/**
 * 股识 StockWise — A 股专属指标面板
 * 设计风格：樱花渐变轻盈风
 * 包含：涨跌停板、北向资金、龙虎榜、资金流向
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, BarChart2, Users, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { CandleData, StockMeta } from "@/lib/stockApi";
import {
  calcLimitInfo,
  calcTurnoverRate,
  generateNorthboundFlow,
  generateDragonTigerData,
  calcMoneyFlow,
  getBoardType,
} from "@/lib/aStockIndicators";

interface AStockPanelProps {
  candles: CandleData[];
  meta: StockMeta;
}

type TabType = "limit" | "northbound" | "moneyflow" | "dragon";

export default function AStockPanel({ candles, meta }: AStockPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("limit");

  const limitInfo = useMemo(
    () => calcLimitInfo(meta.symbol, meta.regularMarketPrice, meta.previousClose, meta.regularMarketChangePercent),
    [meta]
  );
  const turnover = useMemo(() => calcTurnoverRate(candles), [candles]);
  const northbound = useMemo(() => generateNorthboundFlow(candles), [candles]);
  const dragonTiger = useMemo(
    () => generateDragonTigerData(candles, meta.regularMarketChangePercent),
    [candles, meta.regularMarketChangePercent]
  );
  const moneyFlow = useMemo(() => calcMoneyFlow(candles), [candles]);

  const boardLabel = { main: "主板", star: "科创板", gem: "创业板" }[getBoardType(meta.symbol)];

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "limit", label: "涨跌停板", icon: <Activity size={13} /> },
    { key: "northbound", label: "北向资金", icon: <TrendingUp size={13} /> },
    { key: "moneyflow", label: "资金流向", icon: <BarChart2 size={13} /> },
    { key: "dragon", label: "龙虎榜", icon: <Users size={13} /> },
  ];

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* 标题 */}
      <div className="px-5 pt-5 pb-3 border-b border-pink-100/50">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-semibold text-gray-800">A 股专属指标</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-500 font-medium border border-pink-100">
            {boardLabel} · {limitInfo.limitUpPct}% 涨跌幅限制
          </span>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-pink-100/50 bg-pink-50/30">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "text-pink-500 border-b-2 border-pink-400 bg-white/60"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="p-5">
        {/* ── 涨跌停板 ── */}
        {activeTab === "limit" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* 状态徽章 */}
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: limitInfo.statusColor + "20",
                  color: limitInfo.statusColor,
                  border: `1px solid ${limitInfo.statusColor}40`,
                }}
              >
                {limitInfo.isLimitUp && <TrendingUp size={14} />}
                {limitInfo.isLimitDown && <TrendingDown size={14} />}
                {!limitInfo.isLimitUp && !limitInfo.isLimitDown && <Minus size={14} />}
                {limitInfo.statusLabel}
              </div>
              <span className="text-xs text-gray-400">
                今日涨跌：
                <span
                  className="font-semibold ml-1"
                  style={{ color: meta.regularMarketChangePercent >= 0 ? "#E8728A" : "#52C4A0" }}
                >
                  {meta.regularMarketChangePercent >= 0 ? "+" : ""}
                  {meta.regularMarketChangePercent.toFixed(2)}%
                </span>
              </span>
            </div>

            {/* 价格网格 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-pink-50/60 rounded-xl p-3 border border-pink-100/50">
                <p className="text-xs text-gray-400 mb-1">涨停价</p>
                <p className="text-lg font-bold text-pink-500">¥{limitInfo.limitUpPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">+{limitInfo.limitUpPct}%</p>
              </div>
              <div className="bg-teal-50/60 rounded-xl p-3 border border-teal-100/50">
                <p className="text-xs text-gray-400 mb-1">跌停价</p>
                <p className="text-lg font-bold text-teal-500">¥{limitInfo.limitDownPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-0.5">-{limitInfo.limitDownPct}%</p>
              </div>
              <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">昨收价</p>
                <p className="text-base font-semibold text-gray-700">¥{meta.previousClose.toFixed(2)}</p>
              </div>
              <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">今日现价</p>
                <p
                  className="text-base font-semibold"
                  style={{ color: meta.regularMarketChangePercent >= 0 ? "#E8728A" : "#52C4A0" }}
                >
                  ¥{meta.regularMarketPrice.toFixed(2)}
                </p>
              </div>
            </div>

            {/* 涨停进度条 */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                <span>跌停 ¥{limitInfo.limitDownPrice.toFixed(2)}</span>
                <span>涨停 ¥{limitInfo.limitUpPrice.toFixed(2)}</span>
              </div>
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-300 via-gray-200 to-pink-300 rounded-full" />
                {/* 当前价格指示器 */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md z-10"
                  style={{
                    left: `${Math.max(2, Math.min(98, ((meta.regularMarketPrice - limitInfo.limitDownPrice) / (limitInfo.limitUpPrice - limitInfo.limitDownPrice)) * 100))}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: meta.regularMarketChangePercent >= 0 ? "#E8728A" : "#52C4A0",
                  }}
                />
              </div>
            </div>

            {/* 换手率 */}
            <div className="bg-purple-50/40 rounded-xl p-3 border border-purple-100/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">换手率</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor:
                      turnover.turnoverLevel === "very_high" ? "#E8728A20" :
                      turnover.turnoverLevel === "high" ? "#F4956A20" :
                      turnover.turnoverLevel === "very_low" ? "#52C4A020" : "#9B7FD420",
                    color:
                      turnover.turnoverLevel === "very_high" ? "#E8728A" :
                      turnover.turnoverLevel === "high" ? "#F4956A" :
                      turnover.turnoverLevel === "very_low" ? "#52C4A0" : "#9B7FD4",
                  }}
                >
                  {turnover.turnoverLabel}
                </span>
              </div>
              <div className="flex gap-4 text-xs">
                <div>
                  <span className="text-gray-400">今日 </span>
                  <span className="font-semibold text-gray-700">{turnover.turnoverRate.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">5日均 </span>
                  <span className="font-semibold text-gray-700">{turnover.avgTurnover5d.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">20日均 </span>
                  <span className="font-semibold text-gray-700">{turnover.avgTurnover20d.toFixed(2)}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">{turnover.description}</p>
            </div>
          </motion.div>
        )}

        {/* ── 北向资金 ── */}
        {activeTab === "northbound" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* 今日净流入 */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: northbound.trendColor + "20" }}
              >
                {northbound.trend === "inflow" ? (
                  <ArrowUpRight size={22} style={{ color: northbound.trendColor }} />
                ) : northbound.trend === "outflow" ? (
                  <ArrowDownRight size={22} style={{ color: northbound.trendColor }} />
                ) : (
                  <Minus size={22} style={{ color: northbound.trendColor }} />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400">今日北向净流入</p>
                <p className="text-xl font-bold" style={{ color: northbound.trendColor }}>
                  {northbound.todayFlow >= 0 ? "+" : ""}{northbound.todayFlow.toFixed(1)} 亿元
                </p>
                <p className="text-xs font-medium" style={{ color: northbound.trendColor }}>
                  {northbound.trendLabel}
                </p>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">5日累计</p>
                <p
                  className="text-base font-bold"
                  style={{ color: northbound.flow5d >= 0 ? "#E8728A" : "#52C4A0" }}
                >
                  {northbound.flow5d >= 0 ? "+" : ""}{northbound.flow5d.toFixed(1)} 亿
                </p>
              </div>
              <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">20日累计</p>
                <p
                  className="text-base font-bold"
                  style={{ color: northbound.flow20d >= 0 ? "#E8728A" : "#52C4A0" }}
                >
                  {northbound.flow20d >= 0 ? "+" : ""}{northbound.flow20d.toFixed(1)} 亿
                </p>
              </div>
            </div>

            {/* 近30日流向图 */}
            <div>
              <p className="text-xs text-gray-400 mb-2">近30日北向资金净流入（亿元）</p>
              <div className="flex items-end gap-0.5 h-20">
                {northbound.dailyData.slice(-20).map((d, i) => {
                  const maxAbs = Math.max(...northbound.dailyData.map((x) => Math.abs(x.netFlow)), 1);
                  const height = Math.abs(d.netFlow) / maxAbs * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      {d.netFlow >= 0 ? (
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: `${height}%`,
                            backgroundColor: "rgba(232, 114, 138, 0.6)",
                          }}
                          title={`${d.date}: +${d.netFlow}亿`}
                        />
                      ) : (
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: `${height}%`,
                            backgroundColor: "rgba(82, 196, 160, 0.6)",
                          }}
                          title={`${d.date}: ${d.netFlow}亿`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>{northbound.dailyData[Math.max(0, northbound.dailyData.length - 20)]?.date}</span>
                <span>{northbound.dailyData[northbound.dailyData.length - 1]?.date}</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 bg-amber-50/60 rounded-lg p-2.5 border border-amber-100/50">
              ⚠️ 北向资金数据为模拟演示，实际数据请参考交易所官方披露。
            </p>
          </motion.div>
        )}

        {/* ── 资金流向 ── */}
        {activeTab === "moneyflow" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* 主力信号 */}
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: moneyFlow.trendColor + "20" }}
              >
                <BarChart2 size={22} style={{ color: moneyFlow.trendColor }} />
              </div>
              <div>
                <p className="text-xs text-gray-400">主力资金信号</p>
                <p className="text-lg font-bold" style={{ color: moneyFlow.trendColor }}>
                  {moneyFlow.trendLabel}
                </p>
                <p className="text-xs text-gray-400">
                  主力占比 {moneyFlow.mainForceRatio}%
                </p>
              </div>
            </div>

            {/* 资金分类 */}
            {[
              { label: "超大单", value: moneyFlow.superLarge, desc: "单笔 > 100万" },
              { label: "大单", value: moneyFlow.large, desc: "单笔 50-100万" },
              { label: "中单", value: moneyFlow.medium, desc: "单笔 10-50万" },
              { label: "小单", value: moneyFlow.small, desc: "单笔 < 10万" },
            ].map((item) => {
              const isPositive = item.value >= 0;
              const maxVal = Math.max(Math.abs(moneyFlow.superLarge), Math.abs(moneyFlow.large), Math.abs(moneyFlow.medium), Math.abs(moneyFlow.small), 1);
              const barWidth = Math.abs(item.value) / maxVal * 100;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="text-xs font-medium text-gray-600">{item.label}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{item.desc}</span>
                    </div>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isPositive ? "#E8728A" : "#52C4A0" }}
                    >
                      {isPositive ? "+" : ""}{(item.value / 10000).toFixed(2)} 亿
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: isPositive ? "#E8728A" : "#52C4A0",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* 主力 vs 散户 */}
            <div className="bg-purple-50/40 rounded-xl p-3 border border-purple-100/40">
              <p className="text-xs font-medium text-gray-600 mb-2">主力 vs 散户</p>
              <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                <div
                  className="rounded-l-full transition-all duration-500"
                  style={{
                    width: `${moneyFlow.mainForceRatio}%`,
                    backgroundColor: moneyFlow.mainForce >= 0 ? "#E8728A" : "#52C4A0",
                  }}
                />
                <div
                  className="flex-1 rounded-r-full"
                  style={{
                    backgroundColor: moneyFlow.retailFlow >= 0 ? "#9B7FD4" : "#F4956A",
                    opacity: 0.5,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>
                  主力 {moneyFlow.mainForce >= 0 ? "净流入" : "净流出"}{" "}
                  <span style={{ color: moneyFlow.mainForce >= 0 ? "#E8728A" : "#52C4A0" }}>
                    {(Math.abs(moneyFlow.mainForce) / 10000).toFixed(2)}亿
                  </span>
                </span>
                <span>
                  散户 {moneyFlow.retailFlow >= 0 ? "净流入" : "净流出"}{" "}
                  <span style={{ color: moneyFlow.retailFlow >= 0 ? "#9B7FD4" : "#F4956A" }}>
                    {(Math.abs(moneyFlow.retailFlow) / 10000).toFixed(2)}亿
                  </span>
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 bg-amber-50/60 rounded-lg p-2.5 border border-amber-100/50">
              ⚠️ 资金流向数据为基于成交量的模拟估算，仅供参考。
            </p>
          </motion.div>
        )}

        {/* ── 龙虎榜 ── */}
        {activeTab === "dragon" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {!dragonTiger.hasData ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Users size={22} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">近期未上龙虎榜</p>
                <p className="text-xs text-gray-300 mt-1">涨跌幅超过7%或成交量异常时触发</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">上榜日期</p>
                    <p className="text-sm font-semibold text-gray-700">{dragonTiger.date}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-pink-50 text-pink-500 border border-pink-100">
                    {dragonTiger.reason}
                  </span>
                </div>

                {/* 汇总 */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "买入合计", value: dragonTiger.totalBuy, color: "#E8728A" },
                    { label: "卖出合计", value: dragonTiger.totalSell, color: "#52C4A0" },
                    { label: "净买入", value: dragonTiger.netBuy, color: dragonTiger.netBuy >= 0 ? "#E8728A" : "#52C4A0" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/60 rounded-xl p-2.5 border border-gray-100 text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                      <p className="text-sm font-bold" style={{ color: item.color }}>
                        {item.value >= 0 ? "" : "-"}{Math.abs(item.value).toFixed(1)}亿
                      </p>
                    </div>
                  ))}
                </div>

                {/* 席位明细 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">席位明细</p>
                  {dragonTiger.entries.map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center gap-2 p-2.5 rounded-xl border"
                      style={{
                        backgroundColor: entry.type === "buy" ? "#E8728A08" : entry.type === "sell" ? "#52C4A008" : "#9B7FD408",
                        borderColor: entry.type === "buy" ? "#E8728A20" : entry.type === "sell" ? "#52C4A020" : "#9B7FD420",
                      }}
                    >
                      <span className="text-xs text-gray-400 w-4 text-center">{entry.rank}</span>
                      <span className="flex-1 text-xs text-gray-600 truncate">{entry.institution}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-pink-400">买 {entry.buyAmount.toFixed(1)}亿</span>
                        <span className="text-teal-400">卖 {entry.sellAmount.toFixed(1)}亿</span>
                        <span
                          className="font-semibold w-14 text-right"
                          style={{ color: entry.netAmount >= 0 ? "#E8728A" : "#52C4A0" }}
                        >
                          净{entry.netAmount >= 0 ? "买" : "卖"} {Math.abs(entry.netAmount).toFixed(1)}亿
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 bg-amber-50/60 rounded-lg p-2.5 border border-amber-100/50">
                  ⚠️ 龙虎榜数据为模拟演示，实际数据请参考交易所官方披露。
                </p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
