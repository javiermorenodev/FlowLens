import type { FlowGraph } from './types';

export type CoreToWebview =
  | { type: 'graph'; payload: FlowGraph }
  | { type: 'error'; message: string };

export type WebviewToCore =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'openFile'; filePath: string; line: number };
