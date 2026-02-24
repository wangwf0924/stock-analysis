/**
 * 股识 StockWise — 首页
 * 设计风格：樱花渐变轻盈风
 * 包含：Hero 区域、功能介绍、热门股票快览、每日格言
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Search, TrendingUp, TrendingDown, BarChart2, BookOpen, Sparkles, ArrowRight, ChevronRight } from "lucide-react";
import { HOT_STOCKS, formatPrice, isAStock } from "@/lib/stockApi";
import { DAILY_QUOTES } from "@/lib/theories";
import Navbar from "@/components/Navbar";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/o02SDJbfxWShGSF58qRhYJ/sandbox/3VhhR68TEpRpGh8fxjgRkE-img-1_1771916244000_na1fn_aGVyby1iZw.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvbzAyU0RKYmZ4V1NoR1NGNThxUmhZSi9zYW5kYm94LzNWaGhSNjhURXBScEdoOGZ4amdSa0UtaW1nLTFfMTc3MTkxNjI0NDAwMF9uYTFmbl9hR1Z5YnkxaVp3LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=bfw9gmSIE1U3A2~8v50M3O7utC4XAfNLiT3a5bWwTzd7MelFAwucrEsbluUeWyMCtoXWTgcLkvsVU754zPi7pbgIrsuRlnIcoJYHeUXsvT08lJDOYmEXxB-p5ABCmQS3CQ1ZuGHGLAwTynLfpgOaNlNIkFbXgLeexzzfz2P964kU113VRwZjDl30DlKxbZ4gioV334HHsSAnWsIPMSGUDyTbG-zkP1-L-o22QK6uy-0EVv~rNUA5WtCKaC--PrDgWOOFmD2LqjE5mTQB12kpSGrYUbpi5PManrKbd9VIauhUe3mWI5QzCg44fUnH1qf4RgDEndGq2s~dI4zoxsn7cg__";

const PREDICTION_ICON = "https://private-us-east-1.manuscdn.com/user_upload_by_module/session_file/310519663376146662/xKqlQNNlKmuFGHRZ.png?Expires=1803461306&Signature=uZ5TdO6D1c2V-942WlloM-VGH742Wa1u~XyVTBFmlwH7yod4Ei8g0FDDJYhi1ngCJfyNv~T7vGEl4rFcZFf8Yhf4ZaYPC0OIsxsFQIyvv9gaBxoNchj4Th007fmOWkjGkJOwg9yJ5IFjROv~ygrtFDfZkJYI4NHXiR6le0Otvod72rOtZWeRdjGR5qlpA5NAMBbYm1ZbJUSx0Pmn85Vfmo1HvX2oR0hWEwbGn0e7WGr-Ffyg3xGhiMfknU3H3GgkDT~yVGZmaPjBgPfUMmEfaWBXZni2ijG4Z5vgRx9B3yPPMy429EPRAoH2nu2MOo33czC9iz~UIyIrJh0PEKn9mg__&Key-Pair-Id=K2HSFNDJXOU9YS";

const THEORY_BG = "https://private-us-east-1.manuscdn.com/sessionFile/o02SDJbfxWShGSF58qRhYJ/sandbox/3VhhR68TEpRpGh8fxjgRkE-img-2_1771916246000_na1fn_dGhlb3J5LWJn.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvbzAyU0RKYmZ4V1NoR1NGNThxUmhZSi9zYW5kYm94LzNWaGhSNjhURXBScEdoOGZ4amdSa0UtaW1nLTJfMTc3MTkxNjI0NjAwMF9uYTFmbl9kR2hsYjNKNUxXSm4ucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=Dpe9a8yhPot4griuhStMGcToX8eDGkV5TKRxHPhYrkrfep1zxUB9ffvqDjrEBC0W8UYbAg3ztv7o9n0Mvk3CwqnsmdDpPtiZ3GD8GaGuWyicCtZu92IoXgeSgSDz1tdXABxuL9vq5oIYHBG863wEMEu5hsbZa2JN73b9wfNmCcWI2ywNh9UcaZFfkF47OGLqnE7gdHmNqV-RUqT3PL2UlzTmqVa56k~g97oU-IV58F4Cy126zVTN6mOVXx4lUM-rVQNkTB2iEHiJhBfVHeRgM7oW4kbdEHccz~FPlapRjD5-XVmNI-OopeVutg5wT0Vm6dgwjEH0RDDYAEuNUBRUlw__";

// 模拟热门股票价格数据（用于首页展示）
const MOCK_PRICES: Record<string, { price: number; change: number; changePercent: number }> = {
  "600519.SS": { price: 1688.5, change: 12.3, changePercent: 0.73 },
  "000858.SZ": { price: 158.2, change: -2.1, changePercent: -1.31 },
  "601318.SS": { price: 42.8, change: 0.5, changePercent: 1.18 },
  "000333.SZ": { price: 58.9, change: -0.8, changePercent: -1.34 },
  "600036.SS": { price: 38.5, change: 0.3, changePercent: 0.79 },
  "300750.SZ": { price: 178.6, change: 3.2, changePercent: 1.82 },
  AAPL: { price: 213.5, change: 2.8, changePercent: 1.33 },
  MSFT: { price: 415.2, change: -3.1, changePercent: -0.74 },
  GOOGL: { price: 178.9, change: 1.5, changePercent: 0.84 },
  TSLA: { price: 248.3, change: -5.2, changePercent: -2.05 },
  NVDA: { price: 875.4, change: 18.6, changePercent: 2.17 },
  META: { price: 512.8, change: 4.3, changePercent: 0.85 },
};

const FEATURES = [
  {
    icon: <BarChart2 className="w-6 h-6" />,
    title: "专业 K 线分析",
    desc: "支持 MA、EMA、MACD、RSI、布林带、KDJ 等 10+ 技术指标，专业图表交互体验",
    color: "#E8728A",
    bg: "rgba(232,114,138,0.08)",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "智能预测",
    desc: "综合分析趋势、动能、波动率，给出短期价格预测与风险评估",
    color: "#9B7FD4",
    bg: "rgba(155,127,212,0.08)",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "A 股 + 美股",
    desc: "同时支持沪深 A 股与美股市场，一站式查询分析，无需切换平台",
    color: "#F4956A",
    bg: "rgba(244,149,106,0.08)",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "投资大师理论",
    desc: "融合巴菲特、格雷厄姆、彼得·林奇等 10 位大师的投资智慧，理论联系实际",
    color: "#52C4A0",
    bg: "rgba(82,196,160,0.08)",
  },
];

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const [, navigate] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [dailyQuote] = useState(() => DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)]);
  const [activeTab, setActiveTab] = useState<"astock" | "usstock">("astock");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/analysis?symbol=${encodeURIComponent(searchInput.trim().toUpperCase())}`);
    }
  };

  const handleStockClick = (symbol: string) => {
    navigate(`/analysis?symbol=${encodeURIComponent(symbol)}`);
  };

  const currentStocks = HOT_STOCKS[activeTab];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF0FF 50%, #F0F5FF 100%)" }}>
      <Navbar />

      {/* Hero 区域 */}
      <section className="relative overflow-hidden min-h-[580px] flex items-center">
        {/* 背景图 */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        {/* 渐变遮罩 */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(255,245,247,0.85) 0%, rgba(250,240,255,0.75) 50%, rgba(240,245,255,0.85) 100%)" }} />

        <div className="relative container mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium"
                style={{ background: "rgba(232,114,138,0.1)", color: "#C85A7A" }}>
                <Sparkles className="w-4 h-4" />
                融合经典理论 × 投资大师智慧
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                <span style={{ color: "#2D2D3A" }}>读懂市场</span>
                <br />
                <span className="gradient-text">智慧投资</span>
              </h1>

              <p className="text-lg mb-8 leading-relaxed max-w-xl" style={{ color: "#5A5A7A" }}>
                结合道氏理论、波浪理论、价値投资等经典理论，
                为您解读 A 股与美股的涨跌走势。
              </p>

              {/* 搜索框 */}
              <form onSubmit={handleSearch} className="flex gap-3 max-w-lg">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9B7FD4" }} />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="输入股票代码，如 AAPL 或 600519.SS"
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl text-sm outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      border: "1.5px solid rgba(155,127,212,0.25)",
                      color: "#2D2D3A",
                      fontFamily: "'DM Sans', sans-serif",
                      boxShadow: "0 4px 20px rgba(155,127,212,0.1)",
                    }}
                    onFocus={(e) => {
                      e.target.style.border = "1.5px solid rgba(232,114,138,0.5)";
                      e.target.style.boxShadow = "0 4px 24px rgba(232,114,138,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.border = "1.5px solid rgba(155,127,212,0.25)";
                      e.target.style.boxShadow = "0 4px 20px rgba(155,127,212,0.1)";
                    }}
                  />
                </div>
                <button type="submit" className="btn-primary px-6 py-3.5 rounded-2xl font-medium text-sm whitespace-nowrap">
                  开始分析
                </button>
              </form>

              <p className="mt-3 text-xs" style={{ color: "#9B9BB8" }}>
                A股示例：600519.SS（贵州茅台）、000858.SZ（五粮液）
              </p>
            </motion.div>
          </div>
        </div>

        {/* 右侧装饰图 */}
        <motion.div
          className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <img src={PREDICTION_ICON} alt="AI预测" className="w-72 h-72 object-contain animate-float" />
        </motion.div>
      </section>

      {/* 每日格言 */}
      <section className="py-6">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card px-8 py-5 flex items-center gap-4"
          >
            <div className="text-2xl flex-shrink-0">✨</div>
            <div>
              <p className="text-sm font-medium" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                「{dailyQuote.quote}」
              </p>
              <p className="text-xs mt-1" style={{ color: "#9B7FD4" }}>— {dailyQuote.author}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 热门股票 */}
      <section className="py-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
              热门股票
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("astock")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === "astock" ? "text-white shadow-sm" : "text-gray-500 bg-white/60"
                }`}
                style={activeTab === "astock" ? { background: "linear-gradient(135deg, #E8728A, #C85A8A)" } : {}}
              >
                A 股
              </button>
              <button
                onClick={() => setActiveTab("usstock")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === "usstock" ? "text-white shadow-sm" : "text-gray-500 bg-white/60"
                }`}
                style={activeTab === "usstock" ? { background: "linear-gradient(135deg, #9B7FD4, #7B5FC4)" } : {}}
              >
                美 股
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentStocks.map((stock, i) => {
              const priceData = MOCK_PRICES[stock.symbol];
              const isRise = priceData ? priceData.change >= 0 : Math.random() > 0.5;
              return (
                <motion.div
                  key={stock.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleStockClick(stock.symbol)}
                  className="glass-card p-4 cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "#2D2D3A" }}>{stock.name}</p>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: "#9B9BB8" }}>{stock.symbol}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(155,127,212,0.1)", color: "#9B7FD4" }}>
                      {stock.sector}
                    </span>
                  </div>
                  {priceData && (
                    <div>
                      <p className="text-lg font-bold font-en" style={{ color: "#2D2D3A" }}>
                        {isAStock(stock.symbol) ? `¥${priceData.price.toFixed(2)}` : `$${priceData.price.toFixed(2)}`}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        {isRise ? (
                          <TrendingUp className="w-3 h-3 text-rise" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-fall" />
                        )}
                        <span className={`text-xs font-mono font-bold ${isRise ? "text-rise" : "text-fall"}`}>
                          {isRise ? "+" : ""}{priceData.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#9B7FD4" }}>
                    <span>查看分析</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 功能介绍 */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
              专业分析，一目了然
            </h2>
            <p className="text-sm" style={{ color: "#7A7A9A" }}>
              将复杂的金融数据转化为直观易懂的分析报告
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: feature.bg, color: feature.color }}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#7A7A9A" }}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 理论导读 Banner */}
      <section className="py-10">
        <div className="container mx-auto px-6">
          <div
            className="rounded-3xl overflow-hidden relative"
            style={{ minHeight: 220 }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20"
              style={{ backgroundImage: `url(${THEORY_BG})` }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(155,127,212,0.9) 0%, rgba(232,114,138,0.85) 100%)" }} />
            <div className="relative p-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  投资大师的智慧
                </h3>
                <p className="text-white/80 text-sm max-w-md leading-relaxed">
                  从巴菲特的价值投资到索罗斯的反身性理论，
                  探索 10 位传奇投资者的核心思想与实战方法论。
                </p>
                <button
                  onClick={() => navigate("/theories")}
                  className="mt-5 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all"
                  style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                >
                  探索理论库
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="hidden md:flex gap-4 text-white/90 text-sm">
                {["道氏理论", "波浪理论", "价值投资", "反身性理论", "全天候组合"].map((t) => (
                  <span key={t} className="px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 mt-4">
        <div className="container mx-auto px-6 text-center">
          <div className="gradient-divider mb-6" />
          <p className="text-sm" style={{ color: "#9B9BB8" }}>
            股识 StockWise
          </p>
          <p className="text-xs mt-1" style={{ color: "#BBBBCC" }}>
            数据来源：Yahoo Finance
          </p>
        </div>
      </footer>
    </div>
  );
}
