import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  try {
    // 1. Fetch subjects and topics
    const { data: subjects, error: subError } = await supabase
      .from("subjects")
      .select("*")
      .order("order_index", { ascending: true });

    if (subError) throw subError;

    const { data: topics, error: topError } = await supabase
      .from("topics")
      .select("*")
      .order("order_index", { ascending: true });

    if (topError) throw topError;

    // 2. Fetch student_topics if authenticated
    const studentTopicMap = new Map<string, Record<string, unknown>>();
    if (token) {
      const { data: studentTopics } = await supabase
        .from("student_topics")
        .select("*")
        .eq("user_id", token.uid);

      if (studentTopics) {
        studentTopics.forEach((st) => studentTopicMap.set(st.topic_id, st));
      }
    }

    // 3. Assemble response
    const formatted = (subjects || []).map((subject) => {
      const subjectTopics = (topics || [])
        .filter((topic) => topic.subject_id === subject.id)
        .map((topic) => {
          const st = studentTopicMap.get(topic.id);
          return {
            id: topic.id,
            subject_id: topic.subject_id,
            name: topic.name,
            slug: topic.slug,
            description: topic.description,
            key_concepts: Array.isArray(topic.key_concepts) ? topic.key_concepts : [],
            order_index: topic.order_index,
            student_topic: st
              ? {
                  id: st.id as string,
                  user_id: st.user_id as string,
                  topic_id: st.topic_id as string,
                  mastery_score: Number(st.mastery_score) || 0,
                  status: (st.status as string) || "not_learned",
                  confidence: Number(st.confidence) || 0,
                  accuracy: Number(st.accuracy) || 0,
                  total_attempts: (st.total_attempts as number) || 0,
                  correct_attempts: (st.correct_attempts as number) || 0,
                  weak_concepts: Array.isArray(st.weak_concepts) ? st.weak_concepts : [],
                  last_studied_at: st.last_studied_at as string | null,
                  next_revision_at: st.next_revision_at as string | null,
                  revision_interval_days: (st.revision_interval_days as number) || 1,
                  revision_stage: (st.revision_stage as number) || 0,
                }
              : null,
          };
        });

      return {
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        icon: subject.icon || "📚",
        description: subject.description,
        order_index: subject.order_index,
        topics: subjectTopics,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: unknown) {
    console.error("Failed to load subjects", error);
    const message = error instanceof Error ? error.message : "Failed to load subjects";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
