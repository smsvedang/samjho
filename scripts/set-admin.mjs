import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFile } from "node:fs/promises";

const uid = process.argv[2];
const serviceAccountPath = process.argv[3] || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!uid) {
  console.error("Usage: npm run set-admin -- FIREBASE_USER_UID [SERVICE_ACCOUNT_JSON_PATH]");
  process.exit(1);
}

let serviceAccount;
if (serviceAccountPath) {
  serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));
} else {
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
}
if (!(serviceAccount.project_id || serviceAccount.projectId) || !(serviceAccount.client_email || serviceAccount.clientEmail) || !(serviceAccount.private_key || serviceAccount.privateKey)) {
  console.error("Missing Firebase Admin credentials. Pass the service-account JSON path as the second argument.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

await getAuth().setCustomUserClaims(uid, { admin: true });
console.log(`Admin claim granted to ${uid}. Sign out and sign in again to refresh the token.`);