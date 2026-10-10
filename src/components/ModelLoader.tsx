import React from 'react';
import { ModelLoadingState } from '../types';

interface ModelLoaderProps {
  state: ModelLoadingState;
  onRetry?: () => void;
}

export const ModelLoader: React.FC<ModelLoaderProps> = ({ state, onRetry }) => {
  if (state.stage === 'idle' || state.stage === 'ready' || state.stage === 'generating') {
    return null;
  }

  const isProblem = state.stage === 'error' || state.stage === 'unsupported';
  const containerClass = isProblem
    ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
    : 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';
  const textClass = isProblem
    ? 'text-amber-800 dark:text-amber-300'
    : 'text-blue-800 dark:text-blue-300';

  return (
    <div className={`w-full max-w-2xl mx-auto my-2 px-4 py-3 rounded-xl border animate-fade-in ${containerClass}`}>
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className={`min-w-0 ${textClass}`}>
          <p className="font-medium">{state.statusText}</p>
          {state.stage === 'downloading' && (
            <>
              <p className="mt-1">
                Downloading model files; chat messages are not part of this download.
                {state.modelName ? ` Model: ${state.modelName}.` : ''}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, state.progress))}%` }}
                />
              </div>
            </>
          )}
          {state.stage === 'unsupported' && (
            <p className="mt-1">This app does not send your prompt to a hosted AI when local inference is unavailable.</p>
          )}
        </div>
        {(state.stage === 'error' || state.stage === 'unsupported') && onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 px-3 py-1.5 rounded-lg font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 transition cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};
