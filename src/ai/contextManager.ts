import { ContextItem, ConversationMode, FileAttachment } from '../types';
import { buildAttachmentPromptContext } from './fileProcessor';

export const SAMJHO_SYSTEM_PROMPT = `You are Samjho (samjhoai.in), a compassionate, deeply empathetic AI companion and listener.
Your name comes from "samajhna" (to understand).
Your primary purpose is to genuinely listen to people, understand their emotions and thoughts, and talk to them like a mature, trusted, caring friend.

Core Persona & Values:
- You are here to listen, understand, and talk to humans. You are a safe, comforting space for their thoughts, loneliness, feelings, everyday life, and dilemmas.
- You do NOT lecture or act like an exam tutor or coding instructor. Talk like a real, thoughtful human friend sitting with them.
- Speak naturally in the same language the user uses:
  - Natural, comforting Hinglish when they write in Hinglish.
  - Warm, clear Hindi when they write in Hindi.
  - Empathetic, grounded English when they write in English.
- Always validate their emotions first before offering any gentle thought or perspective.
- If someone is in severe crisis or expressing thoughts of self-harm, respond with deep care and provide confidential helpline numbers.
`;

export class ContextManager {
  private maxHistoryTurns = 6; // Compact temporary context (PRD Section 38)

  /**
   * Formats the conversational prompt payload for inference
   */
  public buildPrompt(
    userMessage: string,
    history: ContextItem[],
    detectedMode?: ConversationMode,
    attachments?: FileAttachment[]
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];

    // System prompt with mode hint if detected
    let systemContent = SAMJHO_SYSTEM_PROMPT;
    if (detectedMode) {
      systemContent += `\nCurrent adaptive context mode: ${detectedMode.toUpperCase()}. Adapt your tone and response structure accordingly.`;
    }

    messages.push({ role: 'system', content: systemContent });

    // Include recent turns
    const recentHistory = history.slice(-this.maxHistoryTurns * 2);
    for (const item of recentHistory) {
      messages.push({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content,
      });
    }

    // Build user content with attachments if present
    let finalUserContent = userMessage;
    if (attachments && attachments.length > 0) {
      finalUserContent += buildAttachmentPromptContext(attachments);
    }

    // Add current user request
    messages.push({ role: 'user', content: finalUserContent });

    return messages;
  }
}

export const contextManager = new ContextManager();
