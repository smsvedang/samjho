import React from 'react';
import { ShieldAlert, ArrowLeft, PhoneCall, HeartHandshake, AlertCircle, Heart } from 'lucide-react';
import { CRISIS_HELPLINES } from '../ai/safetyEngine';

interface SafetyProps {
  onBack: () => void;
  onStartTalking: () => void;
}

export const Safety: React.FC<SafetyProps> = ({ onBack, onStartTalking }) => {
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
            Safety & Care
          </span>
        </div>

        <button
          onClick={onStartTalking}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-samjho-600 hover:bg-samjho-700 text-white transition cursor-pointer"
        >
          Start Talking
        </button>
      </header>

      {/* Main Content (PRD Section 23, 24, 25) */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full space-y-12">
        <div className="text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            Safety, Care & Crisis Guidelines
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Because users may discuss sensitive topics, Samjho incorporates an empathetic safety layer designed to support without judgment.
          </p>
        </div>

        {/* 24/7 Crisis Helplines Directory */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-100">
            <PhoneCall className="w-5 h-5 text-red-500" />
            <h2>Free, 24/7 Confidential Crisis Helplines</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {CRISIS_HELPLINES.map((hl, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                      {hl.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold border border-red-200/50 dark:border-red-900/50">
                      {hl.timing}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
                    {hl.description}
                  </p>
                </div>

                <a
                  href={`tel:${hl.number.replace(/[^0-9]/g, '')}`}
                  className="w-full py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call {hl.number}</span>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* PRD Section 24: Crisis Behavior Principles */}
        <section className="p-6 rounded-2xl bg-white dark:bg-surface-darkCard border border-neutral-200/80 dark:border-neutral-800 shadow-card space-y-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Heart className="w-5 h-5 text-samjho-600" />
            <span>How Samjho Responds</span>
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <strong className="text-neutral-900 dark:text-neutral-100 block mb-0.5">
                For normal sadness & venting:
              </strong>
              <span>Listen and talk normally. Samjho does not overreact to every sad sentiment.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <strong className="text-neutral-900 dark:text-neutral-100 block mb-0.5">
                For serious distress:
              </strong>
              <span>Respond empathetically and encourage real-world human support.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <strong className="text-neutral-900 dark:text-neutral-100 block mb-0.5">
                For immediate danger or crisis:
              </strong>
              <span>Keep language calm and direct, provide emergency contact points, and encourage reaching a trusted person nearby.</span>
            </div>
          </div>
        </section>

        {/* PRD Section 25: Medical Information Disclaimer */}
        <section className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 space-y-2">
          <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-neutral-200">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Medical & Clinical Notice</span>
          </div>
          <p className="leading-relaxed">
            Samjho can provide general educational insights, but never presents itself as a doctor or licensed human therapist. For acute or potentially urgent physical symptoms, please seek appropriate professional medical evaluation or contact Emergency 112.
          </p>
        </section>
      </main>
    </div>
  );
};
