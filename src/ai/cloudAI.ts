import { AISettings, ContextItem, ConversationMode, FileAttachment } from '../types';
import { SAMJHO_SYSTEM_PROMPT } from './contextManager';

/**
 * Builds standard system & chat prompt for external LLMs
 */
export function buildLLMMessages(
  userText: string,
  history: ContextItem[],
  mode: ConversationMode,
  attachments?: FileAttachment[],
  webContext?: string
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  let systemPrompt = SAMJHO_SYSTEM_PROMPT;
  systemPrompt += `\n\nRemember: You are a warm, non-judgmental friend and companion. Listen with heart, understand their feelings, and respond naturally without giving academic lectures or technical jargon.`;

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

  // Include live web context if present
  if (webContext && webContext.trim().length > 0) {
    userContent += `\n\n${webContext.trim()}`;
  }

  messages.push({ role: 'user', content: userContent });
  return messages;
}

/**
 * Streams response from Samjho Instant Intelligence (Pollinations AI)
 * No download, no API key required out of the box. Answers all questions, coding, math, GK, Hinglish, emotional support.
 */
export async function streamPollinationsAI(
  messages: Array<{ role: string; content: string }>,
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal
): Promise<string> {
  // Ultra-fast connection timeout (2.0s) so user is never stuck waiting on network issues
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  const onAbort = () => controller.abort();
  if (signal) signal.addEventListener('abort', onAbort);

  try {
    const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai-fast',
        messages,
        temperature: 0.7,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (res.ok) {
      return await readOpenAIStream(res, onChunk, signal);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
    console.warn('[SSE Pollinations stream attempt failed, switching to direct]:', err?.message);
  }

  // Fast direct fallback (1.8s timeout)
  const fallbackController = new AbortController();
  const fbTimeout = setTimeout(() => fallbackController.abort(), 1800);
  if (signal) signal.addEventListener('abort', () => fallbackController.abort());

  try {
    const res2 = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: fallbackController.signal,
    });
    clearTimeout(fbTimeout);

    if (!res2.ok) {
      throw new Error(`Direct AI endpoint error (${res2.status})`);
    }

    const fullText = await res2.text();
    if (!fullText || fullText.trim().length === 0) {
      throw new Error('Empty AI response');
    }

    // Stream out words naturally
    const words = fullText.split(/(\s+)/);
    let accumulated = '';
    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) break;
      accumulated += words[i];
      onChunk(words[i], accumulated);
      if (i % 2 === 0) {
        await new Promise(r => setTimeout(r, 8));
      }
    }
    return accumulated;
  } catch (err2: any) {
    clearTimeout(fbTimeout);
    throw err2;
  }
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
 * Streams response from custom OpenAI / OpenRouter / Ollama endpoint
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
