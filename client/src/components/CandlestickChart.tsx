/**
 * 股识 StockWise — K线图组件
 * 设计风格：樱花渐变轻盈风
 * 使用 lightweight-charts v5 绘制专业 K 线图
 */

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineSeries,
  CandlestickSeries,
  HistogramSeries,
} from "lightweight-charts";
import type { CandleData } from "@/lib/stockApi";
import {
  calcMA,
  calcEMA,
  calcMACD,
  calcRSI,
  calcBollinger,
  calcKDJ,
} from "@/lib/indicators";

interface CandlestickChartProps {
  candles: CandleData[];
  currency?: string;
  height?: number;
}

type IndicatorType = "MA" | "EMA" | "BOLL" | "MACD" | "RSI" | "KDJ";

export default function CandlestickChart({
  candles,
  currency = "CNY",
  height = 420,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const subChartContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndicator, setActiveIndicator] = useState<IndicatorType>("MA");
  const [showVolume, setShowVolume] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // 用本地变量持有图表引用，避免 ref 在 cleanup 时已被更新
    let chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6B6B8A",
        fontFamily: "'DM Sans', 'Space Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(155, 127, 212, 0.08)" },
        horzLines: { color: "rgba(155, 127, 212, 0.08)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(232, 114, 138, 0.5)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#E8728A",
        },
        horzLine: {
          color: "rgba(232, 114, 138, 0.5)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#E8728A",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(155, 127, 212, 0.2)",
        textColor: "#6B6B8A",
      },
      timeScale: {
        borderColor: "rgba(155, 127, 212, 0.2)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    type TimeType = import("lightweight-charts").Time;

    // K 线
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#E8728A",
      downColor: "#52C4A0",
      borderUpColor: "#E8728A",
      borderDownColor: "#52C4A0",
      wickUpColor: "#E8728A",
      wickDownColor: "#52C4A0",
    });

    const chartData = candles.map((c) => ({
      time: c.time as TimeType,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(chartData);

    // 成交量
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "rgba(155, 127, 212, 0.3)",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(
        candles.map((c) => ({
          time: c.time as TimeType,
          value: c.volume,
          color:
            c.close >= c.open
              ? "rgba(232, 114, 138, 0.4)"
              : "rgba(82, 196, 160, 0.4)",
        }))
      );
    }

    // 叠加指标
    const addLine = (data: { time: number; value: number }[], color: string, lineStyle = 0) => {
      const s = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        lineStyle,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(data.map((d) => ({ time: d.time as TimeType, value: d.value })));
    };

    if (activeIndicator === "MA") {
      addLine(calcMA(candles, 5), "#E8728A");
      addLine(calcMA(candles, 10), "#F4956A");
      addLine(calcMA(candles, 20), "#9B7FD4");
      const ma60 = calcMA(candles, 60);
      if (ma60.length > 0) addLine(ma60, "#52C4A0");
    }

    if (activeIndicator === "EMA") {
      addLine(calcEMA(candles, 12), "#E8728A");
      addLine(calcEMA(candles, 26), "#9B7FD4");
    }

    if (activeIndicator === "BOLL") {
      const boll = calcBollinger(candles, 20);
      addLine(boll.map((d) => ({ time: d.time, value: d.upper })), "#E8728A");
      addLine(boll.map((d) => ({ time: d.time, value: d.middle })), "#9B7FD4", 1);
      addLine(boll.map((d) => ({ time: d.time, value: d.lower })), "#52C4A0");
    }

    chart.timeScale().fitContent();

    // 子图表
    let subChart: ReturnType<typeof createChart> | null = null;
    if (
      subChartContainerRef.current &&
      (activeIndicator === "MACD" || activeIndicator === "RSI" || activeIndicator === "KDJ")
    ) {
      subChart = createChart(subChartContainerRef.current, {
        width: subChartContainerRef.current.clientWidth,
        height: 140,
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
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: "rgba(232, 114, 138, 0.4)", width: 1, style: 2 },
          horzLine: { color: "rgba(232, 114, 138, 0.4)", width: 1, style: 2 },
        },
        rightPriceScale: { borderColor: "rgba(155, 127, 212, 0.2)" },
        timeScale: { borderColor: "rgba(155, 127, 212, 0.2)", visible: false },
      });

      const addSubLine = (data: { time: number; value: number }[], color: string, lineStyle = 0) => {
        if (!subChart) return;
        const s = subChart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          lineStyle,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(data.map((d) => ({ time: d.time as TimeType, value: d.value })));
      };

      if (activeIndicator === "MACD") {
        const macdData = calcMACD(candles);
        addSubLine(macdData.map((d) => ({ time: d.time, value: d.macd })), "#E8728A");
        addSubLine(macdData.map((d) => ({ time: d.time, value: d.signal })), "#9B7FD4");
        const histSeries = subChart.addSeries(HistogramSeries, {
          priceLineVisible: false,
          lastValueVisible: false,
        });
        histSeries.setData(
          macdData.map((d) => ({
            time: d.time as TimeType,
            value: d.histogram,
            color: d.histogram >= 0 ? "rgba(232, 114, 138, 0.6)" : "rgba(82, 196, 160, 0.6)",
          }))
        );
      }

      if (activeIndicator === "RSI") {
        const rsiData = calcRSI(candles, 14);
        addSubLine(rsiData, "#9B7FD4");
        addSubLine(rsiData.map((d) => ({ time: d.time, value: 70 })), "rgba(232, 114, 138, 0.4)", 2);
        addSubLine(rsiData.map((d) => ({ time: d.time, value: 30 })), "rgba(82, 196, 160, 0.4)", 2);
      }

      if (activeIndicator === "KDJ") {
        const kdjData = calcKDJ(candles, 9);
        addSubLine(kdjData.map((d) => ({ time: d.time, value: d.k })), "#E8728A");
        addSubLine(kdjData.map((d) => ({ time: d.time, value: d.d })), "#9B7FD4");
        addSubLine(kdjData.map((d) => ({ time: d.time, value: d.j })), "#F4956A");
      }

      subChart.timeScale().fitContent();

      // 同步时间轴
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && subChart) {
          try { subChart.timeScale().setVisibleLogicalRange(range); } catch (_) {}
        }
      });
      subChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) {
          try { chart.timeScale().setVisibleLogicalRange(range); } catch (_) {}
        }
      });
    }

    // 响应式
    const handleResize = () => {
      if (chartContainerRef.current) {
        try { chart.applyOptions({ width: chartContainerRef.current.clientWidth }); } catch (_) {}
      }
      if (subChartContainerRef.current && subChart) {
        try { subChart.applyOptions({ width: subChartContainerRef.current.clientWidth }); } catch (_) {}
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try { chart.remove(); } catch (_) {}
      if (subChart) {
        try { subChart.remove(); } catch (_) {}
      }
    };
  }, [candles, activeIndicator, showVolume, height]);

  const indicators: { key: IndicatorType; label: string; color: string }[] = [
    { key: "MA", label: "MA均线", color: "#E8728A" },
    { key: "EMA", label: "EMA", color: "#F4956A" },
    { key: "BOLL", label: "布林带", color: "#9B7FD4" },
    { key: "MACD", label: "MACD", color: "#52C4A0" },
    { key: "RSI", label: "RSI", color: "#9B7FD4" },
    { key: "KDJ", label: "KDJ", color: "#F4956A" },
  ];

  const hasSubChart = ["MACD", "RSI", "KDJ"].includes(activeIndicator);

  return (
    <div className="w-full">
      {/* 指标选择栏 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {indicators.map((ind) => (
          <button
            key={ind.key}
            onClick={() => setActiveIndicator(ind.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 font-en ${
              activeIndicator === ind.key
                ? "text-white shadow-sm"
                : "bg-white/60 text-gray-500 hover:bg-white/90"
            }`}
            style={activeIndicator === ind.key ? { backgroundColor: ind.color } : {}}
          >
            {ind.label}
          </button>
        ))}
        <button
          onClick={() => setShowVolume(!showVolume)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ml-auto ${
            showVolume ? "bg-purple-100 text-purple-600" : "bg-white/60 text-gray-400"
          }`}
        >
          成交量
        </button>
      </div>

      {/* 图例 */}
      {activeIndicator === "MA" && (
        <div className="flex gap-3 mb-2 text-xs">
          {[
            { label: "MA5", color: "#E8728A" },
            { label: "MA10", color: "#F4956A" },
            { label: "MA20", color: "#9B7FD4" },
            { label: "MA60", color: "#52C4A0" },
          ].map((m) => (
            <span key={m.label} className="flex items-center gap-1">
              <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: m.color }} />
              <span className="text-gray-500">{m.label}</span>
            </span>
          ))}
        </div>
      )}
      {activeIndicator === "MACD" && (
        <div className="flex gap-3 mb-2 text-xs">
          {[
            { label: "DIF", color: "#E8728A" },
            { label: "DEA", color: "#9B7FD4" },
          ].map((m) => (
            <span key={m.label} className="flex items-center gap-1">
              <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: m.color }} />
              <span className="text-gray-500">{m.label}</span>
            </span>
          ))}
        </div>
      )}
      {activeIndicator === "KDJ" && (
        <div className="flex gap-3 mb-2 text-xs">
          {[
            { label: "K", color: "#E8728A" },
            { label: "D", color: "#9B7FD4" },
            { label: "J", color: "#F4956A" },
          ].map((m) => (
            <span key={m.label} className="flex items-center gap-1">
              <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: m.color }} />
              <span className="text-gray-500">{m.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* 主图表 */}
      <div ref={chartContainerRef} className="w-full rounded-xl overflow-hidden" />

      {/* 子图表 */}
      {hasSubChart && (
        <div ref={subChartContainerRef} className="w-full rounded-xl overflow-hidden mt-1" />
      )}
    </div>
  );
}
