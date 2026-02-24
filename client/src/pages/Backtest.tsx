/**
 * 股识 StockWise — 历史回测页面
 * 设计风格：樱花渐变轻盈风
 * 功能：选择技术指标策略，在历史数据上模拟回测，展示胜率、收益曲线、信号标注
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { fetchStockChart, isAStock, formatPrice } from "@/lib/stockApi";
import type { CandleData } from "@/lib/stockApi";
import { calcMA, calcEMA, calcMACD, calcRSI, calcBollinger, calcKDJ } from "@/lib/indicators";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart, BarChart, Bar, Cell
} from "recharts";
import { Play, RotateCcw, TrendingUp, TrendingDown, Target, Zap, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

// ─── 策略定义 ──────────────────────────────────────────────────────────────────

export interface BacktestSignal {
  time: number;
  type: "buy" | "sell";
  price: number;
  reason: string;
  index: number;
}

export interface BacktestTrade {
  buyTime: number;
  buyPrice: number;
  sellTime: number;
  sellPrice: number;
  returnPct: number;
  holdDays: number;
  profit: boolean;
}

export interface BacktestResult {
  signals: BacktestSignal[];
  trades: BacktestTrade[];
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  avgHoldDays: number;
  sharpeRatio: number;
  equityCurve: { time: number; value: number; date: string }[];
  totalTrades: number;
  profitTrades: number;
  lossTrades: number;
  avgWin: number;
  avgLoss: number;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  theory: string; // 对应的投资理论
  params: StrategyParam[];
  run: (candles: CandleData[], params: Record<string, number>) => BacktestSignal[];
}

interface StrategyParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

// ─── 策略实现 ──────────────────────────────────────────────────────────────────

const STRATEGIES: Strategy[] = [
  {
    id: "macd_cross",
    name: "MACD 金叉/死叉",
    description: "MACD 快线上穿慢线（金叉）买入，下穿（死叉）卖出。源自道氏理论的趋势跟踪思想。",
    icon: "⚡",
    color: "#E8728A",
    theory: "道氏理论 · 趋势跟踪",
    params: [
      { key: "fast", label: "快线周期", min: 5, max: 20, step: 1, default: 12 },
      { key: "slow", label: "慢线周期", min: 15, max: 40, step: 1, default: 26 },
      { key: "signal", label: "信号线周期", min: 5, max: 15, step: 1, default: 9 },
    ],
    run: (candles, params) => {
      const macd = calcMACD(candles, params.fast, params.slow, params.signal);
      const signals: BacktestSignal[] = [];
      for (let i = 1; i < macd.length; i++) {
        const prev = macd[i - 1];
        const curr = macd[i];
        const candleIdx = candles.findIndex((c) => c.time === curr.time);
        if (candleIdx < 0) continue;
        if (prev.macd <= prev.signal && curr.macd > curr.signal) {
          signals.push({ time: curr.time, type: "buy", price: candles[candleIdx].close, reason: "MACD 金叉", index: candleIdx });
        } else if (prev.macd >= prev.signal && curr.macd < curr.signal) {
          signals.push({ time: curr.time, type: "sell", price: candles[candleIdx].close, reason: "MACD 死叉", index: candleIdx });
        }
      }
      return signals;
    },
  },
  {
    id: "ma_cross",
    name: "均线金叉/死叉",
    description: "短期均线上穿长期均线（金叉）买入，下穿（死叉）卖出。格雷厄姆价值投资的技术化延伸。",
    icon: "📈",
    color: "#9B7FD4",
    theory: "格雷厄姆 · 均值回归",
    params: [
      { key: "shortPeriod", label: "短期均线", min: 5, max: 20, step: 1, default: 5 },
      { key: "longPeriod", label: "长期均线", min: 20, max: 60, step: 5, default: 20 },
    ],
    run: (candles, params) => {
      const shortMA = calcMA(candles, params.shortPeriod);
      const longMA = calcMA(candles, params.longPeriod);
      const signals: BacktestSignal[] = [];
      const minLen = Math.min(shortMA.length, longMA.length);
      const offset = shortMA.length - minLen;
      const longOffset = longMA.length - minLen;
      for (let i = 1; i < minLen; i++) {
        const prevShort = shortMA[i - 1 + offset].value;
        const prevLong = longMA[i - 1 + longOffset].value;
        const currShort = shortMA[i + offset].value;
        const currLong = longMA[i + longOffset].value;
        const candleIdx = candles.findIndex((c) => c.time === shortMA[i + offset].time);
        if (candleIdx < 0) continue;
        if (prevShort <= prevLong && currShort > currLong) {
          signals.push({ time: shortMA[i + offset].time, type: "buy", price: candles[candleIdx].close, reason: `MA${params.shortPeriod} 上穿 MA${params.longPeriod}`, index: candleIdx });
        } else if (prevShort >= prevLong && currShort < currLong) {
          signals.push({ time: shortMA[i + offset].time, type: "sell", price: candles[candleIdx].close, reason: `MA${params.shortPeriod} 下穿 MA${params.longPeriod}`, index: candleIdx });
        }
      }
      return signals;
    },
  },
  {
    id: "rsi_oversold",
    name: "RSI 超买超卖",
    description: "RSI 跌破超卖线（默认30）买入，突破超买线（默认70）卖出。源自凯恩斯「选美理论」的市场情绪量化。",
    icon: "🎯",
    color: "#52C4A0",
    theory: "凯恩斯 · 市场情绪",
    params: [
      { key: "period", label: "RSI 周期", min: 7, max: 21, step: 1, default: 14 },
      { key: "oversold", label: "超卖线", min: 20, max: 35, step: 1, default: 30 },
      { key: "overbought", label: "超买线", min: 65, max: 80, step: 1, default: 70 },
    ],
    run: (candles, params) => {
      const rsi = calcRSI(candles, params.period);
      const signals: BacktestSignal[] = [];
      let inPosition = false;
      for (let i = 1; i < rsi.length; i++) {
        const prev = rsi[i - 1].value;
        const curr = rsi[i].value;
        const candleIdx = candles.findIndex((c) => c.time === rsi[i].time);
        if (candleIdx < 0) continue;
        if (!inPosition && prev >= params.oversold && curr < params.oversold) {
          signals.push({ time: rsi[i].time, type: "buy", price: candles[candleIdx].close, reason: `RSI 跌破 ${params.oversold}（超卖）`, index: candleIdx });
          inPosition = true;
        } else if (inPosition && prev <= params.overbought && curr > params.overbought) {
          signals.push({ time: rsi[i].time, type: "sell", price: candles[candleIdx].close, reason: `RSI 突破 ${params.overbought}（超买）`, index: candleIdx });
          inPosition = false;
        }
      }
      return signals;
    },
  },
  {
    id: "boll_breakout",
    name: "布林带突破",
    description: "价格跌破布林带下轨买入，突破上轨卖出。源自索罗斯「反身性理论」的均值回归策略。",
    icon: "🌊",
    color: "#F4956A",
    theory: "索罗斯 · 反身性理论",
    params: [
      { key: "period", label: "均线周期", min: 10, max: 30, step: 1, default: 20 },
      { key: "stdDev", label: "标准差倍数", min: 1, max: 3, step: 0.5, default: 2 },
    ],
    run: (candles, params) => {
      const boll = calcBollinger(candles, params.period, params.stdDev);
      const signals: BacktestSignal[] = [];
      let inPosition = false;
      for (let i = 1; i < boll.length; i++) {
        const candleIdx = candles.findIndex((c) => c.time === boll[i].time);
        if (candleIdx < 0) continue;
        const price = candles[candleIdx].close;
        if (!inPosition && price < boll[i].lower) {
          signals.push({ time: boll[i].time, type: "buy", price, reason: "价格跌破布林带下轨", index: candleIdx });
          inPosition = true;
        } else if (inPosition && price > boll[i].upper) {
          signals.push({ time: boll[i].time, type: "sell", price, reason: "价格突破布林带上轨", index: candleIdx });
          inPosition = false;
        }
      }
      return signals;
    },
  },
  {
    id: "kdj_cross",
    name: "KDJ 金叉/死叉",
    description: "K 线上穿 D 线（金叉）买入，下穿（死叉）卖出，结合 J 值超买超卖过滤。A 股常用策略。",
    icon: "🔮",
    color: "#C9A96E",
    theory: "威廉 · 随机指标",
    params: [
      { key: "period", label: "KDJ 周期", min: 5, max: 14, step: 1, default: 9 },
      { key: "jOversold", label: "J 超卖线", min: 10, max: 30, step: 5, default: 20 },
      { key: "jOverbought", label: "J 超买线", min: 70, max: 90, step: 5, default: 80 },
    ],
    run: (candles, params) => {
      const kdj = calcKDJ(candles, params.period);
      const signals: BacktestSignal[] = [];
      for (let i = 1; i < kdj.length; i++) {
        const prev = kdj[i - 1];
        const curr = kdj[i];
        const candleIdx = candles.findIndex((c) => c.time === curr.time);
        if (candleIdx < 0) continue;
        if (prev.k <= prev.d && curr.k > curr.d && curr.j < params.jOversold + 30) {
          signals.push({ time: curr.time, type: "buy", price: candles[candleIdx].close, reason: `KDJ 金叉（J=${curr.j.toFixed(1)}）`, index: candleIdx });
        } else if (prev.k >= prev.d && curr.k < curr.d && curr.j > params.jOverbought - 30) {
          signals.push({ time: curr.time, type: "sell", price: candles[candleIdx].close, reason: `KDJ 死叉（J=${curr.j.toFixed(1)}）`, index: candleIdx });
        }
      }
      return signals;
    },
  },
  {
    id: "ema_trend",
    name: "EMA 趋势跟踪",
    description: "价格站上 EMA 均线且 EMA 向上时买入，跌破时卖出。彼得·林奇「长期持有趋势股」理念的量化实现。",
    icon: "🌸",
    color: "#B8A8D4",
    theory: "彼得·林奇 · 成长投资",
    params: [
      { key: "shortEMA", label: "短期 EMA", min: 5, max: 15, step: 1, default: 8 },
      { key: "longEMA", label: "长期 EMA", min: 20, max: 50, step: 5, default: 21 },
    ],
    run: (candles, params) => {
      const shortEMA = calcEMA(candles, params.shortEMA);
      const longEMA = calcEMA(candles, params.longEMA);
      const signals: BacktestSignal[] = [];
      const minLen = Math.min(shortEMA.length, longEMA.length);
      const sOffset = shortEMA.length - minLen;
      const lOffset = longEMA.length - minLen;
      for (let i = 2; i < minLen; i++) {
        const prevS = shortEMA[i - 1 + sOffset].value;
        const prevL = longEMA[i - 1 + lOffset].value;
        const currS = shortEMA[i + sOffset].value;
        const currL = longEMA[i + lOffset].value;
        const prevPrevS = shortEMA[i - 2 + sOffset].value;
        const candleIdx = candles.findIndex((c) => c.time === shortEMA[i + sOffset].time);
        if (candleIdx < 0) continue;
        const price = candles[candleIdx].close;
        // EMA 向上且短期上穿长期
        if (prevS <= prevL && currS > currL && currS > prevPrevS) {
          signals.push({ time: shortEMA[i + sOffset].time, type: "buy", price, reason: `EMA${params.shortEMA} 上穿 EMA${params.longEMA}（趋势向上）`, index: candleIdx });
        } else if (prevS >= prevL && currS < currL) {
          signals.push({ time: shortEMA[i + sOffset].time, type: "sell", price, reason: `EMA${params.shortEMA} 下穿 EMA${params.longEMA}（趋势转弱）`, index: candleIdx });
        }
      }
      return signals;
    },
  },
];

// ─── 回测计算引擎 ──────────────────────────────────────────────────────────────

function runBacktest(candles: CandleData[], signals: BacktestSignal[]): BacktestResult {
  const trades: BacktestTrade[] = [];
  let buySignal: BacktestSignal | null = null;

  for (const sig of signals) {
    if (sig.type === "buy" && !buySignal) {
      buySignal = sig;
    } else if (sig.type === "sell" && buySignal) {
      const returnPct = ((sig.price - buySignal.price) / buySignal.price) * 100;
      const holdDays = Math.round((sig.time - buySignal.time) / 86400);
      trades.push({
        buyTime: buySignal.time,
        buyPrice: buySignal.price,
        sellTime: sig.time,
        sellPrice: sig.price,
        returnPct,
        holdDays,
        profit: returnPct > 0,
      });
      buySignal = null;
    }
  }

  if (trades.length === 0) {
    return {
      signals, trades: [], winRate: 0, totalReturn: 0, maxDrawdown: 0,
      avgHoldDays: 0, sharpeRatio: 0, equityCurve: [], totalTrades: 0,
      profitTrades: 0, lossTrades: 0, avgWin: 0, avgLoss: 0,
    };
  }

  const profitTrades = trades.filter((t) => t.profit).length;
  const lossTrades = trades.length - profitTrades;
  const winRate = (profitTrades / trades.length) * 100;
  const avgWin = profitTrades > 0
    ? trades.filter((t) => t.profit).reduce((a, t) => a + t.returnPct, 0) / profitTrades
    : 0;
  const avgLoss = lossTrades > 0
    ? trades.filter((t) => !t.profit).reduce((a, t) => a + t.returnPct, 0) / lossTrades
    : 0;

  // 复利总收益
  let equity = 100;
  const equityCurve: { time: number; value: number; date: string }[] = [
    { time: candles[0].time, value: 100, date: new Date(candles[0].time * 1000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) },
  ];

  for (const trade of trades) {
    equity *= (1 + trade.returnPct / 100);
    equityCurve.push({
      time: trade.sellTime,
      value: Math.round(equity * 100) / 100,
      date: new Date(trade.sellTime * 1000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
    });
  }

  const totalReturn = equity - 100;

  // 最大回撤
  let maxEquity = 100;
  let maxDrawdown = 0;
  for (const p of equityCurve) {
    if (p.value > maxEquity) maxEquity = p.value;
    const dd = (maxEquity - p.value) / maxEquity * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // 简化夏普比率
  const returns = trades.map((t) => t.returnPct / 100);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((a, b) => a + (b - avgReturn) ** 2, 0) / returns.length);
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252 / (trades.reduce((a, t) => a + t.holdDays, 0) / trades.length)) : 0;
  const avgHoldDays = trades.reduce((a, t) => a + t.holdDays, 0) / trades.length;

  return {
    signals, trades, winRate, totalReturn, maxDrawdown, avgHoldDays,
    sharpeRatio, equityCurve, totalTrades: trades.length, profitTrades, lossTrades, avgWin, avgLoss,
  };
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function Backtest() {
  const [symbol, setSymbol] = useState("600519.SS");
  const [inputSymbol, setInputSymbol] = useState("600519.SS");
  const [timeRange, setTimeRange] = useState<"1y" | "2y" | "5y">("1y");
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(STRATEGIES[0]);
  const [params, setParams] = useState<Record<string, number>>(
    Object.fromEntries(STRATEGIES[0].params.map((p) => [p.key, p.default]))
  );
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [currency, setCurrency] = useState("CNY");
  const [showTrades, setShowTrades] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载股票数据
  const loadCandles = useCallback(async (sym: string, range: "1y" | "2y" | "5y") => {
    setLoadingData(true);
    setResult(null);
    try {
      const data = await fetchStockChart(sym, range);
      setCandles(data.candles);
      setCurrency(data.meta.currency);
    } catch {
      setCandles([]);
    }
    setLoadingData(false);
  }, []);

  useEffect(() => {
    loadCandles(symbol, timeRange);
  }, [symbol, timeRange, loadCandles]);

  // 切换策略时重置参数
  const handleStrategyChange = (s: Strategy) => {
    setSelectedStrategy(s);
    setParams(Object.fromEntries(s.params.map((p) => [p.key, p.default])));
    setResult(null);
  };

  // 运行回测
  const handleRun = () => {
    if (candles.length < 60) return;
    setLoading(true);
    setTimeout(() => {
      const signals = selectedStrategy.run(candles, params);
      const r = runBacktest(candles, signals);
      setResult(r);
      setLoading(false);
    }, 300);
  };

  // 价格走势 + 信号标注数据
  const priceData = candles.map((c, i) => ({
    time: c.time,
    date: new Date(c.time * 1000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
    price: c.close,
    index: i,
  }));

  const buySignals = result?.signals.filter((s) => s.type === "buy") ?? [];
  const sellSignals = result?.signals.filter((s) => s.type === "sell") ?? [];

  const getScoreColor = (score: number) => {
    if (score >= 60) return "#E8728A";
    if (score >= 45) return "#9B7FD4";
    return "#52C4A0";
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF5F8 0%, #F8F4FF 50%, #F0FBF8 100%)" }}>
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
            历史回测
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8A8AA8" }}>
            选择技术指标策略，在历史数据上模拟交易，验证策略有效性
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：设置面板 */}
          <div className="flex flex-col gap-4">
            {/* 股票选择 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(155,127,212,0.12)",
                boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
              }}
            >
              <h3 className="font-bold mb-3" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                📊 选择股票
              </h3>
              <div className="flex gap-2 mb-3">
                <input
                  ref={inputRef}
                  value={inputSymbol}
                  onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") { setSymbol(inputSymbol); } }}
                  placeholder="如 AAPL 或 600519.SS"
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{
                    background: "rgba(155,127,212,0.06)",
                    border: "1px solid rgba(155,127,212,0.15)",
                    color: "#2D2D3A",
                  }}
                />
                <button
                  onClick={() => setSymbol(inputSymbol)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: "linear-gradient(135deg, #E8728A, #9B7FD4)" }}
                >
                  确认
                </button>
              </div>
              {/* 快捷选择 */}
              <div className="flex flex-wrap gap-1.5">
                {["600519.SS", "000858.SZ", "300750.SZ", "AAPL", "TSLA", "NVDA"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSymbol(s); setInputSymbol(s); }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: symbol === s ? "linear-gradient(135deg, #E8728A, #9B7FD4)" : "rgba(155,127,212,0.08)",
                      color: symbol === s ? "white" : "#5A5A7A",
                    }}
                  >
                    {s.replace(".SS", "").replace(".SZ", "")}
                  </button>
                ))}
              </div>

              {/* 时间范围 */}
              <div className="mt-3">
                <div className="text-xs font-medium mb-2" style={{ color: "#8A8AA8" }}>回测时间范围</div>
                <div className="flex gap-2">
                  {(["1y", "2y", "5y"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: timeRange === r ? "rgba(232,114,138,0.15)" : "rgba(155,127,212,0.06)",
                        color: timeRange === r ? "#E8728A" : "#5A5A7A",
                        border: `1px solid ${timeRange === r ? "rgba(232,114,138,0.3)" : "transparent"}`,
                      }}
                    >
                      {r === "1y" ? "1年" : r === "2y" ? "2年" : "5年"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 策略选择 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(155,127,212,0.12)",
                boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
              }}
            >
              <h3 className="font-bold mb-3" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                🎯 选择策略
              </h3>
              <div className="flex flex-col gap-2">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleStrategyChange(s)}
                    className="flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: selectedStrategy.id === s.id ? `${s.color}15` : "rgba(155,127,212,0.04)",
                      border: `1px solid ${selectedStrategy.id === s.id ? s.color + "40" : "transparent"}`,
                    }}
                  >
                    <span className="text-xl mt-0.5">{s.icon}</span>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "#2D2D3A" }}>{s.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#8A8AA8" }}>{s.theory}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 参数调整 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(155,127,212,0.12)",
                boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
              }}
            >
              <h3 className="font-bold mb-1" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                ⚙️ 参数设置
              </h3>
              <p className="text-xs mb-4" style={{ color: "#8A8AA8" }}>{selectedStrategy.description}</p>
              <div className="flex flex-col gap-4">
                {selectedStrategy.params.map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm" style={{ color: "#5A5A7A" }}>{p.label}</span>
                      <span className="text-sm font-bold" style={{ color: selectedStrategy.color, fontFamily: "'DM Sans', sans-serif" }}>
                        {params[p.key]}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[p.key]}
                      onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${selectedStrategy.color} 0%, ${selectedStrategy.color} ${((params[p.key] - p.min) / (p.max - p.min)) * 100}%, rgba(155,127,212,0.15) ${((params[p.key] - p.min) / (p.max - p.min)) * 100}%, rgba(155,127,212,0.15) 100%)`,
                      }}
                    />
                    <div className="flex justify-between mt-0.5 text-xs" style={{ color: "#C0C0D0" }}>
                      <span>{p.min}</span>
                      <span>{p.max}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 运行按钮 */}
              <button
                onClick={handleRun}
                disabled={loading || loadingData || candles.length < 60}
                className="w-full mt-5 py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{
                  background: loading || loadingData ? "rgba(155,127,212,0.3)" : `linear-gradient(135deg, ${selectedStrategy.color}, #9B7FD4)`,
                  boxShadow: loading || loadingData ? "none" : `0 4px 16px ${selectedStrategy.color}40`,
                }}
              >
                {loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />计算中...</>
                ) : loadingData ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />加载数据...</>
                ) : (
                  <><Play className="w-4 h-4" />开始回测</>
                )}
              </button>
            </div>
          </div>

          {/* 右侧：结果展示 */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* 价格走势图 + 信号标注 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(155,127,212,0.12)",
                boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                  价格走势 & 交易信号
                </h3>
                {result && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#E8728A" }} />买入
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#52C4A0" }} />卖出
                    </span>
                  </div>
                )}
              </div>

              {loadingData ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#E8728A", borderTopColor: "transparent" }} />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={priceData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9B7FD4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#9B7FD4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,127,212,0.08)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A8AA8" }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "#8A8AA8" }} domain={["auto", "auto"]} width={55} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(155,127,212,0.2)" }}>
                            <div style={{ color: "#8A8AA8" }}>{d.date}</div>
                            <div className="font-bold" style={{ color: "#2D2D3A" }}>{formatPrice(d.price, currency)}</div>
                          </div>
                        );
                      }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#9B7FD4" strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
                    {/* 买入信号线 */}
                    {buySignals.map((sig) => (
                      <ReferenceLine key={`buy-${sig.time}`} x={new Date(sig.time * 1000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} stroke="#E8728A" strokeDasharray="4 2" strokeWidth={1.5} />
                    ))}
                    {/* 卖出信号线 */}
                    {sellSignals.map((sig) => (
                      <ReferenceLine key={`sell-${sig.time}`} x={new Date(sig.time * 1000).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} stroke="#52C4A0" strokeDasharray="4 2" strokeWidth={1.5} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 回测结果 */}
            <AnimatePresence>
              {result && result.totalTrades > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col gap-4"
                >
                  {/* 核心指标卡片 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "策略胜率",
                        value: `${result.winRate.toFixed(1)}%`,
                        sub: `${result.profitTrades}盈/${result.lossTrades}亏`,
                        color: getScoreColor(result.winRate),
                        icon: <Target className="w-4 h-4" />,
                      },
                      {
                        label: "总收益率",
                        value: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(1)}%`,
                        sub: `${result.totalTrades} 笔交易`,
                        color: result.totalReturn >= 0 ? "#E8728A" : "#52C4A0",
                        icon: result.totalReturn >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
                      },
                      {
                        label: "最大回撤",
                        value: `-${result.maxDrawdown.toFixed(1)}%`,
                        sub: "历史最大亏损",
                        color: "#F4956A",
                        icon: <TrendingDown className="w-4 h-4" />,
                      },
                      {
                        label: "夏普比率",
                        value: result.sharpeRatio.toFixed(2),
                        sub: "风险调整收益",
                        color: "#9B7FD4",
                        icon: <Zap className="w-4 h-4" />,
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="rounded-2xl p-4"
                        style={{
                          background: "rgba(255,255,255,0.85)",
                          backdropFilter: "blur(16px)",
                          border: "1px solid rgba(155,127,212,0.12)",
                          boxShadow: "0 4px 16px rgba(155,127,212,0.06)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-2" style={{ color: card.color }}>
                          {card.icon}
                          <span className="text-xs">{card.label}</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ fontFamily: "'DM Sans', sans-serif", color: card.color }}>
                          {card.value}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "#8A8AA8" }}>{card.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* 资金曲线 */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(155,127,212,0.12)",
                      boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
                    }}
                  >
                    <h3 className="font-bold mb-4" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                      资金曲线（初始 100）
                    </h3>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={result.equityCurve}>
                        <defs>
                          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E8728A" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#E8728A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,127,212,0.08)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A8AA8" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: "#8A8AA8" }} domain={["auto", "auto"]} width={45} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(155,127,212,0.2)" }}>
                                <div style={{ color: "#8A8AA8" }}>{d.date}</div>
                                <div className="font-bold" style={{ color: d.value >= 100 ? "#E8728A" : "#52C4A0" }}>
                                  {d.value.toFixed(1)} ({d.value >= 100 ? "+" : ""}{(d.value - 100).toFixed(1)}%)
                                </div>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine y={100} stroke="rgba(155,127,212,0.3)" strokeDasharray="4 2" />
                        <Area type="monotone" dataKey="value" stroke="#E8728A" strokeWidth={2} fill="url(#equityGrad)" dot={{ fill: "#E8728A", r: 3 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 每笔交易收益分布 */}
                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(155,127,212,0.12)",
                      boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                        每笔交易收益
                      </h3>
                      <div className="flex gap-4 text-xs">
                        <span style={{ color: "#E8728A" }}>平均盈利：+{result.avgWin.toFixed(2)}%</span>
                        <span style={{ color: "#52C4A0" }}>平均亏损：{result.avgLoss.toFixed(2)}%</span>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={result.trades.map((t, i) => ({ name: `#${i + 1}`, value: t.returnPct, profit: t.profit }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,127,212,0.08)" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#8A8AA8" }} />
                        <YAxis tick={{ fontSize: 9, fill: "#8A8AA8" }} width={35} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-xl px-3 py-2 text-xs shadow-lg" style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(155,127,212,0.2)" }}>
                                <div className="font-bold" style={{ color: d.profit ? "#E8728A" : "#52C4A0" }}>
                                  {d.value >= 0 ? "+" : ""}{d.value.toFixed(2)}%
                                </div>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine y={0} stroke="rgba(155,127,212,0.3)" />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                          {result.trades.map((t, i) => (
                            <Cell key={i} fill={t.profit ? "#E8728A" : "#52C4A0"} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 交易明细（可折叠） */}
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(155,127,212,0.12)",
                      boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
                    }}
                  >
                    <button
                      onClick={() => setShowTrades(!showTrades)}
                      className="w-full flex items-center justify-between p-5"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" style={{ color: "#9B7FD4" }} />
                        <span className="font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                          交易明细（{result.totalTrades} 笔）
                        </span>
                      </div>
                      {showTrades ? <ChevronUp className="w-4 h-4" style={{ color: "#8A8AA8" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#8A8AA8" }} />}
                    </button>
                    <AnimatePresence>
                      {showTrades && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr style={{ borderBottom: "1px solid rgba(155,127,212,0.1)" }}>
                                    {["#", "买入日期", "买入价", "卖出日期", "卖出价", "收益率", "持有天数"].map((h) => (
                                      <th key={h} className="py-2 px-2 text-left font-medium" style={{ color: "#8A8AA8" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.trades.map((t, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid rgba(155,127,212,0.05)" }}>
                                      <td className="py-2 px-2" style={{ color: "#8A8AA8" }}>{i + 1}</td>
                                      <td className="py-2 px-2" style={{ color: "#5A5A7A" }}>{new Date(t.buyTime * 1000).toLocaleDateString("zh-CN")}</td>
                                      <td className="py-2 px-2" style={{ color: "#5A5A7A", fontFamily: "'DM Sans', sans-serif" }}>{formatPrice(t.buyPrice, currency)}</td>
                                      <td className="py-2 px-2" style={{ color: "#5A5A7A" }}>{new Date(t.sellTime * 1000).toLocaleDateString("zh-CN")}</td>
                                      <td className="py-2 px-2" style={{ color: "#5A5A7A", fontFamily: "'DM Sans', sans-serif" }}>{formatPrice(t.sellPrice, currency)}</td>
                                      <td className="py-2 px-2 font-bold" style={{ color: t.profit ? "#E8728A" : "#52C4A0", fontFamily: "'DM Sans', sans-serif" }}>
                                        {t.returnPct >= 0 ? "+" : ""}{t.returnPct.toFixed(2)}%
                                      </td>
                                      <td className="py-2 px-2" style={{ color: "#5A5A7A" }}>{t.holdDays}天</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 策略说明 */}
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgba(155,127,212,0.04)",
                      border: "1px solid rgba(155,127,212,0.1)",
                    }}
                  >
                    <div className="flex items-start gap-2 text-xs" style={{ color: "#8A8AA8" }}>
                      <span className="text-base mt-0.5">📚</span>
                      <div>
                        <span className="font-semibold" style={{ color: "#9B7FD4" }}>{selectedStrategy.theory}</span>
                        <span className="mx-1">·</span>
                        {selectedStrategy.description}
                        <span className="ml-2 text-xs" style={{ color: "#C0C0D0" }}>⚠️ 回测结果仅供参考，不构成投资建议，历史表现不代表未来收益。</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 空状态 */}
            {!result && !loading && !loadingData && (
              <div
                className="rounded-2xl p-12 flex flex-col items-center justify-center text-center"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  border: "2px dashed rgba(155,127,212,0.2)",
                }}
              >
                <div className="text-5xl mb-4">🌸</div>
                <div className="font-semibold mb-2" style={{ fontFamily: "'Noto Serif SC', serif", color: "#5A5A7A" }}>
                  选择策略，点击「开始回测」
                </div>
                <div className="text-sm" style={{ color: "#8A8AA8" }}>
                  系统将在历史数据上模拟交易，计算胜率与收益曲线
                </div>
              </div>
            )}

            {result && result.totalTrades === 0 && (
              <div
                className="rounded-2xl p-10 flex flex-col items-center justify-center text-center"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  border: "2px dashed rgba(155,127,212,0.2)",
                }}
              >
                <div className="text-4xl mb-3">🔍</div>
                <div className="font-semibold mb-1" style={{ color: "#5A5A7A" }}>未找到有效交易信号</div>
                <div className="text-sm" style={{ color: "#8A8AA8" }}>
                  当前参数下策略未产生完整的买卖配对，请尝试调整参数或更换时间范围
                </div>
                <button
                  onClick={() => { setParams(Object.fromEntries(selectedStrategy.params.map((p) => [p.key, p.default]))); }}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
                  style={{ background: "rgba(155,127,212,0.1)", color: "#9B7FD4" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />重置为默认参数
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
