"use client";

import Link from "next/link";
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

const suggestions = [
  { label: "Photosynthesis samjhao", icon: "✦" },
  { label: "What is recursion?", icon: "{}" },
  { label: "GDP simple language mein", icon: "↗" },
  { label: "Why does inflation happen?", icon: "◌" },
];

function tutorReply(prompt: string) {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("recursion")) {
    return "Recursion ka matlab hai: ek function apne aap ko smaller problem ke saath call karta hai.\n\nImagine ek Russian doll. Har doll ke andar same shape ki, lekin chhoti doll hoti hai. Function bhi problem ko chhota karta rehta hai, jab tak simplest case nahi milta.\n\nHar recursive function ke do parts hote hain:\n1. Base case: kab rukna hai.\n2. Recursive case: next smaller problem.\n\nAgar base case na ho, function kabhi nahi rukega. Ab batao: recursion mein base case ka role kya hai?";
  }
  if (lowerPrompt.includes("inflation") || lowerPrompt.includes("gdp")) {
    return "Chalo ise everyday example se samjhte hain. Jab same cheezon ko kharidne ke liye time ke saath zyada paise chahiye, prices badh rahe hote hain. Is general price rise ko inflation kehte hain.\n\nSocho ek chai jo pehle ₹10 ki thi aur ab ₹12 ki hai. Sirf ek chai ka price badhna inflation nahi; jab bahut saari cheezon ke prices average mein badhein, tab inflation hoti hai.\n\nEk quick check: agar sirf ek product mehnga ho, lekin baaki sab same rahein, kya use inflation kahenge?";
  }
  return "Bilkul. Pehle is concept ko ek simple mental picture se samjhte hain.\n\nSocho tumhare paas ek system hai jo input leta hai, us par kaam karta hai, aur output deta hai. Concept ko samajhne ke liye hum ise teen parts mein tod sakte hain: kya hai, kaise kaam karta hai, aur kahan useful hai.\n\nAb ek real-life example: tumhare daily life mein aisa kaunsa example aata hai jahan input badalne par output bhi badal jaata hai?";
}

export default function Home() {
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
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? { id: "draft", title: "New learning session", time: "Not saved", messages: [] };
  const isEmpty = selected.messages.length === 0;
  const filteredConversations = useMemo(
    () => conversations.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase())),
    [conversations, search],
  );

  useEffect(() => {
    if (!auth) {
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserId(null);
        setConversations([]);
        setSelectedId(null);
        setConnectionStatus("Sign in to start a lesson");
        return;
      }
      setUserId(user.uid);
      const token = await user.getIdToken();
      const response = await fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        setConnectionStatus(response.status === 401 ? "Sign-in session needs refreshing" : "Lessons are temporarily unavailable");
        return;
      }
      const data = await response.json();
      const loaded = (data ?? []).map((conversation: { id: string; title: string; updated_at: string }) => ({ id: conversation.id, title: conversation.title, time: new Date(conversation.updated_at).toLocaleDateString(), messages: [] }));
      setConversations(loaded);
      setSelectedId(loaded[0]?.id ?? null);
      setConnectionStatus("Synced with Firebase");
    });
    return unsubscribe;
  }, [auth]);

  useEffect(() => {
    async function loadMessages() {
      if (!firebaseUser || !selectedId || selectedId.startsWith("draft-")) return;
      const token = await firebaseUser.getIdToken();
      const response = await fetch(`/api/conversations/${selectedId}/messages`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return;
      const data = await response.json();
      setConversations((current) => current.map((conversation) => conversation.id === selectedId ? { ...conversation, messages: data.filter((message: { role: string }) => message.role !== "system").map((message: { id: string; role: string; content: string }) => ({ id: message.id, role: message.role as Message["role"], content: message.content })) } : conversation));
    }
    void loadMessages();
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
    const assistantContent = tutorReply(prompt);
    const messageResponse = await fetch(`/api/conversations/${conversationId}/messages`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }, { role: "assistant", content: assistantContent }] }) });
    const savedMessages = messageResponse.ok ? await messageResponse.json() : [];
    const messages = (savedMessages ?? []).map((message: { id: string; role: string; content: string }) => ({ id: message.id, role: message.role as Message["role"], content: message.content }));
    setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, title, time: "Just now", messages: [...conversation.messages, ...messages] } : conversation));
    setInput("");
    setConnectionStatus("Synced with Firebase");
    setIsThinking(true);
    window.setTimeout(() => setIsThinking(false), 650);
  }

  function startNewChat() {
    const id = `draft-${Date.now()}`;
    setConversations((current) => [{ id, title: "New learning session", time: "Just now", messages: [] }, ...current]);
    setSelectedId(id);
    setInput("");
  }

  function setQuickAction(action: string) {
    setInput(action);
  }

  async function handleSignOut() {
    if (!auth) return;
    await signOut(auth);
    setProfileOpen(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="mobile-menu" aria-label="Open conversation history">☰</button>
        <div className="wordmark"><span className="wordmark-mark">s</span><span>samjho</span></div>
        <div className="topbar-right">{firebaseUser ? <div className="profile-menu-wrap"><button className="profile-button" aria-label="Open profile" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>{firebaseUser.photoURL ? <span className="profile-photo" role="img" aria-label="Profile photo" style={{ backgroundImage: `url(${firebaseUser.photoURL})` }} /> : firebaseUser.displayName?.slice(0, 1).toUpperCase() ?? "A"}</button>{profileOpen && <div className="profile-menu"><strong>{firebaseUser.displayName || "Your profile"}</strong><span>{firebaseUser.email}</span><button type="button" onClick={() => void handleSignOut()}>Sign out</button></div>}</div> : <Link href="/login" className="profile-button" aria-label="Sign in">A</Link>}</div>
      </header>
      <div className="workspace">
        <aside className="sidebar">
          <button className="new-chat" onClick={startNewChat}><span>+</span> New chat</button>
          <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lessons" aria-label="Search lessons" /><kbd>⌘ K</kbd></label>
          <div className="history-heading"><span>Your learning</span><div className="menu-wrap"><button aria-label="More history options" aria-expanded={historyMenuOpen} onClick={() => setHistoryMenuOpen((open) => !open)}>•••</button>{historyMenuOpen && <div className="small-menu"><button onClick={() => { setConversations([]); setSelectedId(null); setHistoryMenuOpen(false); }}>Clear local history</button><button onClick={() => { startNewChat(); setHistoryMenuOpen(false); }}>New learning session</button></div>}</div></div>
          <div className="conversation-list">
            <p className="group-label">Today</p>
            {filteredConversations.slice(0, 2).map((conversation) => <ConversationItem key={conversation.id} conversation={conversation} active={conversation.id === selectedId} onClick={() => setSelectedId(conversation.id)} />)}
            <p className="group-label spaced">Earlier</p>
            {filteredConversations.slice(2).map((conversation) => <ConversationItem key={conversation.id} conversation={conversation} active={conversation.id === selectedId} onClick={() => setSelectedId(conversation.id)} />)}
          </div>
          <div className="sidebar-footer"><button>↗ <span>Share feedback</span></button></div>
        </aside>

        <section className="chat-area">
          <div className="chat-heading"><div><span className="eyebrow">LEARNING SESSION</span><h1>{selected.title}</h1></div><div className="menu-wrap"><button className="more-button" aria-label="Conversation options" aria-expanded={conversationMenuOpen} onClick={() => setConversationMenuOpen((open) => !open)}>•••</button>{conversationMenuOpen && <div className="small-menu conversation-menu"><button onClick={() => { startNewChat(); setConversationMenuOpen(false); }}>New learning session</button><button onClick={() => { setInput(""); setConversationMenuOpen(false); }}>Clear composer</button></div>}</div></div>
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
    </main>
  );
}

function ConversationItem({ conversation, active, onClick }: { conversation: Conversation; active: boolean; onClick: () => void }) {
  return <button className={`conversation-item ${active ? "active" : ""}`} onClick={onClick}><span className="conversation-title">{conversation.title}</span><span className="conversation-time">{conversation.time}</span></button>;
}

function EmptyState({ onSuggestion }: { onSuggestion: (prompt: string) => void }) {
  return <div className="empty-state"><div className="empty-icon"><span>✦</span></div><span className="eyebrow">A LITTLE LESS STUCK</span><h2>What do you want to<br /><em>understand?</em></h2><p>Ask anything. We’ll find the explanation<br />that makes it click for you.</p><div className="suggestions">{suggestions.map((suggestion) => <button key={suggestion.label} onClick={() => onSuggestion(suggestion.label)}><span>{suggestion.icon}</span>{suggestion.label}<b>↗</b></button>)}</div></div>;
}

function MessageBubble({ message }: { message: Message }) {
  return <article className={`message ${message.role}`}><div className="message-avatar">{message.role === "assistant" ? "s" : "A"}</div><div className="message-content">{message.role === "assistant" && <span className="assistant-label">SAMJHO <span>✦</span></span>}{message.content.split("\n").map((line, index) => line ? <p key={index}>{line}</p> : <br key={index} />)}</div></article>;
}
