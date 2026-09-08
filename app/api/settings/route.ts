import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function isAdmin(decodedToken: { admin?: boolean; role?: string }) {
  return decodedToken.admin === true || decodedToken.role === "admin";
}

export async function GET(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token || !isAdmin(token as typeof token & { admin?: boolean; role?: string })) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token || !isAdmin(token as typeof token & { admin?: boolean; role?: string })) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Database is not configured" }, { status: 503 });
  const body = await request.json() as Record<string, unknown>;
  const allowedKeys = ["brand_name", "logo_url", "tagline", "default_language", "default_learning_goal", "tutor_instructions", "enabled_strategies", "max_input_length", "max_context_messages"];
  const updates = Object.fromEntries(allowedKeys.filter((key) => key in body).map((key) => [key, body[key]]));
  const { data, error } = await supabase.from("app_settings").upsert({ id: 1, ...updates, updated_at: new Date().toISOString() }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
