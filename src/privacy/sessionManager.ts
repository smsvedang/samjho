import { ContextItem } from '../types';
import { enforceStoragePolicy } from './storagePolicy';

/**
 * SessionManager
 * PRD Section 20:
 * "Session Context: The model needs temporary context to maintain a coherent conversation...
 * This context exists only during the active session.
 * No Permanent Memory: After the session ends, conversation context is cleared."
 */
class SessionManager {
  private activeContext: ContextItem[] = [];
  private sessionStartTime: number;

  constructor() {
    this.sessionStartTime = Date.now();
    this.initCleanupListeners();
    enforceStoragePolicy();
  }

  private initCleanupListeners(): void {
    if (typeof window === 'undefined') return;

    // Clear everything from memory when user unloads or leaves page
    window.addEventListener('beforeunload', () => {
      this.clearSession();
    });

    window.addEventListener('pagehide', () => {
      this.clearSession();
    });
  }

  public getContext(): ContextItem[] {
    return [...this.activeContext];
  }

  public addContext(item: ContextItem): void {
    // Keep max 10 recent turns to avoid unbounded context growth (PRD Section 38)
    this.activeContext.push(item);
    if (this.activeContext.length > 20) {
      this.activeContext = this.activeContext.slice(-20);
    }
  }

  public clearSession(): void {
    this.activeContext = [];
    this.sessionStartTime = Date.now();
    enforceStoragePolicy();
  }

  public getSessionAgeSeconds(): number {
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }
}

export const sessionManager = new SessionManager();
