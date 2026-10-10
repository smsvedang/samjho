import { describe, expect, it } from 'vitest';
import { prebuiltAppConfig } from '@mlc-ai/web-llm';
import { AVAILABLE_MODELS } from './modelManager';

describe('WebLLM model configuration', () => {
  it('uses model IDs present in the installed WebLLM prebuilt catalog', () => {
    const installedModelIds = new Set(
      prebuiltAppConfig.model_list.map((model) => model.model_id)
    );

    for (const model of Object.values(AVAILABLE_MODELS)) {
      expect(installedModelIds.has(model.id), model.id).toBe(true);
    }
  });
});
