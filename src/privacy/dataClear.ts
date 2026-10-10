import { sessionManager } from './sessionManager';
import { enforceStoragePolicy } from './storagePolicy';

/**
 * DataClear
 * Clears app-held conversation context from memory and resets browser selections.
 */
export function clearAllLocalConversationData(): void {
  sessionManager.clearSession();
  enforceStoragePolicy();
  
  // Clear any temporary clipboard or text selections
  if (typeof window !== 'undefined' && window.getSelection) {
    window.getSelection()?.removeAllRanges();
  }
}
