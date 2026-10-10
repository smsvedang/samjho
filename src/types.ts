export type ConversationMode = 'ask' | 'explain' | 'think' | 'listen' | 'mixed';

export interface HelplineInfo {
  name: string;
  number: string;
  description: string;
  timing: string;
}

export type FileCategory = 'image' | 'pdf' | 'code' | 'document' | 'other';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  dataUrl?: string;
  extractedText?: string;
  summary?: string;
  lineCount?: number;
  wordCount?: number;
  imageDimensions?: { width: number; height: number };
  status: 'reading' | 'ready' | 'error';
  statusText?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'samjho' | 'system';
  text: string;
  timestamp: number;
  mode?: ConversationMode;
  isStreaming?: boolean;
  statusText?: string;
  isError?: boolean;
  helplines?: HelplineInfo[];
  attachments?: FileAttachment[];
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

export type EngineProvider = 'webgpu';

export interface AISettings {
  provider: EngineProvider;
  externalWebSearchEnabled: boolean;
}

export interface ModelLoadingState {
  stage: ModelStage;
  progress: number; // 0 - 100
  statusText: string;
  modelName: string;
  bytesDownloaded?: string;
  totalBytes?: string;
  error?: string;
  activeEngine: EngineProvider;
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
