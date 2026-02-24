/**
 * 股识 StockWise — 顶部导航栏
 * 设计风格：樱花渐变轻盈风
 * 包含：登录状态、用户头像、管理员入口
 */

import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { BarChart2, BookOpen, Home, Menu, X, Sparkles, ArrowLeftRight, Globe, FlaskConical, LogIn, LogOut, Shield, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, isAdmin, refetch } = usePhoneAuth();

  const utils = trpc.useUtils();
  const logoutMutation = trpc.phoneAuth.logout.useMutation({
    onSuccess: async () => {
      await utils.phoneAuth.me.invalidate();
      refetch();
      toast.success("已退出登录");
      navigate("/");
    },
    onError: (err) => toast.error(err.message),
  });

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

        {/* 右侧：登录状态 / 用户菜单 */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            /* 已登录：用户头像 + 下拉菜单 */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                style={{
                  background: dropdownOpen ? "rgba(232,114,138,0.1)" : "rgba(155,127,212,0.06)",
                  border: "1.5px solid rgba(232,114,138,0.15)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #E8728A, #9B7FD4)" }}
                >
                  {user.nickname.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium max-w-[80px] truncate" style={{ color: "#2D2D3A" }}>
                  {user.nickname}
                </span>
                {isAdmin && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(232,114,138,0.15)", color: "#C85A7A" }}>
                    管理
                  </span>
                )}
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden shadow-xl z-50"
                    style={{
                      background: "rgba(255,255,255,0.95)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(232,114,138,0.15)",
                    }}
                  >
                    {/* 用户信息 */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(232,114,138,0.1)" }}>
                      <p className="text-sm font-semibold" style={{ color: "#2D2D3A" }}>{user.nickname}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9B9BB8" }}>
                        {user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
                      </p>
                    </div>

                    {/* 菜单项 */}
                    <div className="py-1.5">
                      {isAdmin && (
                        <button
                          onClick={() => { navigate("/admin/invite"); setDropdownOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors"
                          style={{ color: "#C85A7A" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,114,138,0.06)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <Shield size={15} />
                          管理员控制台
                        </button>
                      )}
                      <button
                        onClick={() => { logoutMutation.mutate(); setDropdownOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors"
                        style={{ color: "#7A7A9A" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(155,127,212,0.06)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <LogOut size={15} />
                        退出登录
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* 未登录：登录按钮 */
            <button
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: "linear-gradient(135deg, #E8728A, #C85A8A)",
                color: "white",
                boxShadow: "0 4px 12px rgba(232,114,138,0.3)",
              }}
            >
              <LogIn size={15} />
              登录 / 注册
            </button>
          )}
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

              {/* 移动端登录/用户区域 */}
              <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(232,114,138,0.1)" }}>
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 mb-1">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, #E8728A, #9B7FD4)" }}
                      >
                        {user.nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: "#2D2D3A" }}>{user.nickname}</span>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => { navigate("/admin/invite"); setMobileOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left"
                        style={{ color: "#C85A7A" }}
                      >
                        <Shield size={16} />
                        管理员控制台
                      </button>
                    )}
                    <button
                      onClick={() => { logoutMutation.mutate(); setMobileOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left"
                      style={{ color: "#7A7A9A" }}
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { navigate("/auth"); setMobileOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium w-full text-left"
                    style={{ color: "#E8728A" }}
                  >
                    <LogIn size={16} />
                    登录 / 注册
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
