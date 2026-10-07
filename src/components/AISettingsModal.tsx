import React, { useState, useEffect } from 'react';
import { AISettings, EngineProvider } from '../types';
import { aiSettingsManager } from '../ai/aiSettings';
import {
  Sparkles,
  Zap,
  Cpu,
  ShieldCheck,
  ExternalLink,
  Key,
  Check,
  X,
  Server,
  Info
} from 'lucide-react';

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
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-samjho-600 to-indigo-600 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                AI Engine & Answering Power
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose what powers Samjho's intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Selection Cards */}
        <div className="mt-4 space-y-3">
          {/* 1. Smart Local Companion (Top & Recommended for Privacy) */}
          <label
            className={`block p-3.5 rounded-2xl border transition-all cursor-pointer ${
              settings.provider === 'local-companion'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="engineProvider"
                checked={settings.provider === 'local-companion'}
                onChange={() => setSettings(prev => ({ ...prev, provider: 'local-companion' }))}
                className="mt-1 accent-emerald-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      Samjho Universal AI (Default — Free & Ready)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ✨ All Q&A + Web Ready
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Answers <strong>all questions</strong> (science, math, coding, GK, facts) like ChatGPT & Gemini. Live web search and URL content extraction included — <strong>no API key or login required</strong>.
                </p>
              </div>
            </div>
          </label>

          {/* Section Divider: Optional Cloud APIs */}
          <div className="pt-2 pb-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              <span>Optional Cloud Power (Third-Party APIs)</span>
              <div className="flex-1 h-px bg-neutral-200 dark:border-neutral-800" />
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Note: Using external APIs sends your prompts directly to that provider for GPU processing.
            </p>
          </div>

          {/* 2. Groq (Llama 3.3 70B) */}
          <label
            className={`block p-3.5 rounded-2xl border transition-all cursor-pointer ${
              settings.provider === 'groq'
                ? 'border-samjho-500 bg-samjho-50/50 dark:bg-samjho-950/30 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="engineProvider"
                checked={settings.provider === 'groq'}
                onChange={() => setSettings(prev => ({ ...prev, provider: 'groq' }))}
                className="mt-1 accent-samjho-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      Groq API (Llama 3.3 70B)
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    Ultra Fast LLM
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Extreme ~500 tokens/sec speed. Best for complex reasoning, long code debugging, and essays.
                </p>

                {settings.provider === 'groq' && (
                  <div className="mt-3 pt-3 border-t border-samjho-200/60 dark:border-samjho-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" /> Groq API Key
                      </span>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-samjho-600 dark:text-samjho-400 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get Free Key (10 sec) <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      placeholder="gsk_..."
                      value={settings.groqApiKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, groqApiKey: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-samjho-500 font-mono"
                    />
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Calls Groq directly from your browser with your private key.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </label>

          {/* 3. Google Gemini */}
          <label
            className={`block p-3.5 rounded-2xl border transition-all cursor-pointer ${
              settings.provider === 'gemini'
                ? 'border-samjho-500 bg-samjho-50/50 dark:bg-samjho-950/30 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="engineProvider"
                checked={settings.provider === 'gemini'}
                onChange={() => setSettings(prev => ({ ...prev, provider: 'gemini' }))}
                className="mt-1 accent-samjho-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      Google Gemini 2.0 Flash
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    Free Tier
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Google's latest multimodal model. Calls Google Generative Language API directly.
                </p>

                {settings.provider === 'gemini' && (
                  <div className="mt-3 pt-3 border-t border-samjho-200/60 dark:border-samjho-900/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                        <Key className="w-3.5 h-3.5" /> Gemini API Key
                      </span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-samjho-600 dark:text-samjho-400 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get Free Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={settings.geminiApiKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-samjho-500 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </label>

          {/* 4. Custom OpenAI / OpenRouter */}
          <label
            className={`block p-3.5 rounded-2xl border transition-all cursor-pointer ${
              settings.provider === 'openai'
                ? 'border-samjho-500 bg-samjho-50/50 dark:bg-samjho-950/30 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="engineProvider"
                checked={settings.provider === 'openai'}
                onChange={() => setSettings(prev => ({ ...prev, provider: 'openai' }))}
                className="mt-1 accent-samjho-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-500" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      Custom OpenAI / OpenRouter
                    </span>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Use your own OpenAI or OpenRouter key with any model (GPT-4o, Claude, etc).
                </p>

                {settings.provider === 'openai' && (
                  <div className="mt-3 pt-3 border-t border-samjho-200/60 dark:border-samjho-900/60 space-y-2">
                    <input
                      type="password"
                      placeholder="sk-..."
                      value={settings.openaiApiKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-samjho-500 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="https://api.openai.com/v1"
                      value={settings.openaiBaseUrl || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, openaiBaseUrl: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-samjho-500 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* Privacy Promise Notice */}
        <div className="mt-4 p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-850/60 border border-neutral-200/50 dark:border-neutral-800 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Privacy & Anonymity Summary</span>
          </div>
          <p className="leading-relaxed">
            • <strong>Smart Local Companion:</strong> 100% On-Device. Zero network calls. Works completely offline in Airplane mode. Total anonymity.
          </p>
          <p className="leading-relaxed">
            • <strong>Cloud APIs (Groq / Gemini / OpenAI):</strong> Prompts are sent encrypted directly from your browser to that specific AI company. Samjho has no middleman server and stores zero data.
          </p>
        </div>

        {/* Actions */}
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
                <span>Saved!</span>
              </>
            ) : (
              <span>Save & Apply</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
