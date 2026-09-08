import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/server";
import { getUserProfile, upsertUserProfile } from "@/lib/learning/profileService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getUserProfile(token.uid);
  if (!profile) {
    // Return default profile for new user
    return NextResponse.json({
      id: token.uid,
      display_name: token.name || "",
      avatar_url: token.picture || "",
      preferred_language: "hinglish",
      education_level: "college",
      exam_target: "general",
      onboarded: false,
    });
  }

  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  const token = await verifyFirebaseRequest(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updated = await upsertUserProfile(token.uid, body);
  if (!updated) {
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }

  return NextResponse.json(updated);
}
