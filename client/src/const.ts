import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Giá trị mặc định chạy thử khi chưa điền biến môi trường trên Vercel
const DEFAULT_TELEGRAM_BOT_USERNAME = "Dien_Username_Bot_Cua_Ban_Vao_Day";

export const getOAuthConfig = () => ({
  // Đọc cấu hình tên Bot Telegram thay vì Portal của Manus
  botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || DEFAULT_TELEGRAM_BOT_USERNAME,
});

export const startLogin = () => {
  const { botUsername } = getOAuthConfig();
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  // Giữ nguyên luồng tạo mã mã hóa nonce & ghi cookie an toàn gốc của bạn
  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  // Tạo URL chuyển hướng đăng nhập chuẩn qua widget/bot Telegram của riêng bạn
  const url = new URL(`https://t.me{botUsername}`);
  url.searchParams.set("start", `auth_${state}`);

  window.location.href = url.toString();
};
