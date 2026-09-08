import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { calculateNextRevision, isRevisionDue } from "@/lib/learning/spacedRevisionEngine";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const { data, error } = await supabase
      .from("revision_items")
      .select("*, topics(id, name, slug, key_concepts, subjects(name, icon))")
      .eq("user_id", token.uid)
      .order("due_at", { ascending: true });

    if (error) throw error;

    const formatted = (data || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      topic_id: row.topic_id,
      topic_name: row.topics?.name || "Topic",
      subject_name: row.topics?.subjects?.name || "Subject",
      subject_icon: row.topics?.subjects?.icon || "📚",
      key_concepts: Array.isArray(row.topics?.key_concepts) ? row.topics.key_concepts : [],
      due_at: row.due_at,
      interval_days: row.interval_days,
      stage: row.stage,
      status: row.status,
      is_due: isRevisionDue(row.due_at),
    }));

    return NextResponse.json(formatted);
  } catch (err: unknown) {
    console.error("Failed to load revision items", err);
    const message = err instanceof Error ? err.message : "Failed to load revision items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const body = await request.json();
  const { topic_id, score = 100 } = body;

  if (!topic_id) {
    return NextResponse.json({ error: "topic_id is required" }, { status: 400 });
  }

  try {
    const { data: currentItem } = await supabase
      .from("revision_items")
      .select("*")
      .eq("user_id", token.uid)
      .eq("topic_id", topic_id)
      .maybeSingle();

    const currentStage = currentItem?.stage || 0;
    const nextRevision = calculateNextRevision(currentStage, score);

    const history = Array.isArray(currentItem?.performance_history)
      ? currentItem.performance_history
      : [];
    history.push({
      date: new Date().toISOString(),
      score,
      is_passed: score >= 70,
    });

    const { data: updated, error } = await supabase
      .from("revision_items")
      .upsert(
        {
          user_id: token.uid,
          topic_id,
          due_at: nextRevision.next_revision_at,
          interval_days: nextRevision.interval_days,
          stage: nextRevision.stage,
          performance_history: history,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id, topic_id" }
      )
      .select()
      .single();

    if (error) throw error;

    // Also update student_topics next_revision_at
    await supabase
      .from("student_topics")
      .update({
        next_revision_at: nextRevision.next_revision_at,
        revision_interval_days: nextRevision.interval_days,
        revision_stage: nextRevision.stage,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", token.uid)
      .eq("topic_id", topic_id);

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("Failed to complete revision", err);
    const message = err instanceof Error ? err.message : "Failed to complete revision";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
