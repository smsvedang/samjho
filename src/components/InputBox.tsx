import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { VoiceButton } from './VoiceButton';

interface InputBoxProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  disabled?: boolean;
  clearVersion?: number;
}

export const InputBox: React.FC<InputBoxProps> = ({
  onSend,
  onStop,
  isGenerating,
  disabled = false,
  clearVersion = 0,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [clearVersion]);

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
    const trimmed = text.trim();
    if (!trimmed || isGenerating || disabled) return;

    onSend(trimmed);
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

  const hasContent = text.trim().length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-0">
      <div className="relative flex flex-col p-2 sm:p-2.5 bg-white dark:bg-surface-darkCard rounded-3xl border border-neutral-300/80 dark:border-neutral-700/80 focus-within:border-samjho-500 focus-within:ring-2 focus-within:ring-samjho-500/20 transition-all duration-200 shadow-soft">
        {/* Main Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Jo mann mein ho, yahan bindaas kaho..."
          disabled={disabled}
          rows={1}
          className="w-full px-3 py-1.5 text-sm sm:text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 bg-transparent resize-none focus:outline-hidden leading-relaxed"
        />

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between pt-1.5 px-1 border-t border-neutral-100 dark:border-neutral-800/60 mt-1">
          <div className="flex items-center gap-1">
            {/* Voice Speech-to-Text Button */}
            <VoiceButton
              onTranscript={handleVoiceTranscript}
              disabled={disabled || isGenerating}
            />
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500 hidden sm:inline ml-1">
              Press Enter to send
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="p-2 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:opacity-90 transition flex items-center justify-center cursor-pointer shadow-xs"
                title="Stop generation"
                aria-label="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!hasContent || disabled}
                className={`p-2 rounded-2xl transition-all flex items-center justify-center ${
                  hasContent && !disabled
                    ? 'bg-samjho-600 text-white hover:bg-samjho-700 shadow-md cursor-pointer scale-100'
                    : 'bg-neutral-100 text-neutral-300 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed'
                }`}
                title="Send message"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
