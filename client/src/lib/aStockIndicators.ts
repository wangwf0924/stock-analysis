/**
 * 股识 StockWise — A 股专属指标库
 * 包含：涨跌停板、北向资金流向（模拟）、龙虎榜、换手率、市盈率分位等
 */

import type { CandleData } from "./stockApi";

// ─────────────────────────────────────────────
// 涨跌停板计算
// ─────────────────────────────────────────────

export interface LimitInfo {
  limitUpPrice: number;    // 涨停价
  limitDownPrice: number;  // 跌停价
  limitUpPct: number;      // 涨停幅度（%）
  limitDownPct: number;    // 跌停幅度（%）
  isLimitUp: boolean;      // 今日是否涨停
  isLimitDown: boolean;    // 今日是否跌停
  isNearLimitUp: boolean;  // 接近涨停（>8%）
  isNearLimitDown: boolean;// 接近跌停（<-8%）
  status: "limit_up" | "near_limit_up" | "normal" | "near_limit_down" | "limit_down";
  statusLabel: string;
  statusColor: string;
  boardType: "main" | "star" | "gem"; // 主板/科创板/创业板
}

/**
 * 判断股票所属板块，决定涨跌停幅度
 * 主板：±10%；科创板/创业板：±20%
 */
export function getBoardType(symbol: string): "main" | "star" | "gem" {
  const code = symbol.replace(/\.(SS|SZ)$/, "");
  if (code.startsWith("688")) return "star"; // 科创板
  if (code.startsWith("300") || code.startsWith("301")) return "gem"; // 创业板
  return "main"; // 主板
}

export function calcLimitInfo(
  symbol: string,
  currentPrice: number,
  previousClose: number,
  changePercent: number
): LimitInfo {
  const boardType = getBoardType(symbol);
  const limitPct = boardType === "main" ? 10 : 20;

  const limitUpPrice = Math.round(previousClose * (1 + limitPct / 100) * 100) / 100;
  const limitDownPrice = Math.round(previousClose * (1 - limitPct / 100) * 100) / 100;

  const isLimitUp = changePercent >= limitPct - 0.05;
  const isLimitDown = changePercent <= -(limitPct - 0.05);
  const isNearLimitUp = !isLimitUp && changePercent >= limitPct * 0.8;
  const isNearLimitDown = !isLimitDown && changePercent <= -(limitPct * 0.8);

  let status: LimitInfo["status"] = "normal";
  let statusLabel = "正常交易";
  let statusColor = "#9B9BB8";

  if (isLimitUp) { status = "limit_up"; statusLabel = "涨停"; statusColor = "#E8728A"; }
  else if (isNearLimitUp) { status = "near_limit_up"; statusLabel = "接近涨停"; statusColor = "#F4956A"; }
  else if (isLimitDown) { status = "limit_down"; statusLabel = "跌停"; statusColor = "#52C4A0"; }
  else if (isNearLimitDown) { status = "near_limit_down"; statusLabel = "接近跌停"; statusColor = "#3AA880"; }

  return {
    limitUpPrice,
    limitDownPrice,
    limitUpPct: limitPct,
    limitDownPct: limitPct,
    isLimitUp,
    isLimitDown,
    isNearLimitUp,
    isNearLimitDown,
    status,
    statusLabel,
    statusColor,
    boardType,
  };
}

// ─────────────────────────────────────────────
// 换手率计算
// ─────────────────────────────────────────────

export interface TurnoverInfo {
  turnoverRate: number;       // 当日换手率（%）
  avgTurnover5d: number;      // 5日平均换手率
  avgTurnover20d: number;     // 20日平均换手率
  turnoverLevel: "very_low" | "low" | "normal" | "high" | "very_high";
  turnoverLabel: string;
  description: string;
}

/**
 * 估算换手率（需要流通股本，此处用成交量/估算流通股本）
 * 实际应用中需要从 API 获取真实流通股本
 */
export function calcTurnoverRate(candles: CandleData[], floatShares?: number): TurnoverInfo {
  if (candles.length === 0) {
    return { turnoverRate: 0, avgTurnover5d: 0, avgTurnover20d: 0, turnoverLevel: "normal", turnoverLabel: "正常", description: "数据不足" };
  }

  // 如果没有流通股本，用成交量的相对变化来估算
  const lastCandle = candles[candles.length - 1];
  const avgVolume20d = candles.slice(-20).reduce((s, c) => s + c.volume, 0) / Math.min(candles.length, 20);

  // 相对换手率（当日成交量 / 20日平均成交量）
  const relativeVolume = lastCandle.volume / avgVolume20d;

  // 如果有流通股本，计算真实换手率
  let turnoverRate: number;
  if (floatShares && floatShares > 0) {
    turnoverRate = (lastCandle.volume / floatShares) * 100;
  } else {
    // 估算：假设平均换手率约 1-3%，用相对成交量推算
    turnoverRate = relativeVolume * 2.0;
  }

  const recent5 = candles.slice(-5).map((c) => c.volume / avgVolume20d * 2.0);
  const recent20 = candles.slice(-20).map((c) => c.volume / avgVolume20d * 2.0);
  const avgTurnover5d = recent5.reduce((a, b) => a + b, 0) / recent5.length;
  const avgTurnover20d = recent20.reduce((a, b) => a + b, 0) / recent20.length;

  let turnoverLevel: TurnoverInfo["turnoverLevel"] = "normal";
  let turnoverLabel = "正常";
  let description = "换手率处于正常水平，市场活跃度适中";

  if (turnoverRate < 0.5) { turnoverLevel = "very_low"; turnoverLabel = "极低"; description = "换手率极低，市场交投清淡，流动性不足"; }
  else if (turnoverRate < 1.5) { turnoverLevel = "low"; turnoverLabel = "偏低"; description = "换手率偏低，市场观望情绪较浓"; }
  else if (turnoverRate < 5) { turnoverLevel = "normal"; turnoverLabel = "正常"; description = "换手率处于正常水平，市场活跃度适中"; }
  else if (turnoverRate < 10) { turnoverLevel = "high"; turnoverLabel = "偏高"; description = "换手率偏高，市场交投活跃，需关注主力动向"; }
  else { turnoverLevel = "very_high"; turnoverLabel = "极高"; description = "换手率极高，可能出现主力出货或大幅波动"; }

  return {
    turnoverRate: Math.round(turnoverRate * 100) / 100,
    avgTurnover5d: Math.round(avgTurnover5d * 100) / 100,
    avgTurnover20d: Math.round(avgTurnover20d * 100) / 100,
    turnoverLevel,
    turnoverLabel,
    description,
  };
}

// ─────────────────────────────────────────────
// 北向资金流向（模拟数据）
// ─────────────────────────────────────────────

export interface NorthboundFlow {
  date: string;
  netFlow: number;      // 净流入（亿元），正为流入，负为流出
  buyAmount: number;    // 买入金额（亿元）
  sellAmount: number;   // 卖出金额（亿元）
  cumulative: number;   // 累计净流入（亿元）
}

export interface NorthboundSummary {
  todayFlow: number;          // 今日净流入（亿元）
  flow5d: number;             // 5日累计净流入
  flow20d: number;            // 20日累计净流入
  trend: "inflow" | "outflow" | "neutral";
  trendLabel: string;
  trendColor: string;
  description: string;
  dailyData: NorthboundFlow[];
}

/**
 * 生成北向资金模拟数据
 * 注意：真实数据需要接入专业金融数据接口
 */
export function generateNorthboundFlow(candles: CandleData[]): NorthboundSummary {
  const days = Math.min(candles.length, 30);
  const dailyData: NorthboundFlow[] = [];
  let cumulative = 0;

  // 基于股价走势生成相关的资金流向（正相关但有噪声）
  for (let i = candles.length - days; i < candles.length; i++) {
    const candle = candles[i];
    const priceChange = i > 0 ? (candle.close - candles[i - 1].close) / candles[i - 1].close : 0;

    // 北向资金与价格有一定正相关性
    const baseFlow = priceChange * 100 + (Math.random() - 0.45) * 8;
    const netFlow = Math.round(baseFlow * 10) / 10;
    const buyAmount = Math.abs(netFlow) + Math.random() * 20 + 10;
    const sellAmount = buyAmount - netFlow;
    cumulative += netFlow;

    const date = new Date(candle.time * 1000);
    dailyData.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      netFlow,
      buyAmount: Math.round(buyAmount * 10) / 10,
      sellAmount: Math.round(sellAmount * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10,
    });
  }

  const todayFlow = dailyData[dailyData.length - 1]?.netFlow ?? 0;
  const flow5d = dailyData.slice(-5).reduce((s, d) => s + d.netFlow, 0);
  const flow20d = dailyData.slice(-20).reduce((s, d) => s + d.netFlow, 0);

  let trend: NorthboundSummary["trend"] = "neutral";
  let trendLabel = "中性";
  let trendColor = "#9B7FD4";
  let description = "北向资金近期流向较为平稳，无明显方向性";

  if (flow5d > 5) {
    trend = "inflow"; trendLabel = "持续流入"; trendColor = "#E8728A";
    description = `近5日北向资金累计净流入 ${flow5d.toFixed(1)} 亿元，外资对该股保持积极态度`;
  } else if (flow5d < -5) {
    trend = "outflow"; trendLabel = "持续流出"; trendColor = "#52C4A0";
    description = `近5日北向资金累计净流出 ${Math.abs(flow5d).toFixed(1)} 亿元，外资近期有所减持`;
  }

  return {
    todayFlow: Math.round(todayFlow * 10) / 10,
    flow5d: Math.round(flow5d * 10) / 10,
    flow20d: Math.round(flow20d * 10) / 10,
    trend,
    trendLabel,
    trendColor,
    description,
    dailyData,
  };
}

// ─────────────────────────────────────────────
// 龙虎榜（模拟数据）
// ─────────────────────────────────────────────

export interface DragonTigerEntry {
  rank: number;
  institution: string;
  buyAmount: number;   // 亿元
  sellAmount: number;  // 亿元
  netAmount: number;   // 净买入（亿元）
  type: "buy" | "sell" | "neutral";
}

export interface DragonTigerData {
  date: string;
  reason: string;
  totalBuy: number;
  totalSell: number;
  netBuy: number;
  entries: DragonTigerEntry[];
  hasData: boolean;
}

const INSTITUTIONS = [
  "华泰证券上海分公司", "中信证券深圳分公司", "国泰君安上海分公司",
  "招商证券深圳分公司", "广发证券广州分公司", "机构专用", "沪股通",
  "深股通", "中金公司北京分公司", "申万宏源上海分公司",
];

export function generateDragonTigerData(candles: CandleData[], changePercent: number): DragonTigerData {
  // 只有涨跌幅超过7%才可能上龙虎榜
  const hasData = Math.abs(changePercent) >= 7 || Math.random() > 0.7;

  if (!hasData) {
    return { date: "暂无数据", reason: "", totalBuy: 0, totalSell: 0, netBuy: 0, entries: [], hasData: false };
  }

  const reason = changePercent >= 7 ? "涨幅偏离值达7%" : changePercent <= -7 ? "跌幅偏离值达7%" : "成交量异常";
  const entries: DragonTigerEntry[] = [];
  let totalBuy = 0;
  let totalSell = 0;

  const shuffled = [...INSTITUTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
  shuffled.forEach((inst, i) => {
    const buyAmount = Math.round((Math.random() * 3 + 0.5) * 10) / 10;
    const sellAmount = Math.round((Math.random() * 2 + 0.2) * 10) / 10;
    const netAmount = Math.round((buyAmount - sellAmount) * 10) / 10;
    totalBuy += buyAmount;
    totalSell += sellAmount;
    entries.push({
      rank: i + 1,
      institution: inst,
      buyAmount,
      sellAmount,
      netAmount,
      type: netAmount > 0.3 ? "buy" : netAmount < -0.3 ? "sell" : "neutral",
    });
  });

  entries.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));

  const today = new Date();
  return {
    date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    reason,
    totalBuy: Math.round(totalBuy * 10) / 10,
    totalSell: Math.round(totalSell * 10) / 10,
    netBuy: Math.round((totalBuy - totalSell) * 10) / 10,
    entries,
    hasData: true,
  };
}

// ─────────────────────────────────────────────
// 资金流向分析（主力/散户）
// ─────────────────────────────────────────────

export interface MoneyFlowData {
  mainForce: number;      // 主力净流入（万元）
  retailFlow: number;     // 散户净流入（万元）
  superLarge: number;     // 超大单净流入
  large: number;          // 大单净流入
  medium: number;         // 中单净流入
  small: number;          // 小单净流入
  mainForceRatio: number; // 主力占比（%）
  trend: "strong_in" | "in" | "neutral" | "out" | "strong_out";
  trendLabel: string;
  trendColor: string;
}

export function calcMoneyFlow(candles: CandleData[]): MoneyFlowData {
  if (candles.length === 0) {
    return { mainForce: 0, retailFlow: 0, superLarge: 0, large: 0, medium: 0, small: 0, mainForceRatio: 50, trend: "neutral", trendLabel: "中性", trendColor: "#9B7FD4" };
  }

  const lastCandle = candles[candles.length - 1];
  const priceChange = candles.length > 1
    ? (lastCandle.close - candles[candles.length - 2].close) / candles[candles.length - 2].close
    : 0;

  const totalAmount = lastCandle.volume * lastCandle.close / 10000; // 万元

  // 模拟资金流向分布（基于价格变化）
  const mainRatio = 0.35 + priceChange * 2 + (Math.random() - 0.5) * 0.2;
  const superLargeRatio = mainRatio * 0.4;
  const largeRatio = mainRatio * 0.6;
  const mediumRatio = 0.3 + (Math.random() - 0.5) * 0.1;
  const smallRatio = 1 - mainRatio - mediumRatio;

  const superLarge = Math.round(totalAmount * superLargeRatio * (priceChange > 0 ? 1 : -1));
  const large = Math.round(totalAmount * largeRatio * (priceChange > 0 ? 0.8 : -0.8));
  const medium = Math.round(totalAmount * mediumRatio * (Math.random() > 0.5 ? 1 : -1) * 0.3);
  const small = Math.round(totalAmount * Math.abs(smallRatio) * (priceChange > 0 ? -0.5 : 0.5));

  const mainForce = superLarge + large;
  const retailFlow = medium + small;
  const mainForceRatio = Math.round(Math.abs(mainForce) / totalAmount * 100);

  let trend: MoneyFlowData["trend"] = "neutral";
  let trendLabel = "中性";
  let trendColor = "#9B7FD4";

  if (mainForce > totalAmount * 0.15) { trend = "strong_in"; trendLabel = "主力大幅流入"; trendColor = "#E8728A"; }
  else if (mainForce > totalAmount * 0.05) { trend = "in"; trendLabel = "主力净流入"; trendColor = "#F4956A"; }
  else if (mainForce < -totalAmount * 0.15) { trend = "strong_out"; trendLabel = "主力大幅流出"; trendColor = "#3AA880"; }
  else if (mainForce < -totalAmount * 0.05) { trend = "out"; trendLabel = "主力净流出"; trendColor = "#52C4A0"; }

  return { mainForce, retailFlow, superLarge, large, medium, small, mainForceRatio, trend, trendLabel, trendColor };
}
