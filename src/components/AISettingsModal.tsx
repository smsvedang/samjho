import React, { useEffect, useState } from 'react';
import { Check, Cpu, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { AISettings } from '../types';
import { aiSettingsManager } from '../ai/aiSettings';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [settings, setSettings] = useState<AISettings>(aiSettingsManager.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(aiSettingsManager.getSettings());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    aiSettingsManager.saveSettings(settings);
    setSavedSuccess(true);
    onSaved?.();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-surface-darkCard rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-samjho-600 to-indigo-600 text-white shadow-md">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Local AI & Search Settings
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Chat inference uses WebLLM in your browser.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <label className="block p-4 rounded-2xl border border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30">
            <span className="flex items-center gap-2 font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              <input type="radio" name="engineProvider" checked readOnly className="accent-emerald-600" />
              On-device WebGPU model
            </span>
            <span className="block text-xs text-neutral-600 dark:text-neutral-400 mt-2">
              Samjho downloads model files from the model host and may cache those files in your browser. This download is separate from your messages. If this device cannot load WebGPU, chat will not fall back to a hosted AI service.
            </span>
          </label>

          <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/30">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.externalWebSearchEnabled}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    externalWebSearchEnabled: event.target.checked,
                  }))
                }
                className="mt-0.5 accent-samjho-600"
              />
              <span>
                <span className="block font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Enable external web search and URL extraction
                </span>
                <span className="block text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  When enabled, matching queries or URLs are sent to external search/extraction services (including Jina, DuckDuckGo, Wikipedia or OpenStreetMap). Results are then passed to the local model. Conversation history is not sent to those search services by this feature.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-850/60 border border-neutral-200/50 dark:border-neutral-800 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Data handling</span>
          </div>
          <p className="leading-relaxed">
            Chat messages are kept in application memory for the active page and are not saved as conversation history by this app. Model files may remain in browser caches. Browser speech recognition may use a browser-provided service.
          </p>
          <a
            href="https://huggingface.co/mlc-ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-samjho-600 dark:text-samjho-400 hover:underline"
          >
            Model files are hosted separately from chat <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-samjho-600 hover:bg-samjho-700 text-white transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
