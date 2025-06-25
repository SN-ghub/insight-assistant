// api/ai-analyze.js

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight support
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  // Validate payload
  const { csv } = req.body || {};
  if (!csv) {
    return res.status(400).json({ error: "Missing csv field" });
  }

  // If no API key configured, return stubbed response (free-tier mode)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    // Stub data for testing without API access
    const stubYears = [2005, 2006, 2007, 2008, 2009];
    const stubValues = [10, 12, 9, 11, 13];
    return res.status(200).json({
      summary: "🤖 [stub] No API key configured. Showing sample AI summary: malaria incidence rose slightly from 10 to 13 between 2005 and 2009.",
      chart: { years: stubYears, values: stubValues, label: "Stub Value" }
    });
  }

  // Real OpenAI call
  try {
    const openaiResp = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are a data-analyst AI. Return JSON with keys: summary (<=120 words) and chart {years, values, label}. Respond with ONLY JSON.",
            },
            { role: "user", content: `Analyze this CSV:\n${csv}` },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResp.ok) {
      const txt = await openaiResp.text();
      console.error("OpenAI error:", txt);
      return res.status(502).json({ error: "OpenAI request failed" });
    }

    const { choices } = await openaiResp.json();
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(200)
      .json(JSON.parse(choices[0].message.content));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}
