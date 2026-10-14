import type { FlowGraph } from './types';

export type WorkerCommand =
  | { type: 'scan'; root: string }
  | { type: 'update'; filePath: string }
  | { type: 'remove'; filePath: string };

export type WorkerRequest = WorkerCommand & { id: number };

export type WorkerResponse =
  | { id: number; graph: FlowGraph }
  | { id: number; error: string };
