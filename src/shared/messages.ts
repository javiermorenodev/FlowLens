import type { FlowGraph } from './types';

export interface OpenTarget {
  filePath: string;
  line: number;
}

export type CoreToWebview =
  | { type: 'graph'; payload: FlowGraph }
  | { type: 'error'; message: string };

export type WebviewToCore =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'openFile'; filePath: string; line: number }
  | { type: 'openPair'; primary: OpenTarget; secondary: OpenTarget };
