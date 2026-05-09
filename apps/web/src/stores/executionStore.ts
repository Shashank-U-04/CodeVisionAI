'use client';

import { create } from 'zustand';
import type { EngineStatus, ExecutionState } from '@codevision/visualizer-engine';

interface InputRequest {
  prompt: string;
}

interface ExecutionStore {
  status: EngineStatus;
  code: string;
  steps: ExecutionState[];
  viewStepIndex: number;
  hasStartedVisualization: boolean;   // gate for "Start Visualization" button
  inputRequest: InputRequest | null;
  output: string;
  error: string | null;

  setStatus: (status: EngineStatus) => void;
  setCode: (code: string) => void;
  addStep: (state: ExecutionState) => void;
  setViewStepIndex: (index: number) => void;
  startVisualization: () => void;
  setInputRequest: (req: InputRequest | null) => void;
  appendOutput: (value: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Find first step where state.line === line; returns -1 if not found.
  findFirstStepForLine: (line: number) => number;
}

const DEFAULT_CODE = `# CodeVision AI — Python Visualizer
# Step through your code and see the call stack + heap in real time.

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

def make_points(n):
    points = []
    for i in range(n):
        points.append(Point(i, i * 2))
    return points

pts = make_points(3)
print("first point:", pts[0].x, pts[0].y)

# Try interactive input:
# name = input("name? ")
# print("hello", name)
`;

export const useExecutionStore = create<ExecutionStore>()((set, get) => ({
  status: 'initializing',
  code: DEFAULT_CODE,
  steps: [],
  viewStepIndex: -1,
  hasStartedVisualization: false,
  inputRequest: null,
  output: '',
  error: null,

  setStatus: (status) => set({ status }),
  setCode: (code) => set({ code }),

  // Steps are silently collected — the visualization does NOT auto-advance.
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
