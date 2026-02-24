/**
 * 股识 StockWise — 顶部导航栏
 * 设计风格：樱花渐变轻盈风
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { BarChart2, BookOpen, Home, Menu, X, Sparkles, ArrowLeftRight, Globe, FlaskConical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { path: "/", label: "首页", icon: <Home className="w-4 h-4" /> },
  { path: "/analysis", label: "股票分析", icon: <BarChart2 className="w-4 h-4" /> },
  { path: "/market", label: "市场概览", icon: <Globe className="w-4 h-4" /> },
  { path: "/compare", label: "对比分析", icon: <ArrowLeftRight className="w-4 h-4" /> },
  { path: "/backtest", label: "历史回测", icon: <FlaskConical className="w-4 h-4" /> },
  { path: "/theories", label: "投资理论", icon: <BookOpen className="w-4 h-4" /> },
];

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "rgba(255,250,253,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(232,114,138,0.12)",
        boxShadow: "0 2px 20px rgba(155,127,212,0.08)",
      }}
    >
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 group"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #E8728A, #9B7FD4)" }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span
              className="text-lg font-bold"
              style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}
            >
              股识
            </span>
            <span
              className="text-xs ml-1.5 font-medium"
              style={{ color: "#9B7FD4", fontFamily: "'DM Sans', sans-serif" }}
            >
              StockWise
            </span>
          </div>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive ? "#E8728A" : "#5A5A7A",
                  background: isActive ? "rgba(232,114,138,0.08)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "rgba(155,127,212,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/analysis")}
            className="btn-primary px-5 py-2 rounded-xl text-sm font-medium"
          >
            开始分析
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-xl"
          style={{ color: "#5A5A7A" }}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid rgba(232,114,138,0.1)" }}
          >
            <div className="px-6 py-4 flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left"
                    style={{
                      color: isActive ? "#E8728A" : "#5A5A7A",
                      background: isActive ? "rgba(232,114,138,0.08)" : "transparent",
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
