import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ brand_name: "Samjho", logo_url: "", tagline: "AI that teaches, not just answers." });
  const { data, error } = await supabase.from("app_settings").select("brand_name, logo_url, tagline").eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ error: "Brand settings are temporarily unavailable" }, { status: 503 });
  return NextResponse.json({ brand_name: data?.brand_name || "Samjho", logo_url: data?.logo_url || "", tagline: data?.tagline || "AI that teaches, not just answers." });
}
