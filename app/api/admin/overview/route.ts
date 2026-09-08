import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AdminToken = { admin?: boolean; role?: string };

function isAdmin(token: AdminToken) {
  return token.admin === true || token.role === "admin";
}

export async function GET(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token || !isAdmin(token as AdminToken)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });

  const [profiles, conversations, messages, subjects, topics, questions, attempts, tests, sessions, recentUsers, recentQuestions, recentSessions] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase.from("topics").select("id", { count: "exact", head: true }),
    supabase.from("questions").select("id", { count: "exact", head: true }),
    supabase.from("attempts").select("id", { count: "exact", head: true }),
    supabase.from("tests").select("id", { count: "exact", head: true }),
    supabase.from("learning_sessions").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id, display_name, preferred_language, education_level, role, created_at, updated_at").order("created_at", { ascending: false }).limit(8),
    supabase.from("questions").select("id, question, concept_tested, question_type, difficulty, created_at, topics(name), subjects(name)").order("created_at", { ascending: false }).limit(8),
    supabase.from("learning_sessions").select("id, user_id, session_type, duration_seconds, started_at, completed_at, topics(name)").order("started_at", { ascending: false }).limit(8),
  ]);

  const errors = [profiles, conversations, messages, subjects, topics, questions, attempts, tests, sessions, recentUsers, recentQuestions, recentSessions].filter((result) => result.error);
  if (errors.length) return NextResponse.json({ error: errors[0].error?.message || "Could not load admin data" }, { status: 500 });

  return NextResponse.json({
    metrics: {
      users: profiles.count || 0,
      conversations: conversations.count || 0,
      messages: messages.count || 0,
      subjects: subjects.count || 0,
      topics: topics.count || 0,
      questions: questions.count || 0,
      attempts: attempts.count || 0,
      tests: tests.count || 0,
      sessions: sessions.count || 0,
    },
    recentUsers: recentUsers.data || [],
    recentQuestions: recentQuestions.data || [],
    recentSessions: recentSessions.data || [],
  });
}
