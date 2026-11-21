export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    const systemPrompt = {
      role: "system",
      content: "you are Orion A ai tasked to help answer question that are asked"
    };

    const groqResponse = await fetch("https://groq.com", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen/qwen3-32b",
        messages: [systemPrompt, ...messages],
        temperature: 0.6,
        max_completion_tokens: 2048,
        top_p: 0.95,
        stream: false
      })
    });

    const data = await groqResponse.json();
    return res.status(groqResponse.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
