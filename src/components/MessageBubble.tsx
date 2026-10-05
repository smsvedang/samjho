import React, { useState } from 'react';
import { ChatMessage, ConversationMode } from '../types';
import { Copy, Check, RotateCcw, Volume2, VolumeX, Sparkles, ShieldAlert, PhoneCall } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isLastAssistantMessage?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRegenerate,
  isLastAssistantMessage = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.sender === 'user';

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text);
    // Prefer Indian English or Hindi voice if present
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const formatModeLabel = (mode?: ConversationMode) => {
    switch (mode) {
      case 'listen':
        return 'Listening & Supporting';
      case 'think':
        return 'Reasoning & Exploring';
      case 'explain':
        return 'Adapted Explanation';
      case 'mixed':
        return 'Understanding Both';
      default:
        return 'Samjho';
    }
  };

  // Basic formatting helper for markdown like bold, bullet lists, code blocks
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold syntax **text**
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code `code`
      const withCode = formattedLine.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-xs text-samjho-600 dark:text-samjho-300">$1</code>');

      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <li key={idx} className="ml-4 list-disc my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: withCode.replace(/^[-•]\s*/, '') }} />
        );
      }
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={idx} className="my-1.5 flex gap-2">
            <span className="font-semibold text-samjho-600 dark:text-samjho-400">{line.trim().split(' ')[0]}</span>
            <span dangerouslySetInnerHTML={{ __html: withCode.replace(/^\d+\.\s*/, '') }} />
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="my-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: withCode }} />;
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-[85%] sm:max-w-[70%] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-2xl rounded-tr-xs px-4 py-3 shadow-card">
          <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-normal">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-6 animate-fade-in group">
      {/* Samjho Header with Adaptive Mode Indicator */}
      <div className="flex items-center gap-2 mb-1.5 ml-1">
        <div className="w-5 h-5 rounded-full bg-samjho-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
          ☼
        </div>
        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
          Samjho
        </span>
        {message.mode && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-samjho-50 dark:bg-samjho-950/60 text-samjho-600 dark:text-samjho-300 font-medium border border-samjho-200/50 dark:border-samjho-800/40">
            {formatModeLabel(message.mode)}
          </span>
        )}
      </div>

      {/* Message Body */}
      <div className="max-w-[95%] sm:max-w-[85%] bg-white dark:bg-surface-darkCard border border-neutral-200/70 dark:border-neutral-800/80 rounded-2xl rounded-tl-xs px-5 py-4 shadow-soft text-neutral-800 dark:text-neutral-200 text-sm sm:text-base">
        {renderFormattedText(message.text)}

        {/* Streaming Cursor */}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-1 bg-samjho-500 animate-pulse align-middle" />
        )}

        {/* Crisis / Safety Helpline Card Embed (PRD Section 24) */}
        {message.helplines && message.helplines.length > 0 && (
          <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <ShieldAlert className="w-4 h-4" />
              <span>Immediate Support Resources (Always Available & Free)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {message.helplines.map((hl, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/50 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-red-900 dark:text-red-200">
                    <span>{hl.name}</span>
                    <a
                      href={`tel:${hl.number.replace(/[^0-9]/g, '')}`}
                      className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline font-mono"
                    >
                      <PhoneCall className="w-3 h-3" />
                      {hl.number}
                    </a>
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                    {hl.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer: Copy, Local Speak, Regenerate */}
      {!message.isStreaming && (
        <div className="flex items-center gap-1 mt-1.5 ml-2 text-neutral-400 dark:text-neutral-500 text-xs">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1"
            title="Copy response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleSpeak}
            className="p-1.5 rounded-lg hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1"
            title="Read aloud locally"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-samjho-500 animate-pulse" />
                <span className="text-[11px] text-samjho-500">Stop</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Listen</span>
              </>
            )}
          </button>

          {isLastAssistantMessage && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded-lg hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1"
              title="Regenerate response"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Regenerate</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
