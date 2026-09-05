"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

const strategyOptions = [
  "simple_definition",
  "real_life_analogy",
  "story",
  "step_by_step",
  "mental_visualization",
  "comparison",
  "cause_effect",
  "practical_example",
  "socratic",
  "teach_back",
  "exam_oriented",
];

type Settings = {
  brand_name: string;
  logo_url: string;
  tagline: string;
  default_language: string;
  default_learning_goal: string;
  tutor_instructions: string;
  enabled_strategies: string[];
  max_input_length: number;
  max_context_messages: number;
};

const defaults: Settings = {
  brand_name: "Samjho",
  logo_url: "",
  tagline: "AI that teaches, not just answers.",
  default_language: "hinglish",
  default_learning_goal: "understand_concept",
  tutor_instructions: "Teach for understanding. Adapt your explanation when the learner struggles.",
  enabled_strategies: ["simple_definition", "real_life_analogy", "step_by_step", "mental_visualization", "socratic"],
  max_input_length: 10000,
  max_context_messages: 20,
};

export default function AdminPage() {
  const auth = getFirebaseAuth();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [status, setStatus] = useState(auth ? "Checking admin access..." : "Add Firebase keys to manage settings.");
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setStatus("Sign in with an admin Firebase account to continue.");
          return;
        }
        const tokenResult = await user.getIdTokenResult(true);
        if (tokenResult.claims.admin !== true && tokenResult.claims.role !== "admin") {
          setStatus("This Firebase account does not have admin access.");
          return;
        }
        const token = await user.getIdToken(true);
        const response = await fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          setStatus("Could not load settings from Supabase.");
          return;
        }
        const data = await response.json();
        if (data) setSettings({ ...defaults, ...data, logo_url: data.logo_url ?? "", enabled_strategies: Array.isArray(data.enabled_strategies) ? data.enabled_strategies : defaults.enabled_strategies });
        setIsAdmin(true);
        setStatus("Admin access verified");
      });
    return unsubscribe;
  }, [auth]);

  function updateSetting<Key extends keyof Settings>(key: Key, value: Settings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function toggleStrategy(strategy: string) {
    updateSetting("enabled_strategies", settings.enabled_strategies.includes(strategy)
      ? settings.enabled_strategies.filter((item) => item !== strategy)
      : [...settings.enabled_strategies, strategy]);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !isAdmin || !auth.currentUser) return;
    setSaving(true);
    const token = await auth.currentUser.getIdToken();
    const response = await fetch("/api/settings", { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, logo_url: settings.logo_url || null }) });
    setStatus(response.ok ? "Settings saved" : "Could not save settings. Check the Firebase admin claim.");
    setSaving(false);
  }

  function clearLocalData() {
    localStorage.clear();
    sessionStorage.clear();
    setStatus("Local browser data cleared");
  }

  return (
    <main className="admin-shell">
      <header className="admin-topbar"><Link href="/" className="admin-back">← Back to learning</Link><div className="wordmark"><span className="wordmark-mark">s</span><span>{settings.brand_name || "samjho"}</span></div><span className="admin-status">{status}</span></header>
      {!isAdmin ? <section className="admin-gate"><div className="admin-gate-icon">⌁</div><span className="eyebrow">ADMIN CONSOLE</span><h1>Settings are protected.</h1><p>{status}</p><Link href="/" className="admin-primary">Return to Samjho</Link></section> : <form className="admin-content" onSubmit={saveSettings}>
        <div className="admin-intro"><div><span className="eyebrow">ADMIN CONSOLE</span><h1>Make Samjho yours.</h1><p>Manage the tutor’s voice, boundaries, and visual identity from one place.</p></div><button className="admin-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
        <div className="admin-grid">
          <section className="settings-section"><div className="section-heading"><span className="section-number">01</span><div><h2>Brand identity</h2><p>Shape how Samjho appears to learners.</p></div></div><div className="settings-card"><label>Brand name<input value={settings.brand_name} onChange={(event) => updateSetting("brand_name", event.target.value)} /></label><label>Tagline<input value={settings.tagline} onChange={(event) => updateSetting("tagline", event.target.value)} /></label><label>Logo URL <span className="label-note">PNG, JPG, or SVG URL</span><input value={settings.logo_url} onChange={(event) => updateSetting("logo_url", event.target.value)} placeholder="https://..." /></label><div className="logo-preview"><div className="preview-mark">{settings.logo_url ? <Image src={settings.logo_url} alt="Current logo" width={42} height={42} unoptimized /> : "s"}</div><div><span>Live preview</span><strong>{settings.brand_name || "Your brand"}</strong></div></div></div></section>
          <section className="settings-section"><div className="section-heading"><span className="section-number">02</span><div><h2>Tutor behavior</h2><p>Set the defaults behind every explanation.</p></div></div><div className="settings-card"><label>Default language<select value={settings.default_language} onChange={(event) => updateSetting("default_language", event.target.value)}><option value="hinglish">Hinglish</option><option value="english">English</option><option value="hindi">Hindi</option></select></label><label>Default learning goal<select value={settings.default_learning_goal} onChange={(event) => updateSetting("default_learning_goal", event.target.value)}><option value="understand_concept">Understand concept</option><option value="exam_preparation">Exam preparation</option><option value="practical_application">Practical application</option><option value="interview_preparation">Interview preparation</option><option value="just_curious">Just curious</option></select></label><label>Core tutor instructions<textarea value={settings.tutor_instructions} onChange={(event) => updateSetting("tutor_instructions", event.target.value)} rows={4} /></label></div></section>
          <section className="settings-section full-width"><div className="section-heading"><span className="section-number">03</span><div><h2>Teaching strategies</h2><p>Choose the tools the tutor can use to make ideas click.</p></div></div><div className="strategy-grid">{strategyOptions.map((strategy) => <label className={`strategy-option ${settings.enabled_strategies.includes(strategy) ? "selected" : ""}`} key={strategy}><input type="checkbox" checked={settings.enabled_strategies.includes(strategy)} onChange={() => toggleStrategy(strategy)} /><span>{strategy.replaceAll("_", " ")}</span><b>{settings.enabled_strategies.includes(strategy) ? "✓" : ""}</b></label>)}</div></section>
          <section className="settings-section"><div className="section-heading"><span className="section-number">04</span><div><h2>Safety and limits</h2><p>Keep usage predictable and affordable.</p></div></div><div className="settings-card split-fields"><label>Max input characters<input type="number" min={1000} max={50000} value={settings.max_input_length} onChange={(event) => updateSetting("max_input_length", Number(event.target.value))} /></label><label>Context messages<input type="number" min={4} max={50} value={settings.max_context_messages} onChange={(event) => updateSetting("max_context_messages", Number(event.target.value))} /></label></div></section>
          <section className="settings-section danger-section"><div className="section-heading"><span className="section-number">05</span><div><h2>Data controls</h2><p>Remove data stored by this browser.</p></div></div><div className="settings-card danger-card"><div><strong>Clear local browser data</strong><p>Removes cached drafts and local preferences from this device. Synced Supabase conversations are not affected.</p></div><button type="button" className="danger-button" onClick={clearLocalData}>Clear local data</button></div></section>
        </div>
      </form>}
    </main>
  );
}
