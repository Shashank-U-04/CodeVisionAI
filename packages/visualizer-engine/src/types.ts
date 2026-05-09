// ─── Stack values: either inline primitives or pointers into the heap ───

export type PrimitiveType = 'int' | 'float' | 'str' | 'bool' | 'None';

export interface PrimitiveValue {
  kind: 'primitive';
  type: PrimitiveType;
  value: string | number | boolean | null;
}

export interface RefValue {
  kind: 'ref';
  id: number;
}

export type StackValue = PrimitiveValue | RefValue;

// ─── Heap objects: every reference type lives here, keyed by Python id() ───

export interface ListObject {
  type: 'list';
  id: number;
  elements: StackValue[];
}

export interface TupleObject {
  type: 'tuple';
  id: number;
  elements: StackValue[];
}

export interface DictObject {
  type: 'dict';
  id: number;
  pairs: Array<[StackValue, StackValue]>;
}

export interface SetObject {
  type: 'set';
  id: number;
  elements: StackValue[];
}

export interface FunctionObject {
  type: 'function';
  id: number;
  name: string;
}

export interface ClassObject {
  type: 'class';
  id: number;
  name: string;
}

export interface InstanceObject {
  type: 'instance';
  id: number;
  className: string;
  attrs: Record<string, StackValue>;
}

export type HeapObject =
  | ListObject
  | TupleObject
  | DictObject
  | SetObject
  | FunctionObject
  | ClassObject
  | InstanceObject;

// ─── Stack frames ───

export interface StackFrame {
  name: string;
  line: number;
  locals: Record<string, StackValue>;
  isGlobal: boolean;
  returnValue?: StackValue;
}

// ─── Execution snapshots ───

export type TraceEvent = 'call' | 'line' | 'return' | 'exception';

export interface ExecutionState {
  step: number;
  line: number;
  event: TraceEvent;
  description: string;
  frames: StackFrame[];           // ordered: index 0 = oldest, last = active
  heap: Record<number, HeapObject>;
  stdout: string;
  changedVars: string[];          // dotted paths into frames that changed this step
}

// ─── Engine status + events ───

export type EngineStatus =
  | 'initializing'
  | 'idle'
  | 'running'
  | 'paused_on_input'
  | 'done'
  | 'error';

export type EngineEvent =
  | { type: 'READY' }
  | { type: 'STEP'; state: ExecutionState }
  | { type: 'INPUT_REQUEST'; prompt: string }
  | { type: 'OUTPUT'; value: string }
  | { type: 'DONE' }
  | { type: 'ERROR'; message: string; line?: number | null };
