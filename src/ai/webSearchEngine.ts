/**
 * Samjho AI — Multi-Source Web Scraper & Live Knowledge Search Engine
 * 
 * Enables Samjho to:
 * 1. Scrape live web search results across diverse websites (news, forums, portals, directories, etc.)
 * 2. Extract content from any specific web link/URL passed by the user (via Jina Reader)
 * 3. Search local places, businesses, landmarks (via OpenStreetMap Nominatim)
 * 4. Fallback to DuckDuckGo Instant Answers & Wikipedia
 */

export interface WebSearchSource {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResult {
  type: 'url_extract' | 'search_result';
  title?: string;
  sourceUrl?: string;
  snippet: string;
  sources?: WebSearchSource[];
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
 * Fetches and extracts clean markdown text from any specific webpage URL
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

    const cleanSnippet = text.trim().slice(0, 3500);
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
      sources: [{
        title: title || 'Linked Webpage',
        snippet: cleanSnippet.slice(0, 500),
        url,
      }],
    };
  } catch (err: any) {
    console.warn('[Samjho Web] URL extraction failed for:', url, err?.message);
    return null;
  }
}

/**
 * Scrapes live search results from various websites across the web via DuckDuckGo + Jina
 */
async function scrapeMultiSourceSearch(query: string, signal?: AbortSignal): Promise<WebSearchResult | null> {
  try {
    const ddgUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    const res = await fetch(ddgUrl, { signal: controller.signal });

    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (!res.ok) return null;
    const md = await res.text();
    if (!md || md.length < 100) return null;

    // Parse DuckDuckGo search result blocks
    const parts = md.split('## [');
    const sources: WebSearchSource[] = [];

    for (let i = 1; i < parts.length; i++) {
      const p = parts[i];
      const titleEnd = p.indexOf('](');
      if (titleEnd === -1) continue;
      const title = p.slice(0, titleEnd).trim();

      const urlEnd = p.indexOf(')', titleEnd + 2);
      if (urlEnd === -1) continue;
      const rawUrl = p.slice(titleEnd + 2, urlEnd).trim();

      let destUrl = rawUrl;
      const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        try {
          destUrl = decodeURIComponent(uddgMatch[1]);
        } catch {}
      }

      // Extract text content and clean markdown links
      const noImgs = p.slice(urlEnd + 1).replace(/\[\s*!\[[^\]]*\]\([^)]*\)\s*\]\([^)]*\)/g, '');
      const textLines = noImgs.split('\n')
        .map(l => l.trim().replace(/^\[/, '').replace(/\]\([^\)]+\)$/, '').replace(/[*_#]/g, '').trim())
        .filter(l => l.length > 25 && !l.startsWith('http') && !l.includes('duckduckgo.com'));

      const snippet = textLines.join(' ');
      if (title && snippet.length > 20) {
        sources.push({
          title,
          snippet: snippet.slice(0, 350),
          url: destUrl,
        });
        if (sources.length >= 4) break;
      }
    }

    if (sources.length > 0) {
      const combined = sources.map(s => `• ${s.title}: ${s.snippet} (Source: ${s.url})`).join('\n\n');
      return {
        type: 'search_result',
        title: sources[0].title,
        sourceUrl: sources[0].url,
        snippet: combined,
        sources,
      };
    }
  } catch (e) {
    // Scraper error
  }
  return null;
}

/**
 * Searches OpenStreetMap Nominatim for locations, shops, medicals, clinics, cities
 */
async function searchLocationKnowledge(query: string, signal?: AbortSignal): Promise<WebSearchResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=2`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SamjhoAI/1.0' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);

    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const top = list[0];
        return {
          type: 'search_result',
          title: top.display_name,
          sourceUrl: `https://www.openstreetmap.org/?mlat=${top.lat}&mlon=${top.lon}`,
          snippet: `Location details: ${top.display_name} (Coordinates: ${top.lat}, ${top.lon}, Category: ${top.type || 'place'})`,
          sources: [{
            title: top.display_name,
            snippet: `Coordinates: ${top.lat}, ${top.lon}`,
            url: `https://www.openstreetmap.org/?mlat=${top.lat}&mlon=${top.lon}`,
          }],
        };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Fallback to DuckDuckGo Instant Answer & Wikipedia
 */
async function searchInstantAnswerKnowledge(query: string, signal?: AbortSignal): Promise<WebSearchResult | null> {
  const trimmed = query.trim();

  // 1. DuckDuckGo Instant Answers
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
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
          sources: [{
            title: data.Heading || trimmed,
            snippet: data.AbstractText.trim(),
            url: data.AbstractURL || 'https://duckduckgo.com/?q=' + encodeURIComponent(trimmed),
          }],
        };
      }
    }
  } catch (e) {}

  // 2. Wikipedia Summary
  try {
    const stopWords = /\b(kaun|hai|h|kya|batao|karo|ka|ki|ke|ko|se|mein|me|par|karein|samjhao|explain|bataiye|please|who|is|the|what|of)\b/gi;
    let clean = trimmed.replace(stopWords, ' ').replace(/[?!,.:;]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/\bpm\b/i.test(clean)) clean = clean.replace(/\bpm\b/i, 'prime minister');
    const searchQuery = clean.length >= 2 ? clean : trimmed;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);

    const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
    const wikiRes = await fetch(wikiSearchUrl, { signal: controller.signal });

    if (wikiRes.ok) {
      const searchData = await wikiRes.json();
      const topHit = searchData.query?.search?.[0];

      if (topHit && topHit.title) {
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
              sources: [{
                title: sumData.title,
                snippet: sumData.extract,
                url: sumData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(sumData.title)}`,
              }],
            };
          }
        }
      }
    }
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onAbort);
  } catch (e) {}

  return null;
}

/**
 * Searches across multiple websites to gather live scraped data
 */
export async function searchWebKnowledge(query: string, signal?: AbortSignal): Promise<WebSearchResult | null> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return null;

  // 1. Try multi-source web scraper first (scrapes diverse websites)
  const scraped = await scrapeMultiSourceSearch(trimmed, signal);
  if (scraped && scraped.sources && scraped.sources.length > 0) {
    return scraped;
  }

  // 2. If location / place query, try Nominatim
  if (/where is|located|kahan hai|address|place|location|city|town/i.test(trimmed)) {
    const loc = await searchLocationKnowledge(trimmed, signal);
    if (loc) return loc;
  }

  // 3. Fallback to DuckDuckGo Instant Answers & Wikipedia
  return await searchInstantAnswerKnowledge(trimmed, signal);
}

/**
 * Checks if query needs web search or URL extraction
 */
export function shouldCheckWeb(text: string): boolean {
  if (URL_REGEX.test(text)) return true;

  const lower = text.toLowerCase();
  // Explicit web search intent
  if (/(?:website|google|search|net par|net pe|online|browse|extract|check online|latest|current|news|halat)/i.test(lower)) {
    return true;
  }

  // Factual, location, leadership, or general inquiries
  if (
    /(?:kaun hai|who is|who was|pm of|president of|capital of|chief minister|ceo of|formula of|ohm'?s? law|law of|when was|where is|located|kahan hai|history of|current affairs|election|medical|hospital|shop|college|university)/i.test(lower)
  ) {
    return true;
  }

  return false;
}

/**
 * Detects whether query needs web lookup or URL extraction and fetches it
 */
export async function detectAndFetchWebContext(
  userText: string,
  signal?: AbortSignal,
  onStatus?: (status: string) => void
): Promise<WebSearchResult | null> {
  const url = extractUrlFromText(userText);
  if (url) {
    onStatus?.('📄 Extracting content from webpage...');
    const extracted = await extractUrlContent(url, signal);
    if (extracted) return extracted;
  }

  if (shouldCheckWeb(userText)) {
    onStatus?.('🌐 Searching across various websites & scraping data...');
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

  if (result.sources && result.sources.length > 0) {
    let out = `\n\n[LIVE WEB SEARCH DATA — Scraped from multiple relevant websites across the internet]:\n`;
    result.sources.forEach((s, idx) => {
      out += `Source ${idx + 1}: "${s.title}" (${s.url})\nInformation: "${s.snippet}"\n\n`;
    });
    out += `[Use this live scraped information from these websites to provide accurate, factual, and detailed answers. Cite the relevant source names or URLs naturally in your answer.]`;
    return out;
  }

  return `\n\n[LIVE WEB SEARCH KNOWLEDGE]:
Source: ${result.title || 'Web'} (${result.sourceUrl || 'Online Knowledge'})
Information:
"""
${result.snippet}
"""
[Use this live information to provide accurate, factual, and up-to-date answers.]`;
}
