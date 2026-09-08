import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { generateDiagnosticSet, processDiagnosticSubmission } from "@/lib/learning/diagnosticEngine";
import { recordAttemptAndUpdateMastery, getUserProfile } from "@/lib/learning/profileService";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Question } from "@/lib/learning/types";

export const runtime = "nodejs";

interface DiagnosticAnswerPayload {
  question_id: string;
  user_answer: string;
}

export async function POST(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action, topic_id, topic_name, key_concepts, subject_id, questions, answers } = body;

  const profile = await getUserProfile(token.uid);
  const language = profile?.preferred_language || "hinglish";

  if (action === "start") {
    if (!topic_id || !topic_name) {
      return NextResponse.json({ error: "topic_id and topic_name are required" }, { status: 400 });
    }

    try {
      const questionSet = await generateDiagnosticSet(
        topic_id,
        topic_name,
        Array.isArray(key_concepts) ? key_concepts : [],
        subject_id,
        language
      );
      return NextResponse.json({ questions: questionSet });
    } catch (err: unknown) {
      console.error("Diagnostic generation failed", err);
      return NextResponse.json({ error: "Failed to generate diagnostic assessment" }, { status: 500 });
    }
  }

  if (action === "submit") {
    if (!topic_id || !Array.isArray(questions) || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });
    }

    try {
      const typedAnswers = answers as DiagnosticAnswerPayload[];
      const typedQuestions = questions as Question[];

      const result = await processDiagnosticSubmission(
        topic_id,
        topic_name || "Diagnostic Assessment",
        typedQuestions,
        typedAnswers,
        language
      );

      // Record each answer into attempts and update mastery
      for (const q of typedQuestions) {
        const userAns = typedAnswers.find((a) => a.question_id === q.id);
        const ansStr = userAns ? userAns.user_answer : "";
        const isCorrect = ansStr.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

        await recordAttemptAndUpdateMastery({
          userId: token.uid,
          topicId: topic_id,
          questionId: q.id,
          userAnswer: ansStr,
          isCorrect,
          timeTakenSeconds: 30,
          difficulty: q.difficulty || 2,
          conceptTested: q.concept_tested || "diagnostic_concept",
          explanation: q.explanation,
          correctAnswer: q.correct_answer,
        });
      }

      // Record learning session
      const supabase = getSupabaseServerClient();
      if (supabase) {
        await supabase.from("learning_sessions").insert({
          user_id: token.uid,
          topic_id,
          session_type: "diagnostic",
          duration_seconds: 180,
          metadata: { score: result.overall_mastery, main_weakness: result.main_weakness },
          completed_at: new Date().toISOString(),
        });
      }

      return NextResponse.json(result);
    } catch (err: unknown) {
      console.error("Diagnostic processing failed", err);
      return NextResponse.json({ error: "Failed to evaluate diagnostic" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
