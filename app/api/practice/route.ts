import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getAdaptiveQuestions, getAdaptedDifficulty } from "@/lib/learning/questionEngine";
import { evaluateWithAI } from "@/lib/learning/evaluationEngine";
import { recordAttemptAndUpdateMastery, getUserProfile } from "@/lib/learning/profileService";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topic_id");
  const topicName = searchParams.get("topic_name") || "Concept Practice";
  const subjectId = searchParams.get("subject_id") || undefined;
  const targetConcept = searchParams.get("target_concept") || undefined;
  const count = parseInt(searchParams.get("count") || "1", 10);

  if (!topicId) return NextResponse.json({ error: "topic_id is required" }, { status: 400 });

  const supabase = getSupabaseServerClient();
  let currentDifficulty = 2;
  let weakConcepts: string[] = [];

  if (supabase) {
    const { data: st } = await supabase
      .from("student_topics")
      .select("weak_concepts")
      .eq("user_id", token.uid)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (st && Array.isArray(st.weak_concepts)) {
      weakConcepts = st.weak_concepts;
    }

    const { data: recentAttempts } = await supabase
      .from("attempts")
      .select("is_correct")
      .eq("user_id", token.uid)
      .eq("topic_id", topicId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentAttempts && recentAttempts.length > 0) {
      currentDifficulty = getAdaptedDifficulty(
        recentAttempts.map((a) => ({ is_correct: a.is_correct, difficulty: 2 })),
        2
      );
    }
  }

  const profile = await getUserProfile(token.uid);
  const language = profile?.preferred_language || "hinglish";

  try {
    const questions = await getAdaptiveQuestions({
      topic_id: topicId,
      topic_name: topicName,
      subject_id: subjectId,
      difficulty: currentDifficulty,
      weak_concepts: weakConcepts,
      target_concept: targetConcept,
      count,
      language,
    });

    return NextResponse.json({
      questions,
      current_difficulty: currentDifficulty,
    });
  } catch (err: unknown) {
    console.error("Practice question fetch error", err);
    return NextResponse.json({ error: "Could not generate practice questions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    topic_id,
    question,
    user_answer,
    time_taken_seconds = 20,
  } = body;

  if (!topic_id || !question || user_answer === undefined) {
    return NextResponse.json({ error: "Missing attempt payload" }, { status: 400 });
  }

  const profile = await getUserProfile(token.uid);
  const language = profile?.preferred_language || "hinglish";

  try {
    // Evaluate answer with AI / direct matcher
    const evaluation = await evaluateWithAI(question, user_answer, language);

    // Persist attempt & calculate deterministic mastery
    const { mastery, status } = await recordAttemptAndUpdateMastery({
      userId: token.uid,
      topicId: topic_id,
      questionId: question.id,
      userAnswer: user_answer,
      isCorrect: evaluation.is_correct,
      timeTakenSeconds: time_taken_seconds,
      difficulty: question.difficulty || 2,
      conceptTested: question.concept_tested || "core_concept",
      mistakeType: evaluation.mistake_type,
      explanation: evaluation.explanation,
      correctAnswer: question.correct_answer,
    });

    return NextResponse.json({
      evaluation,
      updated_mastery: mastery,
      updated_status: status,
    });
  } catch (err: unknown) {
    console.error("Practice evaluation error", err);
    return NextResponse.json({ error: "Failed to evaluate answer" }, { status: 500 });
  }
}
