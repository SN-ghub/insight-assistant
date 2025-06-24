// api/ai-analyze.js
import fetch from "node-fetch";           // <–– Node 18 includes fetch, but explicit is fine.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { csv } = req.body || {};
  if (!csv) return res.status(400).json({ error: "Missing csv field" });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY not set");
    return res.status(500).json({ error: "Server mis-config" });
  }

  try {
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",          // or “gpt-4o” if you have access
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a data-analyst AI. Return JSON with keys: summary (<=120 words) and chart {years, values, label}. Respond with **ONLY** JSON.",
          },
          {
            role: "user",
            content: `Analyze this CSV:\n${csv}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResp.ok) {
      const txt = await openaiResp.text();
      console.error("OpenAI error:", txt);
      return res.status(502).json({ error: "OpenAI request failed" });
    }

    const { choices } = await openaiResp.json();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(JSON.parse(choices[0].message.content));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
