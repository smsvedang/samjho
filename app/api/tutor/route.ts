import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI provider is not configured" }, { status: 503 });

  const body = await request.json() as { prompt?: string; messages?: ChatMessage[] };
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ error: "A prompt is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  let settings = {
    brand_name: "Samjho",
    default_language: "hinglish",
    tutor_instructions: "Teach for understanding. Adapt your explanation when the learner struggles.",
    enabled_strategies: ["simple_definition", "real_life_analogy", "step_by_step", "mental_visualization", "socratic"],
    max_input_length: 10000,
    max_context_messages: 20,
  };
  if (supabase) {
    const { data } = await supabase.from("app_settings").select("brand_name, default_language, tutor_instructions, enabled_strategies, max_input_length, max_context_messages").eq("id", 1).maybeSingle();
    if (data) settings = { ...settings, ...data, enabled_strategies: Array.isArray(data.enabled_strategies) ? data.enabled_strategies : settings.enabled_strategies };
  }
  if (prompt.length > settings.max_input_length) return NextResponse.json({ error: `Keep your question under ${settings.max_input_length} characters.` }, { status: 400 });

  const context = (body.messages ?? []).filter((message) => message.role === "user" || message.role === "assistant").slice(-settings.max_context_messages);
  const system = `You are ${settings.brand_name}, an adaptive AI tutor. Teach for understanding, not just answers. Use ${settings.default_language} unless the learner asks for another language. ${settings.tutor_instructions} Available teaching strategies: ${settings.enabled_strategies.join(", ")}. Be accurate, clear, and concise. Ask a useful follow-up question when appropriate. Format math with Markdown-compatible LaTeX: use $...$ for inline math and $$...$$ for display math. Do not wrap formulas in plain square brackets, and do not escape subscript underscores inside math. For example, write $$\\sum_{i=1}^{n} V_i = 0$$.`;
  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", reasoning_effort: "low", temperature: 0.7, max_tokens: 1200, messages: [{ role: "system", content: system }, ...context, { role: "user", content: prompt }] }),
    });
  } catch (error) {
    console.error("Groq request could not be reached", error);
    return NextResponse.json({ error: "The tutor is temporarily unavailable" }, { status: 502 });
  }
  if (!response.ok) {
    console.error("Groq request failed", response.status, await response.text());
    return NextResponse.json({ error: "The tutor is temporarily unavailable" }, { status: 502 });
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return NextResponse.json({ error: "The tutor returned an empty answer" }, { status: 502 });
  return NextResponse.json({ content });
}
