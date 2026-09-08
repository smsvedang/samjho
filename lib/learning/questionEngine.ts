import { Question, QuestionType } from "./types";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface QuestionGenerationParams {
  topic_id: string;
  topic_name: string;
  subject_id?: string;
  subject_name?: string;
  difficulty?: number; // 1 to 6
  weak_concepts?: string[];
  target_concept?: string;
  question_types?: QuestionType[];
  exclude_question_ids?: string[];
  count?: number;
  language?: string;
}

/**
 * Calculates adapted difficulty based on recent attempts
 */
export function getAdaptedDifficulty(
  recentAttempts: Array<{ is_correct: boolean; difficulty: number }>,
  currentDifficulty: number = 2
): number {
  if (!recentAttempts || recentAttempts.length === 0) {
    return Math.max(1, Math.min(6, currentDifficulty));
  }

  const lastAttempts = recentAttempts.slice(-4);
  let consecutiveCorrect = 0;
  let consecutiveIncorrect = 0;

  for (let i = lastAttempts.length - 1; i >= 0; i--) {
    if (lastAttempts[i].is_correct) {
      if (consecutiveIncorrect === 0) consecutiveCorrect++;
      else break;
    } else {
      if (consecutiveCorrect === 0) consecutiveIncorrect++;
      else break;
    }
  }

  if (consecutiveCorrect >= 3) {
    return Math.min(6, currentDifficulty + 1);
  } else if (consecutiveIncorrect >= 2) {
    return Math.max(1, currentDifficulty - 1);
  }

  return Math.max(1, Math.min(6, currentDifficulty));
}

/**
 * Fetches questions from Supabase or dynamically generates with Groq AI
 */
export async function getAdaptiveQuestions(
  params: QuestionGenerationParams
): Promise<Question[]> {
  const {
    topic_id,
    topic_name,
    subject_id,
    difficulty = 2,
    weak_concepts = [],
    target_concept,
    exclude_question_ids = [],
    count = 3,
    language = "hinglish",
  } = params;

  const supabase = getSupabaseServerClient();
  const collectedQuestions: Question[] = [];

  // 1. Try to fetch from database question bank
  if (supabase) {
    let query = supabase
      .from("questions")
      .select("*")
      .eq("topic_id", topic_id)
      .eq("difficulty", difficulty);

    if (exclude_question_ids.length > 0) {
      query = query.not("id", "in", `(${exclude_question_ids.join(",")})`);
    }

    if (target_concept) {
      query = query.eq("concept_tested", target_concept);
    }

    const { data, error } = await query.limit(count);
    if (!error && data && data.length > 0) {
      for (const row of data) {
        collectedQuestions.push({
          id: row.id,
          subject_id: row.subject_id,
          topic_id: row.topic_id,
          concept_tested: row.concept_tested,
          question_type: row.question_type as QuestionType,
          difficulty: row.difficulty,
          question: row.question,
          options: Array.isArray(row.options) ? row.options : [],
          correct_answer: row.correct_answer,
          explanation: row.explanation || "",
          solution_steps: Array.isArray(row.solution_steps) ? row.solution_steps : [],
          hints: Array.isArray(row.hints) ? row.hints : [],
        });
      }
    }
  }

  // If we have enough questions from bank, return them
  if (collectedQuestions.length >= count) {
    return collectedQuestions.slice(0, count);
  }

  // 2. Generate remaining questions dynamically via Groq AI
  const needed = count - collectedQuestions.length;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    // If no AI key and bank has at least something, return what we have or a mock fallback
    if (collectedQuestions.length > 0) return collectedQuestions;
    return [
      {
        id: `mock-${Date.now()}-1`,
        subject_id: subject_id || "default",
        topic_id,
        concept_tested: target_concept || weak_concepts[0] || "core_principles",
        question_type: "mcq",
        difficulty,
        question: `Consider the fundamental rule of ${topic_name}. Which statement accurately describes its behavior?`,
        options: [
          "It satisfies conservation laws throughout the closed network.",
          "It applies only when resistance is zero.",
          "It operates independently of source voltages.",
          "It is only valid for AC circuits.",
        ],
        correct_answer: "It satisfies conservation laws throughout the closed network.",
        explanation: `${topic_name} applies universally across linear and non-linear lumped networks.`,
        solution_steps: [
          "Identify the core governing law.",
          "Verify the boundary condition.",
          "Select the conservation principle.",
        ],
        hints: ["Think about basic physical conservation principles."],
      },
    ];
  }

  const prompt = `You are the lead Question Engine for Samjho AI (an adaptive learning platform).
Generate ${needed} high-quality, pedagogically sound questions for:

Topic: "${topic_name}"
Target Difficulty: Level ${difficulty} of 6 (Scale: 1=Recall, 2=Direct application, 3=Multi-step, 4=Conceptual/Application, 5=Exam-level, 6=Challenge).
Focus Concepts: ${target_concept ? `"${target_concept}"` : weak_concepts.length ? weak_concepts.join(", ") : "core concepts"}
Language Context: ${language}

REQUIREMENTS:
- Do NOT generate trivial questions.
- Format all math with Markdown LaTeX: $...$ for inline math and $$...$$ for display math.
- Mix question types (mostly 'mcq' with 4 distinct options, and 'numerical' where options are []).
- Provide step-by-step solutions and hints.

Return ONLY a valid JSON array of objects matching this exact TypeScript structure:
[
  {
    "concept_tested": "snake_case_concept_name",
    "question_type": "mcq" | "numerical" | "fill_blank" | "conceptual",
    "difficulty": ${difficulty},
    "question": "Clear problem statement with LaTeX math...",
    "options": ["Option A", "Option B", "Option C", "Option D"], // or [] for numerical
    "correct_answer": "Exact correct answer",
    "explanation": "Clear explanation of why this is correct",
    "solution_steps": ["Step 1...", "Step 2..."],
    "hints": ["Helpful guided hint without giving away the full answer"]
  }
]`;

  try {
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        temperature: 0.5,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (aiResponse.ok) {
      const data = await aiResponse.json();
      const content = data.choices?.[0]?.message?.content?.trim() || "[]";
      const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const generatedList = JSON.parse(cleaned) as Array<Partial<Question>>;

      for (const item of generatedList) {
        if (item.question && item.correct_answer) {
          const newQ: Question = {
            id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            subject_id: subject_id || "default",
            topic_id,
            concept_tested: item.concept_tested || "core_concept",
            question_type: (item.question_type as QuestionType) || "mcq",
            difficulty: item.difficulty || difficulty,
            question: item.question,
            options: Array.isArray(item.options) ? item.options : [],
            correct_answer: item.correct_answer,
            explanation: item.explanation || "",
            solution_steps: Array.isArray(item.solution_steps) ? item.solution_steps : [],
            hints: Array.isArray(item.hints) ? item.hints : [],
          };

          // Optionally store question into Supabase question bank for reusability
          if (supabase && subject_id) {
            void supabase.from("questions").insert({
              subject_id,
              topic_id,
              concept_tested: newQ.concept_tested,
              question_type: newQ.question_type,
              difficulty: newQ.difficulty,
              question: newQ.question,
              options: newQ.options,
              correct_answer: newQ.correct_answer,
              explanation: newQ.explanation,
              solution_steps: newQ.solution_steps,
              hints: newQ.hints,
            });
          }

          collectedQuestions.push(newQ);
        }
      }
    }
  } catch (error) {
    console.error("AI question generation error", error);
  }

  return collectedQuestions.slice(0, count);
}
