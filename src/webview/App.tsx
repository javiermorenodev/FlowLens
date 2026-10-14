import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from 'reactflow';
import type { CoreToWebview } from '../shared/messages';
import type { FlowGraph, FlowNode, NodeKind } from '../shared/types';

const vscode = acquireVsCodeApi();

const COLUMN: Record<NodeKind, number> = {
  frontend: 0,
  api: 360,
  backend: 720,
  database: 1080,
};

const KIND_LABEL: Record<NodeKind, string> = {
  frontend: 'Frontend',
  api: 'API',
  backend: 'Backend',
  database: 'Database',
};

interface FlowNodeData {
  kind: NodeKind;
  label: string;
  meta: string;
  filePath: string;
  line: number;
}

function FlowNodeCard({ data }: NodeProps<FlowNodeData>) {
  return (
    <div className="flow-node">
      <div className={`flow-node__kind k-${data.kind}`}>{KIND_LABEL[data.kind]}</div>
      <div className="flow-node__body">
        <div className="flow-node__label">{data.label}</div>
        <div className="flow-node__meta">{data.meta}</div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { flow: FlowNodeCard };

function shortPath(filePath: string): string {
  const parts = filePath.split(/[\\/]/);
  return parts.slice(-2).join('/');
}

function toFlow(graph: FlowGraph): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const counters: Record<NodeKind, number> = { frontend: 0, api: 0, backend: 0, database: 0 };
  const nodes = graph.nodes.map((node: FlowNode) => {
    const row = counters[node.kind];
    counters[node.kind] += 1;
    return {
      id: node.id,
      type: 'flow',
      position: { x: COLUMN[node.kind], y: row * 132 },
      data: {
        kind: node.kind,
        label: node.label,
        meta: `${node.framework} · ${shortPath(node.filePath)}:${node.line}`,
        filePath: node.filePath,
        line: node.line,
      },
    };
  });
  const edges = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
  return { nodes, edges };
}

export function App() {
  const [graph, setGraph] = useState<FlowGraph>({ nodes: [], edges: [], scannedFiles: 0, generatedAt: 0 });
  const [status, setStatus] = useState('Analizando proyecto...');

  useEffect(() => {
    const onMessage = (event: MessageEvent<CoreToWebview>) => {
      const message = event.data;
      if (message.type === 'graph') {
        setGraph(message.payload);
        setStatus(`${message.payload.nodes.length} nodos · ${message.payload.edges.length} conexiones · ${message.payload.scannedFiles} archivos`);
      } else if (message.type === 'error') {
        setStatus(message.message);
      }
    };
    window.addEventListener('message', onMessage);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const { nodes, edges } = useMemo(() => toFlow(graph), [graph]);

  const nodesById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const data = node.data as FlowNodeData;
    vscode.postMessage({ type: 'openFile', filePath: data.filePath, line: data.line });
  }, []);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) {
        return;
      }
      vscode.postMessage({
        type: 'openPair',
        primary: { filePath: source.filePath, line: source.line },
        secondary: { filePath: target.filePath, line: target.line },
      });
    },
    [nodesById],
  );

  return (
    <div className="flow-root">
      <header className="flow-toolbar">
        <h1>FlowLens</h1>
        <span className="flow-status">{status}</span>
        <div className="legend">
          {(Object.keys(KIND_LABEL) as NodeKind[]).map((kind) => (
            <span key={kind}>
              <i className={`k-${kind}`} />
              {KIND_LABEL[kind]}
            </span>
          ))}
        </div>
        <button type="button" className="refresh" onClick={() => vscode.postMessage({ type: 'refresh' })}>
          Re-escanear
        </button>
      </header>
      <div className="flow-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          fitView
          minZoom={0.15}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="var(--vscode-editorWidget-border)" />
          <Controls showInteractive={false} />
        </ReactFlow>
        {nodes.length === 0 ? (
          <div className="flow-empty">
            Sin flujos detectados. Trabaja en un proyecto con rutas Express/NestJS y llamadas fetch/axios.
          </div>
        ) : null}
      </div>
    </div>
  );
}
