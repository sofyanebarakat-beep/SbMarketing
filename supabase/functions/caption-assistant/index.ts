// SB Marketing — caption assistant for Admin → Client portal → Content calendar.
// Suggests a new caption or rewrites the current one in the client's tone of
// voice (clients.brand_tone + a few of their recent captions as examples).
//
// Deploy:  supabase functions deploy caption-assistant
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Only the SB Marketing admin account may call it (checked below on top of
// the platform's verify_jwt), because every call is billed.
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ADMIN_EMAIL = "sofyanebarakat@gmail.com";

interface Body {
  mode: "suggest" | "rewrite";
  business_name?: string;
  activity?: string;
  language?: "fr" | "en";
  tone?: string;
  examples?: string[];
  topic?: string;
  format?: string;
  platforms?: string[];
  caption?: string;
  instructions?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function isAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") || "";
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!auth || !url || !anon) return false;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } });
  if (!res.ok) return false;
  const user = await res.json();
  return String(user?.email || "").toLowerCase() === ADMIN_EMAIL;
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return json({ error: "Caption assistant is not set up: add the ANTHROPIC_API_KEY secret to the caption-assistant function." }, 503);
  if (!(await isAdmin(req))) return json({ error: "Not allowed" }, 403);

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const mode = body.mode === "rewrite" ? "rewrite" : "suggest";
  if (mode === "rewrite" && !String(body.caption || "").trim()) return json({ error: "Write a caption first, then ask for a rewrite." }, 400);

  const lang = body.language === "en" ? "English" : "French";
  const examples = (body.examples || []).filter(Boolean).slice(0, 6).map((e, i) => `Example ${i + 1}:\n${String(e).slice(0, 1200)}`).join("\n\n");
  const system = [
    "You write social media captions for small local businesses on behalf of the marketing agency SB Marketing.",
    `Write in ${lang}. Match the brand's tone of voice exactly; if example captions are given, mirror their style, length, emoji use and hashtag habits.`,
    "Keep captions natural and specific to the business, with a clear call to action when it fits. Add a few relevant hashtags at the end unless the examples show none.",
    "Return only the caption text, with no preamble, quotes or explanation.",
  ].join(" ");
  const brief = [
    `Business: ${body.business_name || "(unknown)"}${body.activity ? ` — ${body.activity}` : ""}`,
    body.tone ? `Tone of voice: ${body.tone}` : "",
    `Networks: ${(body.platforms || []).join(", ") || "Instagram"}`,
    body.format ? `Format: ${body.format}` : "",
    body.topic ? `Post topic: ${body.topic}` : "",
    examples ? `Recent captions from this brand:\n\n${examples}` : "",
    mode === "rewrite" ? `Rewrite this caption in the brand's tone, keeping its meaning:\n\n${body.caption}` : "Write one new caption for this post.",
    body.instructions ? `Extra instructions: ${body.instructions}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: brief }],
    });
    if (response.stop_reason === "refusal") return json({ error: "The assistant could not write this caption. Try rephrasing the topic." }, 422);
    const text = response.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("").trim();
    if (!text) return json({ error: "No caption was returned. Try again." }, 502);
    return json({ caption: text });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return json({ error: "Too many requests — try again in a minute." }, 429);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: "The ANTHROPIC_API_KEY secret is invalid." }, 500);
    if (error instanceof Anthropic.APIError) return json({ error: `Assistant error (${error.status}).` }, 502);
    return json({ error: "Assistant unavailable." }, 502);
  }
});
