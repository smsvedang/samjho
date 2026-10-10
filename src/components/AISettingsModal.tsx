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
                AI Engine & Setup
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Choose how Samjho responds to your messages
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

        {/* Engine Selection Cards */}
        <div className="mt-4 space-y-3">
          {/* 1. Instant Zero-Download AI (Default) */}
          <label
            className={`block p-3.5 rounded-2xl border transition-all cursor-pointer ${
              settings.provider === 'instant'
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="engineProvider"
                checked={settings.provider === 'instant'}
                onChange={() => setSettings(prev => ({ ...prev, provider: 'instant' }))}
                className="mt-1 accent-emerald-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      Instant Direct AI (0 MB Download — Ready)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ⚡ Instant Talk
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Direct conversation out of the box with <strong>zero download wait time</strong>. Answers all science, math, code, Hinglish, emotional support, and general knowledge questions immediately.
                </p>
              </div>
            </div>
          </label>

          {/* Section Divider: Optional Custom APIs */}
          <div className="pt-2 pb-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              <span>Optional Custom / Cloud Power</span>
              <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              Connect your own high-speed API keys or local Ollama server directly from your browser.
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
                    500 T/S Speed
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Ultra-fast response speed using Llama 3.3 70B.
                </p>

                {settings.provider === 'groq' && (
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
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
                        Free Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="password"
                      placeholder="gsk_..."
                      value={settings.groqApiKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, groqApiKey: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-samjho-500 font-mono"
                    />
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
                    Google AI
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Google Generative Language API.
                </p>

                {settings.provider === 'gemini' && (
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
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
                        Free Key <ExternalLink className="w-3 h-3" />
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

          {/* 4. Custom OpenAI / Ollama */}
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
                      Custom OpenAI / Ollama
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                    Local/API
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Connect to local Ollama (<code>http://localhost:11434/v1</code>) or any OpenAI endpoint.
                </p>

                {settings.provider === 'openai' && (
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                    <input
                      type="password"
                      placeholder="API Key (optional for Ollama)"
                      value={settings.openaiApiKey || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-samjho-500 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                      value={settings.openaiBaseUrl || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, openaiBaseUrl: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-2 focus:ring-samjho-500 font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </label>

          {/* 5. On-device WebGPU (Optional download) */}
          <label
            className={`block p-3.5 rounded-2xl border transition-all cursor-pointer ${
              settings.provider === 'webgpu'
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="engineProvider"
                checked={settings.provider === 'webgpu'}
                onChange={() => setSettings(prev => ({ ...prev, provider: 'webgpu' }))}
                className="mt-1 accent-indigo-600 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      On-device WebGPU Model
                    </span>
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    Offline Cache (1GB)
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  Downloads model weights directly into your browser storage using WebGPU for 100% offline chat.
                </p>
              </div>
            </div>
          </label>

          {/* Web Search Toggle */}
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
                  When enabled, matching queries or links are fetched from the web to inject real-time context into Samjho.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-4 p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-850/60 border border-neutral-200/50 dark:border-neutral-800 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-2 font-semibold text-neutral-800 dark:text-neutral-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Zero-Retention Privacy Guarantee</span>
          </div>
          <p className="leading-relaxed">
            Chat messages are stored only in volatile page memory. No chat history is saved to browser storage or remote databases.
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
                <span>Saved</span>
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
