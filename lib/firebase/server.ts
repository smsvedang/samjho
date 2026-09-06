import type { NextRequest } from "next/server";

async function getFirebaseAdminAuth() {
  try {
    const [{ cert, getApps, initializeApp }, { getAuth }] = await Promise.all([
      import("firebase-admin/app"),
      import("firebase-admin/auth"),
    ]);
    if (!getApps().length) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
      if (!projectId || !clientEmail || !privateKey) return null;
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }
    return getAuth();
  } catch (error) {
    console.error("Firebase Admin initialization failed", error);
    return null;
  }
}

export async function verifyFirebaseRequest(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = await getFirebaseAdminAuth();
  if (!auth) return null;
  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error("Firebase token verification failed", error);
    return null;
  }
}
