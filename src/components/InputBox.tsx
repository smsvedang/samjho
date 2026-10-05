import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square, Sparkles } from 'lucide-react';
import { VoiceButton } from './VoiceButton';

interface InputBoxProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export const InputBox: React.FC<InputBoxProps> = ({
  onSend,
  onStop,
  isGenerating,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to 160px height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isGenerating || disabled) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-0">
      <div className="relative flex items-end gap-2 p-2 sm:p-2.5 bg-white dark:bg-surface-darkCard rounded-3xl border border-neutral-300/80 dark:border-neutral-700/80 shadow-soft focus-within:border-samjho-500 focus-within:ring-2 focus-within:ring-samjho-500/20 transition-all duration-200">
        
        {/* Voice Input (PRD Section 26) */}
        <VoiceButton onTranscript={handleVoiceTranscript} disabled={disabled || isGenerating} />

        {/* Text Area (PRD Section 8 & 10) */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type anything... (Ask, explain, vent, or think aloud)"
          rows={1}
          disabled={disabled}
          className="flex-1 max-h-40 py-2 px-1 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm sm:text-base resize-none focus:outline-hidden leading-relaxed"
        />

        {/* Send / Stop Generation Button (PRD Section 8 & 31) */}
        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className="p-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-80 transition cursor-pointer shadow-xs"
            title="Stop generation"
            aria-label="Stop generation"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className={`p-2.5 rounded-full transition-all duration-200 cursor-pointer shadow-xs ${
              text.trim() && !disabled
                ? 'bg-samjho-600 hover:bg-samjho-700 text-white scale-100 shadow-md shadow-samjho-600/30'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed scale-95'
            }`}
            title="Send message"
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between px-3 mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
        <span className="hidden sm:inline">Press Enter to send, Shift + Enter for new line</span>
        <span className="ml-auto text-emerald-600 dark:text-emerald-400 font-medium">
          Zero logs. Runs on your device.
        </span>
      </div>
    </div>
  );
};
