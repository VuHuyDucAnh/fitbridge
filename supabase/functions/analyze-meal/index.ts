// FitBridge — analyze a meal photo into items + calorie/macro estimates.
// Uses a FREE vision model via OpenRouter when OPENROUTER_API_KEY is configured
// (as a Supabase Edge Function secret, so the key never reaches the browser).
// If no key is set, responds { configured: false } and the client falls back to
// manual entry — the feature always works, AI just makes it faster.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-2.0-flash-exp:free";

const PROMPT = `You are a nutrition estimator. Look at the food photo and respond with ONLY compact JSON, no prose:
{"items":["short item with rough qty", ...],"kcal":<int>,"protein":<int g>,"carbs":<int g>,"fat":<int g>}
Estimate the whole plate. If unsure, give your best reasonable estimate. Never return text outside the JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const key = Deno.env.get("OPENROUTER_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ configured: false }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const { image } = await req.json(); // data URL or base64
    if (!image) {
      return new Response(JSON.stringify({ error: "no-image" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 400,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return new Response(JSON.stringify({ configured: true, error: "model", detail }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const match = String(raw).match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ configured: true, error: "parse", raw }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(match[0]);
    const clean = {
      configured: true,
      items: Array.isArray(parsed.items) ? parsed.items.slice(0, 12).map(String) : [],
      kcal: Math.max(0, Math.round(Number(parsed.kcal) || 0)),
      protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
      carbs: Math.max(0, Math.round(Number(parsed.carbs) || 0)),
      fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
    };
    return new Response(JSON.stringify(clean), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ configured: true, error: String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
