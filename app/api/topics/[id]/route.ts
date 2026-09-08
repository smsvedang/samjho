import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = await verifyFirebaseRequest(request);
  const { id } = await context.params;
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    const { data: topic, error } = await supabase
      .from("topics")
      .select("*, subjects(id, name, slug, icon)")
      .eq("id", id)
      .single();

    if (error || !topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    let studentTopic: Record<string, unknown> | null = null;
    let mistakes: Record<string, unknown>[] = [];
    let recentAttempts: Record<string, unknown>[] = [];
    let revisionItem: Record<string, unknown> | null = null;

    if (token) {
      const { data: st } = await supabase
        .from("student_topics")
        .select("*")
        .eq("user_id", token.uid)
        .eq("topic_id", id)
        .maybeSingle();
      studentTopic = st;

      const { data: mist } = await supabase
        .from("mistakes")
        .select("*")
        .eq("user_id", token.uid)
        .eq("topic_id", id)
        .order("occurrence_count", { ascending: false });
      mistakes = mist || [];

      const { data: att } = await supabase
        .from("attempts")
        .select("*")
        .eq("user_id", token.uid)
        .eq("topic_id", id)
        .order("created_at", { ascending: false })
        .limit(10);
      recentAttempts = att || [];

      const { data: rev } = await supabase
        .from("revision_items")
        .select("*")
        .eq("user_id", token.uid)
        .eq("topic_id", id)
        .maybeSingle();
      revisionItem = rev;
    }

    return NextResponse.json({
      topic: {
        id: topic.id,
        subject_id: topic.subject_id,
        subject_name: topic.subjects?.name,
        name: topic.name,
        slug: topic.slug,
        description: topic.description,
        key_concepts: Array.isArray(topic.key_concepts) ? topic.key_concepts : [],
      },
      student_topic: studentTopic
        ? {
            ...studentTopic,
            mastery_score: Number(studentTopic.mastery_score) || 0,
            accuracy: Number(studentTopic.accuracy) || 0,
          }
        : null,
      mistakes,
      recent_attempts: recentAttempts,
      revision_item: revisionItem,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load topic";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
