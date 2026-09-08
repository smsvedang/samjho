"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { Subject, TopicSummary, UserLearningProfile } from "@/lib/learning/types";

import DashboardView from "@/app/components/learning/DashboardView";
import MyLearningView from "@/app/components/learning/MyLearningView";
import MistakeBookView from "@/app/components/learning/MistakeBookView";
import RevisionView from "@/app/components/learning/RevisionView";
import TopicHubModal from "@/app/components/learning/TopicHubModal";
import PracticeModal from "@/app/components/learning/PracticeModal";
import DiagnosticModal from "@/app/components/learning/DiagnosticModal";
import TestModal from "@/app/components/learning/TestModal";
import OnboardingModal from "@/app/components/learning/OnboardingModal";

type ActiveTab = "chat" | "dashboard" | "learning" | "mistakes" | "revision";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: "intro" | "answer";
};

type WorksheetQuestion = { question: string; options?: string[]; answer?: string };
type Worksheet = { title: string; subject: string; instructions: string; questions: WorksheetQuestion[]; answerKey?: string[] };

type Conversation = {
  id: string;
  title: string;
  time: string;
  messages: Message[];
};

type BrandSettings = { brand_name: string; logo_url: string; tagline: string };

const suggestions = [
  { label: "Photosynthesis samjhao", icon: "✦" },
  { label: "What is Kirchhoff's Voltage Law?", icon: "⚡" },
  { label: "Explain Pointers in C++ with memory diagram", icon: "{}" },
  { label: "Integration by parts formula and practice", icon: "∫" },
];

export default function Home() {
  const router = useRouter();
  const auth = getFirebaseAuth();

  // Navigation and active tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");

  // Chat State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [, setConnectionStatus] = useState(auth ? "Checking Firebase session" : "Add Firebase keys to sign in");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  // UI Menus
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [brand, setBrand] = useState<BrandSettings>({ brand_name: "Samjho", logo_url: "", tagline: "AI that teaches, not just answers." });

  // Learning Platform State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [userProfile, setUserProfile] = useState<UserLearningProfile | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Modals Configuration
  const [activeTopicHub, setActiveTopicHub] = useState<TopicSummary | null>(null);
  const [practiceConfig, setPracticeConfig] = useState<{
    topicId: string;
    topicName: string;
    subjectId?: string;
    targetConcept?: string;
  } | null>(null);
  const [diagnosticConfig, setDiagnosticConfig] = useState<{
    topicId: string;
    topicName: string;
    keyConcepts?: string[];
    subjectId?: string;
  } | null>(null);
  const [testConfig, setTestConfig] = useState<{
    topicId: string;
    topicName: string;
    subjectId?: string;
  } | null>(null);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? { id: "draft", title: "New learning session", time: "Not saved", messages: [] };
  const isEmpty = selected.messages.length === 0 && !pendingPrompt;
  const filteredConversations = useMemo(
    () => conversations.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase())),
    [conversations, search],
  );

  useEffect(() => {
    void fetch("/api/public-settings").then((response) => response.ok ? response.json() : null).then((data) => { if (data) setBrand(data); }).catch(() => undefined);
  }, []);

  // Fetch subjects and student learning data
  async function refreshSubjects(token: string) {
    setLoadingSubjects(true);
    try {
      const response = await fetch("/api/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data || []);
      }
    } catch (err) {
      console.error("Failed to load subjects", err);
    } finally {
      setLoadingSubjects(false);
    }
  }

  // Fetch user learning profile
  async function loadProfile(token: string) {
    try {
      const response = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        if (data && !data.onboarded) {
          setOnboardingOpen(true);
        }
      }
    } catch (err) {
      console.error("Failed to load user profile", err);
    }
  }

  useEffect(() => {
    if (!auth) return;
    let active = true;
    let currentLoad: AbortController | null = null;

    function clearSessionState() {
      setUserId(null);
      setFirebaseUser(null);
      setIdToken(null);
      setConversations([]);
      setSelectedId(null);
      setUserProfile(null);
      setConnectionStatus("Sign in to start a lesson");
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      currentLoad?.abort();
      const controller = new AbortController();
      currentLoad = controller;
      setFirebaseUser(user);
      if (!user) {
        clearSessionState();
        return;
      }
      if (!user.emailVerified && user.providerData.some((provider) => provider.providerId === "password")) {
        clearSessionState();
        await signOut(auth);
        router.replace("/login");
        return;
      }
      setUserId(user.uid);
      try {
        const token = await user.getIdToken();
        setIdToken(token);
        if (!active || controller.signal.aborted) return;

        // Load chat conversations
        const response = await fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!active || controller.signal.aborted) return;
        if (response.ok) {
          const data = await response.json();
          const loaded = (data ?? []).map((conversation: { id: string; title: string; updated_at: string }) => ({ id: conversation.id, title: conversation.title, time: new Date(conversation.updated_at).toLocaleDateString(), messages: [] }));
          setConversations(loaded);
          setSelectedId(loaded[0]?.id ?? null);
          setConnectionStatus("Synced with Firebase");
        }

        // Load subjects & profile
        void refreshSubjects(token);
        void loadProfile(token);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConnectionStatus("Lessons are temporarily unavailable");
      }
    });
    return () => {
      active = false;
      currentLoad?.abort();
      unsubscribe();
    };
  }, [auth, router]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadMessages() {
      if (!firebaseUser || !selectedId || selectedId.startsWith("draft-")) return;
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch(`/api/conversations/${selectedId}/messages`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, messages: data.filter((message: { role: string }) => message.role !== "system").map((message: { id: string; role: string; content: string }) => ({ id: message.id, role: message.role as Message["role"], content: message.content })) } : conversation));
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    void loadMessages();
    return () => controller.abort();
  }, [firebaseUser, selectedId]);

  function selectSuggestion(prompt: string) {
    setInput(prompt);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || isThinking) return;
    if (!firebaseUser || !userId) {
      setConnectionStatus("Sign in to start a lesson");
      setLoginPromptOpen(true);
      return;
    }
    setPendingPrompt(prompt);
    setIsThinking(true);
    const title = selected.messages.length ? selected.title : prompt.slice(0, 28);
    let conversationId = selectedId;
    const token = await firebaseUser.getIdToken();
    if (!conversationId || conversationId.startsWith("draft-")) {
      const response = await fetch("/api/conversations", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const data = response.ok ? await response.json() : null;
      if (!data) {
        setConnectionStatus("Could not create lesson");
        setPendingPrompt(null);
        setIsThinking(false);
        return;
      }
      conversationId = data.id;
      setSelectedId(conversationId);
      setConversations((current) => [{ id: data.id, title: data.title, time: "Just now", messages: [] }, ...current.filter((conversation) => !conversation.id.startsWith("draft-"))]);
    }

    // Include student learning context for adaptive responses
    const learningContext = {
      education_level: userProfile?.education_level || "college",
      preferred_language: userProfile?.preferred_language || "hinglish",
    };

    const tutorResponse = await fetch("/api/tutor", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        messages: selected.messages.map(({ role, content }) => ({ role, content })),
        learning_context: learningContext,
      }),
    });

    if (!tutorResponse.ok) {
      const error = await tutorResponse.json().catch(() => null) as { error?: string } | null;
      setConnectionStatus(error?.error || "The tutor is temporarily unavailable");
      setPendingPrompt(null);
      setIsThinking(false);
      return;
    }
    const { content: assistantContent } = await tutorResponse.json() as { content: string };
    const messageResponse = await fetch(`/api/conversations/${conversationId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }, { role: "assistant", content: assistantContent }] }) });
    if (!messageResponse.ok) {
      setConnectionStatus("Could not save this lesson");
      setPendingPrompt(null);
      setIsThinking(false);
      return;
    }
    const savedMessages = messageResponse.ok ? await messageResponse.json() : [];
    const messages = (savedMessages ?? []).map((message: { id: string; role: string; content: string }) => ({ id: message.id, role: message.role as Message["role"], content: message.content }));
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, title, time: "Just now", messages: [...conversation.messages, ...messages] } : conversation));
    setPendingPrompt(null);
    setInput("");
    setConnectionStatus("Synced with Firebase");
    window.setTimeout(() => setIsThinking(false), 450);
  }

  function startNewChat() {
    const id = `draft-${Date.now()}`;
    setConversations((current) => [{ id, title: "New learning session", time: "Just now", messages: [] }, ...current]);
    setSelectedId(id);
    setInput("");
    setActiveTab("chat");
    setMobileSidebarOpen(false);
  }

  function setQuickAction(action: string) {
    setInput(action);
  }

  async function deleteConversation(id: string) {
    if (!firebaseUser || id.startsWith("draft-")) {
      setConversations((current) => current.filter((conversation) => conversation.id !== id));
      setSelectedId(null);
      return;
    }
    const token = await firebaseUser.getIdToken();
    const response = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return;
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    setSelectedId((current) => current === id ? null : current);
  }

  async function handleSignOut() {
    if (!auth || isSigningOut) return;
    setIsSigningOut(true);
    setUserId(null);
    setFirebaseUser(null);
    setIdToken(null);
    setConversations([]);
    setSelectedId(null);
    setInput("");
    setConnectionStatus("Signing out...");
    setProfileOpen(false);
    try {
      await signOut(auth);
    } finally {
      router.replace("/login");
    }
  }

  async function handleCompleteOnboarding(data: {
    education_level: import("@/lib/learning/types").EducationLevel;
    exam_target: string;
    preferred_language: import("@/lib/learning/types").PreferredLanguage;
  }) {
    if (!idToken) return;
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        onboarded: true,
      }),
    });
    if (response.ok) {
      const updated = await response.json();
      setUserProfile(updated);
      setOnboardingOpen(false);
    }
  }

  // Helpers to find topic by id or fallback to default
  function findTopicOrFallback(topicId?: string): TopicSummary {
    for (const s of subjects) {
      const found = (s.topics || []).find((t) => t.id === topicId);
      if (found) return found;
    }
    return subjects[0]?.topics?.[0] || {
      id: "kvl",
      subject_id: "default",
      name: "Kirchhoff's Voltage Law (KVL)",
      slug: "kvl",
      description: "Loop voltage analysis and sign conventions.",
      key_concepts: ["sign_convention", "loop_identification", "mesh_equations"],
      order_index: 1,
    };
  }

  // Learning Action triggers
  function launchPracticeForTopic(topicId: string, topicName: string, concept?: string) {
    if (!idToken) {
      setLoginPromptOpen(true);
      return;
    }
    setPracticeConfig({
      topicId,
      topicName,
      targetConcept: concept,
    });
  }

  function launchDiagnosticForTopic(topic: TopicSummary) {
    if (!idToken) {
      setLoginPromptOpen(true);
      return;
    }
    setDiagnosticConfig({
      topicId: topic.id,
      topicName: topic.name,
      keyConcepts: topic.key_concepts,
      subjectId: topic.subject_id,
    });
  }

  function launchTestForTopic(topic: TopicSummary) {
    if (!idToken) {
      setLoginPromptOpen(true);
      return;
    }
    setTestConfig({
      topicId: topic.id,
      topicName: topic.name,
      subjectId: topic.subject_id,
    });
  }

  return (
    <main className="app-shell">
      {/* Top Header */}
      <header className="topbar">
        <button className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen((open) => !open)}>☰</button>
        <div className="wordmark"><BrandMark logoUrl={brand.logo_url} /><span>{brand.brand_name.toLowerCase()}</span></div>

        {/* Top Center Navigation Tabs */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <span className="nav-tab-icon">✦</span> AI Tutor
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span className="nav-tab-icon">📊</span> Dashboard
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "learning" ? "active" : ""}`}
            onClick={() => setActiveTab("learning")}
          >
            <span className="nav-tab-icon">📚</span> My Learning
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "mistakes" ? "active" : ""}`}
            onClick={() => setActiveTab("mistakes")}
          >
            <span className="nav-tab-icon">⚠️</span> Mistakes
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === "revision" ? "active" : ""}`}
            onClick={() => setActiveTab("revision")}
          >
            <span className="nav-tab-icon">⏱</span> Revision
          </button>
        </nav>

        {/* Top Right Profile / Auth */}
        <div className="topbar-right">
          {firebaseUser ? (
            <div className="profile-menu-wrap">
              <button className="profile-button" aria-label="Open profile" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setHistoryMenuOpen(false); setConversationMenuOpen(false); }}>
                {firebaseUser.photoURL ? <span className="profile-photo" role="img" aria-label="Profile photo" style={{ backgroundImage: `url(${firebaseUser.photoURL})` }} /> : firebaseUser.displayName?.slice(0, 1).toUpperCase() ?? "A"}
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <strong>{firebaseUser.displayName || "Your profile"}</strong>
                  <span>{firebaseUser.email}</span>
                  <span className="label-note">Goal: {userProfile?.exam_target || "General"}</span>
                  <button type="button" onClick={() => { setOnboardingOpen(true); setProfileOpen(false); }}>Edit Learning Preferences</button>
                  <button type="button" disabled={isSigningOut} onClick={() => void handleSignOut()}>{isSigningOut ? "Signing out..." : "Sign out"}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-actions">
              <Link href="/login">Log in</Link>
              <Link href="/signup" className="auth-action-primary">Sign up</Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="workspace">
        {/* Sidebar (Always accessible for AI Chat history & quick tools) */}
        <aside className={`sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
          <button className="new-chat" onClick={startNewChat}><span>+</span> New chat</button>
          <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lessons" aria-label="Search lessons" /><kbd>⌘ K</kbd></label>
          <div className="history-heading"><span>Your learning</span><div className="menu-wrap"><button aria-label="More history options" aria-expanded={historyMenuOpen} onClick={() => { setHistoryMenuOpen((open) => !open); setProfileOpen(false); setConversationMenuOpen(false); }}>•••</button>{historyMenuOpen && <div className="small-menu"><button onClick={() => { setConversations([]); setSelectedId(null); setHistoryMenuOpen(false); }}>Clear local history</button><button onClick={() => { startNewChat(); setHistoryMenuOpen(false); }}>New learning session</button></div>}</div></div>
          <div className="conversation-list">
            <p className="group-label">Today</p>
            {filteredConversations.slice(0, 2).map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} active={conversation.id === selectedId && activeTab === "chat"} onClick={() => { setSelectedId(conversation.id); setActiveTab("chat"); setMobileSidebarOpen(false); }} onDelete={() => void deleteConversation(conversation.id)} />
            ))}
            <p className="group-label spaced">Earlier</p>
            {filteredConversations.slice(2).map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} active={conversation.id === selectedId && activeTab === "chat"} onClick={() => { setSelectedId(conversation.id); setActiveTab("chat"); setMobileSidebarOpen(false); }} onDelete={() => void deleteConversation(conversation.id)} />
            ))}
          </div>
          <div className="sidebar-footer">
            <button type="button" onClick={() => setOnboardingOpen(true)}>⚙ <span>Learning Settings</span></button>
          </div>
        </aside>

        {/* Tab 1: AI Chat (Preserved & Enhanced) */}
        {activeTab === "chat" && (
          <section className="chat-area">
            <div className="chat-heading">
              <div>
                <span className="eyebrow">ADAPTIVE AI TUTOR</span>
                <h1>{selected.title}</h1>
              </div>
              <div className="menu-wrap">
                <button className="more-button" aria-label="Conversation options" aria-expanded={conversationMenuOpen} onClick={() => { setConversationMenuOpen((open) => !open); setProfileOpen(false); setHistoryMenuOpen(false); }}>•••</button>
                {conversationMenuOpen && (
                  <div className="small-menu conversation-menu">
                    <button onClick={() => { startNewChat(); setConversationMenuOpen(false); }}>New learning session</button>
                    <button onClick={() => { setInput(""); setConversationMenuOpen(false); }}>Clear composer</button>
                  </div>
                )}
              </div>
            </div>

            <div className={`message-scroll ${isEmpty ? "empty-scroll" : ""}`}>
              {isEmpty ? (
                <EmptyState onSuggestion={selectSuggestion} />
              ) : (
                <div className="messages">
                  {selected.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onActionClick={(action) => {
                        const top = findTopicOrFallback();
                        if (action === "practice") launchPracticeForTopic(top.id, top.name);
                        else if (action === "diagnostic") launchDiagnosticForTopic(top);
                        else if (action === "test") launchTestForTopic(top);
                        else if (action === "explain_mistake") setInput(`Can you explain what mistake I might be making in this concept and how to avoid it?`);
                      }}
                    />
                  ))}
                  {pendingPrompt && <MessageBubble message={{ id: "pending-user", role: "user", content: pendingPrompt }} />}
                  {isThinking && <ThinkingIndicator />}
                </div>
              )}
            </div>

            <div className="composer-wrap">
              {!isEmpty && (
                <div className="quick-actions">
                  <button onClick={() => setQuickAction("Explain from basic principles")}>Explain simply</button>
                  <button onClick={() => setQuickAction("Give a real-life analogy")}>Real-life analogy</button>
                  <button onClick={() => {
                    const top = findTopicOrFallback();
                    launchPracticeForTopic(top.id, top.name);
                  }}>⚡ Practice Questions</button>
                  <button onClick={() => {
                    const top = findTopicOrFallback();
                    launchTestForTopic(top);
                  }}>⏱ Test Me</button>
                </div>
              )}
              <form className="composer" onSubmit={submitMessage}>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="What do you want to understand? Ask a concept or solve a problem..."
                  aria-label="What do you want to understand?"
                  rows={1}
                />
                <div className="composer-bottom">
                  <span>Samjho adapts to how you learn <span className="sparkle">✦</span></span>
                  <button className="send-button" type="submit" aria-label="Send message">↑</button>
                </div>
              </form>
              <p className="composer-note">Samjho can make mistakes. Check important information.</p>
            </div>
          </section>
        )}

        {/* Tab 2: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="learning-container">
            <DashboardView
              subjects={subjects}
              loading={loadingSubjects}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectTopic={(topic) => setActiveTopicHub(topic)}
              onStartPractice={(topicId, topicName, concept) => launchPracticeForTopic(topicId, topicName, concept)}
              onStartRevision={(topicId, topicName) => launchPracticeForTopic(topicId, topicName)}
            />
          </div>
        )}

        {/* Tab 3: My Learning */}
        {activeTab === "learning" && (
          <div className="learning-container">
            <MyLearningView
              subjects={subjects}
              loading={loadingSubjects}
              onSelectTopic={(topic) => setActiveTopicHub(topic)}
            />
          </div>
        )}

        {/* Tab 4: Mistake Book */}
        {activeTab === "mistakes" && (
          <div className="learning-container">
            {idToken ? (
              <MistakeBookView
                token={idToken}
                onFixMistake={(topicId, topicName, concept) => launchPracticeForTopic(topicId, topicName, concept)}
              />
            ) : (
              <div className="empty-state-card">
                <h3>Please sign in to view your Mistake Book</h3>
                <Link href="/login" className="primary-button">Sign in</Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Spaced Revision */}
        {activeTab === "revision" && (
          <div className="learning-container">
            {idToken ? (
              <RevisionView
                token={idToken}
                onStartRevisionSession={(topicId, topicName) => launchPracticeForTopic(topicId, topicName)}
              />
            ) : (
              <div className="empty-state-card">
                <h3>Please sign in to view your Spaced Revision Queue</h3>
                <Link href="/login" className="primary-button">Sign in</Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Learning Modals */}
      {activeTopicHub && (
        <TopicHubModal
          topic={activeTopicHub}
          token={idToken || undefined}
          onClose={() => setActiveTopicHub(null)}
          onStartPractice={(concept) => launchPracticeForTopic(activeTopicHub.id, activeTopicHub.name, concept)}
          onStartDiagnostic={() => launchDiagnosticForTopic(activeTopicHub)}
          onStartTest={() => launchTestForTopic(activeTopicHub)}
          onOpenMistakes={() => setActiveTab("mistakes")}
        />
      )}

      {practiceConfig && idToken && (
        <PracticeModal
          topicId={practiceConfig.topicId}
          topicName={practiceConfig.topicName}
          subjectId={practiceConfig.subjectId}
          targetConcept={practiceConfig.targetConcept}
          token={idToken}
          onClose={() => setPracticeConfig(null)}
          onMasteryUpdated={() => {
            if (idToken) void refreshSubjects(idToken);
          }}
        />
      )}

      {diagnosticConfig && idToken && (
        <DiagnosticModal
          topicId={diagnosticConfig.topicId}
          topicName={diagnosticConfig.topicName}
          keyConcepts={diagnosticConfig.keyConcepts}
          subjectId={diagnosticConfig.subjectId}
          token={idToken}
          onClose={() => setDiagnosticConfig(null)}
          onStartRemediation={(concept) => {
            launchPracticeForTopic(diagnosticConfig.topicId, diagnosticConfig.topicName, concept);
          }}
        />
      )}

      {testConfig && idToken && (
        <TestModal
          topicId={testConfig.topicId}
          topicName={testConfig.topicName}
          subjectId={testConfig.subjectId}
          token={idToken}
          onClose={() => setTestConfig(null)}
          onStartRemediation={(weakness) => {
            launchPracticeForTopic(testConfig.topicId, testConfig.topicName, weakness);
          }}
        />
      )}

      {onboardingOpen && (
        <OnboardingModal
          initialLanguage={userProfile?.preferred_language || "hinglish"}
          onClose={() => setOnboardingOpen(false)}
          onComplete={handleCompleteOnboarding}
        />
      )}

      {/* Login Prompt Dialog */}
      {loginPromptOpen && (
        <div className="login-prompt-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginPromptOpen(false); }}>
          <section className="login-prompt" role="dialog" aria-modal="true" aria-labelledby="login-prompt-title">
            <button className="login-prompt-close" type="button" aria-label="Close sign in message" onClick={() => setLoginPromptOpen(false)}>×</button>
            <span className="eyebrow">YOUR LEARNING SPACE</span>
            <h2 id="login-prompt-title">Please log in to start learning</h2>
            <p>Sign in or create an account to solve adaptive problems, track weaknesses, and save your progress.</p>
            <div className="login-prompt-actions">
              <Link href="/login" className="auth-action-primary">Log in</Link>
              <Link href="/signup">Sign up</Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function ConversationItem({ conversation, active, onClick, onDelete }: { conversation: Conversation; active: boolean; onClick: () => void; onDelete: () => void }) {
  return <div className={`conversation-item ${active ? "active" : ""}`}><button className="conversation-select" onClick={onClick}><span className="conversation-title">{conversation.title}</span><span className="conversation-time">{conversation.time}</span></button><button className="conversation-delete" aria-label={`Delete ${conversation.title}`} onClick={onDelete}>×</button></div>;
}

function BrandMark({ logoUrl }: { logoUrl: string }) {
  return <span className="wordmark-mark" style={logoUrl ? { backgroundImage: `url(${logoUrl})`, backgroundSize: "cover", backgroundPosition: "center", color: "transparent" } : undefined}>s</span>;
}

function EmptyState({ onSuggestion }: { onSuggestion: (prompt: string) => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><span>✦</span></div>
      <span className="eyebrow">A LITTLE LESS STUCK</span>
      <h2>What do you want to<br /><em>understand?</em></h2>
      <p>Ask anything. We’ll find the explanation<br />that makes it click for you.</p>
      <div className="suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion.label} onClick={() => onSuggestion(suggestion.label)}>
            <span>{suggestion.icon}</span>{suggestion.label}<b>↗</b>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onActionClick,
}: {
  message: Message;
  onActionClick?: (action: "practice" | "diagnostic" | "test" | "explain_mistake") => void;
}) {
  const worksheet = message.role === "assistant" ? extractWorksheet(message.content) : null;
  const displayContent = worksheet ? removeWorksheetMarker(message.content) : message.content;
  return (
    <article className={`message ${message.role}`}>
      <div className="message-avatar">{message.role === "assistant" ? "s" : "A"}</div>
      <div className="message-content">
        {message.role === "assistant" && <span className="assistant-label">SAMJHO <span>✦</span></span>}
        {message.role === "assistant" ? (
          <>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {normalizeMathDelimiters(displayContent)}
            </ReactMarkdown>

            {/* Learning Action Chips on Assistant Responses */}
            {!worksheet && onActionClick && (
              <div className="chat-learning-actions">
                <button
                  type="button"
                  className="learning-chip highlight"
                  onClick={() => onActionClick("practice")}
                >
                  ⚡ Practice This
                </button>
                <button
                  type="button"
                  className="learning-chip"
                  onClick={() => onActionClick("diagnostic")}
                >
                  🩺 Diagnostic Check
                </button>
                <button
                  type="button"
                  className="learning-chip"
                  onClick={() => onActionClick("test")}
                >
                  ⏱ Test Me
                </button>
                <button
                  type="button"
                  className="learning-chip"
                  onClick={() => onActionClick("explain_mistake")}
                >
                  💡 Explain Mistakes
                </button>
              </div>
            )}
          </>
        ) : (
          message.content.split("\n").map((line, index) => line ? <p key={index}>{line}</p> : <br key={index} />)
        )}
        {worksheet && <button className="worksheet-download" type="button" onClick={() => void downloadWorksheet(worksheet)}>Download worksheet PDF <span>↓</span></button>}
      </div>
    </article>
  );
}

function extractWorksheet(content: string): Worksheet | null {
  const match = content.match(/<!-- SAMJHO_WORKSHEET\s*([\s\S]*?)\s*-->/);
  if (!match) return null;
  try {
    const worksheet = JSON.parse(match[1]) as Worksheet;
    return worksheet.title && worksheet.questions?.length ? worksheet : null;
  } catch {
    return null;
  }
}

function removeWorksheetMarker(content: string) {
  return content.replace(/<!-- SAMJHO_WORKSHEET\s*[\s\S]*?\s*-->/, "").trim();
}

async function downloadWorksheet(worksheet: Worksheet) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  let y = 54;

  function ensureSpace(height: number) {
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      y = 54;
    }
  }

  function write(text: string, size: number, color: [number, number, number], gap = 16) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, pageWidth - margin * 2) as string[];
    ensureSpace(lines.length * gap);
    pdf.text(lines, margin, y);
    y += lines.length * gap;
  }

  pdf.setFillColor(35, 105, 93);
  pdf.rect(0, 0, pageWidth, 18, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(35, 105, 93);
  pdf.text("SAMJHOAI", margin, y);
  y += 28;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(27, 48, 42);
  const titleLines = pdf.splitTextToSize(worksheet.title, pageWidth - margin * 2) as string[];
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 26 + 8;
  if (worksheet.subject) write(worksheet.subject, 10, [96, 116, 107], 14);
  write(worksheet.instructions, 11, [72, 87, 80], 16);
  y += 10;
  worksheet.questions.forEach((question, index) => {
    const optionText = question.options?.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n") || "Answer: ______________________________________________";
    const questionText = `${index + 1}. ${question.question}\n${optionText}`;
    const lines = pdf.splitTextToSize(questionText, pageWidth - margin * 2 - 12) as string[];
    ensureSpace(lines.length * 16 + 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(27, 48, 42);
    pdf.text(lines, margin, y);
    y += lines.length * 16 + 14;
  });
  if (worksheet.answerKey?.length) {
    ensureSpace(48);
    y += 10;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Answer key", margin, y);
    y += 22;
    write(worksheet.answerKey.map((answer, index) => `${index + 1}. ${answer}`).join("   "), 10, [72, 87, 80], 15);
  }
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(140, 150, 145);
    pdf.text("SamjhoAI - Learn with understanding", margin, pageHeight - 24);
    pdf.text(`${page} / ${pageCount}`, pageWidth - margin - 24, pageHeight - 24);
  }
  pdf.save(`${worksheet.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "samjho-worksheet"}.pdf`);
}

function ThinkingIndicator() {
  return <div className="thinking"><span /><span /><span /> Samjho is thinking</div>;
}

function normalizeMathDelimiters(content: string) {
  return content
    .replace(/^\s*\[\s*((?=[^\]]*(?:\\[a-zA-Z]+|[_^=]))[^\]]+?)\s*\]\s*$/gm, (_, math: string) => `$$${normalizeMathContent(math)}$$`)
    .replaceAll("\\[", "$$")
    .replaceAll("\\]", "$$")
    .replaceAll("\\(", "$")
    .replaceAll("\\)", "$")
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, math: string) => `$$${normalizeMathContent(math)}$$`)
    .replace(/\$([^$\n]+?)\$/g, (_, math: string) => `$${normalizeMathContent(math)}$`);
}

function normalizeMathContent(math: string) {
  return math.replaceAll("\\_", "_").trim();
}
