import { ENV } from "./_core/env";
import type { RadarToken } from "./marketData.js";

export type TelegramLocale = "vi" | "en";

/**
 * Hàm định dạng thông tin Token theo ngôn ngữ được chọn
 */
function formatToken(token: RadarToken, locale: TelegramLocale) {
  const title = locale === "vi" ? "Token" : "Token";
  const potential = locale === "vi" ? "tiềm năng" : "potential";
  const risk = locale === "vi" ? "rủi ro" : "risk";
  return `• ${title} ${token.symbol} (${token.chainName}) — ${potential} ${token.potentialScore}/100, ${risk} ${token.riskScore}/100\n  ${token.url}`;
}

/**
 * Hàm gửi cảnh báo về sức khỏe nguồn dữ liệu (Data Source Health)
 */
export async function sendTelegramSourceHealthAlert(lines: string[], locale: TelegramLocale) {
  // Đồng bộ sử dụng ENV tập trung thay vì gọi trực tiếp process.env
  const token = ENV.telegramBotToken;
  const chatId = ENV.telegramChatId;
  
  if (!token || !chatId) {
    throw new Error("Telegram chưa được cấu hình ở phía server. Vui lòng kiểm tra Vercel Environment Variables.");
  }
  if (lines.length === 0) return { sent: false, count: 0 };

  const heading = locale === "vi" ? "MEMECOIN RADAR / SỨC KHỎE NGUỒN DỮ LIỆU" : "MEMECOIN RADAR / DATA SOURCE HEALTH";
  const disclaimer = locale === "vi" ? "Chỉ giám sát dữ liệu nghiên cứu — không phải lời khuyên tài chính." : "Research data monitoring only — not financial advice.";
  
  // Sửa lỗi: Đổi '\\n' thành '\n' để tin nhắn xuống dòng chính xác trên Telegram
  const text = `${heading}\n\n${lines.join("\n")}\n\n${disclaimer}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: text, 
        disable_web_page_preview: true 
      }),
    });

    if (!response.ok) throw new Error(`Telegram API returned HTTP ${response.status}`);
    
    const payload = await response.json() as { ok?: boolean };
    if (!payload.ok) throw new Error("Telegram rejected the health alert");
    
    return { sent: true, count: lines.length };
  } catch (error) {
    console.error("[Telegram Error] Lỗi gửi tin nhắn sức khỏe nguồn:", error);
    throw error;
  }
}

/**
 * Hàm gửi cảnh báo nghiên cứu danh sách Token tiềm năng (Research Alert)
 */
export async function sendTelegramResearchAlert(tokens: RadarToken[], locale: TelegramLocale) {
  // Đồng bộ sử dụng ENV tập trung
  const token = ENV.telegramBotToken;
  const chatId = ENV.telegramChatId;

  if (!token || !chatId) {
    throw new Error("Telegram chưa được cấu hình ở phía server. Vui lòng kiểm tra Vercel Environment Variables.");
  }
  if (tokens.length === 0) return { sent: false, count: 0 };

  const heading = locale === "vi" ? "MEMECOIN RADAR / CẢNH BÁO NGHIÊN CỨU" : "MEMECOIN RADAR / RESEARCH ALERT";
  const disclaimer = locale === "vi" ? "Chỉ nghiên cứu — không phải lời khuyên tài chính, không có mua/bán tự động." : "Research only — not financial advice, no automated buying or selling.";
  
  const text = `${heading}\n\n${tokens.slice(0, 10).map(item => formatToken(item, locale)).join("\n")}\n\n${disclaimer}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: text, 
        disable_web_page_preview: true 
      }),
    });

    if (!response.ok) throw new Error(`Telegram API trả về HTTP ${response.status}`);
    
    const payload = await response.json() as { ok?: boolean };
    if (!payload.ok) throw new Error("Telegram không chấp nhận bản tin");
    
    return { sent: true, count: Math.min(tokens.length, 10) };
  } catch (error) {
    console.error("[Telegram Error] Lỗi gửi tin nhắn cảnh báo nghiên cứu:", error);
    throw error;
  }
}

/**
 * Hàm bổ sung: Kiểm tra nhanh trạng thái kết nối của Bot (Health Check)
 */
export async function testTelegramConnection(): Promise<boolean> {
  const token = ENV.telegramBotToken;
  if (!token) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json() as { ok?: boolean; result?: { username: string } };
    if (data.ok && data.result) {
      console.log(`[Telegram Check] Kết nối thành công tới Bot: @${data.result.username}`);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
