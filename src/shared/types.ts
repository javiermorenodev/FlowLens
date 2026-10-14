export type NodeKind = 'frontend' | 'api' | 'backend' | 'database';

export interface FlowNode {
  id: string;
  label: string;
  kind: NodeKind;
  filePath: string;
  line: number;
  framework: string;
  detail?: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  scannedFiles: number;
  generatedAt: number;
}

export interface RouteInfo {
  method: string;
  path: string;
  filePath: string;
  line: number;
  framework: string;
}

export interface CallInfo {
  method: string;
  path: string;
  filePath: string;
  line: number;
  framework: string;
}

export interface EntityInfo {
  name: string;
  filePath: string;
  line: number;
  framework: string;
}

export interface BackendParser {
  name: string;
  detect(filePath: string, content: string): boolean;
  parse(filePath: string, content: string): RouteInfo[];
}

export interface FrontendParser {
  name: string;
  detect(filePath: string, content: string): boolean;
  parse(filePath: string, content: string): CallInfo[];
}

export interface SchemaParser {
  name: string;
  detect(filePath: string, content: string): boolean;
  parse(filePath: string, content: string): EntityInfo[];
}
