/**
 * Samjho AI - Privacy & Storage Policy Engine
 * 
 * PRD Principles:
 * 1. No Identity (No name, email, phone, account, password, profile)
 * 2. No app-managed conversation database or history
 * 3. Ephemeral Session Memory (In-memory state only during the active browser session)
 * 4. No conversation messages in app-managed browser storage
 */

export const STORAGE_POLICY = {
  ALLOW_PERSISTENT_CONVERSATION_STORAGE: false,
  ALLOW_CLOUD_SYNC: false,
  ALLOW_THIRD_PARTY_TRACKING: false,
  ALLOW_COOKIE_IDENTIFIERS: false,
  ALLOW_MODEL_CACHE: true, // Only model weights are cached in browser Cache/IndexedDB for offline speed
} as const;

/**
 * Audit and purge any unintentional persistent items to safeguard user privacy.
 */
export function enforceStoragePolicy(): void {
  try {
    if (typeof window === 'undefined') return;

    // Never keep chat logs in localStorage
    const keysToCheck = ['samjho_chat', 'chat_history', 'user_profile', 'session_history'];
    keysToCheck.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn('[Samjho Privacy] Storage policy check notice:', err);
  }
}

/**
 * Explicit Privacy Statement for PRD Section 51
 */
export const PRIVACY_STATEMENT = {
  short: "Samjho uses an in-browser model for chat. Model files may be downloaded and cached; optional web search sends your query or URL to external services.",
  zeroIdentity: "No account, no sign-in, no phone, no email required.",
  zeroDatabase: "The app has no conversation database. When you clear or close your tab, temporary context is discarded; this does not describe provider or hosting retention.",
  deviceProcessing: "Chat inference runs in your browser when the WebGPU model is loaded. Browser speech recognition may use a browser-provided service.",
};
