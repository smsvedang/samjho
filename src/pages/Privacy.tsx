import React from 'react';
import { ShieldCheck, ArrowLeft, Lock, HardDrive, EyeOff, Trash2, Cpu } from 'lucide-react';

interface PrivacyProps {
  onBack: () => void;
  onStartTalking: () => void;
}

export const Privacy: React.FC<PrivacyProps> = ({ onBack, onStartTalking }) => {
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
            Privacy Center
          </span>
        </div>

        <button
          onClick={onStartTalking}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-samjho-600 hover:bg-samjho-700 text-white transition cursor-pointer"
        >
          Start Talking
        </button>
      </header>

      {/* Main Content (PRD Section 22) */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full space-y-12">
        <div className="text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            Samjho Privacy Center
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            “Samjho is designed so your conversations can be processed locally on your device rather than sent to a cloud AI service.”
          </p>
        </div>

        {/* 4 Pillars of PRD Section 22 */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <EyeOff className="w-5 h-5 text-samjho-600 dark:text-samjho-400" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                What Samjho knows
              </h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <strong>Nothing about who you are</strong> unless you choose to tell it during the conversation.
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
              <p>Samjho will never ask for: Name, Email, Phone number, Date of birth, Contacts, or Social profiles.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <HardDrive className="w-5 h-5 text-samjho-600 dark:text-samjho-400" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                What Samjho stores
              </h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <strong>Samjho is designed not to maintain a cloud conversation history.</strong>
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
              <p>We do not store: User messages, AI responses, Conversation histories, Emotional profiles, or Behavioral telemetry.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <Cpu className="w-5 h-5 text-samjho-600 dark:text-samjho-400" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Where the conversation is processed
              </h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <strong>On the user's device</strong> when local inference is available (using WebGPU and in-browser models).
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
              <p>Your browser executes the AI model locally. Your thoughts do not pass through remote third-party AI APIs.</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card">
            <div className="flex items-center gap-3 mb-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                What happens when you leave?
              </h2>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              The active conversation is cleared according to the application's local-session behavior. When you close the tab, refresh, or hit <em>Clear Conversation</em>, active in-memory context is immediately discarded. There is no permanent memory or "Samjho remembers you" profile.
            </p>
          </div>
        </div>

        {/* PRD Section 19: No Tracking Policy */}
        <div className="p-6 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
          <h3 className="font-bold text-neutral-900 dark:text-neutral-200">
            Zero Tracking Guarantee
          </h3>
          <p>
            Samjho rejects invasive analytics, session recording (no Hotjar / LogRocket / Clarity), advertising trackers, third-party pixels, and behavioral profiling.
          </p>
        </div>

        <div className="text-center pt-4">
          <button
            onClick={onStartTalking}
            className="px-6 py-3 rounded-2xl bg-samjho-600 hover:bg-samjho-700 text-white font-medium text-sm transition shadow-sm cursor-pointer"
          >
            Start Talking Anonymously
          </button>
        </div>
      </main>
    </div>
  );
};
