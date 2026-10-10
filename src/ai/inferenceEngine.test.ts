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
