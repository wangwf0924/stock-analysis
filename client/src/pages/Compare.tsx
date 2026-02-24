/**
 * 股识 StockWise — 股票对比分析页面
 * 设计风格：樱花渐变轻盈风
 * 功能：双股走势对比、指标对比、AI 综合评分
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  TrendingUp, TrendingDown, Minus, Search, RefreshCw,
  BarChart2, ArrowLeftRight, ChevronDown, Info, X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { fetchStockChart, isAStock, formatSymbol, HOT_STOCKS } from "@/lib/stockApi";
import type { StockChartData, TimeRange } from "@/lib/stockApi";
import { calcMA, calcRSI, calcMACD, calcBollinger, analyzeTrend, generatePrediction } from "@/lib/indicators";
import {
  createChart, ColorType, CrosshairMode, LineSeries, CandlestickSeries, HistogramSeries
} from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { useRef } from "react";

// ─────────────────────────────────────────────
// 对比走势图（归一化）
// ─────────────────────────────────────────────

interface CompareChartProps {
  stockA: StockChartData;
  stockB: StockChartData;
  colorA?: string;
  colorB?: string;
}

function CompareLineChart({ stockA, stockB, colorA = "#E8728A", colorB = "#9B7FD4" }: CompareChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || stockA.candles.length === 0 || stockB.candles.length === 0) return;

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6B6B8A",
        fontFamily: "'DM Sans', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(155, 127, 212, 0.08)" },
        horzLines: { color: "rgba(155, 127, 212, 0.08)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(232, 114, 138, 0.5)", width: 1, style: 2, labelBackgroundColor: "#E8728A" },
        horzLine: { color: "rgba(232, 114, 138, 0.5)", width: 1, style: 2, labelBackgroundColor: "#E8728A" },
      },
      rightPriceScale: { borderColor: "rgba(155, 127, 212, 0.2)" },
      timeScale: { borderColor: "rgba(155, 127, 212, 0.2)", timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;

    type TimeType = import("lightweight-charts").Time;

    // 归一化：以第一个数据点为基准，显示涨跌幅
    const normalizeCandles = (candles: typeof stockA.candles) => {
      const base = candles[0].close;
      return candles.map((c) => ({
        time: c.time as TimeType,
        value: ((c.close - base) / base) * 100,
      }));
    };

    const seriesA = chart.addSeries(LineSeries, {
      color: colorA,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: formatSymbol(stockA.meta.symbol),
    });
    seriesA.setData(normalizeCandles(stockA.candles));

    const seriesB = chart.addSeries(LineSeries, {
      color: colorB,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: formatSymbol(stockB.meta.symbol),
    });
    seriesB.setData(normalizeCandles(stockB.candles));

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [stockA, stockB, colorA, colorB]);

  return <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />;
}

// ─────────────────────────────────────────────
// K 线对比（左右并排）
// ─────────────────────────────────────────────

interface MiniCandleChartProps {
  data: StockChartData;
  color: string;
  label: string;
}

function MiniCandleChart({ data, color, label }: MiniCandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.candles.length === 0) return;
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 200,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6B6B8A",
        fontFamily: "'DM Sans', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(155, 127, 212, 0.06)" },
        horzLines: { color: "rgba(155, 127, 212, 0.06)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(155, 127, 212, 0.15)" },
      timeScale: { borderColor: "rgba(155, 127, 212, 0.15)", timeVisible: false },
    });

    type TimeType = import("lightweight-charts").Time;
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: color,
      downColor: color === "#E8728A" ? "#52C4A0" : "#E8728A",
      borderUpColor: color,
      borderDownColor: color === "#E8728A" ? "#52C4A0" : "#E8728A",
      wickUpColor: color,
      wickDownColor: color === "#E8728A" ? "#52C4A0" : "#E8728A",
    });
    candleSeries.setData(
      data.candles.map((c) => ({ time: c.time as TimeType, open: c.open, high: c.high, low: c.low, close: c.close }))
    );

    // MA5
    const ma5 = calcMA(data.candles, 5);
    const maSeries = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    maSeries.setData(ma5.map((d) => ({ time: d.time as TimeType, value: d.value })));

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [data, color]);

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">{label} K线图</p>
      <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    </div>
  );
}

// ─────────────────────────────────────────────
// 指标对比卡片
// ─────────────────────────────────────────────

interface MetricCompareProps {
  label: string;
  valueA: string | number;
  valueB: string | number;
  colorA: string;
  colorB: string;
  higherIsBetter?: boolean;
  rawA?: number;
  rawB?: number;
  unit?: string;
}

function MetricCompare({ label, valueA, valueB, colorA, colorB, higherIsBetter = true, rawA, rawB, unit = "" }: MetricCompareProps) {
  const numA = rawA ?? (typeof valueA === "number" ? valueA : parseFloat(String(valueA)));
  const numB = rawB ?? (typeof valueB === "number" ? valueB : parseFloat(String(valueB)));
  const winner = isNaN(numA) || isNaN(numB) ? null : higherIsBetter ? (numA > numB ? "A" : numA < numB ? "B" : null) : (numA < numB ? "A" : numA > numB ? "B" : null);

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100/60 last:border-0">
      <span className="text-xs text-gray-400 w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-1">
        <span
          className={`flex-1 text-right text-xs font-semibold px-2 py-0.5 rounded-lg`}
          style={{
            color: colorA,
            backgroundColor: colorA + "15",
            outline: winner === "A" ? `1px solid ${colorA}` : "none",
          }}
        >
          {valueA}{unit}
          {winner === "A" && <span className="ml-1 text-xs">★</span>}
        </span>
        <span className="text-gray-200 text-xs">vs</span>
        <span
          className={`flex-1 text-left text-xs font-semibold px-2 py-0.5 rounded-lg`}
          style={{
            color: colorB,
            backgroundColor: colorB + "15",
            outline: winner === "B" ? `1px solid ${colorB}` : "none",
          }}
        >
          {winner === "B" && <span className="mr-1 text-xs">★</span>}
          {valueB}{unit}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 搜索框
// ─────────────────────────────────────────────

interface StockSearchProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (symbol: string) => void;
  placeholder: string;
  color: string;
  label: string;
}

function StockSearch({ value, onChange, onSelect, placeholder, color, label }: StockSearchProps) {
  const [open, setOpen] = useState(false);
  const allStocks = [...HOT_STOCKS.astock, ...HOT_STOCKS.usstock];
  const filtered = allStocks.filter(
    (s) => s.symbol.toLowerCase().includes(value.toLowerCase()) || s.name.includes(value)
  );

  return (
    <div className="relative">
      <label className="text-xs font-medium mb-1.5 block" style={{ color }}>{label}</label>
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 bg-white/80 transition-all"
        style={{ borderColor: open ? color : "rgba(155, 127, 212, 0.2)" }}
      >
        <Search size={14} style={{ color }} />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-300"
        />
        {value && (
          <button onClick={() => { onChange(""); setOpen(false); }}>
            <X size={12} className="text-gray-300 hover:text-gray-500" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-48 overflow-y-auto"
          >
            {filtered.slice(0, 8).map((s) => (
              <button
                key={s.symbol}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-pink-50 text-left transition-colors"
                onMouseDown={() => { onSelect(s.symbol); onChange(s.name || s.symbol); setOpen(false); }}
              >
                <span className="text-xs font-mono text-gray-400 w-20">{s.symbol}</span>
                <span className="text-sm text-gray-700">{s.name}</span>
                <span className="ml-auto text-xs text-gray-300">{s.sector}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// 主页面
// ─────────────────────────────────────────────

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "1mo", label: "1月" },
  { key: "3mo", label: "3月" },
  { key: "6mo", label: "6月" },
  { key: "1y", label: "1年" },
  { key: "2y", label: "2年" },
];

const COLOR_A = "#E8728A";
const COLOR_B = "#9B7FD4";

export default function Compare() {
  const [, navigate] = useLocation();
  const [symbolA, setSymbolA] = useState("600519.SS");
  const [symbolB, setSymbolB] = useState("AAPL");
  const [inputA, setInputA] = useState("贵州茅台");
  const [inputB, setInputB] = useState("苹果");
  const [range, setRange] = useState<TimeRange>("3mo");
  const [dataA, setDataA] = useState<StockChartData | null>(null);
  const [dataB, setDataB] = useState<StockChartData | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"normalized" | "candle" | "metrics">("normalized");

  const loadData = useCallback(async () => {
    setError(null);
    setLoadingA(true);
    setLoadingB(true);

    const [resA, resB] = await Promise.allSettled([
      fetchStockChart(symbolA, range),
      fetchStockChart(symbolB, range),
    ]);

    if (resA.status === "fulfilled") { setDataA(resA.value); } else { setError("股票A数据加载失败"); }
    if (resB.status === "fulfilled") { setDataB(resB.value); } else { setError("股票B数据加载失败"); }

    setLoadingA(false);
    setLoadingB(false);
  }, [symbolA, symbolB, range]);

  useEffect(() => { loadData(); }, [loadData]);

  const trendA = dataA ? analyzeTrend(dataA.candles) : null;
  const trendB = dataB ? analyzeTrend(dataB.candles) : null;
  const predA = dataA ? generatePrediction(dataA.candles) : null;
  const predB = dataB ? generatePrediction(dataB.candles) : null;

  const isLoading = loadingA || loadingB;

  // 综合评分（0-100）
  const scoreA = predA ? Math.round(
    (predA.nextDayPrediction === "up" ? 60 : predA.nextDayPrediction === "down" ? 30 : 45) +
    (trendA?.confidence ?? 0) * 0.4
  ) : null;
  const scoreB = predB ? Math.round(
    (predB.nextDayPrediction === "up" ? 60 : predB.nextDayPrediction === "down" ? 30 : 45) +
    (trendB?.confidence ?? 0) * 0.4
  ) : null;

  const trendColors = {
    strong_up: "#E8728A", up: "#F4956A", sideways: "#9B7FD4", down: "#52C4A0", strong_down: "#3AA880"
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-gradient)" }}>
      <Navbar />

      <main className="container py-8 max-w-6xl mx-auto">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-sm">
              <ArrowLeftRight size={18} className="text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-gray-800">对比分析</h1>
          </div>
          <p className="text-sm text-gray-400 ml-12">同屏对比两只股票的走势、指标与 AI 评分，发现投资机会</p>
        </motion.div>

        {/* 选股区 */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            <StockSearch
              value={inputA}
              onChange={setInputA}
              onSelect={(s) => setSymbolA(s)}
              placeholder="输入代码或名称，如 600519.SS"
              color={COLOR_A}
              label="股票 A（粉色）"
            />
            <div className="flex flex-col items-center gap-2 pb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                <ArrowLeftRight size={14} className="text-purple-400" />
              </div>
              <span className="text-xs text-gray-300">vs</span>
            </div>
            <StockSearch
              value={inputB}
              onChange={setInputB}
              onSelect={(s) => setSymbolB(s)}
              placeholder="输入代码或名称，如 AAPL"
              color={COLOR_B}
              label="股票 B（紫色）"
            />
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-pink-100/40">
            {/* 时间范围 */}
            <div className="flex gap-1.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    range === r.key
                      ? "bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-sm"
                      : "bg-white/60 text-gray-400 hover:bg-white/90"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              {isLoading ? "加载中..." : "对比分析"}
            </button>
          </div>
        </motion.div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-600">
            {error}
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-pink-200 border-t-pink-400 animate-spin" />
              <p className="text-sm text-gray-400">正在获取数据...</p>
            </div>
          </div>
        )}

        {/* 主内容 */}
        {!isLoading && dataA && dataB && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-5"
          >
            {/* 股票信息卡片 */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { data: dataA, color: COLOR_A, trend: trendA, score: scoreA, pred: predA },
                { data: dataB, color: COLOR_B, trend: trendB, score: scoreB, pred: predB },
              ].map(({ data, color, trend, score, pred }, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: idx === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                  className="glass-card rounded-2xl p-4"
                  style={{ borderTop: `3px solid ${color}` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">{data.meta.symbol}</p>
                      <p className="font-serif font-bold text-gray-800 text-base leading-tight">
                        {data.meta.longName || data.meta.shortName || data.meta.symbol}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/analysis?symbol=${data.meta.symbol}`)}
                      className="text-xs px-2 py-1 rounded-lg transition-colors hover:opacity-80"
                      style={{ backgroundColor: color + "20", color }}
                    >
                      详情 →
                    </button>
                  </div>

                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-2xl font-bold" style={{ color }}>
                      {data.meta.currency === "CNY" ? "¥" : "$"}{data.meta.regularMarketPrice.toFixed(2)}
                    </span>
                    <span
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: data.meta.regularMarketChangePercent >= 0 ? COLOR_A : "#52C4A0" }}
                    >
                      {data.meta.regularMarketChangePercent >= 0 ? "+" : ""}
                      {data.meta.regularMarketChangePercent.toFixed(2)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    {trend && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: (trendColors[trend.trend] ?? "#9B7FD4") + "20",
                          color: trendColors[trend.trend] ?? "#9B7FD4",
                        }}
                      >
                        {trend.label}
                      </span>
                    )}
                    {pred && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: pred.nextDayPrediction === "up" ? "#E8728A20" : pred.nextDayPrediction === "down" ? "#52C4A020" : "#9B7FD420",
                          color: pred.nextDayPrediction === "up" ? "#E8728A" : pred.nextDayPrediction === "down" ? "#52C4A0" : "#9B7FD4",
                        }}
                      >
                        {pred.nextDayPrediction === "up" ? "↑ 看涨" : pred.nextDayPrediction === "down" ? "↓ 看跌" : "→ 中性"}
                      </span>
                    )}
                  </div>

                  {/* AI 综合评分 */}
                  {score !== null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">AI 综合评分</span>
                        <span className="font-bold" style={{ color }}>{score}/100</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* 视图切换 */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="flex border-b border-pink-100/40 bg-pink-50/20">
                {[
                  { key: "normalized" as const, label: "归一化走势对比", icon: <TrendingUp size={13} /> },
                  { key: "candle" as const, label: "K线对比", icon: <BarChart2 size={13} /> },
                  { key: "metrics" as const, label: "指标对比", icon: <ArrowLeftRight size={13} /> },
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setActiveView(v.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                      activeView === v.key
                        ? "text-pink-500 border-b-2 border-pink-400 bg-white/60"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {v.icon}
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* 归一化走势 */}
                {activeView === "normalized" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 rounded" style={{ backgroundColor: COLOR_A }} />
                        <span className="text-xs text-gray-500">{formatSymbol(symbolA)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 rounded" style={{ backgroundColor: COLOR_B }} />
                        <span className="text-xs text-gray-500">{formatSymbol(symbolB)}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                        <Info size={11} />
                        <span>以各自起始价格归一化，显示相对涨跌幅（%）</span>
                      </div>
                    </div>
                    <CompareLineChart stockA={dataA} stockB={dataB} colorA={COLOR_A} colorB={COLOR_B} />
                  </motion.div>
                )}

                {/* K 线对比 */}
                {activeView === "candle" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <MiniCandleChart data={dataA} color={COLOR_A} label={formatSymbol(symbolA)} />
                      <MiniCandleChart data={dataB} color={COLOR_B} label={formatSymbol(symbolB)} />
                    </div>
                  </motion.div>
                )}

                {/* 指标对比 */}
                {activeView === "metrics" && dataA && dataB && trendA && trendB && predA && predB && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {/* 表头 */}
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 pb-2 border-b border-gray-100">
                      <span className="w-24">指标</span>
                      <span className="flex-1 text-right pr-2" style={{ color: COLOR_A }}>{formatSymbol(symbolA)}</span>
                      <span className="text-gray-200">vs</span>
                      <span className="flex-1 text-left pl-2" style={{ color: COLOR_B }}>{formatSymbol(symbolB)}</span>
                    </div>

                    {/* 价格指标 */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">价格表现</p>
                      <MetricCompare label="当前价格" valueA={`${dataA.meta.currency === "CNY" ? "¥" : "$"}${dataA.meta.regularMarketPrice.toFixed(2)}`} valueB={`${dataB.meta.currency === "CNY" ? "¥" : "$"}${dataB.meta.regularMarketPrice.toFixed(2)}`} colorA={COLOR_A} colorB={COLOR_B} rawA={dataA.meta.regularMarketPrice} rawB={dataB.meta.regularMarketPrice} />
                      <MetricCompare label="今日涨跌幅" valueA={`${dataA.meta.regularMarketChangePercent >= 0 ? "+" : ""}${dataA.meta.regularMarketChangePercent.toFixed(2)}%`} valueB={`${dataB.meta.regularMarketChangePercent >= 0 ? "+" : ""}${dataB.meta.regularMarketChangePercent.toFixed(2)}%`} colorA={COLOR_A} colorB={COLOR_B} rawA={dataA.meta.regularMarketChangePercent} rawB={dataB.meta.regularMarketChangePercent} />
                      <MetricCompare label="52周高点" valueA={`${dataA.meta.currency === "CNY" ? "¥" : "$"}${dataA.meta.fiftyTwoWeekHigh.toFixed(2)}`} valueB={`${dataB.meta.currency === "CNY" ? "¥" : "$"}${dataB.meta.fiftyTwoWeekHigh.toFixed(2)}`} colorA={COLOR_A} colorB={COLOR_B} rawA={dataA.meta.fiftyTwoWeekHigh} rawB={dataB.meta.fiftyTwoWeekHigh} />
                    </div>

                    {/* 技术指标 */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">技术指标</p>
                      {(() => {
                        const rsiA = calcRSI(dataA.candles, 14);
                        const rsiB = calcRSI(dataB.candles, 14);
                        const macdA = calcMACD(dataA.candles);
                        const macdB = calcMACD(dataB.candles);
                        const bollA = calcBollinger(dataA.candles, 20);
                        const bollB = calcBollinger(dataB.candles, 20);
                        const lastRsiA = rsiA[rsiA.length - 1]?.value ?? 50;
                        const lastRsiB = rsiB[rsiB.length - 1]?.value ?? 50;
                        const lastMacdA = macdA[macdA.length - 1]?.histogram ?? 0;
                        const lastMacdB = macdB[macdB.length - 1]?.histogram ?? 0;
                        const lastBollA = bollA[bollA.length - 1];
                        const lastBollB = bollB[bollB.length - 1];
                        const bollWidthA = lastBollA ? ((lastBollA.upper - lastBollA.lower) / lastBollA.middle * 100) : 0;
                        const bollWidthB = lastBollB ? ((lastBollB.upper - lastBollB.lower) / lastBollB.middle * 100) : 0;
                        return (
                          <>
                            <MetricCompare label="RSI(14)" valueA={lastRsiA.toFixed(1)} valueB={lastRsiB.toFixed(1)} colorA={COLOR_A} colorB={COLOR_B} higherIsBetter={false} rawA={Math.abs(lastRsiA - 50)} rawB={Math.abs(lastRsiB - 50)} />
                            <MetricCompare label="MACD柱" valueA={lastMacdA.toFixed(3)} valueB={lastMacdB.toFixed(3)} colorA={COLOR_A} colorB={COLOR_B} rawA={lastMacdA} rawB={lastMacdB} />
                            <MetricCompare label="布林带宽" valueA={`${bollWidthA.toFixed(2)}%`} valueB={`${bollWidthB.toFixed(2)}%`} colorA={COLOR_A} colorB={COLOR_B} higherIsBetter={false} rawA={bollWidthA} rawB={bollWidthB} />
                          </>
                        );
                      })()}
                    </div>

                    {/* AI 预测对比 */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">AI 预测</p>
                      <MetricCompare label="趋势判断" valueA={trendA.label} valueB={trendB.label} colorA={COLOR_A} colorB={COLOR_B} rawA={trendA.confidence} rawB={trendB.confidence} />
                      <MetricCompare label="趋势置信度" valueA={`${trendA.confidence}%`} valueB={`${trendB.confidence}%`} colorA={COLOR_A} colorB={COLOR_B} rawA={trendA.confidence} rawB={trendB.confidence} />
                      <MetricCompare label="7日目标价" valueA={`${dataA.meta.currency === "CNY" ? "¥" : "$"}${predA.priceTarget7d.toFixed(2)}`} valueB={`${dataB.meta.currency === "CNY" ? "¥" : "$"}${predB.priceTarget7d.toFixed(2)}`} colorA={COLOR_A} colorB={COLOR_B} rawA={predA.priceTarget7d / dataA.meta.regularMarketPrice} rawB={predB.priceTarget7d / dataB.meta.regularMarketPrice} />
                      <MetricCompare label="风险等级" valueA={predA.riskLevel === "low" ? "低" : predA.riskLevel === "medium" ? "中" : "高"} valueB={predB.riskLevel === "low" ? "低" : predB.riskLevel === "medium" ? "中" : "高"} colorA={COLOR_A} colorB={COLOR_B} higherIsBetter={false} rawA={predA.riskLevel === "low" ? 1 : predA.riskLevel === "medium" ? 2 : 3} rawB={predB.riskLevel === "low" ? 1 : predB.riskLevel === "medium" ? 2 : 3} />
                    </div>

                    {/* 综合结论 */}
                    {scoreA !== null && scoreB !== null && (
                      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100/50">
                        <p className="text-xs font-semibold text-gray-600 mb-2">综合评分结论</p>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex-1 text-center">
                            <p className="text-2xl font-bold" style={{ color: COLOR_A }}>{scoreA}</p>
                            <p className="text-xs text-gray-400">{formatSymbol(symbolA)}</p>
                          </div>
                          <div className="text-gray-200 text-lg">vs</div>
                          <div className="flex-1 text-center">
                            <p className="text-2xl font-bold" style={{ color: COLOR_B }}>{scoreB}</p>
                            <p className="text-xs text-gray-400">{formatSymbol(symbolB)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                          {scoreA > scoreB
                            ? `当前技术面来看，${formatSymbol(symbolA)} 综合评分更高，短期表现相对占优。`
                            : scoreB > scoreA
                            ? `当前技术面来看，${formatSymbol(symbolB)} 综合评分更高，短期表现相对占优。`
                            : "两只股票当前综合评分相近，建议结合基本面进一步分析。"}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 text-center">⚠️ 以上评分仅供参考，不构成投资建议</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* 快速切换热门股票 */}
            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">快速选择热门股票</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-2" style={{ color: COLOR_A }}>A 股（股票A）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HOT_STOCKS.astock.slice(0, 4).map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => { setSymbolA(s.symbol); setInputA(s.name); }}
                        className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                        style={{
                          backgroundColor: symbolA === s.symbol ? COLOR_A + "20" : "#f9f9f9",
                          color: symbolA === s.symbol ? COLOR_A : "#9B9BB8",
                          border: `1px solid ${symbolA === s.symbol ? COLOR_A + "40" : "#e5e7eb"}`,
                        }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2" style={{ color: COLOR_B }}>美股（股票B）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HOT_STOCKS.usstock.slice(0, 4).map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => { setSymbolB(s.symbol); setInputB(s.name); }}
                        className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                        style={{
                          backgroundColor: symbolB === s.symbol ? COLOR_B + "20" : "#f9f9f9",
                          color: symbolB === s.symbol ? COLOR_B : "#9B9BB8",
                          border: `1px solid ${symbolB === s.symbol ? COLOR_B + "40" : "#e5e7eb"}`,
                        }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
