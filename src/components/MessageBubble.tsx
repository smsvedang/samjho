import React, { useState } from 'react';
import { ChatMessage, ConversationMode, FileAttachment } from '../types';
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ShieldAlert,
  PhoneCall,
  FileText,
  FileCode,
  File,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
  Code
} from 'lucide-react';
import { formatFileSize } from '../ai/fileProcessor';

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
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [expandedAttachments, setExpandedAttachments] = useState<Record<string, boolean>>({});

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

  const toggleAttachment = (id: string) => {
    setExpandedAttachments(prev => ({ ...prev, [id]: !prev[id] }));
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
    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, partIdx) => {
      // Handle fenced code block
      if (part.startsWith('```') && part.endsWith('```')) {
        const firstLineEnd = part.indexOf('\n');
        const lang = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : '';
        const codeContent = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3) : part.substring(3, part.length - 3);

        return (
          <div key={partIdx} className="my-3 rounded-xl overflow-hidden border border-neutral-700/60 bg-neutral-900 text-neutral-100 shadow-sm text-xs sm:text-sm font-mono">
            <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800/80 border-b border-neutral-700/60 text-[11px] text-neutral-400">
              <span className="font-semibold uppercase tracking-wider">{lang || 'Code'}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(codeContent)}
                className="hover:text-white transition flex items-center gap-1 cursor-pointer"
                title="Copy code"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3.5 overflow-x-auto whitespace-pre leading-relaxed text-emerald-300 dark:text-emerald-300">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // Handle normal markdown lines
      const lines = part.split('\n');
      return lines.map((line, idx) => {
        // Headers
        if (line.startsWith('### ')) {
          return (
            <h4 key={`${partIdx}-${idx}`} className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 mt-3 mb-1.5 flex items-center gap-1.5">
              {line.replace(/^###\s+/, '')}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={`${partIdx}-${idx}`} className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-4 mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800">
              {line.replace(/^##\s+/, '')}
            </h3>
          );
        }

        // Bold & inline code
        const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        const withCode = formattedLine.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-xs text-samjho-600 dark:text-samjho-300 font-semibold">$1</code>');

        // Blockquotes
        if (line.trim().startsWith('> ')) {
          return (
            <blockquote key={`${partIdx}-${idx}`} className="border-l-2 border-samjho-500 pl-3 py-1 my-1.5 bg-samjho-50/40 dark:bg-samjho-950/20 text-neutral-700 dark:text-neutral-300 text-xs sm:text-sm italic rounded-r-lg">
              <span dangerouslySetInnerHTML={{ __html: withCode.replace(/^>\s*/, '') }} />
            </blockquote>
          );
        }

        // Bullet lists
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (
            <li key={`${partIdx}-${idx}`} className="ml-4 list-disc my-1 leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: withCode.replace(/^[-•]\s*/, '') }} />
          );
        }

        // Numbered lists
        if (/^\d+\.\s/.test(line.trim())) {
          return (
            <div key={`${partIdx}-${idx}`} className="my-1.5 flex gap-2 text-sm sm:text-base">
              <span className="font-semibold text-samjho-600 dark:text-samjho-400 shrink-0">{line.trim().split(' ')[0]}</span>
              <span dangerouslySetInnerHTML={{ __html: withCode.replace(/^\d+\.\s*/, '') }} />
            </div>
          );
        }

        // Empty lines
        if (line.trim() === '') {
          return <div key={`${partIdx}-${idx}`} className="h-2" />;
        }

        return <p key={`${partIdx}-${idx}`} className="my-1 leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: withCode }} />;
      });
    });
  };

  // Render attachment cards
  const renderAttachments = (attachments?: FileAttachment[], isUserMsg = false) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-2.5 my-2 ${isUserMsg ? 'justify-end' : 'justify-start'}`}>
        {attachments.map((att) => {
          const isImage = att.category === 'image';
          const isPdf = att.category === 'pdf';
          const isCode = att.category === 'code';
          const isExpanded = !!expandedAttachments[att.id];

          if (isImage && att.dataUrl) {
            return (
              <div
                key={att.id}
                className="relative group rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 shadow-xs max-w-[220px]"
              >
                <div
                  onClick={() => setSelectedImage({ url: att.dataUrl!, name: att.name })}
                  className="cursor-pointer relative overflow-hidden aspect-video flex items-center justify-center bg-black/5"
                >
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
                </div>

                <div className="p-2 flex items-center justify-between text-[11px] bg-white/90 dark:bg-neutral-900/90">
                  <span className="font-medium truncate max-w-[140px]" title={att.name}>
                    {att.name}
                  </span>
                  <span className="text-neutral-400 font-mono text-[10px]">
                    {formatFileSize(att.size)}
                  </span>
                </div>
              </div>
            );
          }

          // Document / Code / Other
          return (
            <div
              key={att.id}
              className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-surface-darkCard/95 shadow-xs overflow-hidden max-w-sm w-full text-xs text-left"
            >
              <div className="p-2.5 flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${
                    isPdf
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : isCode
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  }`}
                >
                  {isPdf ? (
                    <FileText className="w-4 h-4" />
                  ) : isCode ? (
                    <FileCode className="w-4 h-4" />
                  ) : (
                    <File className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={att.name}>
                    {att.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {att.summary || `${formatFileSize(att.size)} • ${att.category.toUpperCase()}`}
                  </p>
                </div>

                {att.extractedText && (
                  <button
                    type="button"
                    onClick={() => toggleAttachment(att.id)}
                    className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title={isExpanded ? 'Collapse' : 'View extracted content'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Expandable Extracted Content Drawer */}
              {isExpanded && att.extractedText && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 font-mono text-[11px] max-h-56 overflow-y-auto leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {att.extractedText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isUser) {
    return (
      <div className="flex flex-col items-end mb-4 animate-fade-in">
        {/* User Attachments */}
        {renderAttachments(message.attachments, true)}

        {/* User Text Bubble */}
        {message.text && (
          <div className="max-w-[85%] sm:max-w-[70%] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-2xl rounded-tr-xs px-4 py-3 shadow-card">
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
        {message.isStreaming && (!message.text || message.text.trim().length === 0) ? (
          <div className="flex items-center gap-3.5 py-1.5 animate-fade-in">
            {/* Pulsing Beacon with Glowing Halo */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-samjho-600 via-indigo-600 to-purple-600 text-white shadow-md">
              <span className="text-sm font-bold">☼</span>
              <span className="absolute inset-0 rounded-xl bg-samjho-400/40 animate-ping" />
            </div>

            {/* Dynamic Status & Bouncing Dots Animation */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold bg-gradient-to-r from-samjho-600 via-indigo-600 to-purple-600 dark:from-samjho-400 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
                  {message.statusText || 'Samjho is thinking & finding information...'}
                </span>
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-samjho-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Searching multiple websites & scraping relevant data
              </p>
            </div>
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
            className="p-1.5 rounded-lg hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1 cursor-pointer"
            title="Copy response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleSpeak}
            className="p-1.5 rounded-lg hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1 cursor-pointer"
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
              className="p-1.5 rounded-lg hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center gap-1 cursor-pointer"
              title="Regenerate response"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Regenerate</span>
            </button>
          )}
        </div>
      )}

      {/* Lightbox Image Viewer Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-700 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-800/90 text-white text-xs border-b border-neutral-700">
              <span className="font-medium truncate max-w-sm">{selectedImage.name}</span>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg hover:bg-neutral-700 text-neutral-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
