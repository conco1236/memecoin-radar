export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET || "radar-fallback-secret-key-change-me",
  
  // Cấu hình kết nối trực tiếp đến OpenAI 
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",

  // Hệ thống kết nối và thông báo qua Bot Telegram của bạn
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
};

// Backwards-compatible alias: some files import { ENV } from './env.js'
export const ENV = env;
