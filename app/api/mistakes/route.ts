import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topic_id");

  try {
    let query = supabase
      .from("mistakes")
      .select("*, topics(id, name, slug, subjects(name))")
      .eq("user_id", token.uid)
      .order("resolved", { ascending: true })
      .order("occurrence_count", { ascending: false });

    if (topicId) {
      query = query.eq("topic_id", topicId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const formatted = (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      question_id: row.question_id,
      topic_id: row.topic_id,
      topic_name: row.topics?.name || "Topic",
      subject_name: row.topics?.subjects?.name || "Subject",
      concept: row.concept,
      mistake_type: row.mistake_type,
      student_answer: row.student_answer,
      correct_answer: row.correct_answer,
      explanation: row.explanation,
      occurrence_count: row.occurrence_count,
      resolution_streak: row.resolution_streak || 0,
      resolved: Boolean(row.resolved),
      first_occurred_at: row.first_occurred_at,
      last_occurred_at: row.last_occurred_at,
    }));

    return NextResponse.json(formatted);
  } catch (err: unknown) {
    console.error("Failed to load mistakes", err);
    const message = err instanceof Error ? err.message : "Failed to load mistakes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
