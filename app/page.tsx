"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  kind?: "intro" | "answer";
};

type Conversation = {
  id: string;
  title: string;
  time: string;
  messages: Message[];
};

type BrandSettings = { brand_name: string; logo_url: string; tagline: string };

const suggestions = [
  { label: "Photosynthesis samjhao", icon: "✦" },
  { label: "What is recursion?", icon: "{}" },
  { label: "GDP simple language mein", icon: "↗" },
  { label: "Why does inflation happen?", icon: "◌" },
];

export default function Home() {
  const router = useRouter();
  const auth = getFirebaseAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [, setConnectionStatus] = useState(auth ? "Checking Firebase session" : "Add Firebase keys to sign in");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [brand, setBrand] = useState<BrandSettings>({ brand_name: "Samjho", logo_url: "", tagline: "AI that teaches, not just answers." });
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? { id: "draft", title: "New learning session", time: "Not saved", messages: [] };
  const isEmpty = selected.messages.length === 0;
  const filteredConversations = useMemo(
    () => conversations.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase())),
    [conversations, search],
  );

  useEffect(() => {
    void fetch("/api/public-settings").then((response) => response.ok ? response.json() : null).then((data) => { if (data) setBrand(data); }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }
    let active = true;
    let currentLoad: AbortController | null = null;

    function clearSessionState() {
      setUserId(null);
      setFirebaseUser(null);
      setConversations([]);
      setSelectedId(null);
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
      setUserId(user.uid);
      try {
        const token = await user.getIdToken();
        if (!active || controller.signal.aborted) return;
        const response = await fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!active || controller.signal.aborted) return;
        if (!response.ok) {
          setConnectionStatus(response.status === 401 ? "Sign-in session needs refreshing" : "Lessons are temporarily unavailable");
          return;
        }
        const data = await response.json();
        if (!active || controller.signal.aborted) return;
        const loaded = (data ?? []).map((conversation: { id: string; title: string; updated_at: string }) => ({ id: conversation.id, title: conversation.title, time: new Date(conversation.updated_at).toLocaleDateString(), messages: [] }));
        setConversations(loaded);
        setSelectedId(loaded[0]?.id ?? null);
        setConnectionStatus("Synced with Firebase");
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
  }, [auth]);

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
    const title = selected.messages.length ? selected.title : prompt.slice(0, 28);
    let conversationId = selectedId;
    const token = await firebaseUser.getIdToken();
    if (!conversationId || conversationId.startsWith("draft-")) {
      const response = await fetch("/api/conversations", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const data = response.ok ? await response.json() : null;
      if (!data) {
        setConnectionStatus("Could not create lesson");
        return;
      }
      conversationId = data.id;
      setSelectedId(conversationId);
      setConversations((current) => [{ id: data.id, title: data.title, time: "Just now", messages: [] }, ...current.filter((conversation) => !conversation.id.startsWith("draft-"))]);
    }
    setIsThinking(true);
    const tutorResponse = await fetch("/api/tutor", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt, messages: selected.messages.map(({ role, content }) => ({ role, content })) }) });
    if (!tutorResponse.ok) {
      const error = await tutorResponse.json().catch(() => null) as { error?: string } | null;
      setConnectionStatus(error?.error || "The tutor is temporarily unavailable");
      setIsThinking(false);
      return;
    }
    const { content: assistantContent } = await tutorResponse.json() as { content: string };
    const messageResponse = await fetch(`/api/conversations/${conversationId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }, { role: "assistant", content: assistantContent }] }) });
    if (!messageResponse.ok) {
      setConnectionStatus("Could not save this lesson");
      setIsThinking(false);
      return;
    }
    const savedMessages = messageResponse.ok ? await messageResponse.json() : [];
    const messages = (savedMessages ?? []).map((message: { id: string; role: string; content: string }) => ({ id: message.id, role: message.role as Message["role"], content: message.content }));
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, title, time: "Just now", messages: [...conversation.messages, ...messages] } : conversation));
    setInput("");
    setConnectionStatus("Synced with Firebase");
    window.setTimeout(() => setIsThinking(false), 650);
  }

  function startNewChat() {
    const id = `draft-${Date.now()}`;
    setConversations((current) => [{ id, title: "New learning session", time: "Just now", messages: [] }, ...current]);
    setSelectedId(id);
    setInput("");
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Open conversation history" aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen((open) => !open)}>☰</button>
        <div className="wordmark"><BrandMark logoUrl={brand.logo_url} /><span>{brand.brand_name.toLowerCase()}</span></div>
        <div className="topbar-right">{firebaseUser ? <div className="profile-menu-wrap"><button className="profile-button" aria-label="Open profile" aria-expanded={profileOpen} onClick={() => { setProfileOpen((open) => !open); setHistoryMenuOpen(false); setConversationMenuOpen(false); }}>{firebaseUser.photoURL ? <span className="profile-photo" role="img" aria-label="Profile photo" style={{ backgroundImage: `url(${firebaseUser.photoURL})` }} /> : firebaseUser.displayName?.slice(0, 1).toUpperCase() ?? "A"}</button>{profileOpen && <div className="profile-menu"><strong>{firebaseUser.displayName || "Your profile"}</strong><span>{firebaseUser.email}</span><button type="button" disabled={isSigningOut} onClick={() => void handleSignOut()}>{isSigningOut ? "Signing out..." : "Sign out"}</button></div>}</div> : <div className="auth-actions"><Link href="/login">Log in</Link><Link href="/signup" className="auth-action-primary">Sign up</Link></div>}</div>
      </header>
      <div className="workspace">
        <aside className={`sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
          <button className="new-chat" onClick={startNewChat}><span>+</span> New chat</button>
          <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lessons" aria-label="Search lessons" /><kbd>⌘ K</kbd></label>
          <div className="history-heading"><span>Your learning</span><div className="menu-wrap"><button aria-label="More history options" aria-expanded={historyMenuOpen} onClick={() => { setHistoryMenuOpen((open) => !open); setProfileOpen(false); setConversationMenuOpen(false); }}>•••</button>{historyMenuOpen && <div className="small-menu"><button onClick={() => { setConversations([]); setSelectedId(null); setHistoryMenuOpen(false); }}>Clear local history</button><button onClick={() => { startNewChat(); setHistoryMenuOpen(false); }}>New learning session</button></div>}</div></div>
          <div className="conversation-list">
            <p className="group-label">Today</p>
            {filteredConversations.slice(0, 2).map((conversation) => <ConversationItem key={conversation.id} conversation={conversation} active={conversation.id === selectedId} onClick={() => { setSelectedId(conversation.id); setMobileSidebarOpen(false); }} onDelete={() => void deleteConversation(conversation.id)} />)}
            <p className="group-label spaced">Earlier</p>
            {filteredConversations.slice(2).map((conversation) => <ConversationItem key={conversation.id} conversation={conversation} active={conversation.id === selectedId} onClick={() => { setSelectedId(conversation.id); setMobileSidebarOpen(false); }} onDelete={() => void deleteConversation(conversation.id)} />)}
          </div>
          <div className="sidebar-footer"><button>↗ <span>Share feedback</span></button></div>
        </aside>

        <section className="chat-area">
          <div className="chat-heading"><div><span className="eyebrow">LEARNING SESSION</span><h1>{selected.title}</h1></div><div className="menu-wrap"><button className="more-button" aria-label="Conversation options" aria-expanded={conversationMenuOpen} onClick={() => { setConversationMenuOpen((open) => !open); setProfileOpen(false); setHistoryMenuOpen(false); }}>•••</button>{conversationMenuOpen && <div className="small-menu conversation-menu"><button onClick={() => { startNewChat(); setConversationMenuOpen(false); }}>New learning session</button><button onClick={() => { setInput(""); setConversationMenuOpen(false); }}>Clear composer</button></div>}</div></div>
          <div className={`message-scroll ${isEmpty ? "empty-scroll" : ""}`}>
            {isEmpty ? <EmptyState onSuggestion={selectSuggestion} /> : <div className="messages">{selected.messages.map((message) => <MessageBubble key={message.id} message={message} />)}{isThinking && <div className="thinking"><span /><span /><span /> Samjho is thinking</div>}</div>}
          </div>
          <div className="composer-wrap">
            {!isEmpty && <div className="quick-actions"><button onClick={() => setQuickAction("Make it simpler")}>Make it simpler</button><button onClick={() => setQuickAction("Give another real-life example")}>Another example</button><button onClick={() => setQuickAction("Test me")}>Test me</button></div>}
            <form className="composer" onSubmit={submitMessage}><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="What do you want to understand?" aria-label="What do you want to understand?" rows={1} /><div className="composer-bottom"><span>Samjho adapts to how you learn <span className="sparkle">✦</span></span><button className="send-button" type="submit" aria-label="Send message">↑</button></div></form>
            <p className="composer-note">Samjho can make mistakes. Check important information.</p>
          </div>
        </section>
      </div>
      {loginPromptOpen && <div className="login-prompt-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginPromptOpen(false); }}><section className="login-prompt" role="dialog" aria-modal="true" aria-labelledby="login-prompt-title"><button className="login-prompt-close" type="button" aria-label="Close sign in message" onClick={() => setLoginPromptOpen(false)}>×</button><span className="eyebrow">YOUR LEARNING SPACE</span><h2 id="login-prompt-title">Please log in to start chatting</h2><p>Sign in or create an account to ask questions, save lessons, and continue learning later.</p><div className="login-prompt-actions"><Link href="/login" className="auth-action-primary">Log in</Link><Link href="/signup">Sign up</Link></div></section></div>}
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
  return <div className="empty-state"><div className="empty-icon"><span>✦</span></div><span className="eyebrow">A LITTLE LESS STUCK</span><h2>What do you want to<br /><em>understand?</em></h2><p>Ask anything. We’ll find the explanation<br />that makes it click for you.</p><div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion.label} onClick={() => onSuggestion(suggestion.label)}><span>{suggestion.icon}</span>{suggestion.label}<b>↗</b></button>)}</div></div>;
}

function MessageBubble({ message }: { message: Message }) {
  return <article className={`message ${message.role}`}><div className="message-avatar">{message.role === "assistant" ? "s" : "A"}</div><div className="message-content">{message.role === "assistant" && <span className="assistant-label">SAMJHO <span>✦</span></span>}{message.content.split("\n").map((line, index) => line ? <p key={index}>{line}</p> : <br key={index} />)}</div></article>;
}
