import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  X,
  FileText,
  FileCode,
  File,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { VoiceButton } from './VoiceButton';
import { FileAttachment } from '../types';
import { processUploadedFile, determineCategory, formatFileSize } from '../ai/fileProcessor';

interface InputBoxProps {
  onSend: (text: string, attachments?: FileAttachment[]) => void;
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
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clearVersionRef = useRef(clearVersion);
  clearVersionRef.current = clearVersion;

  useEffect(() => {
    setText('');
    setAttachments([]);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const requestClearVersion = clearVersionRef.current;

    for (const file of fileArray) {
      const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      const provisional: FileAttachment = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        category: determineCategory(file),
        status: 'reading',
        statusText: 'Reading...',
      };

      setAttachments((prev) => [...prev, provisional]);

      try {
        const processed = await processUploadedFile(file, (statusText) => {
          if (clearVersionRef.current !== requestClearVersion) return;
          setAttachments((prev) =>
            prev.map((a) => (a.id === tempId ? { ...a, statusText } : a))
          );
        });

        if (clearVersionRef.current === requestClearVersion) {
          setAttachments((prev) =>
            prev.map((a) => (a.id === tempId ? processed : a))
          );
        }
      } catch (err: any) {
        if (clearVersionRef.current === requestClearVersion) {
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === tempId
                ? {
                    ...a,
                    status: 'error',
                    error: err?.message || 'Error reading file',
                    statusText: 'Error',
                  }
                : a
            )
          );
        }
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleFiles(e.clipboardData.files);
    }
  };

  const isAnyReading = attachments.some((a) => a.status === 'reading');
  const hasContent = text.trim().length > 0 || attachments.length > 0;

  const handleSend = () => {
    if (!hasContent || isGenerating || disabled || isAnyReading) return;

    let sendText = text.trim();
    if (!sendText && attachments.length > 0) {
      const first = attachments[0];
      if (first.category === 'image') {
        sendText = first.extractedText
          ? 'Please analyze this image, read its content, and explain it.'
          : 'Please analyze and explain what is in this image.';
      } else if (first.category === 'code') {
        sendText = `Please analyze and review this code file (${first.name}).`;
      } else {
        sendText = `Please read and summarize this document (${first.name}).`;
      }
    }

    onSend(sendText, attachments.length > 0 ? [...attachments] : undefined);
    setText('');
    setAttachments([]);
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
    <div
      className="w-full max-w-3xl mx-auto px-3 sm:px-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        onChange={handleFileInputChange}
        accept="image/*,.pdf,.txt,.md,.markdown,.json,.csv,.tsv,.js,.jsx,.ts,.tsx,.py,.html,.css,.scss,.sql,.cpp,.c,.h,.java"
        className="hidden"
      />

      <div
        className={`relative flex flex-col p-2 sm:p-2.5 bg-white dark:bg-surface-darkCard rounded-3xl border transition-all duration-200 shadow-soft ${
          isDragging
            ? 'border-samjho-500 ring-4 ring-samjho-500/20 bg-samjho-50/20 dark:bg-samjho-950/20'
            : 'border-neutral-300/80 dark:border-neutral-700/80 focus-within:border-samjho-500 focus-within:ring-2 focus-within:ring-samjho-500/20'
        }`}
      >
        {/* Drag and Drop Active Overlay Prompt */}
        {isDragging && (
          <div className="absolute inset-0 z-30 rounded-3xl bg-samjho-600/10 dark:bg-samjho-900/40 backdrop-blur-xs flex items-center justify-center border-2 border-dashed border-samjho-500 pointer-events-none">
            <span className="text-sm font-semibold text-samjho-700 dark:text-samjho-300 flex items-center gap-2">
              <Paperclip className="w-4 h-4 animate-bounce" />
              Drop files here to process in this browser. If external web search is enabled, extracted text is added to the local-model context.
            </span>
          </div>
        )}

        {/* Attachments Tray (Previews before sending) */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1 pt-1 pb-2 border-b border-neutral-200/60 dark:border-neutral-800/60 mb-1.5 animate-fade-in">
            {attachments.map((att) => {
              const isImage = att.category === 'image';
              const isPdf = att.category === 'pdf';
              const isCode = att.category === 'code';

              return (
                <div
                  key={att.id}
                  className="flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 shadow-2xs group relative max-w-[280px]"
                >
                  {/* Thumbnail / Icon */}
                  {isImage && att.dataUrl ? (
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 bg-neutral-200 dark:bg-neutral-900">
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
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
                  )}

                  {/* Metadata & Status */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-neutral-900 dark:text-neutral-100 leading-tight">
                      {att.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <span>{formatFileSize(att.size)}</span>
                      <span>•</span>
                      {att.status === 'reading' ? (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>Loading</span>
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="p-1 rounded-md text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Controls Row */}
        <div className="flex items-end gap-1.5 sm:gap-2">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isGenerating}
            className="p-2 sm:p-2.5 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-samjho-600 dark:hover:text-samjho-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach images or documents (PDF, Code, Text)"
            aria-label="Attach files"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Input */}
          <VoiceButton
            onTranscript={handleVoiceTranscript}
            disabled={disabled || isGenerating}
          />

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              attachments.length > 0
                ? 'Ask anything about these files, or press send to analyze...'
                : 'Type anything, paste screenshots, or attach files...'
            }
            rows={1}
            disabled={disabled}
            className="flex-1 max-h-40 py-2 px-1 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-sm sm:text-base resize-none focus:outline-hidden leading-relaxed"
          />

          {/* Send / Stop Generation Button */}
          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              className="p-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-80 transition cursor-pointer shadow-xs shrink-0"
              title="Stop generation"
              aria-label="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!hasContent || disabled || isAnyReading}
              className={`p-2.5 rounded-full transition-all duration-200 cursor-pointer shadow-xs shrink-0 ${
                hasContent && !disabled && !isAnyReading
                  ? 'bg-samjho-600 hover:bg-samjho-700 text-white scale-100 shadow-md shadow-samjho-600/30'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed scale-95'
              }`}
              title="Send message"
              aria-label="Send message"
            >
              {isAnyReading ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
        <span className="hidden sm:inline">
          Attach or drag-drop images, PDFs, code & text files
        </span>
        <span className="ml-auto text-emerald-600 dark:text-emerald-400 font-medium">
          Zero cloud upload. Files stay in your browser.
        </span>
      </div>
    </div>
  );
};
