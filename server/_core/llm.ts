import { env } from "./env";

export async function generateLLMResponse(prompt: string, systemInstruction?: string) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY chưa được cấu hình trên Vercel.");
  }

  try {
    const response = await fetch("https://openai.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        messages: [
          ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[OpenAI Error]:", errorData);
      throw new Error(`OpenAI trả về lỗi: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("[LLM Processing Error]:", error);
    throw new Error("Không thể kết nối hoặc xử lý dữ liệu qua dịch vụ OpenAI.");
  }
}
