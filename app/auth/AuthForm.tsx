"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type AuthMode = "login" | "signup";

export default function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const auth = getFirebaseAuth();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth) return;
    if (auth.currentUser) router.replace("/");
  }, [auth, router]);

  function firebaseMessage(code: string) {
    const messages: Record<string, string> = {
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/email-already-in-use": "An account already exists with this email.",
      "auth/weak-password": "Use a password with at least 6 characters.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/popup-closed-by-user": "The Google sign-in window was closed.",
      "auth/popup-blocked": "Your browser blocked the popup. Allow popups and try again.",
      "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    };
    return messages[code] ?? "Something went wrong. Please try again.";
  }

  async function signInWithGoogle() {
    if (!auth) {
      setError("Firebase authentication is not configured yet.");
      return;
    }
    setError("");
    setNotice("");
    setIsLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace("/");
    } catch (firebaseError) {
      setError(firebaseMessage((firebaseError as { code?: string }).code ?? ""));
    } finally {
      setIsLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      setError("Firebase authentication is not configured yet.");
      return;
    }
    if (isSignup && !name.trim()) {
      setError("Tell us your name to create your learning space.");
      return;
    }
    setError("");
    setNotice("");
    setIsLoading(true);
    try {
      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: name.trim() });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace("/");
    } catch (firebaseError) {
      setError(firebaseMessage((firebaseError as { code?: string }).code ?? ""));
    } finally {
      setIsLoading(false);
    }
  }

  async function resetPassword() {
    if (!auth || !email.trim()) {
      setError("Enter your email first, then request a reset link.");
      return;
    }
    setError("");
    setNotice("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice("Password reset link sent. Check your inbox.");
    } catch (firebaseError) {
      setError(firebaseMessage((firebaseError as { code?: string }).code ?? ""));
    }
  }

  return (
    <main className="auth-shell">
      <header className="auth-topbar"><Link href="/" className="wordmark"><span className="wordmark-mark">s</span><span>samjho</span></Link><Link href="/" className="auth-close" aria-label="Back to learning">×</Link></header>
      <section className="auth-layout">
        <div className="auth-story"><span className="eyebrow">YOUR NEXT AHA MOMENT</span><h1>Understanding feels better when it <em>clicks.</em></h1><p>Join Samjho and learn with an AI tutor that changes how it explains until the idea makes sense.</p><div className="auth-note"><span className="auth-note-mark">✦</span><span>Simple explanations. Better questions. Real understanding.</span></div></div>
        <div className="auth-card"><div className="auth-card-heading"><span className="eyebrow">{isSignup ? "START LEARNING" : "WELCOME BACK"}</span><h2>{isSignup ? "Create your space" : "Good to see you"}</h2><p>{isSignup ? "Your learning journey starts here." : "Pick up right where you left off."}</p></div><button className="google-button" type="button" onClick={signInWithGoogle} disabled={isLoading}><span className="google-icon">G</span>{isSignup ? "Continue with Google" : "Sign in with Google"}</button><div className="auth-divider"><span>or continue with email</span></div><form onSubmit={submit}>{isSignup && <label className="auth-label">Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Aarav Sharma" autoComplete="name" /></label>}<label className="auth-label">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label className="auth-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "At least 6 characters" : "Your password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={6} required /></label>{!isSignup && <button className="forgot-button" type="button" onClick={resetPassword}>Forgot password?</button>}{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<button className="auth-submit" type="submit" disabled={isLoading}>{isLoading ? "One moment..." : isSignup ? "Create account" : "Sign in"}<span>→</span></button></form><p className="auth-switch">{isSignup ? "Already have an account?" : "New to Samjho?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Sign in" : "Create an account"}</Link></p><p className="auth-terms">By continuing, you agree to learn thoughtfully with Samjho.</p></div>
      </section>
    </main>
  );
}
