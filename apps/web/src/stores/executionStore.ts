'use client';

import { create } from 'zustand';
import type { EngineStatus, ExecutionState } from '@codevision/visualizer-engine';

interface InputRequest {
  prompt: string;
}

interface ExecutionStore {
  status: EngineStatus;
  steps: ExecutionState[];
  viewStepIndex: number;
  hasStartedVisualization: boolean;
  inputRequest: InputRequest | null;
  output: string;
  error: string | null;

  setStatus: (status: EngineStatus) => void;
  addStep: (state: ExecutionState) => void;
  setViewStepIndex: (index: number) => void;
  startVisualization: () => void;
  setInputRequest: (req: InputRequest | null) => void;
  appendOutput: (value: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  findFirstStepForLine: (line: number) => number;
}

export const useExecutionStore = create<ExecutionStore>()((set, get) => ({
  status: 'initializing',
  steps: [],
  viewStepIndex: -1,
  hasStartedVisualization: false,
  inputRequest: null,
  output: '',
  error: null,

  setStatus: (status) => set({ status }),

  addStep: (state) =>
    set((prev) => ({ steps: [...prev.steps, state] })),

  setViewStepIndex: (index) => set({ viewStepIndex: index }),

  startVisualization: () =>
    set((prev) => {
      if (prev.steps.length === 0) return prev;
      return { hasStartedVisualization: true, viewStepIndex: 0 };
    }),

  setInputRequest: (inputRequest) => set({ inputRequest }),

  appendOutput: (value) =>
    set((prev) => ({ output: prev.output + value })),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      steps: [],
      viewStepIndex: -1,
      hasStartedVisualization: false,
      inputRequest: null,
      output: '',
      error: null,
    }),

  findFirstStepForLine: (line) => {
    const steps = get().steps;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].line === line) return i;
    }
    return -1;
  },
}));
