/**
 * 股识 StockWise — 股票分析页面
 * 设计风格：樱花渐变轻盈风
 * 包含：搜索、K线图、技术指标、AI预测、基本信息
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, TrendingUp, TrendingDown, RefreshCw, AlertCircle,
  Target, Shield, Zap, BarChart2, Info, ChevronDown, ChevronUp,
  Clock, DollarSign, Activity
} from "lucide-react";
import {
  fetchStockChart, formatPrice, formatChange, formatVolume,
  formatSymbol, isAStock, HOT_STOCKS, type StockChartData, type TimeRange
} from "@/lib/stockApi";
import { analyzeTrend, generatePrediction } from "@/lib/indicators";
import { getRelevantTheories } from "@/lib/theories";
import CandlestickChart from "@/components/CandlestickChart";
import AStockPanel from "@/components/AStockPanel";
import Navbar from "@/components/Navbar";

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: "1日", value: "1d" },
  { label: "5日", value: "5d" },
  { label: "1月", value: "1mo" },
  { label: "3月", value: "3mo" },
  { label: "6月", value: "6mo" },
  { label: "1年", value: "1y" },
  { label: "2年", value: "2y" },
];

const TREND_COLORS = {
  strong_up: { bg: "rgba(232,114,138,0.1)", text: "#C85A7A", border: "rgba(232,114,138,0.3)" },
  up: { bg: "rgba(232,114,138,0.07)", text: "#E8728A", border: "rgba(232,114,138,0.2)" },
  sideways: { bg: "rgba(155,127,212,0.08)", text: "#9B7FD4", border: "rgba(155,127,212,0.2)" },
  down: { bg: "rgba(82,196,160,0.08)", text: "#3AA880", border: "rgba(82,196,160,0.2)" },
  strong_down: { bg: "rgba(82,196,160,0.12)", text: "#2A9870", border: "rgba(82,196,160,0.3)" },
};

const RISK_COLORS = {
  low: { bg: "rgba(82,196,160,0.1)", text: "#3AA880", label: "低风险" },
  medium: { bg: "rgba(244,149,106,0.1)", text: "#D4723A", label: "中风险" },
  high: { bg: "rgba(232,114,138,0.1)", text: "#C85A7A", label: "高风险" },
};

export default function Analysis() {
  const [location] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [symbol, setSymbol] = useState("AAPL");
  const [timeRange, setTimeRange] = useState<TimeRange>("3mo");
  const [stockData, setStockData] = useState<StockChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTheories, setShowTheories] = useState(false);

  // 从 URL 参数获取 symbol
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sym = params.get("symbol");
    if (sym) {
      setSymbol(sym.toUpperCase());
      setSearchInput(sym.toUpperCase());
    }
  }, [location]);

  const loadData = useCallback(async (sym: string, range: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStockChart(sym, range);
      setStockData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "数据加载失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(symbol, timeRange);
  }, [symbol, timeRange, loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const sym = searchInput.trim().toUpperCase();
      setSymbol(sym);
      window.history.pushState({}, "", `/analysis?symbol=${encodeURIComponent(sym)}`);
    }
  };

  const trend = stockData ? analyzeTrend(stockData.candles) : null;
  const prediction = stockData ? generatePrediction(stockData.candles) : null;
  const relevantTheories = trend ? getRelevantTheories(trend.trend) : [];

  const isRise = stockData ? stockData.meta.regularMarketChange >= 0 : true;
  const trendColor = trend ? TREND_COLORS[trend.trend] : TREND_COLORS.sideways;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF0FF 50%, #F0F5FF 100%)" }}>
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* 搜索栏 */}
        <div className="flex gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3 flex-1 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9B7FD4" }} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="输入股票代码，如 AAPL 或 600519.SS"
                className="w-full pl-11 pr-4 py-3 rounded-2xl text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  border: "1.5px solid rgba(155,127,212,0.2)",
                  color: "#2D2D3A",
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 2px 12px rgba(155,127,212,0.08)",
                }}
                onFocus={(e) => { e.target.style.border = "1.5px solid rgba(232,114,138,0.45)"; }}
                onBlur={(e) => { e.target.style.border = "1.5px solid rgba(155,127,212,0.2)"; }}
              />
            </div>
            <button type="submit" className="btn-primary px-5 py-3 rounded-2xl text-sm font-medium">
              分析
            </button>
          </form>
          <button
            onClick={() => loadData(symbol, timeRange)}
            className="p-3 rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.8)", color: "#9B7FD4", border: "1.5px solid rgba(155,127,212,0.2)" }}
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* 快速切换热门股票 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[...HOT_STOCKS.astock.slice(0, 4), ...HOT_STOCKS.usstock.slice(0, 4)].map((s) => (
            <button
              key={s.symbol}
              onClick={() => {
                setSymbol(s.symbol);
                setSearchInput(s.symbol);
                window.history.pushState({}, "", `/analysis?symbol=${encodeURIComponent(s.symbol)}`);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: symbol === s.symbol ? "linear-gradient(135deg, #E8728A, #9B7FD4)" : "rgba(255,255,255,0.7)",
                color: symbol === s.symbol ? "white" : "#5A5A7A",
                border: symbol === s.symbol ? "none" : "1px solid rgba(155,127,212,0.15)",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="glass-card p-4 mb-6 flex items-center gap-3" style={{ borderColor: "rgba(232,114,138,0.3)" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#E8728A" }} />
            <p className="text-sm" style={{ color: "#5A5A7A" }}>{error}</p>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: "rgba(232,114,138,0.3)", borderTopColor: "#E8728A" }} />
              <p className="text-sm" style={{ color: "#9B9BB8" }}>正在加载 {symbol} 数据...</p>
            </div>
          </div>
        )}

        {/* 主内容 */}
        {!loading && stockData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            {/* 股票头部信息 */}
            <div className="glass-card p-6 mb-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                      {stockData.meta.longName || stockData.meta.shortName || symbol}
                    </h1>
                    <span className="text-sm px-2.5 py-1 rounded-full font-mono" style={{ background: "rgba(155,127,212,0.1)", color: "#9B7FD4" }}>
                      {formatSymbol(symbol)}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(155,127,212,0.07)", color: "#9B9BB8" }}>
                      {stockData.meta.exchangeName}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold font-en" style={{ color: "#2D2D3A" }}>
                      {formatPrice(stockData.meta.regularMarketPrice, stockData.meta.currency)}
                    </span>
                    <span className={`text-lg font-bold font-en ${isRise ? "text-rise" : "text-fall"}`}>
                      {formatChange(stockData.meta.regularMarketChange, stockData.meta.regularMarketChangePercent)}
                    </span>
                    {isRise ? <TrendingUp className="w-5 h-5 text-rise" /> : <TrendingDown className="w-5 h-5 text-fall" />}
                  </div>
                </div>

                {/* 趋势标签 */}
                {trend && (
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className="px-4 py-2 rounded-2xl text-sm font-medium"
                      style={{ background: trendColor.bg, color: trendColor.text, border: `1px solid ${trendColor.border}` }}
                    >
                      {trend.label}
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: "#9B9BB8" }}>
                      <Activity className="w-3 h-3" />
                      置信度 {trend.confidence}%
                    </div>
                  </div>
                )}
              </div>

              {/* 关键数据 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid rgba(155,127,212,0.1)" }}>
                {[
                  { label: "今日开盘", value: formatPrice(stockData.meta.regularMarketOpen, stockData.meta.currency), icon: <Clock className="w-3.5 h-3.5" /> },
                  { label: "今日最高", value: formatPrice(stockData.meta.regularMarketDayHigh, stockData.meta.currency), icon: <TrendingUp className="w-3.5 h-3.5" /> },
                  { label: "今日最低", value: formatPrice(stockData.meta.regularMarketDayLow, stockData.meta.currency), icon: <TrendingDown className="w-3.5 h-3.5" /> },
                  { label: "成交量", value: formatVolume(stockData.meta.regularMarketVolume), icon: <BarChart2 className="w-3.5 h-3.5" /> },
                  { label: "52周最高", value: formatPrice(stockData.meta.fiftyTwoWeekHigh, stockData.meta.currency), icon: <TrendingUp className="w-3.5 h-3.5" /> },
                  { label: "52周最低", value: formatPrice(stockData.meta.fiftyTwoWeekLow, stockData.meta.currency), icon: <TrendingDown className="w-3.5 h-3.5" /> },
                  { label: "昨日收盘", value: formatPrice(stockData.meta.previousClose, stockData.meta.currency), icon: <DollarSign className="w-3.5 h-3.5" /> },
                  { label: "货币", value: stockData.meta.currency, icon: <Info className="w-3.5 h-3.5" /> },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: "rgba(155,127,212,0.04)" }}>
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: "#9B9BB8" }}>
                      {item.icon}
                      <span className="text-xs">{item.label}</span>
                    </div>
                    <p className="font-semibold text-sm font-en" style={{ color: "#2D2D3A" }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* K 线图 */}
            <div className="glass-card p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                  价格走势图
                </h2>
                <div className="flex gap-1">
                  {TIME_RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setTimeRange(r.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: timeRange === r.value ? "linear-gradient(135deg, #E8728A, #9B7FD4)" : "rgba(255,255,255,0.7)",
                        color: timeRange === r.value ? "white" : "#7A7A9A",
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <CandlestickChart candles={stockData.candles} currency={stockData.meta.currency} height={400} />
            </div>

            {/* 两栏布局：趋势分析 + AI 预测 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* 趋势分析 */}
              {trend && (
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                    <BarChart2 className="w-4 h-4" style={{ color: "#E8728A" }} />
                    趋势分析
                  </h2>

                  <div
                    className="p-4 rounded-2xl mb-4"
                    style={{ background: trendColor.bg, border: `1px solid ${trendColor.border}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg" style={{ color: trendColor.text, fontFamily: "'Noto Serif SC', serif" }}>
                        {trend.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 rounded-full overflow-hidden w-20" style={{ background: "rgba(155,127,212,0.15)" }}>
                          <div className="h-full rounded-full" style={{ width: `${trend.confidence}%`, background: trendColor.text }} />
                        </div>
                        <span className="text-xs font-mono" style={{ color: trendColor.text }}>{trend.confidence}%</span>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: "#5A5A7A" }}>{trend.description}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium mb-2" style={{ color: "#9B9BB8" }}>信号详情</p>
                    {trend.signals.map((signal, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#E8728A" }} />
                        <span style={{ color: "#5A5A7A" }}>{signal}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI 预测 */}
              {prediction && (
                <div className="glass-card p-5">
                  <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                    <Zap className="w-4 h-4" style={{ color: "#9B7FD4" }} />
                    AI 智能预测
                    <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: "rgba(155,127,212,0.1)", color: "#9B7FD4" }}>
                      仅供参考
                    </span>
                  </h2>

                  {/* 明日预测 */}
                  <div className="p-4 rounded-2xl mb-4" style={{ background: "rgba(155,127,212,0.06)", border: "1px solid rgba(155,127,212,0.15)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm" style={{ color: "#7A7A9A" }}>明日走势预测</span>
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
                        style={{
                          background: prediction.nextDayPrediction === "up" ? "rgba(232,114,138,0.1)" : prediction.nextDayPrediction === "down" ? "rgba(82,196,160,0.1)" : "rgba(155,127,212,0.1)",
                          color: prediction.nextDayPrediction === "up" ? "#E8728A" : prediction.nextDayPrediction === "down" ? "#3AA880" : "#9B7FD4",
                        }}
                      >
                        {prediction.nextDayPrediction === "up" ? <TrendingUp className="w-4 h-4" /> : prediction.nextDayPrediction === "down" ? <TrendingDown className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        {prediction.nextDayPrediction === "up" ? "看涨" : prediction.nextDayPrediction === "down" ? "看跌" : "中性"}
                        <span className="font-mono text-xs">({prediction.nextDayConfidence}%)</span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#5A5A7A" }}>{prediction.summary}</p>
                  </div>

                  {/* 价格目标 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl" style={{ background: "rgba(232,114,138,0.05)", border: "1px solid rgba(232,114,138,0.1)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target className="w-3.5 h-3.5" style={{ color: "#E8728A" }} />
                        <span className="text-xs" style={{ color: "#9B9BB8" }}>7日目标价</span>
                      </div>
                      <p className="font-bold font-en" style={{ color: "#2D2D3A" }}>
                        {formatPrice(prediction.priceTarget7d, stockData.meta.currency)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(155,127,212,0.05)", border: "1px solid rgba(155,127,212,0.1)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target className="w-3.5 h-3.5" style={{ color: "#9B7FD4" }} />
                        <span className="text-xs" style={{ color: "#9B9BB8" }}>30日目标价</span>
                      </div>
                      <p className="font-bold font-en" style={{ color: "#2D2D3A" }}>
                        {formatPrice(prediction.priceTarget30d, stockData.meta.currency)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(82,196,160,0.05)", border: "1px solid rgba(82,196,160,0.1)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5" style={{ color: "#3AA880" }} />
                        <span className="text-xs" style={{ color: "#9B9BB8" }}>支撑位</span>
                      </div>
                      <p className="font-bold font-en" style={{ color: "#2D2D3A" }}>
                        {formatPrice(prediction.supportLevel, stockData.meta.currency)}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: "rgba(244,149,106,0.05)", border: "1px solid rgba(244,149,106,0.1)" }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield className="w-3.5 h-3.5" style={{ color: "#D4723A" }} />
                        <span className="text-xs" style={{ color: "#9B9BB8" }}>阻力位</span>
                      </div>
                      <p className="font-bold font-en" style={{ color: "#2D2D3A" }}>
                        {formatPrice(prediction.resistanceLevel, stockData.meta.currency)}
                      </p>
                    </div>
                  </div>

                  {/* 风险评估 */}
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: RISK_COLORS[prediction.riskLevel].bg }}
                  >
                    <Shield className="w-4 h-4 flex-shrink-0" style={{ color: RISK_COLORS[prediction.riskLevel].text }} />
                    <div>
                      <span className="text-sm font-medium" style={{ color: RISK_COLORS[prediction.riskLevel].text }}>
                        {RISK_COLORS[prediction.riskLevel].label}
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: "#7A7A9A" }}>
                        基于近期波动率与趋势强度综合评估
                      </p>
                    </div>
                  </div>

                  <p className="text-xs mt-3 text-center" style={{ color: "#BBBBCC" }}>
                    ⚠ 预测结果仅供参考，不构成投资建议，投资有风险
                  </p>
                </div>
              )}
            </div>

            {/* A 股专属指标 */}
            {isAStock(symbol) && stockData && (
              <div className="mb-5">
                <AStockPanel candles={stockData.candles} meta={stockData.meta} />
              </div>
            )}

            {/* 相关理论 */}
            <div className="glass-card p-5">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setShowTheories(!showTheories)}
              >
                <h2 className="font-semibold flex items-center gap-2" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                  <span className="text-lg">📚</span>
                  相关投资理论
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(155,127,212,0.1)", color: "#9B7FD4" }}>
                    {relevantTheories.length} 条
                  </span>
                </h2>
                {showTheories ? <ChevronUp className="w-4 h-4" style={{ color: "#9B9BB8" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#9B9BB8" }} />}
              </button>

              <AnimatePresence>
                {showTheories && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-4">
                      {relevantTheories.map((theory) => (
                        <div
                          key={theory.id}
                          className="p-4 rounded-2xl"
                          style={{ background: "rgba(155,127,212,0.04)", border: "1px solid rgba(155,127,212,0.1)" }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">{theory.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                                  {theory.title}
                                </h3>
                                <span className="text-xs" style={{ color: "#9B9BB8" }}>— {theory.author}</span>
                              </div>
                              <p className="text-sm leading-relaxed mb-2" style={{ color: "#5A5A7A" }}>{theory.summary}</p>
                              <blockquote className="text-xs italic px-3 py-2 rounded-xl" style={{ background: "rgba(232,114,138,0.06)", color: "#7A5A6A", borderLeft: "2px solid #E8728A" }}>
                                「{theory.quote}」
                                <span className="not-italic ml-2" style={{ color: "#9B9BB8" }}>— {theory.quoteSource}</span>
                              </blockquote>
                              <p className="text-xs mt-2" style={{ color: "#7A7A9A" }}>
                                <strong style={{ color: "#9B7FD4" }}>实战应用：</strong>{theory.application}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
