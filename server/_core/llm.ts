import { env } from "./env";

export async function generateLLMResponse(
  prompt: string,
  systemInstruction?: string
) {
  const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY chưa được cấu hình. Vui lòng thêm biến môi trường trên Vercel."
    );
  }

  // Sử dụng mô hình được cấu hình hoặc mặc định mô hình rẻ/tiết kiệm gpt-4o-mini
  const model = env.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemInstruction
            ? [{ role: "system", content: systemInstruction }]
            : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[OpenAI Error Details]:", errorData);
      throw new Error(
        `OpenAI trả về lỗi (${response.status}): ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("[LLM Processing Error]:", error);
    throw new Error("Không thể kết nối hoặc xử lý dữ liệu qua dịch vụ OpenAI.");
  }
}
