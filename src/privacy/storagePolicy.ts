/**
 * Samjho AI - Privacy & Storage Policy Engine
 * 
 * PRD Principles:
 * 1. No Identity (No name, email, phone, account, password, profile)
 * 2. No Conversation Database (Zero cloud logs or remote databases)
 * 3. Ephemeral Session Memory (In-memory state only during the active browser session)
 * 4. Zero Conversation Disk Leaks (localStorage / cookies must never hold messages)
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
  short: "Samjho is designed so your conversations can be processed locally on your device rather than sent to a cloud AI service.",
  zeroIdentity: "No account, no sign-in, no phone, no email required.",
  zeroDatabase: "No conversation database. When you clear or close your tab, temporary context is discarded.",
  deviceProcessing: "All thinking, reasoning, and listening happens directly in your browser.",
};
