/**
 * Self-contained Web Worker source code.
 * Loaded as a Blob URL so it requires no build step.
 *
 * Message protocol (received from main thread):
 *   { type: 'INIT' }
 *   { type: 'RUN', code, tracerCode, signalBuffer, inputBuffer }
 *
 * Message protocol (sent to main thread):
 *   { type: 'READY' }
 *   { type: 'STEP', state: ExecutionState }
 *   { type: 'INPUT_REQUEST', prompt: string }
 *   { type: 'OUTPUT', value: string }
 *   { type: 'DONE' }
 *   { type: 'ERROR', message: string, line?: number }
 */
export const WORKER_SOURCE = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

var pyodide = null;
var signalArray = null;
var inputLengthArray = null;
var inputDataArray = null;

self.onmessage = async function(e) {
  var msg = e.data;

  if (msg.type === 'INIT') {
    try {
      pyodide = await loadPyodide();
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', message: 'Failed to load Pyodide: ' + String(err) });
    }
    return;
  }

  if (msg.type === 'RUN') {
    signalArray = new Int32Array(msg.signalBuffer);
    inputLengthArray = new Int32Array(msg.inputBuffer, 0, 1);
    inputDataArray = new Uint8Array(msg.inputBuffer, 4);

    try {
      pyodide.globals.set('__user_code__', msg.code);

      pyodide.globals.set('__post_step__', function(jsonStr) {
        try {
          self.postMessage(JSON.parse(jsonStr));
        } catch (_) {}
      });

      pyodide.globals.set('__request_input__', function(prompt) {
        Atomics.store(signalArray, 0, 0);
        self.postMessage({ type: 'INPUT_REQUEST', prompt: String(prompt) });
        Atomics.wait(signalArray, 0, 0);
        var length = Atomics.load(inputLengthArray, 0);
        var bytes = new Uint8Array(length);
        for (var i = 0; i < length; i++) {
          bytes[i] = Atomics.load(inputDataArray, i);
        }
        return new TextDecoder().decode(bytes);
      });

      await pyodide.runPythonAsync(msg.tracerCode);
      self.postMessage({ type: 'DONE' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', message: String(err) });
    }
    return;
  }
};
`;
