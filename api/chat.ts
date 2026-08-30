export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    return res.status(200).json({
      success: true,
      reply: `Đã phản hồi: ${message || "Không có nội dung"}`,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
