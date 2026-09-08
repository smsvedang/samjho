import { MistakeType, Question } from "./types";

export interface EvaluationResult {
  is_correct: boolean;
  confidence: number;
  mistake_type?: MistakeType;
  concept: string;
  explanation: string;
  feedback: string;
  needs_remediation: boolean;
}

/**
 * Normalizes string for robust comparison (strips punctuation, units like 'V', 'A', 'Ohms', whitespace)
 */
export function normalizeAnswer(ans: string): string {
  return ans
    .trim()
    .toLowerCase()
    .replace(/\\text\{[a-zA-Z]+\}/g, "")
    .replace(/[,\s$]/g, "")
    .replace(/(\.0+|0+)$/, "");
}

/**
 * Fast deterministic check for MCQs or precise numbers
 */
export function evaluateDirectly(
  question: Question,
  userAnswer: string
): EvaluationResult | null {
  const cleanUser = normalizeAnswer(userAnswer);
  const cleanCorrect = normalizeAnswer(question.correct_answer);

  // Exact or numeric match
  if (cleanUser === cleanCorrect) {
    return {
      is_correct: true,
      confidence: 1.0,
      concept: question.concept_tested,
      explanation: question.explanation,
      feedback: "Correct! Outstanding job on this concept.",
      needs_remediation: false,
    };
  }

  // If it's an MCQ and user answered another choice
  if (question.question_type === "mcq") {
    // Determine mistake type heuristic
    let mistakeType: MistakeType = "conceptual";
    if (question.concept_tested.includes("sign") || question.concept_tested.includes("unit")) {
      mistakeType = "sign_unit";
    }

    return {
      is_correct: false,
      confidence: 0.95,
      mistake_type: mistakeType,
      concept: question.concept_tested,
      explanation: question.explanation,
      feedback: `The correct answer is "${question.correct_answer}". ${question.explanation}`,
      needs_remediation: true,
    };
  }

  // For numerical with exact float parse
  const userNum = parseFloat(cleanUser);
  const correctNum = parseFloat(cleanCorrect);
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    const isClose = Math.abs(userNum - correctNum) < 0.01;
    if (isClose) {
      return {
        is_correct: true,
        confidence: 1.0,
        concept: question.concept_tested,
        explanation: question.explanation,
        feedback: "Correct calculation!",
        needs_remediation: false,
      };
    } else {
      // Check for sign error
      const isSignError = Math.abs(userNum + correctNum) < 0.01;
      return {
        is_correct: false,
        confidence: 0.9,
        mistake_type: isSignError ? "sign_unit" : "calculation",
        concept: question.concept_tested,
        explanation: question.explanation,
        feedback: isSignError
          ? `Check your sign convention! You got ${userAnswer}, but the magnitude requires the opposite sign: ${question.correct_answer}.`
          : `Calculation error. Correct answer is ${question.correct_answer}.`,
        needs_remediation: true,
      };
    }
  }

  // Delegate qualitative answers to AI evaluation
  return null;
}

/**
 * Evaluates open-ended/conceptual answer using Groq AI with structured JSON response
 */
export async function evaluateWithAI(
  question: Question,
  userAnswer: string,
  preferredLanguage: string = "hinglish"
): Promise<EvaluationResult> {
  const direct = evaluateDirectly(question, userAnswer);
  if (direct) return direct;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // Fallback if AI is offline
    const isExact = normalizeAnswer(userAnswer) === normalizeAnswer(question.correct_answer);
    return {
      is_correct: isExact,
      confidence: 0.7,
      mistake_type: isExact ? undefined : "conceptual",
      concept: question.concept_tested,
      explanation: question.explanation,
      feedback: isExact
        ? "Correct!"
        : `Expected: ${question.correct_answer}. ${question.explanation}`,
      needs_remediation: !isExact,
    };
  }

  const prompt = `You are an expert evaluator for Samjho AI learning platform.
Evaluate the student's answer to this question:

Topic Concept: ${question.concept_tested}
Question: ${question.question}
Expected Answer: ${question.correct_answer}
Official Explanation: ${question.explanation}
Student's Answer: "${userAnswer}"
Preferred Language: ${preferredLanguage}

Respond ONLY with a valid JSON object matching this schema:
{
  "is_correct": boolean,
  "confidence": number (between 0.0 and 1.0),
  "mistake_type": "conceptual" | "calculation" | "application" | "memory" | "sign_unit" | "careless" | "unknown" (null if correct),
  "concept": string (e.g. "${question.concept_tested}"),
  "explanation": "concise explanation of why the answer is right/wrong in ${preferredLanguage}",
  "feedback": "encouraging 1-2 sentence coaching feedback in ${preferredLanguage}",
  "needs_remediation": boolean
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Groq status ${response.status}`);
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<EvaluationResult>;

    return {
      is_correct: Boolean(parsed.is_correct),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.9,
      mistake_type: parsed.is_correct ? undefined : (parsed.mistake_type as MistakeType) || "conceptual",
      concept: parsed.concept || question.concept_tested,
      explanation: parsed.explanation || question.explanation,
      feedback: parsed.feedback || (parsed.is_correct ? "Well done!" : "Let's review this concept."),
      needs_remediation: parsed.is_correct ? false : Boolean(parsed.needs_remediation ?? true),
    };
  } catch (error) {
    console.error("AI evaluation failed, falling back to heuristic", error);
    const isExact = normalizeAnswer(userAnswer) === normalizeAnswer(question.correct_answer);
    return {
      is_correct: isExact,
      confidence: 0.8,
      mistake_type: isExact ? undefined : "conceptual",
      concept: question.concept_tested,
      explanation: question.explanation,
      feedback: isExact ? "Correct!" : question.explanation,
      needs_remediation: !isExact,
    };
  }
}
