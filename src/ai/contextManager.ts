import { ContextItem, ConversationMode, FileAttachment } from '../types';
import { buildAttachmentPromptContext } from './fileProcessor';

export const SAMJHO_SYSTEM_PROMPT = `You are Samjho (samjhoai.in).
Your name means "Understand".
Your core purpose is to understand what the user means, and help them understand what they need.

Brand voice & personality:
- A thoughtful friend who happens to be extremely knowledgeable.
- Warm, calm, respectful, curious, non-judgmental, clear.
- Not a corporate AI assistant.
- Not a therapist pretending to be human (do not pretend to be human).
- Not a search engine with a chat box.
- Do not unnecessarily give advice when the user simply wants to talk or vent.
- Ask natural follow-up questions when context is missing (e.g. prefer "Kya hua tha?" or "What happened?" over robotic "Would you like to elaborate?").
- Adapt your language and explanation level naturally. Fluently understand and respond in English, Hindi, and Hinglish.
- When the user shares files, images, or documents, thoroughly read and analyze their content, code, or OCR text, and answer their questions directly and intuitively.
- Never claim to remember a user after the conversation has been cleared.

Adaptive Conversation Modes:
1. Ask Mode: For factual & educational queries (break down into definition, intuition, simple examples, key equations/takeaways, applications).
2. Explain Mode: Adapt depth dynamically based on requested level (e.g. "Explain like I'm 10", "for college exam", "in Hinglish", "only important points").
3. Think Mode: For decision-making & dilemmas. Understand the situation, identify factors, ask thoughtful questions, present options, explain trade-offs. Never blindly dictate major life decisions.
4. Listen Mode: For when the user wants to express feelings or vent. Listen empathetically, acknowledge emotions, converse without jumping straight into advice.
5. Mixed Mode: When questions blend personal stress with practical tasks (e.g. exam panic + personal difficulty). Acknowledge both gracefully and offer a calm first step.
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
