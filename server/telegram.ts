import type { RadarToken } from "./marketData";

export type TelegramLocale = "vi" | "en";

function formatToken(token: RadarToken, locale: TelegramLocale) {
  const title = locale === "vi" ? "Token" : "Token";
  const potential = locale === "vi" ? "tiềm năng" : "potential";
  const risk = locale === "vi" ? "rủi ro" : "risk";
  return `• ${title} ${token.symbol} (${token.chainName}) — ${potential} ${token.potentialScore}/100, ${risk} ${token.riskScore}/100\n  ${token.url}`;
}

export async function sendTelegramResearchAlert(tokens: RadarToken[], locale: TelegramLocale) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram chưa được cấu hình ở phía server");
  if (tokens.length === 0) return { sent: false, count: 0 };
  const heading = locale === "vi" ? "MEMECOIN RADAR / CẢNH BÁO NGHIÊN CỨU" : "MEMECOIN RADAR / RESEARCH ALERT";
  const disclaimer = locale === "vi" ? "Chỉ nghiên cứu — không phải lời khuyên tài chính, không có mua/bán tự động." : "Research only — not financial advice, no automated buying or selling.";
  const text = `${heading}\n\n${tokens.slice(0, 10).map(item => formatToken(item, locale)).join("\n")}\n\n${disclaimer}`;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram API trả về HTTP ${response.status}`);
  const payload = await response.json() as { ok?: boolean };
  if (!payload.ok) throw new Error("Telegram không chấp nhận bản tin");
  return { sent: true, count: Math.min(tokens.length, 10) };
}
