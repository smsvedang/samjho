import React from 'react';
import { ArrowLeft, Heart, Sparkles, Shield, Cpu, Compass } from 'lucide-react';

interface AboutProps {
  onBack: () => void;
  onStartTalking: () => void;
}

export const About: React.FC<AboutProps> = ({ onBack, onStartTalking }) => {
  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-neutral-900 dark:text-neutral-100 flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/70 dark:bg-surface-darkCard/70 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-samjho-600 dark:hover:text-samjho-400 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-samjho-600 text-white flex items-center justify-center font-bold text-xs">
            ☼
          </div>
          <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
            About Samjho
          </span>
        </div>

        <button
          onClick={onStartTalking}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-samjho-600 hover:bg-samjho-700 text-white transition cursor-pointer"
        >
          Start Talking
        </button>
      </header>

      {/* Main Content (PRD Section 1, 2, 48, 49, 54) */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full space-y-12">
        <div className="text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-samjho-600 to-indigo-500 text-white mx-auto flex items-center justify-center text-2xl font-bold mb-4 shadow-float">
            ☼
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Samjho.
          </h1>
          <p className="text-base text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed">
            Hindi word for <em>"Understand"</em>.
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            An AI that listens, understands and explains.
          </p>
        </div>

        {/* Vision Statement (PRD Section 1.1) */}
        <div className="p-8 rounded-3xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-soft text-center">
          <blockquote className="text-lg sm:text-xl font-medium text-neutral-800 dark:text-neutral-200 italic mb-4">
            “A place where I can say anything without having to introduce myself.”
          </blockquote>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
            Most AI assistants are built for "Question → Answer". But people don't always interact with AI because they need an answer. Sometimes they want to think aloud, explain what happened, vent, or ask an embarrassing doubt without an account following them forever.
          </p>
        </div>

        {/* 5 Core Principles (PRD Section 2) */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-samjho-600" />
            <span>5 Core Product Principles</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
              <span className="text-xs font-bold text-samjho-600 dark:text-samjho-400">1. No Identity</span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                No name, email, phone number, account, password, or permanent profile.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
              <span className="text-xs font-bold text-samjho-600 dark:text-samjho-400">2. No Conversation Database</span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Chat messages are held in page memory and are not written to a database or browser history storage by this app. External service retention is separate.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
              <span className="text-xs font-bold text-samjho-600 dark:text-samjho-400">3. Private Intelligence</span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Zero identity, zero data retention. Your messages stay private and disappear when you leave.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
              <span className="text-xs font-bold text-samjho-600 dark:text-samjho-400">4. Human Conversation</span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Understands context and emotional nuance instead of mechanically matching keywords.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card sm:col-span-2">
              <span className="text-xs font-bold text-samjho-600 dark:text-samjho-400">5. Explain, Don't Lecture</span>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Adapts explanations to your level and language (English, Hindi, Hinglish) without condescension.
              </p>
            </div>
          </div>
        </section>

        {/* PRD Section 54: Final Statement */}
        <div className="p-8 rounded-3xl bg-neutral-900 text-white text-center">
          <p className="text-lg font-bold mb-2">SAMJHO</p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-6">
            Ask a question. Explain a problem. Learn something. Think something through. Or just talk.
          </p>
          <div className="inline-block px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-mono text-emerald-400">
            Samjho — because sometimes understanding is more important than answering.
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={onStartTalking}
            className="px-6 py-3 rounded-2xl bg-samjho-600 hover:bg-samjho-700 text-white font-medium text-sm transition shadow-sm cursor-pointer"
          >
            Start Talking Now
          </button>
        </div>
      </main>
    </div>
  );
};
