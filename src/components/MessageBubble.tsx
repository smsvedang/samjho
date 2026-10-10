import React, { useState } from 'react';
import { ChatMessage, ConversationMode } from '../types';
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  PhoneCall,
} from 'lucide-react';

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

  // Render markdown with fenced code blocks, headers, bold, bullet points
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, partIdx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : '';
        const codeContent = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3) : part.substring(3, part.length - 3);

        return (
          <div key={partIdx} className="my-3 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-neutral-100 text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800 text-neutral-400 text-[11px] font-mono border-b border-neutral-700/50">
              <span>{lang || 'code'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(codeContent.trim())}
                className="hover:text-white transition cursor-pointer"
              >
                Copy
              </button>
            </div>
            <pre className="p-3 overflow-x-auto font-mono leading-relaxed">
              <code>{codeContent.trim()}</code>
            </pre>
          </div>
        );
      }

      const lines = part.split('\n');
      return (
        <div key={partIdx} className="space-y-1.5">
          {lines.map((line, lineIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lineIdx} className="h-2" />;

            // Headings
            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={lineIdx} className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-2 mb-1">
                  {formatInline(trimmed.substring(4))}
                </h3>
              );
            }
            if (trimmed.startsWith('## ')) {
              return (
                <h2 key={lineIdx} className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-3 mb-1.5">
                  {formatInline(trimmed.substring(3))}
                </h2>
              );
            }
            if (trimmed.startsWith('# ')) {
              return (
                <h1 key={lineIdx} className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-3 mb-2">
                  {formatInline(trimmed.substring(2))}
                </h1>
              );
            }

            // Bullet points
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
              return (
                <div key={lineIdx} className="flex items-start gap-2 ml-1">
                  <span className="text-samjho-500 shrink-0 mt-1">•</span>
                  <p className="leading-relaxed">{formatInline(trimmed.substring(2))}</p>
                </div>
              );
            }

            // Numbered list
            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
              return (
                <div key={lineIdx} className="flex items-start gap-2 ml-1">
                  <span className="text-samjho-600 dark:text-samjho-400 font-semibold shrink-0 text-xs mt-0.5">{numMatch[1]}.</span>
                  <p className="leading-relaxed">{formatInline(numMatch[2])}</p>
                </div>
              );
            }

            // Regular paragraph
            return (
              <p key={lineIdx} className="leading-relaxed">
                {formatInline(trimmed)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  const formatInline = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={i} className="font-semibold text-neutral-900 dark:text-neutral-100">{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith('*') && seg.endsWith('*') && !seg.startsWith('**')) {
        return <em key={i} className="italic">{seg.slice(1, -1)}</em>;
      }
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-samjho-600 dark:text-samjho-400 font-mono text-xs">
            {seg.slice(1, -1)}
          </code>
        );
      }
      return seg;
    });
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end mb-4 animate-fade-in">
        {message.text && (
          <div className="max-w-[85%] sm:max-w-[70%] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-3xl rounded-tr-xs px-5 py-3 shadow-md">
            <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base font-normal">
              {message.text}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col mb-6 animate-fade-in group">
      {/* Samjho Header */}
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
      <div className="max-w-[95%] sm:max-w-[85%] bg-white dark:bg-surface-darkCard border border-neutral-200/70 dark:border-neutral-800/80 rounded-3xl rounded-tl-xs px-5 py-4 shadow-soft text-neutral-800 dark:text-neutral-200 text-sm sm:text-base">
        {message.isStreaming && (!message.text || message.text.trim().length === 0) ? (
          <div className="flex items-center gap-3 py-1 animate-fade-in">
            <span className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Samjho sun raha hai...
            </span>
            <span className="inline-flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-samjho-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        ) : (
          <>
            {renderFormattedText(message.text)}

            {/* Streaming Cursor */}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-samjho-500 animate-pulse align-middle" />
            )}
          </>
        )}

        {/* Crisis / Safety Helpline Card Embed */}
        {message.helplines && message.helplines.length > 0 && (
          <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Free & Confidential Helplines</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {message.helplines.map((h, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">{h.name}</p>
                  <p className="text-samjho-600 dark:text-samjho-400 font-mono font-bold text-sm my-0.5">{h.number}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{h.description} ({h.timing})</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions Row (Copy, Listen, Regenerate) */}
      {!message.isStreaming && message.text && (
        <div className="flex items-center gap-1 mt-1.5 ml-2 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title="Copy response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleSpeak}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
            title={isSpeaking ? 'Stop voice' : 'Listen response'}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-samjho-500" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
          </button>

          {isLastAssistantMessage && onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center gap-1 text-[11px]"
              title="Regenerate answer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
