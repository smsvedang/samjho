import { DeviceCapabilities, DeviceTier, ModelLoadingState } from '../types';

export interface ModelProfile {
  id: string;
  name: string;
  sizeMB: number;
  tier: DeviceTier;
  family: 'Qwen' | 'SmolLM' | 'Llama' | 'Phi';
  description: string;
}

export const AVAILABLE_MODELS: Record<string, ModelProfile> = {
  'SmolLM2-360M-Instruct-q4f16_1-MLC': {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM2 360M (Fast & Compact)',
    sizeMB: 380,
    tier: 'low',
    family: 'SmolLM',
    description: 'Instant loading, lightweight footprint, perfect for mobile and everyday chat.',
  },
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': {
    id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B (Multilingual)',
    sizeMB: 512,
    tier: 'medium',
    family: 'Qwen',
    description: 'Strong Hindi, Hinglish, reasoning, and conceptual explanations.',
  },
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B (High Precision)',
    sizeMB: 1200,
    tier: 'high',
    family: 'Qwen',
    description: 'Deep reasoning, coding, and nuanced emotional understanding.',
  },
};

export class ModelManager {
  private capabilities: DeviceCapabilities | null = null;
  private state: ModelLoadingState = {
    stage: 'idle',
    progress: 0,
    statusText: 'Initializing...',
    modelName: 'SmolLM2 360M (Local)',
    activeEngine: 'webgpu',
  };

  private listeners: Array<(state: ModelLoadingState) => void> = [];

  public subscribe(fn: (state: ModelLoadingState) => void): () => void {
    this.listeners.push(fn);
    fn(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.state));
  }

  public updateState(partial: Partial<ModelLoadingState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public getState(): ModelLoadingState {
    return this.state;
  }

  public async detectCapabilities(): Promise<DeviceCapabilities> {
    if (this.capabilities) return this.capabilities;

    let hasWebGPU = false;
    try {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          hasWebGPU = true;
        }
      }
    } catch {
      hasWebGPU = false;
    }

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const deviceMemory = (nav as any)?.deviceMemory || 4;
    const hardwareConcurrency = nav?.hardwareConcurrency || 4;
    const userAgent = nav?.userAgent || '';

    let deviceTier: DeviceTier = 'medium';
    let recommendedModelId = 'SmolLM2-360M-Instruct-q4f16_1-MLC';

    if (!hasWebGPU) {
      deviceTier = 'unsupported';
    } else if (deviceMemory >= 8 && hardwareConcurrency >= 8) {
      deviceTier = 'high';
      recommendedModelId = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
    } else if (deviceMemory >= 4) {
      deviceTier = 'medium';
      recommendedModelId = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
    } else {
      deviceTier = 'low';
      recommendedModelId = 'SmolLM2-360M-Instruct-q4f16_1-MLC';
    }

    this.capabilities = {
      hasWebGPU,
      deviceMemoryGB: deviceMemory,
      hardwareConcurrency,
      browser: userAgent,
      deviceTier,
      recommendedModelId,
    };

    return this.capabilities;
  }
}

export const modelManager = new ModelManager();
