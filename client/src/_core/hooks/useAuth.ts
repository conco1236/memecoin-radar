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

  // Hàm tải/kiểm tra thông tin phiên làm việc từ API Express mới
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
    } finally {
      setLoading(false);
    }
  }, []);

  // Gọi kiểm tra phiên làm việc ngay khi Hook khởi tạo trên giao diện
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Hàm Đăng xuất (Logout) xóa sạch dữ liệu phiên và cookie
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Ghi đè cookie bằng giá trị rỗng và đặt thời gian hết hạn ngay lập tức
      document.cookie = "user_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
      
      // Xóa bộ nhớ cache cục bộ
      try {
        sessionStorage.removeItem("manus-cookie");
        localStorage.removeItem("manus-runtime-user-info");
      } catch {}
      
      setUser(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  // Xử lý chuyển hướng trang tự động nếu chưa xác thực (Unauthenticated)
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    }
    // Đã loại bỏ lệnh gọi startLogin() của Manus cũ để tránh loop chuyển hướng lỗi
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
