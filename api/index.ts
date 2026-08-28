import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";

import { db } from "../server/db.js";
import { users } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { ENV } from "../server/_core/env.js";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Hàm băm mật khẩu bảo mật sử dụng crypto tích hợp sẵn của NodeJS
function hashPassword(password: string): string {
  return crypto.createHmac("sha256", ENV.cookieSecret).update(password).digest("hex");
}

// ====================================================
// 1. API EXPRESS XỬ LÝ ĐĂNG KÝ TÀI KHOẢN BẰNG EMAIL
// ====================================================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });
    }

    // Kiểm tra xem Email đã tồn tại trong DB chưa
    const checkUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (checkUser.length > 0) {
      return res.status(400).json({ error: "Email này đã được sử dụng" });
    }

    // Thêm người dùng mới khớp hoàn toàn với định dạng schema MySQL mới
    await db.insert(users).values({
      email: email,
      passwordHash: hashPassword(password),
      role: "user"
    });

    return res.status(200).json({ success: true, message: "Đăng ký thành công!" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================
// 2. API EXPRESS XỬ LÝ ĐĂNG NHẬP TÀI KHOẢN BẰNG EMAIL
// ====================================================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });
    }

    const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // So sánh mật khẩu băm hash mã hóa bảo mật
    if (userRecord.length === 0 || userRecord[0].passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Tài khoản hoặc mật khẩu không chính xác" });
    }

    // Cập nhật thời gian đăng nhập gần nhất (lastSignedIn) bằng MySQL Core
    await db.update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, userRecord[0].id));

    // Tạo một chuỗi Session Token đơn giản lưu vào Cookie
    const sessionData = JSON.stringify({ userId: userRecord[0].id, email: userRecord[0].email });
    const encodedSession = Buffer.from(sessionData).toString("base64");

    // Thiết lập cookie phản hồi trên Express
    res.setHeader("Set-Cookie", `user_session=${encodedSession}; Path=/; HttpOnly; Max-Age=604800; SameSite=Strict`);
    return res.status(200).json({ success: true, email: userRecord[0].email });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================================================
// 3. API LẤY THÔNG TIN PHIÊN ĐĂNG NHẬP HIỆN TẠI (GET ME)
// ====================================================
app.get("/api/auth/me", (req, res) => {
  try {
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/user_session=([^;]+)/);
    
    if (!match) {
      return res.status(401).json({ user: null });
    }

    // Giải mã chuỗi base64 ngược lại thành object JSON để lấy email user
    const decodedSession = Buffer.from(match[1], "base64").toString("utf-8");
    const sessionObj = JSON.parse(decodedSession);

    return res.status(200).json({ user: { email: sessionObj.email } });
  } catch {
    return res.status(401).json({ user: null });
  }
});

// ====================================================
// 4. GIỮ NGUYÊN CỔNG ĐỊNH TUYẾN tRPC TIÊU CHUẨN CỦA DỰ ÁN
// ====================================================
app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default app;
