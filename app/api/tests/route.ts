import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createTopicTestQuestions, evaluateTopicTest } from "@/lib/learning/testEngine";
import { recordAttemptAndUpdateMastery, getUserProfile } from "@/lib/learning/profileService";
import { Question } from "@/lib/learning/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const body = await request.json();
  const { action, topic_id, topic_name, subject_id, question_count = 5, difficulty = 3, test_id, time_taken_seconds, questions, user_answers } = body;

  const profile = await getUserProfile(token.uid);
  const language = profile?.preferred_language || "hinglish";

  if (action === "create") {
    if (!topic_id || !topic_name) {
      return NextResponse.json({ error: "topic_id and topic_name are required" }, { status: 400 });
    }

    try {
      const generatedQuestions = await createTopicTestQuestions({
        topic_id,
        topic_name,
        subject_id,
        question_count,
        difficulty,
        language,
      });

      const newTestId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      return NextResponse.json({
        test_id: newTestId,
        topic_id,
        topic_name,
        questions: generatedQuestions,
      });
    } catch (err: unknown) {
      console.error("Test creation failed", err);
      return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
    }
  }

  if (action === "submit") {
    if (!test_id || !topic_id || !Array.isArray(questions) || !user_answers) {
      return NextResponse.json({ error: "Invalid test submission payload" }, { status: 400 });
    }

    try {
      const testResult = await evaluateTopicTest({
        test_id,
        user_id: token.uid,
        topic_id,
        topic_name: topic_name || "Topic Assessment",
        time_taken_seconds: time_taken_seconds || 120,
        questions: questions as Question[],
        user_answers,
        language,
      });

      // Persist test in Supabase
      if (supabase) {
        const { data: savedTest } = await supabase
          .from("tests")
          .insert({
            user_id: token.uid,
            topic_id,
            title: testResult.title,
            total_questions: testResult.total_questions,
            score: testResult.score,
            accuracy: testResult.accuracy,
            time_taken_seconds: testResult.time_taken_seconds,
            difficulty: testResult.difficulty,
            breakdown: testResult.breakdown,
            strong_areas: testResult.strong_areas,
            weak_areas: testResult.weak_areas,
            completed_at: testResult.completed_at,
          })
          .select()
          .single();

        const dbTestId = savedTest?.id || test_id;

        if (Array.isArray(testResult.questions)) {
          const tqRows = testResult.questions.map((tq) => ({
            test_id: dbTestId,
            question_id: tq.question_id?.startsWith("mock-") || tq.question_id?.startsWith("gen-") ? null : tq.question_id,
            question: tq.question,
            options: tq.options,
            user_answer: tq.user_answer,
            correct_answer: tq.correct_answer,
            is_correct: tq.is_correct,
            time_taken_seconds: tq.time_taken_seconds,
            mistake_type: tq.mistake_type,
            explanation: tq.explanation,
          }));

          await supabase.from("test_questions").insert(tqRows);
        }

        // Record individual attempts to update mastery & mistake book
        for (const tq of testResult.questions || []) {
          await recordAttemptAndUpdateMastery({
            userId: token.uid,
            topicId: topic_id,
            questionId: tq.question_id,
            userAnswer: tq.user_answer,
            isCorrect: tq.is_correct,
            timeTakenSeconds: tq.time_taken_seconds,
            difficulty: 3,
            conceptTested: tq.mistake_type ? `${tq.mistake_type}_analysis` : "test_concept",
            mistakeType: tq.mistake_type,
            explanation: tq.explanation,
            correctAnswer: tq.correct_answer,
          });
        }

        // Record learning session
        await supabase.from("learning_sessions").insert({
          user_id: token.uid,
          topic_id,
          session_type: "test",
          duration_seconds: testResult.time_taken_seconds,
          metadata: { score: testResult.score, accuracy: testResult.accuracy },
          completed_at: new Date().toISOString(),
        });
      }

      return NextResponse.json(testResult);
    } catch (err: unknown) {
      console.error("Test submission failed", err);
      return NextResponse.json({ error: "Failed to evaluate test" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
