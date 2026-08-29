import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "default_fallback_secret_key"
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return res.status(200).json({ success: true, user: payload });
  } catch (error) {
    return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
}
