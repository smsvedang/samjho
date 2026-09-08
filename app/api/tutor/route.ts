import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };
type WorksheetQuestion = { question: string; options?: string[]; answer?: string };
type Worksheet = { title: string; subject: string; instructions: string; questions: WorksheetQuestion[]; answerKey?: string[] };

export interface LearningContextInput {
  education_level?: string;
  subject?: string;
  topic?: string;
  mastery?: number;
  weaknesses?: string[];
  recent_accuracy?: number;
  preferred_language?: string;
  action_type?: "explain" | "teach_me" | "example" | "hint" | "step" | "explain_mistake" | "revise";
}

function isWorksheetRequest(prompt: string) {
  return /\b(questions?|quiz|test|worksheet|practice problems?|mcqs?|question paper)\b|प्रश्न|सवाल|questions?\s+(bana|make|generate|create)|प्रश्न\s*(बना|बनाओ|तैयार)/i.test(prompt);
}

function parseWorksheet(content: string): Worksheet | null {
  const candidate = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(candidate) as Partial<Worksheet>;
    if (!parsed.title || !Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
    const questions = parsed.questions.filter((question): question is WorksheetQuestion => Boolean(question && typeof question.question === "string"));
    return questions.length ? { title: parsed.title, subject: parsed.subject || "", instructions: parsed.instructions || "Answer each question.", questions, answerKey: parsed.answerKey } : null;
  } catch {
    return null;
  }
}

function worksheetMarkdown(worksheet: Worksheet) {
  const marker = `<!-- SAMJHO_WORKSHEET\n${JSON.stringify(worksheet)}\n-->`;
  const questions = worksheet.questions.map((question, index) => `${index + 1}. ${question.question}${question.options?.length ? `\n   ${question.options.map((option) => `- ${option}`).join("\n   ")}` : "\n   \n   Answer: ______________________________"}`).join("\n\n");
  return `${marker}\n\n## ${worksheet.title}\n\n${worksheet.instructions}\n\n${questions}`;
}

export async function POST(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return NextResponse.json({ error: "AI provider is not configured" }, { status: 503 });

  const body = await request.json() as {
    prompt?: string;
    messages?: ChatMessage[];
    learning_context?: LearningContextInput;
  };
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
  const worksheetRequest = isWorksheetRequest(prompt);
  const userLang = body.learning_context?.preferred_language || settings.default_language;
  const languageInstruction = `Detect the language of the learner's latest message and reply in that same language. The latest message has priority over older messages and the configured default. If the latest message is clearly English, reply entirely in English; if it is Hindi, reply in Hindi; if it is Hinglish, reply in natural Hinglish; and apply the same rule to any other language you can understand. Do not translate unless asked. Use ${userLang} only when the message is too short or language-neutral to identify. Technical terms must remain standard and accurate.`;

  // Dynamic pedagogical adaptation based on student learning context
  let adaptationDirectives = "";
  if (body.learning_context) {
    const lc = body.learning_context;
    const mastery = typeof lc.mastery === "number" ? lc.mastery : null;
    const weaknesses = lc.weaknesses?.length ? lc.weaknesses.join(", ") : null;

    if (mastery !== null && mastery < 50) {
      adaptationDirectives += " The student is currently in the fundamental learning stage for this topic. Explain starting from simple first principles, break concepts down step-by-step, use real-life analogies, and avoid overwhelming jargon.";
    } else if (mastery !== null && mastery >= 75) {
      adaptationDirectives += " The student has strong baseline understanding. Provide deep, concise, exam-level or application-oriented insight and suggest an interesting edge-case or challenge problem.";
    }

    if (weaknesses) {
      adaptationDirectives += ` Note recurring areas where the student has struggled: [${weaknesses}]. Pay special attention to clarifying these points clearly.`;
    }

    if (lc.action_type === "hint") {
      adaptationDirectives += " The student requested a hint. DO NOT give the full solution. Provide a constructive nudging hint that guides their next step.";
    } else if (lc.action_type === "step") {
      adaptationDirectives += " The student requested the next step. Reveal only the immediate next logical step and ask them to deduce what comes next.";
    } else if (lc.action_type === "explain_mistake") {
      adaptationDirectives += " Analyze the mistake with extreme clarity. Explain why the misconception happened and how to avoid it in similar problems.";
    }
  }

  const system = worksheetRequest
    ? `You are ${settings.brand_name}, an adaptive AI tutor. The learner wants a question worksheet. ${languageInstruction} Return ONLY valid JSON, with no Markdown or code fences, matching this shape: {"title":"...","subject":"...","instructions":"...","questions":[{"question":"...","options":["..."],"answer":"..."}],"answerKey":["..."]}. Generate 8-12 accurate, age-appropriate questions about the requested topic. Mix conceptual and application questions. Include options only for multiple-choice questions; omit options for open questions. Keep answers concise. Do not leave questions blank.`
    : `You are ${settings.brand_name}, an adaptive AI tutor. Teach for understanding, not just answers. ${languageInstruction} ${settings.tutor_instructions} ${adaptationDirectives} Available teaching strategies: ${settings.enabled_strategies.join(", ")}. Be accurate, clear, and concise. Ask a useful follow-up question when appropriate. Format math with Markdown-compatible LaTeX: use $...$ for inline math and $$...$$ for display math. Do not wrap formulas in plain square brackets, and do not escape subscript underscores inside math. For example, write $$\\sum_{i=1}^{n} V_i = 0$$.`;

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", reasoning_effort: "low", temperature: worksheetRequest ? 0.4 : 0.7, max_tokens: worksheetRequest ? 3500 : 1200, messages: [{ role: "system", content: system }, ...(worksheetRequest ? [] : context), { role: "user", content: prompt }] }),
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
  if (worksheetRequest) {
    const worksheet = parseWorksheet(content);
    if (!worksheet) return NextResponse.json({ error: "I could not format that worksheet. Please try the request again with a topic and class level." }, { status: 502 });
    return NextResponse.json({ content: worksheetMarkdown(worksheet) });
  }
  return NextResponse.json({ content });
}
