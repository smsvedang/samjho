import { Question, TestResult, TestQuestionRecord } from "./types";
import { getAdaptiveQuestions } from "./questionEngine";
import { evaluateWithAI } from "./evaluationEngine";

export interface CreateTestOptions {
  topic_id: string;
  topic_name: string;
  subject_id?: string;
  question_count?: number;
  difficulty?: number;
  language?: string;
}

export interface SubmitTestOptions {
  test_id: string;
  user_id: string;
  topic_id: string;
  topic_name: string;
  time_taken_seconds: number;
  questions: Question[];
  user_answers: Record<string, string>;
  language?: string;
}

/**
 * Creates questions for a formal topic test
 */
export async function createTopicTestQuestions(
  options: CreateTestOptions
): Promise<Question[]> {
  const {
    topic_id,
    topic_name,
    subject_id,
    question_count = 5,
    difficulty = 3,
    language = "hinglish",
  } = options;

  return await getAdaptiveQuestions({
    topic_id,
    topic_name,
    subject_id,
    difficulty,
    count: question_count,
    language,
  });
}

/**
 * Evaluates full topic test submission and computes detailed breakdowns
 */
export async function evaluateTopicTest(
  options: SubmitTestOptions
): Promise<TestResult> {
  const {
    test_id,
    user_id,
    topic_id,
    topic_name,
    time_taken_seconds,
    questions,
    user_answers,
    language = "hinglish",
  } = options;

  const testQuestionRecords: TestQuestionRecord[] = [];
  let correctCount = 0;

  // Breakdown metrics
  let conceptTotal = 0;
  let conceptCorrect = 0;
  let appTotal = 0;
  let appCorrect = 0;
  let calcTotal = 0;
  let calcCorrect = 0;

  const conceptPerformance: Record<string, { total: number; correct: number }> = {};

  for (const q of questions) {
    const userAnswer = user_answers[q.id] || "";
    const evalResult = await evaluateWithAI(q, userAnswer, language);

    if (evalResult.is_correct) {
      correctCount++;
    }

    const c = q.concept_tested || "general";
    if (!conceptPerformance[c]) conceptPerformance[c] = { total: 0, correct: 0 };
    conceptPerformance[c].total++;
    if (evalResult.is_correct) conceptPerformance[c].correct++;

    // Classify into Concept vs Application vs Calculation category
    if (q.question_type === "numerical") {
      calcTotal++;
      if (evalResult.is_correct) calcCorrect++;
    } else if (q.difficulty >= 3) {
      appTotal++;
      if (evalResult.is_correct) appCorrect++;
    } else {
      conceptTotal++;
      if (evalResult.is_correct) conceptCorrect++;
    }

    testQuestionRecords.push({
      id: `tq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      test_id,
      question_id: q.id,
      question: q.question,
      options: q.options,
      user_answer: userAnswer,
      correct_answer: q.correct_answer,
      is_correct: evalResult.is_correct,
      time_taken_seconds: Math.round(time_taken_seconds / Math.max(1, questions.length)),
      mistake_type: evalResult.mistake_type,
      explanation: evalResult.explanation,
    });
  }

  const totalQuestions = questions.length;
  const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const score = accuracy;

  const strongAreas: string[] = [];
  const weakAreas: string[] = [];

  for (const [cName, stat] of Object.entries(conceptPerformance)) {
    const acc = (stat.correct / stat.total) * 100;
    if (acc >= 70) {
      strongAreas.push(cName);
    } else {
      weakAreas.push(cName);
    }
  }

  const conceptPct = conceptTotal > 0 ? Math.round((conceptCorrect / conceptTotal) * 100) : accuracy;
  const applicationPct = appTotal > 0 ? Math.round((appCorrect / appTotal) * 100) : accuracy;
  const calculationPct = calcTotal > 0 ? Math.round((calcCorrect / calcTotal) * 100) : accuracy;

  return {
    id: test_id,
    user_id,
    topic_id,
    topic_name,
    title: `${topic_name} Assessment`,
    total_questions: totalQuestions,
    score: Math.round(score * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
    time_taken_seconds,
    difficulty: "Adaptive",
    breakdown: {
      concept_pct: conceptPct,
      application_pct: applicationPct,
      calculation_pct: calculationPct,
    },
    strong_areas: strongAreas,
    weak_areas: weakAreas,
    started_at: new Date(Date.now() - time_taken_seconds * 1000).toISOString(),
    completed_at: new Date().toISOString(),
    questions: testQuestionRecords,
  };
}
