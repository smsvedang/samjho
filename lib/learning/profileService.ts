import { getSupabaseServerClient } from "@/lib/supabase/server";
import { UserLearningProfile, MistakeType } from "./types";
import { calculateMasteryScore } from "./masteryEngine";
import { calculateNextRevision } from "./spacedRevisionEngine";
import { extractWeakConcepts } from "./weaknessEngine";

export async function getUserProfile(userId: string): Promise<UserLearningProfile | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    preferred_language: data.preferred_language || "hinglish",
    education_level: data.education_level || "college",
    exam_target: data.exam_target || "general",
    onboarded: Boolean(data.onboarded),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function upsertUserProfile(
  userId: string,
  updates: Partial<UserLearningProfile>
): Promise<UserLearningProfile | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const payload: Record<string, unknown> = {
    id: userId,
    updated_at: new Date().toISOString(),
  };

  if (updates.display_name !== undefined) payload.display_name = updates.display_name;
  if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
  if (updates.preferred_language !== undefined) payload.preferred_language = updates.preferred_language;
  if (updates.education_level !== undefined) payload.education_level = updates.education_level;
  if (updates.exam_target !== undefined) payload.exam_target = updates.exam_target;
  if (updates.onboarded !== undefined) payload.onboarded = updates.onboarded;

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Failed to upsert profile", error);
    return null;
  }

  return {
    id: data.id,
    display_name: data.display_name,
    avatar_url: data.avatar_url,
    preferred_language: data.preferred_language || "hinglish",
    education_level: data.education_level || "college",
    exam_target: data.exam_target || "general",
    onboarded: Boolean(data.onboarded),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export interface RecordAttemptParams {
  userId: string;
  topicId: string;
  questionId?: string;
  userAnswer: string;
  isCorrect: boolean;
  timeTakenSeconds: number;
  difficulty: number;
  conceptTested: string;
  mistakeType?: string;
  explanation?: string;
  correctAnswer?: string;
}

/**
 * Persists an attempt and automatically updates student_topics mastery, mistakes table, and revision scheduling
 */
export async function recordAttemptAndUpdateMastery(
  params: RecordAttemptParams
): Promise<{ mastery: number; status: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { mastery: 0, status: "not_learned" };

  const {
    userId,
    topicId,
    questionId,
    userAnswer,
    isCorrect,
    timeTakenSeconds,
    difficulty,
    conceptTested,
    mistakeType,
    explanation,
    correctAnswer,
  } = params;

  // 1. Insert attempt
  await supabase.from("attempts").insert({
    user_id: userId,
    question_id: questionId?.startsWith("mock-") || questionId?.startsWith("gen-") ? null : questionId,
    topic_id: topicId,
    user_answer: userAnswer,
    is_correct: isCorrect,
    time_taken_seconds: timeTakenSeconds,
    mistake_type: mistakeType || (isCorrect ? null : "conceptual"),
  });

  // 2. Update or insert into Mistake Book if incorrect
  if (!isCorrect) {
    const mType = mistakeType || "conceptual";
    const { data: existingMistake } = await supabase
      .from("mistakes")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .eq("concept", conceptTested)
      .eq("mistake_type", mType)
      .maybeSingle();

    if (existingMistake) {
      await supabase
        .from("mistakes")
        .update({
          occurrence_count: existingMistake.occurrence_count + 1,
          student_answer: userAnswer,
          correct_answer: correctAnswer || existingMistake.correct_answer,
          explanation: explanation || existingMistake.explanation,
          resolved: false,
          resolution_streak: 0,
          last_occurred_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingMistake.id);
    } else {
      await supabase.from("mistakes").insert({
        user_id: userId,
        question_id: questionId?.startsWith("mock-") || questionId?.startsWith("gen-") ? null : questionId,
        topic_id: topicId,
        concept: conceptTested,
        mistake_type: mType,
        student_answer: userAnswer,
        correct_answer: correctAnswer || "",
        explanation: explanation || "",
        occurrence_count: 1,
        resolution_streak: 0,
        resolved: false,
      });
    }
  } else {
    // If correct, check if we are resolving any existing mistake for this concept
    const { data: activeMistakes } = await supabase
      .from("mistakes")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .eq("concept", conceptTested)
      .eq("resolved", false);

    if (activeMistakes && activeMistakes.length > 0) {
      for (const m of activeMistakes) {
        const newStreak = (m.resolution_streak || 0) + 1;
        const isResolved = newStreak >= 2; // Resolved after 2 consecutive correct answers
        await supabase
          .from("mistakes")
          .update({
            resolution_streak: newStreak,
            resolved: isResolved,
            updated_at: new Date().toISOString(),
          })
          .eq("id", m.id);
      }
    }
  }

  // 3. Fetch all attempts for this user & topic to recompute mastery deterministically
  const { data: allAttempts } = await supabase
    .from("attempts")
    .select("is_correct, time_taken_seconds, created_at, mistake_type")
    .eq("user_id", userId)
    .eq("topic_id", topicId);

  const { data: unresolvedMistakes } = await supabase
    .from("mistakes")
    .select("id")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .eq("resolved", false);

  const formattedAttempts = (allAttempts || []).map((a) => ({
    is_correct: a.is_correct,
    difficulty: difficulty || 2,
    created_at: a.created_at,
    mistake_type: a.mistake_type,
  }));

  const { score: masteryScore, accuracy, status } = calculateMasteryScore(
    formattedAttempts,
    unresolvedMistakes?.length || 0
  );

  const weakConcepts = extractWeakConcepts(
    (allAttempts || []).map((a) => ({
      concept_tested: conceptTested,
      is_correct: a.is_correct,
      mistake_type: (a.mistake_type as MistakeType) || undefined,
      created_at: a.created_at,
    }))
  );

  // 4. Update Spaced Revision schedule
  const { data: currentStudentTopic } = await supabase
    .from("student_topics")
    .select("revision_stage, revision_interval_days")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();

  const currentStage = currentStudentTopic?.revision_stage || 0;
  const revisionCalc = calculateNextRevision(currentStage, isCorrect ? 100 : 40);

  // 5. Upsert student_topics
  await supabase.from("student_topics").upsert(
    {
      user_id: userId,
      topic_id: topicId,
      mastery_score: masteryScore,
      status,
      accuracy,
      total_attempts: formattedAttempts.length,
      correct_attempts: formattedAttempts.filter((a) => a.is_correct).length,
      weak_concepts: weakConcepts,
      last_studied_at: new Date().toISOString(),
      next_revision_at: revisionCalc.next_revision_at,
      revision_interval_days: revisionCalc.interval_days,
      revision_stage: revisionCalc.stage,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id, topic_id" }
  );

  // 6. Upsert revision_items
  await supabase.from("revision_items").upsert(
    {
      user_id: userId,
      topic_id: topicId,
      due_at: revisionCalc.next_revision_at,
      interval_days: revisionCalc.interval_days,
      stage: revisionCalc.stage,
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id, topic_id" }
  );

  return { mastery: masteryScore, status };
}
