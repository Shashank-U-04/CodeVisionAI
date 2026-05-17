import type { EngineEvent } from './types';

const DEFAULT_API_BASE =
  typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://127.0.0.1:8000';

export type RemoteLanguage = 'mock' | 'c' | 'cpp' | 'java';

export interface RemoteEngineOptions {
  language: RemoteLanguage;
  apiBase?: string;
}

/**
 * Server-backed engine. Mirrors VisualizerEngine's surface so the UI can
 * swap between the two transparently via createEngine().
 *
 * Transport: POST /api/v1/execute/stream returns an SSE stream. We use fetch
 * (not EventSource) because EventSource only does GET. Each line of the body
 * is parsed manually following the SSE spec subset we emit.
 */
export class RemoteEngine {
  private readonly language: RemoteLanguage;
  private readonly apiBase: string;

  private controller: AbortController | null = null;
  private sessionId: string | null = null;

  onEvent: ((event: EngineEvent) => void) | null = null;

  constructor(options: RemoteEngineOptions) {
    this.language = options.language;
    this.apiBase = options.apiBase ?? DEFAULT_API_BASE;
  }

  initialize(): void {
    // No long-lived connection until run() — emit READY immediately so the UI
    // unblocks (Pyodide's READY signals worker boot; here there's nothing to boot).
    queueMicrotask(() => this.onEvent?.({ type: 'READY' }));
  }

  async run(code: string): Promise<void> {
    this.dispose();
    this.controller = new AbortController();

    try {
      const response = await fetch(`${this.apiBase}/api/v1/execute/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: this.language, code }),
        signal: this.controller.signal,
      });

      if (!response.ok || !response.body) {
        this.onEvent?.({
          type: 'ERROR',
          message: `Backend returned ${response.status} ${response.statusText}`,
        });
        return;
      }

      this.sessionId = response.headers.get('X-Session-Id');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = this.drainBuffer(buffer);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      this.onEvent?.({
        type: 'ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Parse an SSE buffer. The spec separates events by a blank line, which on
   * the wire is either "\n\n" or "\r\n\r\n" depending on the server. We honor
   * both. Within an event, only `data:` lines are consumed; other fields
   * (`event:`, `id:`, comments) are ignored. Returns the unconsumed tail.
   */
  private drainBuffer(buffer: string): string {
    let cursor = 0;
    while (true) {
      // Find whichever separator appears first.
      const lf = buffer.indexOf('\n\n', cursor);
      const crlf = buffer.indexOf('\r\n\r\n', cursor);
      let splitAt: number;
      let sepLen: number;
      if (lf === -1 && crlf === -1) return buffer.slice(cursor);
      if (lf === -1) { splitAt = crlf; sepLen = 4; }
      else if (crlf === -1) { splitAt = lf; sepLen = 2; }
      else if (crlf < lf) { splitAt = crlf; sepLen = 4; }
      else { splitAt = lf; sepLen = 2; }

      const chunk = buffer.slice(cursor, splitAt);
      cursor = splitAt + sepLen;

      const dataLines: string[] = [];
      for (const rawLine of chunk.split('\n')) {
        const line = rawLine.replace(/\r$/, '');
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (dataLines.length === 0) continue;

      try {
        const event = JSON.parse(dataLines.join('\n')) as EngineEvent;
        this.onEvent?.(event);
      } catch {
        // Malformed event — skip it; the next blank line resets us.
      }
    }
  }

  async provideInput(value: string): Promise<void> {
    if (!this.sessionId) return;
    try {
      await fetch(`${this.apiBase}/api/v1/execute/input/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
    } catch (err) {
      this.onEvent?.({
        type: 'ERROR',
        message: `Failed to deliver input: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  dispose(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
    if (this.sessionId) {
      const sid = this.sessionId;
      this.sessionId = null;
      fetch(`${this.apiBase}/api/v1/execute/cancel/${sid}`, { method: 'POST' }).catch(() => {});
    }
  }
}
