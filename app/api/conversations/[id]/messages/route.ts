import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function getOwnedConversation(id: string, userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return { supabase: null, conversation: null };
  const { data: conversation } = await supabase.from("conversations").select("id, title").eq("id", id).eq("user_id", userId).single();
  return { supabase, conversation };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { supabase, conversation } = await getOwnedConversation(id, token.uid);
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data, error } = await supabase.from("messages").select("id, role, content").eq("conversation_id", id).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { supabase, conversation } = await getOwnedConversation(id, token.uid);
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { messages } = await request.json();
  const rows = (messages ?? []).map((message: { role: string; content: string }) => ({ conversation_id: id, user_id: token.uid, role: message.role, content: message.content }));
  const { data, error } = await supabase.from("messages").insert(rows).select("id, role, content");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
