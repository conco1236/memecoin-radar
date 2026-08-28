import { useCallback, useEffect, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export interface UserInfo {
  email: string;
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Hàm tải thông tin phiên làm việc từ API Express mới
  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          setUser(data.user);
          localStorage.setItem("manus-runtime-user-info", JSON.stringify(data.user));
          return;
        }
      }
      setUser(null);
      localStorage.removeItem("manus-runtime-user-info");
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setUser(null);
    } finaly {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Hàm Đăng xuất (Logout) xóa sạch dữ liệu phiên và cookie
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      document.cookie = "user_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
      try {
        sessionStorage.removeItem("manus-cookie");
        localStorage.removeItem("manus-runtime-user-info");
      } catch {}
      setUser(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finaly {
      setLoading(false);
    }
  }, []);

  // Xử lý chuyển hướng trang tự động nếu yêu cầu đăng nhập
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    }
    // Loại bỏ hoàn toàn cổng startLogin() điều hướng Manus cũ tại đây
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
