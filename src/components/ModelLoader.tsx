import React from 'react';
import { ModelLoadingState } from '../types';

interface ModelLoaderProps {
  state: ModelLoadingState;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * ModelLoader is now completely invisible during normal operation.
 * The model loads silently in the background.
 * Only shows a subtle error state if something goes critically wrong.
 */
export const ModelLoader: React.FC<ModelLoaderProps> = ({ state, onRetry, onDismiss }) => {
  // Never show anything during normal operation — no scary popups
  // The local companion is always immediately ready
  if (state.stage === 'ready' || state.stage === 'idle' || state.stage === 'downloading' || state.stage === 'detecting') {
    return null;
  }

  // Only show for critical errors that need user action
  if (state.stage === 'error') {
    return (
      <div className="w-full max-w-xl mx-auto my-2 px-4 py-2.5 bg-red-50/80 dark:bg-red-950/20 backdrop-blur-md rounded-xl border border-red-200/60 dark:border-red-900/40 animate-fade-in">
        <div className="flex items-center justify-between text-xs">
          <span className="text-red-600 dark:text-red-400">Local model encountered an issue. Using companion mode.</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 rounded-lg font-medium bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 transition text-xs ml-3 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
