import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ModelLoadingState, FileAttachment } from '../types';
import { MessageBubble } from './MessageBubble';
import { InputBox } from './InputBox';
import { PrivacyBadge } from './PrivacyBadge';
import { ModelLoader } from './ModelLoader';
import { responseController } from '../ai/responseController';
import { clearAllLocalConversationData } from '../privacy/dataClear';
import { modelManager } from '../ai/modelManager';
import { inferenceEngine } from '../ai/inferenceEngine';
import {
  RotateCcw,
  Trash2,
  Plus,
  Sun,
  Moon,
  Shield,
  HelpCircle,
  Sparkles,
  BookOpen,
  Brain,
  MessageCircle,
  Code,
  Zap
} from 'lucide-react';

interface ChatWindowProps {
  onNavigate?: (route: '/' | '/chat' | '/privacy' | '/safety' | '/about') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const STARTER_PROMPTS = [
  {
    tag: 'Learn',
    icon: BookOpen,
    text: "Explain Faraday's law with definition, intuition, and application.",
    gradient: 'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/5 dark:to-indigo-500/5',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderHover: 'hover:border-blue-400/60',
  },
  {
    tag: 'Vent',
    icon: MessageCircle,
    text: "Aaj bahut ajeeb din tha.",
    gradient: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderHover: 'hover:border-amber-400/60',
  },
  {
    tag: 'Decide',
    icon: Brain,
    text: "Should I change my course?",
    gradient: 'from-purple-500/10 to-fuchsia-500/10 dark:from-purple-500/5 dark:to-fuchsia-500/5',
    iconColor: 'text-purple-600 dark:text-purple-400',
    borderHover: 'hover:border-purple-400/60',
  },
  {
    tag: 'Exam + Stress',
    icon: Sparkles,
    text: "Kal exam hai aur kuch yaad nahi ho raha. Upar se anxiety ho rahi hai.",
    gradient: 'from-rose-500/10 to-pink-500/10 dark:from-rose-500/5 dark:to-pink-500/5',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderHover: 'hover:border-rose-400/60',
  },
  {
    tag: 'Code Help',
    icon: Code,
    text: "Why is my React component re-rendering?",
    gradient: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderHover: 'hover:border-emerald-400/60',
  },
  {
    tag: 'Simplify',
    icon: Zap,
    text: "Explain transformer in simple language.",
    gradient: 'from-cyan-500/10 to-sky-500/10 dark:from-cyan-500/5 dark:to-sky-500/5',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    borderHover: 'hover:border-cyan-400/60',
  },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  onNavigate,
  isDarkMode,
  toggleDarkMode,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [modelState, setModelState] = useState<ModelLoadingState>(modelManager.getState());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = modelManager.subscribe(setModelState);
    // Initialize WebLLM or local inference engine in background
    inferenceEngine.initWebLLM();
    return () => unsub();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, attachments?: FileAttachment[]) => {
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text,
      timestamp: Date.now(),
      attachments,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      await responseController.handleUserMessage(text, attachments, (partialMsg) => {
        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === partialMsg.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = partialMsg;
            return next;
          } else {
            return [...prev, partialMsg];
          }
        });
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    responseController.stop();
    setIsGenerating(false);
  };

  const handleRegenerate = async () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user');
    if (!lastUserMessage || isGenerating) return;

    // Remove the last assistant message
    setMessages((prev) => {
      const lastIndex = prev.map(m => m.sender).lastIndexOf('samjho');
      if (lastIndex >= 0) {
        return prev.slice(0, lastIndex);
      }
      return prev;
    });

    setIsGenerating(true);
    try {
      await responseController.handleUserMessage(
        lastUserMessage.text,
        lastUserMessage.attachments,
        (partialMsg) => {
          setMessages((prev) => {
            const index = prev.findIndex((m) => m.id === partialMsg.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = partialMsg;
              return next;
            } else {
              return [...prev, partialMsg];
            }
          });
        }
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // PRD Section 21: Clear Conversation
  const confirmClearConversation = () => {
    clearAllLocalConversationData();
    setMessages([]);
    setShowClearModal(false);
  };

  const handleNewConversation = () => {
    if (messages.length > 0) {
      setShowClearModal(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-surface-light dark:bg-surface-dark overflow-hidden">
      {/* Top Header */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white/80 dark:bg-surface-darkCard/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate?.('/')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
            title="Samjho Home"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-samjho-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              ☼
            </div>
            <span className="font-bold tracking-tight text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-1">
              SAMJHO
              <span className="text-amber-500 font-normal text-sm">☼</span>
            </span>
          </button>

          {/* Privacy Indicator Badge */}
          <div className="ml-1 hidden sm:block">
            <PrivacyBadge engineType={modelState.activeEngine} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* New Chat Button */}
          <button
            onClick={handleNewConversation}
            className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">New</span>
          </button>

          {/* Clear Conversation Button */}
          {messages.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="p-2 rounded-xl text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Clear</span>
            </button>
          )}

          {/* Navigation Links */}
          <button
            onClick={() => onNavigate?.('/privacy')}
            className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy</span>
          </button>

          <button
            onClick={() => onNavigate?.('/safety')}
            className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Safety</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Privacy indicator strip */}
      <div className="sm:hidden px-4 py-1 bg-neutral-50/80 dark:bg-neutral-900/80 border-b border-neutral-200/40 dark:border-neutral-800/40 flex justify-center">
        <PrivacyBadge engineType={modelState.activeEngine} />
      </div>

      {/* Model Loader Banner (now invisible during normal operation) */}
      <ModelLoader
        state={modelState}
        onRetry={() => inferenceEngine.initWebLLM()}
        onDismiss={() => {
          modelManager.updateState({
            stage: 'ready',
            progress: 100,
            statusText: 'Samjho is ready',
            activeEngine: 'local-companion',
          });
        }}
      />

      {/* Main Chat Scroll Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
        <div className="max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            /* Professional Empty State */
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-8 animate-fade-in">
              {/* Animated Logo */}
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-samjho-600 via-indigo-500 to-purple-500 text-white flex items-center justify-center text-2xl font-bold shadow-float">
                  ☼
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-surface-dark flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">✓</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-1.5">
                Samjho is ready.
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-medium mb-1">
                Ask anything. Say anything.
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm mb-8">
                Everything runs on your device. No account, no cloud, no data collection.
              </p>

              {/* Starter Suggestions */}
              <div className="w-full max-w-2xl text-left">
                <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3 block ml-1">
                  Start a conversation
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {STARTER_PROMPTS.map((prompt, idx) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt.text)}
                        className={`p-3.5 text-left bg-gradient-to-br ${prompt.gradient} hover:bg-opacity-100 border border-neutral-200/70 dark:border-neutral-800/70 ${prompt.borderHover} rounded-2xl shadow-sm hover:shadow-card transition-all duration-200 group cursor-pointer active:scale-[0.98]`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`p-1 rounded-lg bg-white/80 dark:bg-neutral-900/50 ${prompt.iconColor}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className={`text-[11px] font-bold ${prompt.iconColor} uppercase tracking-wide`}>
                            {prompt.tag}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white leading-relaxed line-clamp-2">
                          {prompt.text}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Message Feed */
            <div className="space-y-4 pt-2">
              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onRegenerate={handleRegenerate}
                  isLastAssistantMessage={
                    msg.sender === 'samjho' && index === messages.length - 1
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* Docked Input Section */}
      <footer className="w-full pb-4 sm:pb-6 pt-2 bg-gradient-to-t from-surface-light dark:from-surface-dark via-surface-light/95 dark:via-surface-dark/95 to-transparent z-10">
        <InputBox
          onSend={handleSendMessage}
          onStop={handleStop}
          isGenerating={isGenerating}
        />
      </footer>

      {/* Clear Conversation Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-darkCard rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-up text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Clear this conversation?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              All messages will disappear. Samjho doesn't store any data — this conversation only exists in your current session.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearConversation}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition shadow-sm cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
