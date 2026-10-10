import React, { useState } from 'react';
import { Info, ShieldCheck, X } from 'lucide-react';
import { EngineProvider, ModelStage } from '../types';

interface PrivacyBadgeProps {
  engineType?: EngineProvider;
  stage?: ModelStage;
  externalSearchEnabled?: boolean;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({
  engineType = 'webgpu',
  stage = 'idle',
  externalSearchEnabled = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const status = stage === 'ready'
    ? 'WebGPU model ready'
    : stage === 'downloading'
      ? 'Model downloading'
      : stage === 'unsupported'
        ? 'WebGPU unavailable'
        : stage === 'error'
          ? 'Model needs attention'
          : stage === 'generating'
            ? 'Generating locally'
            : 'Local model status';

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-50 dark:bg-neutral-900/60 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-sm"
        title="Shows local model status and data-handling details."
      >
        <span className={`h-2 w-2 rounded-full ${stage === 'ready' || stage === 'generating' ? 'bg-emerald-500' : stage === 'error' || stage === 'unsupported' ? 'bg-amber-500' : 'bg-neutral-400'}`} />
        <span className="font-semibold tracking-wide">{status}</span>
        <span className="hidden sm:inline text-neutral-500 dark:text-neutral-400 font-normal">
          | {engineType === 'webgpu' ? 'Browser inference' : 'Local inference'}
        </span>
        <Info className="w-3 h-3 ml-0.5 opacity-60" />
      </button>

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
                    Local model status
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{status}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close privacy details"
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
              <p className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800 text-xs">
                When the WebGPU model is ready, chat generation is performed in this browser. Model files are downloaded separately and may be cached by WebLLM in browser storage.
              </p>
              <ul className="space-y-2 text-xs">
                <li>• This app does not save chat history to browser storage.</li>
                <li>• External search is {externalSearchEnabled ? 'enabled; matching queries or URLs may be sent to search/extraction services.' : 'disabled.'}</li>
                <li>• Browser speech recognition may use a browser-provided service; Samjho cannot verify its processing location.</li>
                <li>• Hosting, browser, and model-host logs or retention are outside this code’s control.</li>
                <li>• Engine status: {engineType}.</li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
