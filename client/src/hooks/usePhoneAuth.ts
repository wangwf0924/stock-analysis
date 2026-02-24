/**
 * 手机号认证 Hook
 * 封装 trpc.phoneAuth.me 查询，提供统一的认证状态
 */

import { trpc } from "@/lib/trpc";

export function usePhoneAuth() {
  const { data: user, isLoading, refetch } = trpc.phoneAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    refetch,
  };
}
