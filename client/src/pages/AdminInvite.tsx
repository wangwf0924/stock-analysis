/**
 * 股识 StockWise — 管理员邀请码管理页面
 * 功能：生成邀请码、查看邀请码列表、禁用/启用/删除邀请码、查看用户列表
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Plus, Copy, Trash2, Ban, CheckCircle2, ArrowLeft,
  Users, Key, RefreshCw, Loader2, Shield, ChevronDown, ChevronUp
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { toast } from "sonner";

export default function AdminInvite() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading, isAdmin } = usePhoneAuth();

  const [activeTab, setActiveTab] = useState<"codes" | "users">("codes");
  const [showGenForm, setShowGenForm] = useState(false);
  const [genNote, setGenNote] = useState("");
  const [genMaxUses, setGenMaxUses] = useState(1);
  const [genCount, setGenCount] = useState(1);
  const [newCodes, setNewCodes] = useState<string[]>([]);

  const utils = trpc.useUtils();

  // 邀请码列表
  const { data: codesData, isLoading: codesLoading, refetch: refetchCodes } =
    trpc.admin.listInviteCodes.useQuery({ limit: 100, offset: 0 }, { enabled: isAdmin });

  // 用户列表
  const { data: usersData, isLoading: usersLoading } =
    trpc.admin.listUsers.useQuery({ limit: 50, offset: 0 }, { enabled: isAdmin && activeTab === "users" });

  // 生成邀请码
  const createMutation = trpc.admin.createInviteCode.useMutation({
    onSuccess: (data) => {
      setNewCodes(data.codes);
      utils.admin.listInviteCodes.invalidate();
      toast.success(`成功生成 ${data.codes.length} 个邀请码`);
      setGenNote("");
    },
    onError: (err) => toast.error(err.message),
  });

  // 禁用邀请码
  const disableMutation = trpc.admin.disableInviteCode.useMutation({
    onSuccess: () => { utils.admin.listInviteCodes.invalidate(); toast.success("已禁用"); },
    onError: (err) => toast.error(err.message),
  });

  // 启用邀请码
  const enableMutation = trpc.admin.enableInviteCode.useMutation({
    onSuccess: () => { utils.admin.listInviteCodes.invalidate(); toast.success("已启用"); },
    onError: (err) => toast.error(err.message),
  });

  // 删除邀请码
  const deleteMutation = trpc.admin.deleteInviteCode.useMutation({
    onSuccess: () => { utils.admin.listInviteCodes.invalidate(); toast.success("已删除"); },
    onError: (err) => toast.error(err.message),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`已复制：${code}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF0FF 50%, #F0F5FF 100%)" }}>
        <Loader2 className="animate-spin" style={{ color: "#E8728A" }} size={32} />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF0FF 50%, #F0F5FF 100%)" }}>
        <Shield size={48} style={{ color: "#E8728A" }} />
        <p className="text-lg font-semibold" style={{ color: "#2D2D3A" }}>需要管理员权限</p>
        <p className="text-sm" style={{ color: "#9B9BB8" }}>请使用管理员账号登录后访问此页面</p>
        <button
          onClick={() => navigate("/auth")}
          className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #E8728A, #C85A8A)" }}
        >
          去登录
        </button>
      </div>
    );
  }

  const codes = codesData ?? [];
  const users = usersData?.users ?? [];
  const totalUsers = usersData?.total ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FFF5F7 0%, #FAF0FF 50%, #F0F5FF 100%)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "#9B7FD4" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#E8728A")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9B7FD4")}
            >
              <ArrowLeft size={16} />
              返回首页
            </button>
            <span style={{ color: "#D0D0E0" }}>|</span>
            <div className="flex items-center gap-2">
              <Shield size={18} style={{ color: "#E8728A" }} />
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D2D3A" }}>
                管理员控制台
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: "rgba(232,114,138,0.1)", color: "#C85A7A" }}>
            <Shield size={12} />
            {user.nickname}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "邀请码总数", value: codes.length, color: "#9B7FD4", bg: "rgba(155,127,212,0.08)" },
            { label: "有效邀请码", value: codes.filter(c => !c.isDisabled && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length, color: "#52C4A0", bg: "rgba(82,196,160,0.08)" },
            { label: "已使用次数", value: codes.reduce((s, c) => s + c.usedCount, 0), color: "#F4956A", bg: "rgba(244,149,106,0.08)" },
            { label: "注册用户数", value: totalUsers, color: "#E8728A", bg: "rgba(232,114,138,0.08)" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,114,138,0.1)" }}
            >
              <p className="text-xs mb-1" style={{ color: "#9B9BB8" }}>{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "codes", label: "邀请码管理", icon: <Key size={14} /> },
            { key: "users", label: "用户列表", icon: <Users size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={
                activeTab === tab.key
                  ? { background: "linear-gradient(135deg, #E8728A, #C85A8A)", color: "white", boxShadow: "0 4px 12px rgba(232,114,138,0.3)" }
                  : { background: "rgba(255,255,255,0.7)", color: "#7A7A9A" }
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 邀请码管理 */}
        {activeTab === "codes" && (
          <div>
            {/* 生成邀请码区域 */}
            <div
              className="rounded-2xl mb-6 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,114,138,0.1)" }}
            >
              <button
                onClick={() => setShowGenForm(!showGenForm)}
                className="w-full flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: "#2D2D3A" }}>
                  <Plus size={16} style={{ color: "#E8728A" }} />
                  生成新邀请码
                </div>
                {showGenForm ? <ChevronUp size={16} style={{ color: "#9B9BB8" }} /> : <ChevronDown size={16} style={{ color: "#9B9BB8" }} />}
              </button>

              {showGenForm && (
                <div className="px-6 pb-6 border-t" style={{ borderColor: "rgba(232,114,138,0.1)" }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>备注（选填）</label>
                      <input
                        type="text"
                        value={genNote}
                        onChange={e => setGenNote(e.target.value)}
                        placeholder="如：给某某用"
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "rgba(155,127,212,0.06)", border: "1.5px solid rgba(155,127,212,0.2)", color: "#2D2D3A" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>最大使用次数（0=不限）</label>
                      <input
                        type="number"
                        value={genMaxUses}
                        onChange={e => setGenMaxUses(Math.max(0, parseInt(e.target.value) || 0))}
                        min={0}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "rgba(155,127,212,0.06)", border: "1.5px solid rgba(155,127,212,0.2)", color: "#2D2D3A" }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ color: "#5A5A7A" }}>生成数量（1-100）</label>
                      <input
                        type="number"
                        value={genCount}
                        onChange={e => setGenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                        min={1}
                        max={100}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "rgba(155,127,212,0.06)", border: "1.5px solid rgba(155,127,212,0.2)", color: "#2D2D3A" }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => createMutation.mutate({ note: genNote || undefined, maxUses: genMaxUses, count: genCount })}
                    disabled={createMutation.isPending}
                    className="mt-4 flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                    style={{ background: "linear-gradient(135deg, #9B7FD4, #7B5FC4)", boxShadow: "0 4px 12px rgba(155,127,212,0.3)" }}
                  >
                    {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    生成邀请码
                  </button>

                  {/* 新生成的邀请码展示 */}
                  {newCodes.length > 0 && (
                    <div className="mt-4 p-4 rounded-xl" style={{ background: "rgba(82,196,160,0.08)", border: "1px solid rgba(82,196,160,0.2)" }}>
                      <p className="text-xs font-medium mb-2" style={{ color: "#52C4A0" }}>新生成的邀请码（点击复制）：</p>
                      <div className="flex flex-wrap gap-2">
                        {newCodes.map(code => (
                          <button
                            key={code}
                            onClick={() => copyCode(code)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-all"
                            style={{ background: "rgba(82,196,160,0.15)", color: "#2D8A6A", border: "1px solid rgba(82,196,160,0.3)" }}
                          >
                            {code}
                            <Copy size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 邀请码列表 */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,114,138,0.1)" }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(232,114,138,0.1)" }}>
                <h3 className="font-semibold text-sm" style={{ color: "#2D2D3A" }}>邀请码列表（{codes.length}）</h3>
                <button onClick={() => refetchCodes()} className="p-1.5 rounded-lg transition-colors" style={{ color: "#9B9BB8" }}>
                  <RefreshCw size={14} />
                </button>
              </div>

              {codesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin" style={{ color: "#E8728A" }} size={24} />
                </div>
              ) : codes.length === 0 ? (
                <div className="text-center py-12" style={{ color: "#9B9BB8" }}>
                  <Key size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无邀请码，点击上方「生成新邀请码」</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "rgba(232,114,138,0.06)" }}>
                  {codes.map((code) => {
                    const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
                    const isExhausted = code.maxUses > 0 && code.usedCount >= code.maxUses;
                    const isActive = !code.isDisabled && !isExpired && !isExhausted;

                    return (
                      <div key={code.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-pink-50/30 transition-colors">
                        <div className="flex items-center gap-4">
                          {/* 状态指示 */}
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? "bg-green-400" : "bg-gray-300"}`} />

                          {/* 邀请码 */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm tracking-wider" style={{ color: "#2D2D3A" }}>
                                {code.code}
                              </span>
                              <button onClick={() => copyCode(code.code)} className="opacity-50 hover:opacity-100 transition-opacity">
                                <Copy size={12} style={{ color: "#9B7FD4" }} />
                              </button>
                              {/* 状态标签 */}
                              {code.isDisabled && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(200,90,122,0.1)", color: "#C85A7A" }}>已禁用</span>
                              )}
                              {isExpired && !code.isDisabled && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(150,150,180,0.1)", color: "#9B9BB8" }}>已过期</span>
                              )}
                              {isExhausted && !code.isDisabled && !isExpired && (
                                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(244,149,106,0.1)", color: "#C47A4A" }}>已用完</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs" style={{ color: "#9B9BB8" }}>
                                已用 {code.usedCount}/{code.maxUses === 0 ? "∞" : code.maxUses}
                              </span>
                              {code.note && (
                                <span className="text-xs" style={{ color: "#B0B0CC" }}>备注：{code.note}</span>
                              )}
                              {code.expiresAt && (
                                <span className="text-xs" style={{ color: "#B0B0CC" }}>
                                  到期：{new Date(code.expiresAt).toLocaleDateString("zh-CN")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center gap-1">
                          {code.isDisabled ? (
                            <button
                              onClick={() => enableMutation.mutate({ id: code.id })}
                              className="p-1.5 rounded-lg transition-colors"
                              title="启用"
                              style={{ color: "#52C4A0" }}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => disableMutation.mutate({ id: code.id })}
                              className="p-1.5 rounded-lg transition-colors"
                              title="禁用"
                              style={{ color: "#F4956A" }}
                            >
                              <Ban size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`确定删除邀请码 ${code.code}？`)) {
                                deleteMutation.mutate({ id: code.id });
                              }
                            }}
                            className="p-1.5 rounded-lg transition-colors"
                            title="删除"
                            style={{ color: "#E8728A" }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 用户列表 */}
        {activeTab === "users" && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(232,114,138,0.1)" }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(232,114,138,0.1)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#2D2D3A" }}>注册用户（共 {totalUsers} 人）</h3>
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin" style={{ color: "#E8728A" }} size={24} />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12" style={{ color: "#9B9BB8" }}>
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无注册用户</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(232,114,138,0.06)" }}>
                {/* 表头 */}
                <div className="grid grid-cols-5 px-6 py-2 text-xs font-medium" style={{ color: "#9B9BB8", background: "rgba(155,127,212,0.04)" }}>
                  <span>昵称</span>
                  <span>手机号</span>
                  <span>角色</span>
                  <span>邀请码</span>
                  <span>注册时间</span>
                </div>
                {users.map((u) => (
                  <div key={u.id} className="grid grid-cols-5 px-6 py-3 text-sm items-center hover:bg-pink-50/20 transition-colors">
                    <span className="font-medium" style={{ color: "#2D2D3A" }}>{u.nickname}</span>
                    <span className="font-mono text-xs" style={{ color: "#5A5A7A" }}>
                      {u.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
                    </span>
                    <span>
                      {u.role === "admin" ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(232,114,138,0.1)", color: "#C85A7A" }}>管理员</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(155,127,212,0.1)", color: "#7B5FC4" }}>普通用户</span>
                      )}
                    </span>
                    <span className="font-mono text-xs" style={{ color: "#9B7FD4" }}>{u.inviteCode ?? "—"}</span>
                    <span className="text-xs" style={{ color: "#9B9BB8" }}>
                      {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
