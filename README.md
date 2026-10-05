# SAMJHO AI (samjhoai.in)

> **"Understand what you mean and help you understand what you need."**  
> *Privacy-first AI companion & general-purpose AI assistant. Talk freely without introducing yourself.*

---

## ☼ Core Product Philosophy

1. **No Identity:** No Name, Email, Phone number, Account, Password, or Profile.
2. **No Conversation Database:** Samjho does not maintain a cloud conversation history. What you type stays on your device.
3. **Local Intelligence:** Conversation processing runs locally on the user's device via WebGPU and in-browser local companion models.
4. **Human Conversation:** Understands context and nuance instead of mechanically matching keywords.
5. **Explain, Don't Lecture:** Adapts explanations to your level and language (English, Hindi, Hinglish).

---

## 🧠 Adaptive Conversation Modes

Samjho does not force users into rigid modes; it adapts organically:
- **Ask Mode:** Structured breakdowns for factual/educational doubts (Definition, Intuition, Formula, Example, Application).
- **Explain Mode:** Tailors explanations ("Explain like I'm 10", "for my B.Tech exam", "in Hinglish", "important points").
- **Think Mode:** Clarifies reasoning and options for decisions without blindly dictating life choices.
- **Listen Mode:** Warm, calm, non-judgmental presence for venting and emotional decompression.
- **Mixed Mode:** Elegantly balances academic/practical pressure with personal emotional support.

---

## 🛡️ Safety & Care Layer

- Real-time client-side safety evaluation for distress, self-harm, or medical emergencies.
- Calming, direct responses paired with verified 24/7 confidential helplines (Tele-MANAS, 112, Vandrevala Foundation, KIRAN).
- Clear medical & clinical boundaries: provides educational explanations, never poses as a doctor or therapist.

---

## ⚡ Technical Architecture

```
samjho/
├── src/
│   ├── components/
│   │   ├── ChatWindow.tsx      # Main conversational screen
│   │   ├── MessageBubble.tsx   # Markdown, TTS, copy, mode badges, helpline cards
│   │   ├── InputBox.tsx        # Auto-resizing input, stop generation, speech-to-text
│   │   ├── VoiceButton.tsx     # Local speech recognition (Web Speech API)
│   │   ├── PrivacyBadge.tsx    # Live device inference verification badge
│   │   └── ModelLoader.tsx     # Download progress & compatibility states
│   ├── ai/
│   │   ├── modelManager.ts     # Device tier detection (WebGPU/RAM)
│   │   ├── inferenceEngine.ts  # WebLLM streaming & client companion engine
│   │   ├── contextManager.ts   # System prompt & compact ephemeral context
│   │   ├── safetyEngine.ts     # Crisis evaluation & helpline directory
│   │   └── responseController.ts # Conversation pipeline coordinator
│   ├── privacy/
│   │   ├── storagePolicy.ts    # Zero-persistence & disk leak prevention
│   │   ├── sessionManager.ts   # In-memory session lifecycle
│   │   └── dataClear.ts        # Instant conversation purge
│   ├── pages/
│   │   ├── Home.tsx            # Full landing page (PRD Section 29)
│   │   ├── Chat.tsx            # Direct chat route (/chat)
│   │   ├── Privacy.tsx         # Privacy Center (PRD Section 22 & 51)
│   │   ├── Safety.tsx          # Safety guidelines & helpline directory
│   │   └── About.tsx           # Brand philosophy & 5 principles
│   ├── types.ts                # TypeScript domain models
│   ├── App.tsx                 # Routing, theme management, PWA prompt
│   ├── main.tsx                # Entry point & PWA service worker
│   └── index.css               # Warm minimalist styling
└── public/
    ├── manifest.json           # PWA installable manifest
    ├── sw.js                   # Service Worker offline caching
    └── logo.svg                # SAMJHO ☼ warm beacon emblem
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```
