import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MLCEngine } from '@mlc-ai/web-llm';
import { aiSettingsManager } from './aiSettings';
import { InferenceEngine } from './inferenceEngine';
import { AVAILABLE_MODELS, modelManager } from './modelManager';

const mocks = vi.hoisted(() => ({
  createEngine: vi.fn(),
  search: vi.fn(),
}));

vi.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: mocks.createEngine,
}));

vi.mock('./webSearchEngine', () => ({
  detectAndFetchWebContext: mocks.search,
  formatWebContextForPrompt: vi.fn(() => 'external search context'),
}));

const capabilities = {
  hasWebGPU: true,
  deviceMemoryGB: 4,
  hardwareConcurrency: 4,
  browser: 'test',
  deviceTier: 'medium' as const,
  recommendedModelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
};

function makeEngine() {
  const create = vi.fn().mockResolvedValue((async function* () {
    yield { choices: [{ delta: { content: 'Local answer' } }] };
  })());
  const engine = {
    chat: { completions: { create } },
    interruptGenerate: vi.fn().mockResolvedValue(undefined),
    resetChat: vi.fn().mockResolvedValue(undefined),
    unload: vi.fn().mockResolvedValue(undefined),
  };
  return { engine: engine as unknown as MLCEngine, create };
}

describe('local inference privacy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(modelManager, 'detectCapabilities').mockResolvedValue(capabilities);
    aiSettingsManager.saveSettings({ provider: 'webgpu', externalWebSearchEnabled: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses model IDs supported by the installed WebLLM package', () => {
    expect(Object.keys(AVAILABLE_MODELS)).toEqual([
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    ]);
  });

  it('initializes WebLLM and generates a response without sending prompts to a hosted AI', async () => {
    const localEngine = makeEngine();
    mocks.createEngine.mockResolvedValue(localEngine.engine);
    const inference = new InferenceEngine();

    await inference.initWebLLM();
    const chunks: string[] = [];
    const result = await inference.generateResponse('Explain a concept', (_chunk, full) => {
      chunks.push(full);
    });

    expect(mocks.createEngine).toHaveBeenCalledWith(
      capabilities.recommendedModelId,
      expect.any(Object)
    );
    expect(localEngine.create).toHaveBeenCalledOnce();
    expect(chunks).toEqual(['Local answer']);
    expect(result.text).toBe('Local answer');
    expect(mocks.search).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not use a hosted fallback when the local model fails to load', async () => {
    mocks.createEngine.mockRejectedValue(new Error('model load failed'));
    const inference = new InferenceEngine();

    await inference.initWebLLM();
    const result = await inference.generateResponse('Explain a concept', vi.fn());

    expect(result.text).toContain('not ready');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports unsupported WebGPU without downloading a model or calling a hosted AI', async () => {
    vi.spyOn(modelManager, 'detectCapabilities').mockResolvedValue({
      ...capabilities,
      hasWebGPU: false,
      deviceTier: 'unsupported',
    });
    const inference = new InferenceEngine();

    await inference.initWebLLM();
    const result = await inference.generateResponse('Explain a concept', vi.fn());

    expect(result.text).toContain('not ready');
    expect(mocks.createEngine).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('only performs external search when the setting is explicitly enabled', async () => {
    const localEngine = makeEngine();
    mocks.createEngine.mockResolvedValue(localEngine.engine);
    mocks.search.mockResolvedValue({
      type: 'search_result',
      snippet: 'Search result',
    });
    const inference = new InferenceEngine();
    await inference.initWebLLM();

    await inference.generateResponse('What is the latest news?', vi.fn());
    expect(mocks.search).not.toHaveBeenCalled();

    aiSettingsManager.saveSettings({ externalWebSearchEnabled: true });
    await inference.generateResponse('What is the latest news?', vi.fn());
    expect(mocks.search).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resets the WebLLM conversation state when clearing a chat', async () => {
    const localEngine = makeEngine();
    mocks.createEngine.mockResolvedValue(localEngine.engine);
    const inference = new InferenceEngine();
    await inference.initWebLLM();

    await inference.resetConversation();

    expect(localEngine.engine.interruptGenerate).not.toHaveBeenCalled();
    expect(localEngine.engine.resetChat).toHaveBeenCalledOnce();
  });
});

describe('instant zero-download AI path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiSettingsManager.saveSettings({ provider: 'instant', externalWebSearchEnabled: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates response instantly using instant streaming AI without downloading WebGPU models', async () => {
    const mockRes = new Response(
      `data: {"choices":[{"delta":{"content":"Instant AI response"}}]}\n\ndata: [DONE]\n\n`,
      { status: 200, headers: { 'Content-Type': 'text/event-stream' } }
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));

    const inference = new InferenceEngine();
    const chunks: string[] = [];
    const result = await inference.generateResponse('Hello Samjho', (_chunk, full) => {
      chunks.push(full);
    });

    expect(result.text).toBe('Instant AI response');
    expect(mocks.createEngine).not.toHaveBeenCalled();
  });

  it('falls back to local companion engine when network is offline without blocking user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const inference = new InferenceEngine();
    const result = await inference.generateResponse('bohot akela feel ho raha hai', vi.fn());

    expect(result.text).toContain('Akelepan');
    expect(mocks.createEngine).not.toHaveBeenCalled();
  }, 15000);

  it('handles homesickness queries with deep empathy and warmth on fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const inference = new InferenceEngine();
    const result = await inference.generateResponse('ghar ki bahot yaad aarhi hai yrr', vi.fn());

    expect(result.text).toContain('Ghar ki yaad');
    expect(result.text).toContain('mummy');
    expect(mocks.createEngine).not.toHaveBeenCalled();
  }, 15000);

  it('calculates math expressions and percentages dynamically', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const inference = new InferenceEngine();
    const result = await inference.generateResponse('what is 20% of 1500', vi.fn());

    expect(result.text).toContain('300');
    expect(mocks.createEngine).not.toHaveBeenCalled();
  }, 15000);

  it('answers GK questions like capitals and science constants accurately', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const inference = new InferenceEngine();
    const result = await inference.generateResponse('capital of France kya hai', vi.fn());

    expect(result.text).toContain('Paris');
    expect(mocks.createEngine).not.toHaveBeenCalled();
  }, 15000);
});

