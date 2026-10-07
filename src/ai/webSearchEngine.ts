/**
 * Samjho AI — Web Search & Live Website Knowledge Extractor
 * 
 * Enables Samjho to:
 * 1. Extract content from any web link/URL passed by the user (via Jina Reader or direct fetch)
 * 2. Search live factual knowledge via DuckDuckGo Instant Answers & Wikipedia REST API
 * 3. Augment LLM prompts with real-time web context (RAG)
 */

export interface WebSearchResult {
  type: 'url_extract' | 'search_result';
  title?: string;
  sourceUrl?: string;
  snippet: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`]+[^\s.,;:!?"'<>)]/i;

/**
 * Checks if the user message contains a website URL
 */
export function extractUrlFromText(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Fetches and extracts clean markdown text from a webpage using Jina Reader
 */
export async function extractUrlContent(url: string, signal?: AbortSignal): Promise<WebSearchResult | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    const res = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain, text/markdown',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (!res.ok) return null;

    const text = await res.text();
    if (!text || text.trim().length === 0) return null;

    // Truncate to reasonable token length (~3500 characters)
    const cleanSnippet = text.trim().slice(0, 3500);

    // Try to extract title if Jina outputs 'Title: ...'
    let title: string | undefined;
    const titleMatch = cleanSnippet.match(/^Title:\s*(.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    return {
      type: 'url_extract',
      title: title || url,
      sourceUrl: url,
      snippet: cleanSnippet,
    };
  } catch (err: any) {
    console.warn('[Samjho Web] URL extraction failed for:', url, err?.message);
    return null;
  }
}

/**
 * Searches Wikipedia and DuckDuckGo for live facts, concepts, entities, and answers
 */
export async function searchWebKnowledge(query: string, signal?: AbortSignal): Promise<WebSearchResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;

  // 1. DuckDuckGo Instant Answer API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, { signal: controller.signal });

    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (ddgRes.ok) {
      const data = await ddgRes.json();
      if (data.AbstractText && data.AbstractText.trim().length > 25) {
        return {
          type: 'search_result',
          title: data.Heading || trimmed,
          sourceUrl: data.AbstractURL || undefined,
          snippet: data.AbstractText.trim(),
        };
      }
    }
  } catch (e) {
    // DDG failed, proceed to Wikipedia
  }

  // 2. Wikipedia Search & Summary API
  try {
    // Clean stop-words from Hinglish / English questions for targeted Wikipedia search
    const stopWords = /\b(kaun|hai|h|kya|batao|karo|ka|ki|ke|ko|se|mein|me|par|karein|samjhao|explain|bataiye|please|who|is|the|what|of|define|meaning|meaning of)\b/gi;
    let clean = trimmed.replace(stopWords, ' ').replace(/[?!,.:;]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/\bpm\b/i.test(clean)) clean = clean.replace(/\bpm\b/i, 'prime minister');
    const searchQuery = clean.length >= 2 ? clean : trimmed;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
    const wikiRes = await fetch(wikiSearchUrl, { signal: controller.signal });

    if (wikiRes.ok) {
      const searchData = await wikiRes.json();
      const topHit = searchData.query?.search?.[0];

      if (topHit && topHit.title) {
        // Fetch article summary
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title.replace(/ /g, '_'))}`;
        const sumRes = await fetch(summaryUrl, { signal: controller.signal });

        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);

        if (sumRes.ok) {
          const sumData = await sumRes.json();
          if (sumData.extract && sumData.extract.length > 20) {
            return {
              type: 'search_result',
              title: sumData.title,
              sourceUrl: sumData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(sumData.title)}`,
              snippet: sumData.extract,
            };
          }
        }
      }
    }
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
  } catch (e) {
    // Wikipedia search failed
  }

  return null;
}

/**
 * Checks if query needs web search or URL extraction
 */
export function shouldCheckWeb(text: string): boolean {
  if (URL_REGEX.test(text)) return true;

  const lower = text.toLowerCase();
  // Explicit web intent
  if (/(?:website|google|search|net par|net pe|online|browse|extract|check online|latest|current|news|halat)/i.test(lower)) {
    return true;
  }

  // Factual queries that benefit from live web lookup (leaders, scientific laws, definitions, GK)
  if (
    /(?:kaun hai|who is|who was|pm of|president of|capital of|chief minister|ceo of|formula of|ohm'?s? law|law of|when was|where is|history of|current affairs|election)/i.test(lower)
  ) {
    return true;
  }

  return false;
}

/**
 * Detects whether the query needs a web lookup or URL extraction and fetches it
 */
export async function detectAndFetchWebContext(
  userText: string,
  signal?: AbortSignal
): Promise<WebSearchResult | null> {
  const url = extractUrlFromText(userText);
  if (url) {
    const extracted = await extractUrlContent(url, signal);
    if (extracted) return extracted;
  }

  if (shouldCheckWeb(userText)) {
    return await searchWebKnowledge(userText, signal);
  }

  return null;
}

/**
 * Formats web search or URL extraction results for system / assistant context
 */
export function formatWebContextForPrompt(result: WebSearchResult): string {
  if (result.type === 'url_extract') {
    return `\n\n[LIVE EXTRACTED WEBPAGE CONTENT from ${result.sourceUrl}]:
Title: ${result.title || 'Web Page'}
Content:
"""
${result.snippet}
"""
[Use this live extracted web content to accurately answer the user's questions about this website/link.]`;
  }

  return `\n\n[LIVE WEB SEARCH KNOWLEDGE]:
Source: ${result.title || 'Web'} (${result.sourceUrl || 'Online Knowledge'})
Information:
"""
${result.snippet}
"""
[Use this live information to provide accurate, factual, and up-to-date answers.]`;
}
