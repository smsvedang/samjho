import { AISettings, ContextItem, ConversationMode, FileAttachment } from '../types';
import { SAMJHO_SYSTEM_PROMPT } from './contextManager';

/**
 * Builds standard system & chat prompt for external LLMs
 */
export function buildLLMMessages(
  userText: string,
  history: ContextItem[],
  mode: ConversationMode,
  attachments?: FileAttachment[]
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  let systemPrompt = SAMJHO_SYSTEM_PROMPT;
  systemPrompt += `\n\nCurrent detected conversation mode: ${mode.toUpperCase()}.
Remember your core guidelines:
- Be a warm, empathetic, non-judgmental friend (Samjho).
- Reply naturally in the same language as the user (natural Hinglish when addressed in Hinglish, English when in English).
- Validate feelings genuinely before problem-solving.
- Never use robotic menus or numbered selection choices like 'Option 1, Option 2'.
- Keep conversational answers natural, balanced, and comforting.`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt }
  ];

  // Include recent conversation history (last 8 turns)
  const recent = history.slice(-8);
  for (const item of recent) {
    if (item.role === 'user' || item.role === 'assistant') {
      messages.push({
        role: item.role,
        content: item.content,
      });
    }
  }

  // Include attachments context if present
  let userContent = userText;
  if (attachments && attachments.length > 0) {
    userContent += '\n\n[Attachments attached by user:';
    for (const att of attachments) {
      userContent += `\n- File: ${att.name} (${att.category})`;
      if (att.extractedText) {
        userContent += `\nExtracted content:\n"""\n${att.extractedText.slice(0, 3000)}\n"""`;
      }
    }
    userContent += '\n]';
  }

  messages.push({ role: 'user', content: userContent });
  return messages;
}

/**
 * Streams response from Groq API (Ultra-fast Llama 3.3 70B)
 */
export async function streamGroq(
  settings: AISettings,
  messages: Array<{ role: string; content: string }>,
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = settings.groqApiKey?.trim();
  if (!apiKey) {
    throw new Error('Groq API Key is missing. Please add your free key in AI Settings.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      stream: true,
      max_tokens: 2048,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    let parsedMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      parsedMsg = errJson.error?.message || errText;
    } catch {}
    throw new Error(`Groq API error (${res.status}): ${parsedMsg}`);
  }

  return readOpenAIStream(res, onChunk, signal);
}

/**
 * Streams response from Google Gemini API (Gemini 2.0 Flash)
 */
export async function streamGemini(
  settings: AISettings,
  messages: Array<{ role: string; content: string }>,
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = settings.geminiApiKey?.trim();
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please add your key in AI Settings.');
  }

  // Format messages for Gemini API
  // Extract system message
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMsgs = messages.filter(m => m.role !== 'system');

  const contents = chatMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (systemMsg) {
    payload.systemInstruction = {
      parts: [{ text: systemMsg.content }],
    };
  }

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    let parsedMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      parsedMsg = errJson.error?.message || errText;
    } catch {}
    throw new Error(`Gemini API error (${res.status}): ${parsedMsg}`);
  }

  if (!res.body) throw new Error('No response body from Gemini API');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    if (signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') continue;

      try {
        const json = JSON.parse(dataStr);
        const candidate = json.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (text) {
          accumulated += text;
          onChunk(text, accumulated);
        }
      } catch {}
    }
  }

  return accumulated;
}

/**
 * Streams response from custom OpenAI / OpenRouter endpoint
 */
export async function streamOpenAICompatible(
  settings: AISettings,
  messages: Array<{ role: string; content: string }>,
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = settings.openaiApiKey?.trim();
  const baseUrl = (settings.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = settings.openaiModel?.trim() || 'gpt-4o-mini';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      stream: true,
      max_tokens: 2048,
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${errText}`);
  }

  return readOpenAIStream(res, onChunk, signal);
}

/**
 * Helper to process OpenAI-compatible SSE streams
 */
async function readOpenAIStream(
  res: Response,
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  if (!res.body) throw new Error('Empty response body stream');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';

  while (true) {
    if (signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') break;

      try {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta?.content || '';
        if (delta) {
          accumulated += delta;
          onChunk(delta, accumulated);
        }
      } catch {}
    }
  }

  return accumulated;
}
