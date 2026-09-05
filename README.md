# Samjho

Adaptive AI tutor built with Next.js, Supabase, and Groq.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add the Firebase web config values and Firebase Admin service-account values.
3. Add the Supabase URL and service-role key. The service-role key is server-only.
4. Apply `supabase/migrations/202609050001_samjho_core.sql` in the Supabase SQL editor or with the Supabase CLI.
5. Give an admin Firebase user a custom claim from the local Firebase Admin script:

```bash
npm run set-admin -- FIREBASE_USER_UID path/to/service-account.json
```

Sign out and sign in again after granting the claim so Firebase issues a refreshed ID token. Do not expose the Admin SDK credentials in browser code.

6. Start the app with `npm run dev`.

Firebase authenticates learners and admins. Next.js verifies the Firebase ID token before using Supabase for persistence. The admin console is intentionally not linked from the learner interface and is available only at `/admin` to users with the Firebase `admin` claim.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
# samjho
