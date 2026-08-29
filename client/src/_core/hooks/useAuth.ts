import { useCallback, useEffect, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export interface UserInfo {
  email: string;
  id?: string;
  name?: string;
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};

  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Lấy thông tin người dùng từ API xác thực chuẩn
  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          localStorage.setItem("user_info", JSON.stringify(data.user));
          return;
        }
      }
      setUser(null);
      localStorage.removeItem("user_info");
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Xử lý đăng xuất phiên làm việc
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Gọi API đăng xuất nếu có
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});

      // Xóa cookie phiên
      document.cookie =
        "user_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";

      // Xóa thông tin lưu trữ tại trình duyệt
      try {
        localStorage.removeItem("user_info");
        sessionStorage.clear();
      } catch {}

      setUser(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Xử lý chuyển hướng nếu chưa đăng nhập
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    }
  }, [redirectOnUnauthenticated, redirectPath, loading, user]);

  return {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    refresh: fetchMe,
    logout,
  };
}
