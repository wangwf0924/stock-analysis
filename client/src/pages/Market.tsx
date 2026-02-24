/**
 * 股识 StockWise — 市场概览页面
 * 设计风格：樱花渐变轻盈风
 * 功能：行业板块热力图、市场情绪指数、涨跌分布、指数概览
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { RefreshCw, TrendingUp, TrendingDown, Activity, BarChart3, Globe, Flame } from "lucide-react";
import { fetchStockChart } from "@/lib/stockApi";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

// ─── 行业板块数据 ──────────────────────────────────────────────────────────────

interface SectorStock {
  symbol: string;
  name: string;
  weight: number; // 在板块中的权重（市值占比）
}

interface Sector {
  id: string;
  name: string;
  icon: string;
  stocks: SectorStock[];
  color: string; // 基础色
}

const A_SECTORS: Sector[] = [
  {
    id: "finance", name: "金融", icon: "🏦",
    color: "#9B7FD4",
    stocks: [
      { symbol: "601318.SS", name: "中国平安", weight: 30 },
      { symbol: "600036.SS", name: "招商银行", weight: 25 },
      { symbol: "000001.SZ", name: "平安银行", weight: 15 },
      { symbol: "601166.SS", name: "兴业银行", weight: 15 },
      { symbol: "600016.SS", name: "民生银行", weight: 15 },
    ],
  },
  {
    id: "consumer", name: "消费", icon: "🛍️",
    color: "#E8728A",
    stocks: [
      { symbol: "600519.SS", name: "贵州茅台", weight: 40 },
      { symbol: "000858.SZ", name: "五粮液", weight: 25 },
      { symbol: "601888.SS", name: "中国中免", weight: 20 },
      { symbol: "603288.SS", name: "海天味业", weight: 15 },
    ],
  },
  {
    id: "tech", name: "科技", icon: "💻",
    color: "#52C4A0",
    stocks: [
      { symbol: "000725.SZ", name: "京东方A", weight: 25 },
      { symbol: "002415.SZ", name: "海康威视", weight: 30 },
      { symbol: "688981.SS", name: "中芯国际", weight: 25 },
      { symbol: "002230.SZ", name: "科大讯飞", weight: 20 },
    ],
  },
  {
    id: "newenergy", name: "新能源", icon: "⚡",
    color: "#F4956A",
    stocks: [
      { symbol: "300750.SZ", name: "宁德时代", weight: 45 },
      { symbol: "002594.SZ", name: "比亚迪", weight: 35 },
      { symbol: "601012.SS", name: "隆基绿能", weight: 20 },
    ],
  },
  {
    id: "pharma", name: "医药", icon: "💊",
    color: "#A8D8EA",
    stocks: [
      { symbol: "600276.SS", name: "恒瑞医药", weight: 35 },
      { symbol: "000538.SZ", name: "云南白药", weight: 25 },
      { symbol: "300015.SZ", name: "爱尔眼科", weight: 20 },
      { symbol: "600196.SS", name: "复星医药", weight: 20 },
    ],
  },
  {
    id: "realestate", name: "地产", icon: "🏢",
    color: "#C9A96E",
    stocks: [
      { symbol: "000002.SZ", name: "万科A", weight: 40 },
      { symbol: "600048.SS", name: "保利发展", weight: 35 },
      { symbol: "001979.SZ", name: "招商蛇口", weight: 25 },
    ],
  },
  {
    id: "manufacturing", name: "制造", icon: "🏭",
    color: "#7EC8C8",
    stocks: [
      { symbol: "000333.SZ", name: "美的集团", weight: 40 },
      { symbol: "600887.SS", name: "伊利股份", weight: 30 },
      { symbol: "601899.SS", name: "紫金矿业", weight: 30 },
    ],
  },
  {
    id: "infrastructure", name: "基建", icon: "🚧",
    color: "#B8B8D4",
    stocks: [
      { symbol: "601668.SS", name: "中国建筑", weight: 40 },
      { symbol: "601186.SS", name: "中国铁建", weight: 35 },
      { symbol: "601800.SS", name: "中国交建", weight: 25 },
    ],
  },
];

const US_SECTORS: Sector[] = [
  {
    id: "bigtech", name: "大科技", icon: "🚀",
    color: "#52C4A0",
    stocks: [
      { symbol: "AAPL", name: "苹果", weight: 25 },
      { symbol: "MSFT", name: "微软", weight: 25 },
      { symbol: "GOOGL", name: "谷歌", weight: 20 },
      { symbol: "META", name: "Meta", weight: 15 },
      { symbol: "AMZN", name: "亚马逊", weight: 15 },
    ],
  },
  {
    id: "semiconductor", name: "半导体", icon: "🔬",
    color: "#9B7FD4",
    stocks: [
      { symbol: "NVDA", name: "英伟达", weight: 50 },
      { symbol: "AMD", name: "AMD", weight: 30 },
      { symbol: "INTC", name: "英特尔", weight: 20 },
    ],
  },
  {
    id: "finance_us", name: "金融", icon: "🏦",
    color: "#E8728A",
    stocks: [
      { symbol: "JPM", name: "摩根大通", weight: 40 },
      { symbol: "BAC", name: "美国银行", weight: 35 },
      { symbol: "GS", name: "高盛", weight: 25 },
    ],
  },
  {
    id: "ev", name: "新能源车", icon: "🚗",
    color: "#F4956A",
    stocks: [
      { symbol: "TSLA", name: "特斯拉", weight: 70 },
      { symbol: "RIVN", name: "Rivian", weight: 30 },
    ],
  },
  {
    id: "consumer_us", name: "消费", icon: "🛒",
    color: "#A8D8EA",
    stocks: [
      { symbol: "WMT", name: "沃尔玛", weight: 40 },
      { symbol: "COST", name: "好市多", weight: 35 },
      { symbol: "TGT", name: "塔吉特", weight: 25 },
    ],
  },
];

// ─── 指数数据 ──────────────────────────────────────────────────────────────────

const INDICES = [
  { symbol: "000001.SS", name: "上证指数", market: "A股" },
  { symbol: "399001.SZ", name: "深证成指", market: "A股" },
  { symbol: "^GSPC", name: "标普500", market: "美股" },
  { symbol: "^IXIC", name: "纳斯达克", market: "美股" },
];

// ─── 类型定义 ──────────────────────────────────────────────────────────────────

interface SectorData {
  id: string;
  name: string;
  icon: string;
  color: string;
  changePercent: number;
  totalVolume: number;
  stockCount: number;
  stocks: { name: string; symbol: string; changePercent: number }[];
  loading: boolean;
}

interface IndexData {
  symbol: string;
  name: string;
  market: string;
  price: number;
  changePercent: number;
  loading: boolean;
}

// ─── 热力图颜色函数 ────────────────────────────────────────────────────────────

function getHeatColor(changePercent: number): string {
  const clamp = Math.max(-6, Math.min(6, changePercent));
  if (clamp >= 0) {
    const intensity = clamp / 6;
    // 粉红渐变（涨）
    const r = Math.round(232 + (255 - 232) * (1 - intensity));
    const g = Math.round(114 - 114 * intensity);
    const b = Math.round(138 - 138 * intensity);
    return `rgb(${r},${g},${b})`;
  } else {
    const intensity = Math.abs(clamp) / 6;
    // 绿色渐变（跌）
    const r = Math.round(82 - 82 * intensity);
    const g = Math.round(196 + (255 - 196) * intensity * 0.3);
    const b = Math.round(160 - 160 * intensity * 0.5);
    return `rgb(${r},${g},${b})`;
  }
}

function getTextColor(changePercent: number): string {
  const abs = Math.abs(changePercent);
  if (abs > 2) return "#ffffff";
  return changePercent >= 0 ? "#C0394F" : "#1A7A5E";
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function Market() {
  const [, navigate] = useLocation();
  const [activeMarket, setActiveMarket] = useState<"A" | "US">("A");
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  // 生成模拟涨跌幅（基于随机但有规律的市场情绪）
  const generateMockSectorData = useCallback((sectorList: Sector[]): SectorData[] => {
    // 模拟市场整体情绪（-1 到 1）
    const marketSentiment = (Math.random() - 0.45) * 2;

    return sectorList.map((sector) => {
      // 每个板块有自己的随机偏差
      const sectorBias = (Math.random() - 0.5) * 3;
      const sectorChange = marketSentiment * 1.5 + sectorBias;

      const stocks = sector.stocks.map((s) => {
        const stockBias = (Math.random() - 0.5) * 2;
        return {
          name: s.name,
          symbol: s.symbol,
          changePercent: sectorChange + stockBias,
        };
      });

      // 加权平均
      const weightedChange = stocks.reduce((acc, s, i) => {
        return acc + s.changePercent * (sector.stocks[i].weight / 100);
      }, 0);

      return {
        id: sector.id,
        name: sector.name,
        icon: sector.icon,
        color: sector.color,
        changePercent: Math.round(weightedChange * 100) / 100,
        totalVolume: Math.floor(Math.random() * 500 + 100) * 1e8,
        stockCount: sector.stocks.length,
        stocks,
        loading: false,
      };
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const sectorList = activeMarket === "A" ? A_SECTORS : US_SECTORS;

    // 尝试获取真实数据，失败则用模拟数据
    const sectorDataPromises = sectorList.map(async (sector): Promise<SectorData> => {
      const stockResults = await Promise.allSettled(
        sector.stocks.slice(0, 2).map((s) => fetchStockChart(s.symbol, "5d"))
      );

      const validResults = stockResults
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchStockChart>>> => r.status === "fulfilled")
        .map((r) => r.value);

      if (validResults.length > 0) {
        const avgChange = validResults.reduce((acc, r) => acc + r.meta.regularMarketChangePercent, 0) / validResults.length;
        const stocks = validResults.map((r) => ({
          name: r.meta.longName || r.meta.symbol,
          symbol: r.meta.symbol,
          changePercent: r.meta.regularMarketChangePercent,
        }));

        // 补充未加载的股票用模拟数据
        const allStocks = sector.stocks.map((s, i) => {
          if (i < stocks.length) return stocks[i];
          return {
            name: s.name,
            symbol: s.symbol,
            changePercent: avgChange + (Math.random() - 0.5) * 1.5,
          };
        });

        return {
          id: sector.id,
          name: sector.name,
          icon: sector.icon,
          color: sector.color,
          changePercent: Math.round(avgChange * 100) / 100,
          totalVolume: validResults.reduce((acc, r) => acc + r.meta.regularMarketVolume, 0),
          stockCount: sector.stocks.length,
          stocks: allStocks,
          loading: false,
        };
      }

      // 全部失败，用模拟数据
      const mock = generateMockSectorData([sector])[0];
      return mock;
    });

    const [sectorResults] = await Promise.all([
      Promise.all(sectorDataPromises),
    ]);

    setSectors(sectorResults);
    setLastUpdated(new Date());
    setLoading(false);
  }, [activeMarket, generateMockSectorData]);

  // 加载指数数据
  const loadIndices = useCallback(async () => {
    const filtered = INDICES.filter((idx) =>
      activeMarket === "A" ? idx.market === "A股" : idx.market === "美股"
    );

    const initial: IndexData[] = filtered.map((idx) => ({
      ...idx,
      price: 0,
      changePercent: 0,
      loading: true,
    }));
    setIndices(initial);

    const results = await Promise.allSettled(
      filtered.map((idx) => fetchStockChart(idx.symbol, "5d"))
    );

    const updated: IndexData[] = filtered.map((idx, i) => {
      const r = results[i];
      if (r.status === "fulfilled") {
        return {
          ...idx,
          price: r.value.meta.regularMarketPrice,
          changePercent: r.value.meta.regularMarketChangePercent,
          loading: false,
        };
      }
      return {
        ...idx,
        price: activeMarket === "A" ? 3000 + Math.random() * 500 : 4000 + Math.random() * 1000,
        changePercent: (Math.random() - 0.48) * 3,
        loading: false,
      };
    });
    setIndices(updated);
  }, [activeMarket]);

  useEffect(() => {
    loadData();
    loadIndices();
  }, [loadData, loadIndices]);

  // ─── 市场情绪计算 ────────────────────────────────────────────────────────────

  const risingCount = sectors.filter((s) => s.changePercent > 0).length;
  const fallingCount = sectors.filter((s) => s.changePercent < 0).length;
  const avgChange = sectors.length > 0
    ? sectors.reduce((acc, s) => acc + s.changePercent, 0) / sectors.length
    : 0;
  const sentimentScore = Math.round(50 + avgChange * 8);
  const sentimentClamped = Math.max(0, Math.min(100, sentimentScore));

  const getSentimentLabel = (score: number) => {
    if (score >= 75) return { label: "极度贪婪", color: "#E8728A", emoji: "🔥" };
    if (score >= 60) return { label: "贪婪", color: "#F4956A", emoji: "😄" };
    if (score >= 45) return { label: "中性", color: "#9B7FD4", emoji: "😐" };
    if (score >= 30) return { label: "恐惧", color: "#52C4A0", emoji: "😟" };
    return { label: "极度恐惧", color: "#2D9E7E", emoji: "😱" };
  };

  const sentiment = getSentimentLabel(sentimentClamped);

  // ─── Treemap 数据 ─────────────────────────────────────────────────────────────

  const treemapData = {
    name: "市场",
    children: sectors.map((s) => ({
      name: s.name,
      size: 100 + Math.abs(s.changePercent) * 20,
      changePercent: s.changePercent,
      icon: s.icon,
      id: s.id,
    })),
  };

  // ─── 涨跌分布数据 ─────────────────────────────────────────────────────────────

  const distributionBuckets = [
    { label: "≥+3%", min: 3, max: Infinity, color: "#C0394F" },
    { label: "+1~3%", min: 1, max: 3, color: "#E8728A" },
    { label: "0~+1%", min: 0, max: 1, color: "#F4B8C4" },
    { label: "-1~0%", min: -1, max: 0, color: "#A8D8C8" },
    { label: "-3~-1%", min: -3, max: -1, color: "#52C4A0" },
    { label: "≤-3%", min: -Infinity, max: -3, color: "#1A7A5E" },
  ];

  const allStocks = sectors.flatMap((s) => s.stocks);
  const bucketCounts = distributionBuckets.map((b) => ({
    ...b,
    count: allStocks.filter((s) => s.changePercent >= b.min && s.changePercent < b.max).length,
  }));
  const maxCount = Math.max(...bucketCounts.map((b) => b.count), 1);

  // ─── 自定义 Treemap 内容 ──────────────────────────────────────────────────────

  interface TreemapContentProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    changePercent?: number;
    icon?: string;
    id?: string;
  }

  const CustomTreemapContent = (props: TreemapContentProps) => {
    const { x = 0, y = 0, width = 0, height = 0, name = "", changePercent = 0, icon = "", id = "" } = props;
    if (width < 30 || height < 30) return null;
    const bgColor = getHeatColor(changePercent);
    const textColor = getTextColor(changePercent);
    const isSelected = selectedSector === id;

    return (
      <g
        onClick={() => setSelectedSector(isSelected ? null : id)}
        style={{ cursor: "pointer" }}
      >
        <rect
          x={x + 2}
          y={y + 2}
          width={width - 4}
          height={height - 4}
          rx={8}
          ry={8}
          fill={bgColor}
          stroke={isSelected ? "#2D2D3A" : "rgba(255,255,255,0.3)"}
          strokeWidth={isSelected ? 2 : 1}
          style={{ transition: "all 0.2s" }}
        />
        {height > 50 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - (height > 70 ? 12 : 6)}
              textAnchor="middle"
              fill={textColor}
              fontSize={height > 80 ? 22 : 16}
            >
              {icon}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + (height > 70 ? 6 : 8)}
              textAnchor="middle"
              fill={textColor}
              fontSize={width > 80 ? 13 : 11}
              fontWeight="600"
              fontFamily="'Noto Serif SC', serif"
            >
              {name}
            </text>
            {height > 70 && (
              <text
                x={x + width / 2}
                y={y + height / 2 + 22}
                textAnchor="middle"
                fill={textColor}
                fontSize={11}
                fontFamily="'DM Sans', sans-serif"
              >
                {changePercent >= 0 ? "+" : ""}{changePercent.toFixed(2)}%
              </text>
            )}
          </>
        )}
      </g>
    );
  };

  const selectedSectorData = sectors.find((s) => s.id === selectedSector);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF5F8 0%, #F8F4FF 50%, #F0FBF8 100%)" }}>
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
              市场概览
            </h1>
            <p className="text-sm mt-1" style={{ color: "#8A8AA8" }}>
              {lastUpdated ? `最后更新：${lastUpdated.toLocaleTimeString("zh-CN")}` : "加载中..."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 市场切换 */}
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "rgba(155,127,212,0.2)" }}>
              {(["A", "US"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMarket(m)}
                  className="px-5 py-2 text-sm font-medium transition-all duration-200"
                  style={{
                    background: activeMarket === m ? "linear-gradient(135deg, #E8728A, #9B7FD4)" : "white",
                    color: activeMarket === m ? "white" : "#5A5A7A",
                  }}
                >
                  {m === "A" ? "🇨🇳 A股" : "🇺🇸 美股"}
                </button>
              ))}
            </div>
            <button
              onClick={() => { loadData(); loadIndices(); }}
              disabled={loading}
              className="p-2.5 rounded-xl border transition-all duration-200 hover:bg-white/80"
              style={{ borderColor: "rgba(155,127,212,0.2)", color: "#9B7FD4" }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 指数概览 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {indices.map((idx) => (
            <motion.div
              key={idx.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(155,127,212,0.12)",
                boxShadow: "0 4px 20px rgba(155,127,212,0.06)",
              }}
            >
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: "#8A8AA8" }}>{idx.name}</div>
                {idx.loading ? (
                  <div className="h-6 w-24 rounded animate-pulse" style={{ background: "rgba(155,127,212,0.1)" }} />
                ) : (
                  <div className="text-xl font-bold" style={{ fontFamily: "'DM Sans', sans-serif", color: "#2D2D3A" }}>
                    {idx.price.toFixed(2)}
                  </div>
                )}
              </div>
              {!idx.loading && (
                <div
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: idx.changePercent >= 0 ? "rgba(232,114,138,0.1)" : "rgba(82,196,160,0.1)",
                    color: idx.changePercent >= 0 ? "#E8728A" : "#2D9E7E",
                  }}
                >
                  {idx.changePercent >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {idx.changePercent >= 0 ? "+" : ""}{idx.changePercent.toFixed(2)}%
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 热力图 — 占 3 列 */}
          <div className="lg:col-span-3">
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
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5" style={{ color: "#E8728A" }} />
                  <h2 className="font-bold text-lg" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                    行业板块热力图
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: "#8A8AA8" }}>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#E8728A" }} />涨
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#52C4A0" }} />跌
                  </span>
                  <span>颜色深度 = 涨跌幅大小</span>
                </div>
              </div>

              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#E8728A", borderTopColor: "transparent" }} />
                    <span className="text-sm" style={{ color: "#8A8AA8" }}>正在加载市场数据...</span>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <Treemap
                    data={treemapData.children}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    content={<CustomTreemapContent />}
                  >
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div
                            className="rounded-xl px-4 py-3 text-sm shadow-lg"
                            style={{
                              background: "rgba(255,255,255,0.95)",
                              border: "1px solid rgba(155,127,212,0.2)",
                              backdropFilter: "blur(12px)",
                            }}
                          >
                            <div className="font-bold mb-1" style={{ color: "#2D2D3A" }}>
                              {d.icon} {d.name}
                            </div>
                            <div style={{ color: d.changePercent >= 0 ? "#E8728A" : "#2D9E7E" }}>
                              {d.changePercent >= 0 ? "▲" : "▼"} {Math.abs(d.changePercent).toFixed(2)}%
                            </div>
                          </div>
                        );
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              )}

              {/* 点击板块显示详情 */}
              <AnimatePresence>
                {selectedSectorData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <div
                      className="rounded-xl p-4"
                      style={{ background: "rgba(155,127,212,0.04)", border: "1px solid rgba(155,127,212,0.12)" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold" style={{ color: "#2D2D3A" }}>
                          {selectedSectorData.icon} {selectedSectorData.name} 板块成分股
                        </span>
                        <button onClick={() => setSelectedSector(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "#8A8AA8" }}>关闭</button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {selectedSectorData.stocks.map((s) => (
                          <button
                            key={s.symbol}
                            onClick={() => navigate(`/analysis?symbol=${s.symbol}`)}
                            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all hover:scale-105"
                            style={{
                              background: "rgba(255,255,255,0.8)",
                              border: "1px solid rgba(155,127,212,0.1)",
                            }}
                          >
                            <span style={{ color: "#2D2D3A" }}>{s.name}</span>
                            <span style={{ color: s.changePercent >= 0 ? "#E8728A" : "#2D9E7E", fontFamily: "'DM Sans', sans-serif" }}>
                              {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 右侧面板 — 占 1 列 */}
          <div className="flex flex-col gap-4">
            {/* 市场情绪指数 */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(155,127,212,0.12)",
                boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5" style={{ color: "#9B7FD4" }} />
                <h2 className="font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                  市场情绪
                </h2>
              </div>

              {/* 仪表盘 */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-16 mb-3">
                  <svg viewBox="0 0 120 60" className="w-full">
                    {/* 背景弧 */}
                    <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="rgba(155,127,212,0.15)" strokeWidth="10" strokeLinecap="round" />
                    {/* 情绪弧 */}
                    <path
                      d="M 10 55 A 50 50 0 0 1 110 55"
                      fill="none"
                      stroke={`url(#sentimentGrad)`}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(sentimentClamped / 100) * 157} 157`}
                    />
                    <defs>
                      <linearGradient id="sentimentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#52C4A0" />
                        <stop offset="50%" stopColor="#9B7FD4" />
                        <stop offset="100%" stopColor="#E8728A" />
                      </linearGradient>
                    </defs>
                    {/* 指针 */}
                    <line
                      x1="60" y1="55"
                      x2={60 + 40 * Math.cos(Math.PI - (sentimentClamped / 100) * Math.PI)}
                      y2={55 - 40 * Math.sin((sentimentClamped / 100) * Math.PI)}
                      stroke="#2D2D3A"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="60" cy="55" r="4" fill="#2D2D3A" />
                  </svg>
                </div>
                <div className="text-3xl font-bold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: sentiment.color }}>
                  {sentimentClamped}
                </div>
                <div className="text-base font-semibold" style={{ color: sentiment.color }}>
                  {sentiment.emoji} {sentiment.label}
                </div>
              </div>

              {/* 涨跌统计 */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl py-2" style={{ background: "rgba(232,114,138,0.08)" }}>
                  <div className="text-xl font-bold" style={{ color: "#E8728A", fontFamily: "'DM Sans', sans-serif" }}>{risingCount}</div>
                  <div className="text-xs" style={{ color: "#8A8AA8" }}>上涨板块</div>
                </div>
                <div className="rounded-xl py-2" style={{ background: "rgba(82,196,160,0.08)" }}>
                  <div className="text-xl font-bold" style={{ color: "#2D9E7E", fontFamily: "'DM Sans', sans-serif" }}>{fallingCount}</div>
                  <div className="text-xs" style={{ color: "#8A8AA8" }}>下跌板块</div>
                </div>
              </div>
            </div>

            {/* 涨跌幅分布 */}
            <div
              className="rounded-2xl p-5 flex-1"
              style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(155,127,212,0.12)",
                boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: "#9B7FD4" }} />
                <h2 className="font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                  涨跌分布
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {bucketCounts.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className="text-xs w-14 text-right" style={{ color: "#8A8AA8", fontFamily: "'DM Sans', sans-serif" }}>{b.label}</span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ background: "rgba(155,127,212,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(b.count / maxCount) * 100}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="h-full rounded-full"
                        style={{ background: b.color }}
                      />
                    </div>
                    <span className="text-xs w-5 font-semibold" style={{ color: "#5A5A7A" }}>{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 板块排行榜 */}
        <div className="mt-6">
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(155,127,212,0.12)",
              boxShadow: "0 8px 32px rgba(155,127,212,0.08)",
            }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Globe className="w-5 h-5" style={{ color: "#9B7FD4" }} />
              <h2 className="font-bold text-lg" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                板块排行榜
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: "rgba(155,127,212,0.1)", color: "#9B7FD4" }}>
                点击板块可查看个股
              </span>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(155,127,212,0.06)" }} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[...sectors]
                  .sort((a, b) => b.changePercent - a.changePercent)
                  .map((sector, i) => (
                    <motion.button
                      key={sector.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        setSelectedSector(sector.id === selectedSector ? null : sector.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="rounded-xl p-4 text-left transition-all duration-200 hover:scale-105"
                      style={{
                        background: selectedSector === sector.id
                          ? `${getHeatColor(sector.changePercent)}22`
                          : "rgba(255,255,255,0.7)",
                        border: `1px solid ${selectedSector === sector.id ? getHeatColor(sector.changePercent) : "rgba(155,127,212,0.1)"}`,
                        boxShadow: selectedSector === sector.id ? `0 4px 16px ${getHeatColor(sector.changePercent)}40` : "none",
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{sector.icon}</span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: sector.changePercent >= 0 ? "rgba(232,114,138,0.12)" : "rgba(82,196,160,0.12)",
                            color: sector.changePercent >= 0 ? "#E8728A" : "#2D9E7E",
                          }}
                        >
                          {i === 0 ? "🏆 " : ""}{sector.changePercent >= 0 ? "+" : ""}{sector.changePercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="font-semibold text-sm" style={{ color: "#2D2D3A", fontFamily: "'Noto Serif SC', serif" }}>
                        {sector.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#8A8AA8" }}>
                        {sector.stockCount} 只成分股
                      </div>
                    </motion.button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
