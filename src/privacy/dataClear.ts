import { sessionManager } from './sessionManager';
import { enforceStoragePolicy } from './storagePolicy';

/**
 * DataClear
 * Handles instant, irreversible discarding of active conversation context from RAM.
 */
export function clearAllLocalConversationData(): void {
  sessionManager.clearSession();
  enforceStoragePolicy();
  
  // Clear any temporary clipboard or text selections
  if (typeof window !== 'undefined' && window.getSelection) {
    window.getSelection()?.removeAllRanges();
  }
}
