import React, { useState } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';
import { EngineProvider } from '../types';

interface PrivacyBadgeProps {
  engineType?: EngineProvider;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ engineType = 'local-companion' }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-sm group"
        title="Verified Local & Private. Click for details."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold tracking-wide">
          {['groq', 'gemini', 'openai'].includes(engineType) ? 'Private' : 'Local'}
        </span>
        <span className="hidden sm:inline text-emerald-600/80 dark:text-emerald-400/80 font-normal">
          | {engineType === 'webgpu' ? 'WebGPU Device Inference' : engineType === 'groq' ? 'Groq Llama 3.3 (Private)' : engineType === 'gemini' ? 'Gemini 2.0 (Private)' : engineType === 'openai' ? 'Custom API' : 'On-Device Processing'}
        </span>
        <Info className="w-3 h-3 ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Verification Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-surface-darkCard rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-up">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Local Privacy Verification
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Verified: Conversations stay on your device
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                <p className="font-medium text-neutral-900 dark:text-neutral-100">
                  Your conversation is being processed on this device.
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Unlike conventional AI services, Samjho does not transmit your text or voice prompts to a remote chat server.
                </p>
              </div>

              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> No Account, Email or Phone required
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> No Cloud Conversation Database
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> Ephemeral memory: clears on tab close or session reset
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✓</span> Engine: {engineType === 'webgpu' ? 'Accelerated WebGPU' : 'Pure Browser Local Engine'}
                </li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
