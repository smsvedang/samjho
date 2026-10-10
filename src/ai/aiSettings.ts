import { AISettings, EngineProvider } from '../types';

const SETTINGS_STORAGE_KEY = 'samjho_ai_settings_v2';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'instant',
  externalWebSearchEnabled: false,
};

class AISettingsManager {
  private settings: AISettings;
  private listeners: Array<(settings: AISettings) => void> = [];

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AISettings {
    if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };

    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SETTINGS,
          provider: parsed.provider || 'instant',
          externalWebSearchEnabled: parsed.externalWebSearchEnabled === true,
          groqApiKey: parsed.groqApiKey,
          geminiApiKey: parsed.geminiApiKey,
          openaiApiKey: parsed.openaiApiKey,
          openaiBaseUrl: parsed.openaiBaseUrl,
          openaiModel: parsed.openaiModel,
        };
      }
    } catch (e) {
      console.warn('Failed to parse AI settings:', e);
    }

    return { ...DEFAULT_SETTINGS };
  }

  public getSettings(): AISettings {
    return { ...this.settings };
  }

  public saveSettings(partial: Partial<AISettings>): void {
    this.settings = { ...this.settings, ...partial };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.warn('Failed to save AI settings to localStorage:', e);
      }
    }

    this.notify();
  }

  public setProvider(provider: EngineProvider): void {
    this.saveSettings({ provider });
  }

  public subscribe(fn: (settings: AISettings) => void): () => void {
    this.listeners.push(fn);
    fn(this.settings);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.settings));
  }
}

export const aiSettingsManager = new AISettingsManager();
