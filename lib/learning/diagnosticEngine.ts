import { DiagnosticResult, Question, ConceptScoreBreakdown } from "./types";
import { getAdaptiveQuestions } from "./questionEngine";
import { evaluateWithAI } from "./evaluationEngine";

export interface DiagnosticAnswerInput {
  question_id: string;
  user_answer: string;
}

/**
 * Generates 5-6 diagnostic questions for a topic covering all its core concepts
 */
export async function generateDiagnosticSet(
  topicId: string,
  topicName: string,
  keyConcepts: string[] = [],
  subjectId?: string,
  language: string = "hinglish"
): Promise<Question[]> {
  const concepts = keyConcepts.length > 0 ? keyConcepts : ["fundamentals", "application", "analysis"];
  const questions: Question[] = [];

  // Generate 1-2 questions per key concept at Level 2 and Level 3
  for (let i = 0; i < Math.min(concepts.length, 5); i++) {
    const concept = concepts[i];
    const difficulty = i % 2 === 0 ? 2 : 3;
    const qList = await getAdaptiveQuestions({
      topic_id: topicId,
      topic_name: topicName,
      subject_id: subjectId,
      difficulty,
      target_concept: concept,
      count: 1,
      language,
    });
    if (qList.length > 0) {
      questions.push(qList[0]);
    }
  }

  // Ensure at least 5 questions
  if (questions.length < 5) {
    const extra = await getAdaptiveQuestions({
      topic_id: topicId,
      topic_name: topicName,
      subject_id: subjectId,
      difficulty: 2,
      count: 5 - questions.length,
      language,
    });
    questions.push(...extra);
  }

  return questions;
}

/**
 * Evaluates full diagnostic submission and builds the comprehensive report
 */
export async function processDiagnosticSubmission(
  topicId: string,
  topicName: string,
  questions: Question[],
  answers: DiagnosticAnswerInput[],
  language: string = "hinglish"
): Promise<DiagnosticResult> {
  const conceptStats = new Map<string, { total: number; correct: number }>();
  let totalScore = 0;

  for (const q of questions) {
    const ans = answers.find((a) => a.question_id === q.id);
    const userAnswer = ans ? ans.user_answer : "";
    const evaluation = await evaluateWithAI(q, userAnswer, language);

    const concept = q.concept_tested || "core_concept";
    if (!conceptStats.has(concept)) {
      conceptStats.set(concept, { total: 0, correct: 0 });
    }
    const stat = conceptStats.get(concept)!;
    stat.total++;
    if (evaluation.is_correct) {
      stat.correct++;
      totalScore++;
    }
  }

  const conceptBreakdowns: ConceptScoreBreakdown[] = [];
  const strongAreas: string[] = [];
  const weakAreas: string[] = [];

  for (const [concept, stat] of conceptStats.entries()) {
    const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    conceptBreakdowns.push({
      concept,
      accuracy,
      total: stat.total,
      correct: stat.correct,
    });

    if (accuracy >= 75) {
      strongAreas.push(concept);
    } else {
      weakAreas.push(concept);
    }
  }

  const overallMastery = questions.length > 0
    ? Math.round((totalScore / questions.length) * 100)
    : 0;

  // Identify main weakness (lowest accuracy concept)
  const sortedWeakness = [...conceptBreakdowns].sort((a, b) => a.accuracy - b.accuracy);
  const mainWeakness = sortedWeakness.length > 0 && sortedWeakness[0].accuracy < 70
    ? sortedWeakness[0].concept
    : weakAreas[0] || null;

  const weakName = mainWeakness ? mainWeakness.replace(/_/g, " ") : "Advanced Problem Solving";

  return {
    topic_id: topicId,
    topic_name: topicName,
    overall_mastery: overallMastery,
    concept_breakdowns: conceptBreakdowns,
    main_weakness: mainWeakness,
    strong_areas: strongAreas,
    weak_areas: weakAreas,
    recommended_remediation: {
      title: `Master ${weakName} in ${topicName}`,
      explanation_focus: `Focused walkthrough on ${weakName} with intuitive real-world examples and sign rules.`,
      practice_question_count: 5,
      estimated_minutes: 10,
    },
  };
}
