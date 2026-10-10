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
            Chat generation uses a browser-based WebGPU model when available. This code does not establish what hosting, browser, model-download or optional search providers log or retain.
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
              <strong>The app code does not write chat messages to a database or browser storage.</strong>
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 space-y-1">
              <p>Messages remain in page memory while chatting. External providers and hosting may have separate logging or retention policies that are not controlled by this app.</p>
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
              <strong>In the browser</strong> when the WebGPU model is ready.
            </p>
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
              <p>The chat inference path uses the loaded WebGPU model. External search is off by default; enabling it sends matching queries or URLs to third-party search/extraction services. Browser speech recognition may also use a browser-provided service.</p>
              <p className="mt-2">PDF and image processing runs in the browser, but worker and language/runtime assets may be downloaded from public CDNs. This is separate from sending file contents to those CDNs.</p>
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
              Clear Conversation aborts active generation and clears page messages, attachments, temporary context and the WebLLM chat state. Refreshing or leaving the page also discards application memory. It cannot remove model files/settings or recall data already sent to an external service.
            </p>
          </div>
        </div>

        {/* Application telemetry disclosure */}
        <div className="p-6 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
          <h3 className="font-bold text-neutral-900 dark:text-neutral-200">
            Application telemetry
          </h3>
          <p>
            No analytics or session-recording integration was found in the checked-in application code. Hosting, browser, model and optional external-search service logging is outside the scope of this app code and must be checked separately.
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
