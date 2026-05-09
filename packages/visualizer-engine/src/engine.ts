import type { EngineEvent } from './types';
import { WORKER_SOURCE } from './worker-source';
import { PYTHON_TRACER_CODE } from './tracer';

const SIGNAL_BUFFER_BYTES = 4;
const INPUT_BUFFER_BYTES = 4 + 8192; // 4-byte length prefix + 8KB data

export class VisualizerEngine {
  private worker: Worker | null = null;
  private workerUrl: string | null = null;

  private signalBuffer: SharedArrayBuffer;
  private inputBuffer: SharedArrayBuffer;
  private signalArray: Int32Array;
  private inputLengthArray: Int32Array;
  private inputDataArray: Uint8Array;

  onEvent: ((event: EngineEvent) => void) | null = null;

  constructor() {
    if (typeof SharedArrayBuffer === 'undefined') {
      throw new Error(
        'SharedArrayBuffer is unavailable. The app requires COOP/COEP security headers. ' +
        'Run the dev server with `npm run dev` — headers are configured automatically.'
      );
    }

    this.signalBuffer = new SharedArrayBuffer(SIGNAL_BUFFER_BYTES);
    this.inputBuffer = new SharedArrayBuffer(INPUT_BUFFER_BYTES);
    this.signalArray = new Int32Array(this.signalBuffer);
    this.inputLengthArray = new Int32Array(this.inputBuffer, 0, 1);
    this.inputDataArray = new Uint8Array(this.inputBuffer, 4);
  }

  initialize(): void {
    const blob = new Blob([WORKER_SOURCE], { type: 'application/javascript' });
    this.workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerUrl);

    this.worker.onmessage = (e: MessageEvent) => {
      this.onEvent?.(e.data as EngineEvent);
    };

    this.worker.onerror = (e: ErrorEvent) => {
      this.onEvent?.({ type: 'ERROR', message: e.message });
    };

    this.worker.postMessage({ type: 'INIT' });
  }

  run(code: string): void {
    if (!this.worker) throw new Error('Engine not initialized. Call initialize() first.');

    Atomics.store(this.signalArray, 0, 0);

    this.worker.postMessage({
      type: 'RUN',
      code,
      tracerCode: PYTHON_TRACER_CODE,
      signalBuffer: this.signalBuffer,
      inputBuffer: this.inputBuffer,
    });
  }

  provideInput(value: string): void {
    const encoded = new TextEncoder().encode(value + '\n');
    const maxLen = INPUT_BUFFER_BYTES - 4;
    const slice = encoded.slice(0, maxLen);

    for (let i = 0; i < slice.length; i++) {
      Atomics.store(this.inputDataArray, i, slice[i]);
    }
    Atomics.store(this.inputLengthArray, 0, slice.length);
    Atomics.store(this.signalArray, 0, 1);
    Atomics.notify(this.signalArray, 0, 1);
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
  }
}
