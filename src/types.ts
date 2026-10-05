export type ConversationMode = 'ask' | 'explain' | 'think' | 'listen' | 'mixed';

export interface HelplineInfo {
  name: string;
  number: string;
  description: string;
  timing: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'samjho' | 'system';
  text: string;
  timestamp: number;
  mode?: ConversationMode;
  isStreaming?: boolean;
  isError?: boolean;
  helplines?: HelplineInfo[];
}

export type DeviceTier = 'high' | 'medium' | 'low' | 'unsupported';

export interface DeviceCapabilities {
  hasWebGPU: boolean;
  deviceMemoryGB?: number;
  hardwareConcurrency?: number;
  browser: string;
  deviceTier: DeviceTier;
  recommendedModelId: string;
}

export type ModelStage =
  | 'idle'
  | 'detecting'
  | 'downloading'
  | 'ready'
  | 'generating'
  | 'error'
  | 'unsupported';

export interface ModelLoadingState {
  stage: ModelStage;
  progress: number; // 0 - 100
  statusText: string;
  modelName: string;
  bytesDownloaded?: string;
  totalBytes?: string;
  error?: string;
  activeEngine: 'webgpu' | 'local-companion';
}

export interface SafetyCheckResult {
  isHarmful: boolean;
  category?: 'crisis' | 'self_harm' | 'medical' | 'violence' | 'none';
  helplineList?: HelplineInfo[];
  safetyInterventionText?: string;
}

export interface ContextItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}
