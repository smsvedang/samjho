import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { MessageBubble } from './MessageBubble';
import { InputBox } from './InputBox';
import { PrivacyBadge } from './PrivacyBadge';
import { responseController } from '../ai/responseController';
import { clearAllLocalConversationData } from '../privacy/dataClear';
import { inferenceEngine } from '../ai/inferenceEngine';
import { aiSettingsManager } from '../ai/aiSettings';
import {
  Trash2,
  Plus,
  Sun,
  Moon,
  Shield,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { AISettingsModal } from './AISettingsModal';

interface ChatWindowProps {
  onNavigate?: (route: '/' | '/chat' | '/privacy' | '/safety' | '/about') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  onNavigate,
  isDarkMode,
  toggleDarkMode,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestVersion = useRef(0);
  const [clearVersion, setClearVersion] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Ensure the conversation is always in Instant Zero-Download mode
    if (aiSettingsManager.getSettings().provider === 'webgpu') {
      aiSettingsManager.setProvider('instant');
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    const requestId = ++requestVersion.current;
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      await responseController.handleUserMessage(text.trim(), (partialMsg) => {
        if (requestId !== requestVersion.current) return;
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
      if (requestId === requestVersion.current) setIsGenerating(false);
    }
  };

  const handleStop = () => {
    requestVersion.current += 1;
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

    const requestId = ++requestVersion.current;
    setIsGenerating(true);
    try {
      await responseController.handleUserMessage(
        lastUserMessage.text,
        (partialMsg) => {
          if (requestId !== requestVersion.current) return;
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
      if (requestId === requestVersion.current) setIsGenerating(false);
    }
  };

  const confirmClearConversation = async () => {
    requestVersion.current += 1;
    responseController.stop();
    clearAllLocalConversationData();
    setMessages([]);
    setIsGenerating(false);
    setIsClearing(true);
    setClearVersion((version) => version + 1);
    setShowClearModal(false);
    try {
      await inferenceEngine.resetConversation();
    } catch (err) {
      console.warn('[Samjho] Reset context failed:', err);
    } finally {
      setIsClearing(false);
    }
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
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-samjho-600 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              ☼
            </div>
            <span className="font-bold tracking-tight text-neutral-900 dark:text-neutral-100 text-base flex items-center gap-1">
              SAMJHO
              <span className="text-amber-500 font-normal text-sm">☼</span>
            </span>
          </button>

          {/* Privacy Trust Badge */}
          <div className="ml-2">
            <PrivacyBadge />
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
            <span className="hidden sm:inline">New</span>
          </button>

          {/* Clear Conversation Button */}
          {messages.length > 0 && (
            <button
              onClick={() => setShowClearModal(true)}
              className="p-2 rounded-xl text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Clear Conversation"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Privacy Policy Link */}
          <button
            onClick={() => onNavigate?.('/privacy')}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy</span>
          </button>

          {/* Safety Link */}
          <button
            onClick={() => onNavigate?.('/safety')}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Safety</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer ml-1"
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* AI Settings Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="AI Engine Settings"
            aria-label="AI Engine Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Chat Scroll Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-4">
        <div className="max-w-3xl mx-auto w-full">
          {messages.length === 0 ? (
            /* Clean, Empathetic Empty State */
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-samjho-600 to-indigo-500 text-white flex items-center justify-center text-3xl font-bold shadow-float mb-5">
                ☼
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2">
                Main sun raha hoon.
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-md leading-relaxed">
                Jo bhi mann mein ho, yahan bindaas kaho. Zero judgment, 100% private.
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3 font-medium">
                No account • No judgment • Anonymous
              </p>
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
          clearVersion={clearVersion}
          disabled={isClearing}
        />
      </footer>

      {/* Clear Conversation Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-surface-darkCard rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-slide-up text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Clear this conversation?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              Sabhi messages aur temporary baatein clear ho jayengi.
            </p>

            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearConversation}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-md transition cursor-pointer"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
