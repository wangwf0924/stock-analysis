/**
 * 股识 StockWise — 注册 / 登录页面
 * 设计风格：樱花渐变轻盈风
 * 功能：手机号 + 密码 + 邀请码注册 / 手机号 + 密码登录
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Lock, User, Key, Eye, EyeOff, ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Mode = "login" | "register";

export default function Auth() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");

  // 登录表单
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);

  // 注册表单
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regNickname, setRegNickname] = useState("");
  const [regInviteCode, setRegInviteCode] = useState("");
  const [showRegPwd, setShowRegPwd] = useState(false);

  const utils = trpc.useUtils();

  // 邀请码预检
  const { data: codeCheck } = trpc.phoneAuth.checkInviteCode.useQuery(
    { code: regInviteCode },
    { enabled: regInviteCode.length >= 4, staleTime: 5000 }
  );

  // 登录 mutation
  const loginMutation = trpc.phoneAuth.login.useMutation({
    onSuccess: async (data) => {
      await utils.phoneAuth.me.invalidate();
      toast.success(`欢迎回来，${data.user.nickname}！`);
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // 注册 mutation
  const registerMutation = trpc.phoneAuth.register.useMutation({
    onSuccess: async (data) => {
      await utils.phoneAuth.me.invalidate();
      toast.success(`注册成功，欢迎加入，${data.user.nickname}！`);
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone || !loginPassword) return toast.error("请填写完整信息");
    loginMutation.mutate({ phone: loginPhone, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPhone || !regPassword || !regNickname || !regInviteCode) return toast.error("请填写完整信息");
    if (regPassword.length < 8) return toast.error("密码至少 8 位");
    registerMutation.mutate({
      phone: regPhone,
      password: regPassword,
      nickname: regNickname,
      inviteCode: regInviteCode,
    });
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF0FF 50%, #F0F5FF 100%)" }}
    >
      {/* 装饰圆圈 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #E8728A, transparent)" }} />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #9B7FD4, transparent)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* 返回首页 */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
          style={{ color: "#9B7FD4" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#E8728A")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9B7FD4")}
        >
          <ArrowLeft size={16} />
          返回首页
        </button>

        {/* 卡片 */}
        <div
          className="rounded-3xl p-8 shadow-xl"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(232,114,138,0.15)",
          }}
        >
          {/* Logo + 标题 */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ background: "linear-gradient(135deg, #E8728A, #9B7FD4)" }}
            >
              🌸
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
              股识 StockWise
            </h1>
            <p className="text-sm mt-1" style={{ color: "#9B9BB8" }}>
              {mode === "login" ? "登录您的账号" : "创建新账号"}
            </p>
          </div>

          {/* Tab 切换 */}
          <div
            className="flex rounded-2xl p-1 mb-6"
            style={{ background: "rgba(155,127,212,0.08)" }}
          >
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                style={
                  mode === m
                    ? { background: "white", color: "#E8728A", boxShadow: "0 2px 8px rgba(232,114,138,0.2)" }
                    : { color: "#9B9BB8" }
                }
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode === "login" ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                {/* 手机号 */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>手机号</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9B7FD4" }} />
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={e => setLoginPhone(e.target.value)}
                      placeholder="请输入手机号"
                      maxLength={11}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: "rgba(155,127,212,0.06)",
                        border: "1.5px solid rgba(155,127,212,0.2)",
                        color: "#2D2D3A",
                      }}
                      onFocus={e => (e.target.style.border = "1.5px solid rgba(232,114,138,0.5)")}
                      onBlur={e => (e.target.style.border = "1.5px solid rgba(155,127,212,0.2)")}
                    />
                  </div>
                </div>

                {/* 密码 */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>密码</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9B7FD4" }} />
                    <input
                      type={showLoginPwd ? "text" : "password"}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="请输入密码"
                      className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: "rgba(155,127,212,0.06)",
                        border: "1.5px solid rgba(155,127,212,0.2)",
                        color: "#2D2D3A",
                      }}
                      onFocus={e => (e.target.style.border = "1.5px solid rgba(232,114,138,0.5)")}
                      onBlur={e => (e.target.style.border = "1.5px solid rgba(155,127,212,0.2)")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPwd(!showLoginPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "#9B9BB8" }}
                    >
                      {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all mt-2 flex items-center justify-center gap-2"
                  style={{
                    background: isLoading ? "#C8A0B8" : "linear-gradient(135deg, #E8728A, #C85A8A)",
                    boxShadow: isLoading ? "none" : "0 4px 16px rgba(232,114,138,0.4)",
                  }}
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {isLoading ? "登录中..." : "登录"}
                </button>

                <p className="text-center text-xs" style={{ color: "#9B9BB8" }}>
                  还没有账号？
                  <button type="button" onClick={() => setMode("register")} className="ml-1 font-medium" style={{ color: "#9B7FD4" }}>
                    立即注册
                  </button>
                </p>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                {/* 手机号 */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>手机号</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9B7FD4" }} />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="请输入手机号"
                      maxLength={11}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: "rgba(155,127,212,0.06)",
                        border: "1.5px solid rgba(155,127,212,0.2)",
                        color: "#2D2D3A",
                      }}
                      onFocus={e => (e.target.style.border = "1.5px solid rgba(232,114,138,0.5)")}
                      onBlur={e => (e.target.style.border = "1.5px solid rgba(155,127,212,0.2)")}
                    />
                  </div>
                </div>

                {/* 昵称 */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>昵称</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9B7FD4" }} />
                    <input
                      type="text"
                      value={regNickname}
                      onChange={e => setRegNickname(e.target.value)}
                      placeholder="您的昵称（最多 32 字）"
                      maxLength={32}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: "rgba(155,127,212,0.06)",
                        border: "1.5px solid rgba(155,127,212,0.2)",
                        color: "#2D2D3A",
                      }}
                      onFocus={e => (e.target.style.border = "1.5px solid rgba(232,114,138,0.5)")}
                      onBlur={e => (e.target.style.border = "1.5px solid rgba(155,127,212,0.2)")}
                    />
                  </div>
                </div>

                {/* 密码 */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>密码（至少 8 位）</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9B7FD4" }} />
                    <input
                      type={showRegPwd ? "text" : "password"}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="请设置密码（至少 8 位）"
                      className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: "rgba(155,127,212,0.06)",
                        border: "1.5px solid rgba(155,127,212,0.2)",
                        color: "#2D2D3A",
                      }}
                      onFocus={e => (e.target.style.border = "1.5px solid rgba(232,114,138,0.5)")}
                      onBlur={e => (e.target.style.border = "1.5px solid rgba(155,127,212,0.2)")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPwd(!showRegPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: "#9B9BB8" }}
                    >
                      {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {regPassword.length > 0 && regPassword.length < 8 && (
                    <p className="text-xs mt-1" style={{ color: "#E8728A" }}>密码至少 8 位</p>
                  )}
                </div>

                {/* 邀请码 */}
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>邀请码</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#9B7FD4" }} />
                    <input
                      type="text"
                      value={regInviteCode}
                      onChange={e => setRegInviteCode(e.target.value.toUpperCase())}
                      placeholder="请输入邀请码"
                      maxLength={16}
                      className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all font-mono tracking-wider"
                      style={{
                        background: "rgba(155,127,212,0.06)",
                        border: "1.5px solid rgba(155,127,212,0.2)",
                        color: "#2D2D3A",
                      }}
                      onFocus={e => (e.target.style.border = "1.5px solid rgba(232,114,138,0.5)")}
                      onBlur={e => (e.target.style.border = "1.5px solid rgba(155,127,212,0.2)")}
                    />
                    {/* 邀请码验证状态图标 */}
                    {regInviteCode.length >= 4 && codeCheck && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        {codeCheck.valid
                          ? <CheckCircle2 size={16} style={{ color: "#52C4A0" }} />
                          : <XCircle size={16} style={{ color: "#E8728A" }} />
                        }
                      </div>
                    )}
                  </div>
                  {regInviteCode.length >= 4 && codeCheck && !codeCheck.valid && (
                    <p className="text-xs mt-1" style={{ color: "#E8728A" }}>{codeCheck.reason}</p>
                  )}
                  {regInviteCode.length >= 4 && codeCheck?.valid && (
                    <p className="text-xs mt-1" style={{ color: "#52C4A0" }}>邀请码有效 ✓</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all mt-2 flex items-center justify-center gap-2"
                  style={{
                    background: isLoading ? "#C8A0B8" : "linear-gradient(135deg, #9B7FD4, #7B5FC4)",
                    boxShadow: isLoading ? "none" : "0 4px 16px rgba(155,127,212,0.4)",
                  }}
                >
                  {isLoading && <Loader2 size={16} className="animate-spin" />}
                  {isLoading ? "注册中..." : "立即注册"}
                </button>

                <p className="text-center text-xs" style={{ color: "#9B9BB8" }}>
                  已有账号？
                  <button type="button" onClick={() => setMode("login")} className="ml-1 font-medium" style={{ color: "#E8728A" }}>
                    立即登录
                  </button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* 底部说明 */}
        <p className="text-center text-xs mt-4" style={{ color: "#BBBBCC" }}>
          注册即表示您同意平台使用条款
        </p>
      </motion.div>
    </div>
  );
}
