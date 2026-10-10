import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionManager } from '../privacy/sessionManager';
import { clearAllLocalConversationData } from '../privacy/dataClear';

const mocks = vi.hoisted(() => ({
  abortGeneration: vi.fn(),
  generateResponse: vi.fn(),
}));

vi.mock('./inferenceEngine', () => ({
  inferenceEngine: {
    abortGeneration: mocks.abortGeneration,
    generateResponse: mocks.generateResponse,
  },
}));

import { ResponseController } from './responseController';

describe('conversation clearing', () => {
  beforeEach(() => {
    sessionManager.clearSession();
    mocks.abortGeneration.mockReset();
    mocks.generateResponse.mockReset();
  });

  it('clears temporary context and ignores late response callbacks after stop/clear', async () => {
    let resolveGeneration!: (value: { text: string; mode: 'ask' }) => void;
    let lateChunk!: (chunk: string, fullText: string) => void;
    let lateStatus!: (status: string) => void;
    mocks.generateResponse.mockImplementation((_text, onChunk, _attachments, onStatus) => {
      lateChunk = onChunk;
      lateStatus = onStatus;
      onChunk('early', 'early');
      return new Promise((resolve) => {
        resolveGeneration = resolve;
      });
    });

    const controller = new ResponseController();
    const updates: string[] = [];
    const generation = controller.handleUserMessage('temporary message', (message) => {
      updates.push(message.text);
    });

    expect(sessionManager.getContext()).toHaveLength(1);
    controller.stop();
    clearAllLocalConversationData();
    lateChunk('late', 'late');
    lateStatus('late status');
    resolveGeneration({ text: 'late answer', mode: 'ask' });
    await generation;

    expect(mocks.abortGeneration).toHaveBeenCalledOnce();
    expect(sessionManager.getContext()).toEqual([]);
    expect(updates).toEqual(['', 'early']);
    expect(controller.getIsGenerating()).toBe(false);
  });
});
