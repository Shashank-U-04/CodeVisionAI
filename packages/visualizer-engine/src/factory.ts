import { VisualizerEngine } from './engine';
import { RemoteEngine, type RemoteLanguage } from './remote-engine';
import type { EngineEvent } from './types';

export type EngineLanguage = 'python' | RemoteLanguage;

/**
 * Minimum surface every engine implementation honors. Both VisualizerEngine
 * (browser Pyodide) and RemoteEngine (server SSE) satisfy this; the workspace
 * UI only depends on these methods.
 */
export interface Engine {
  onEvent: ((event: EngineEvent) => void) | null;
  initialize(): void;
  run(code: string): void | Promise<void>;
  provideInput(value: string): void | Promise<void>;
  dispose(): void;
}

export interface CreateEngineOptions {
  language: EngineLanguage;
  apiBase?: string;
}

export function createEngine(options: CreateEngineOptions): Engine {
  if (options.language === 'python') return new VisualizerEngine();
  return new RemoteEngine({ language: options.language, apiBase: options.apiBase });
}
