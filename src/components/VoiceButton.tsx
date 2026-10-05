import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onTranscript, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN, en-IN, en-US'; // Multi-lingual Hinglish & English support

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentTranscript += event.results[i][0].transcript;
        }
      }
      if (currentTranscript.trim()) {
        onTranscript(currentTranscript.trim());
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Samjho Voice] Speech recognition event:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!isSupported || disabled) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('[Samjho Voice] Could not start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  if (!isSupported) {
    return null; // Gracefully omit if browser doesn't support Web Speech API
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        aria-label={isListening ? "Listening... click to stop" : "Talk to Samjho (Voice input)"}
        title={isListening ? "Listening... (Local Speech Recognition)" : "Talk to Samjho (Voice is processed on your device)"}
        className={`p-2.5 rounded-full transition-all duration-200 cursor-pointer ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse scale-105'
            : 'text-neutral-500 hover:text-samjho-600 dark:text-neutral-400 dark:hover:text-samjho-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {isListening ? (
          <div className="flex items-center gap-1.5 px-1">
            <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
            <Mic className="w-4 h-4" />
          </div>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Floating Status Pill when listening */}
      {isListening && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 rounded-full bg-neutral-900 text-white text-[11px] font-medium whitespace-nowrap shadow-lg flex items-center gap-1.5 animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
          Listening... (Bolo, main sun raha hoon)
        </div>
      )}
    </div>
  );
};
