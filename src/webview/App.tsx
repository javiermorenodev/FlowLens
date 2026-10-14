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

const ALL_KINDS = Object.keys(KIND_LABEL) as NodeKind[];

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

function buildNodes(nodes: FlowNode[], positions: Map<string, { x: number; y: number }>): Node<FlowNodeData>[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'flow',
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    data: {
      kind: node.kind,
      label: node.label,
      meta: `${node.framework} · ${shortPath(node.filePath)}:${node.line}`,
      filePath: node.filePath,
      line: node.line,
    },
  }));
}

function toEdges(edges: FlowGraph['edges']): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: 'smoothstep',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

export function App() {
  const [graph, setGraph] = useState<FlowGraph>({ nodes: [], edges: [], scannedFiles: 0, generatedAt: 0 });
  const [status, setStatus] = useState('Analizando proyecto...');
  const [query, setQuery] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<NodeKind>>(new Set(ALL_KINDS));
  const [activeFrameworks, setActiveFrameworks] = useState<Set<string> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const frameworks = useMemo(
    () => [...new Set(graph.nodes.map((node) => node.framework))].sort(),
    [graph.nodes],
  );

  useEffect(() => {
    setActiveFrameworks(new Set(frameworks));
  }, [frameworks]);

  const positions = useMemo(() => {
    const counters: Record<NodeKind, number> = { frontend: 0, api: 0, backend: 0, database: 0 };
    const map = new Map<string, { x: number; y: number }>();
    for (const node of graph.nodes) {
      const row = counters[node.kind];
      counters[node.kind] += 1;
      map.set(node.id, { x: COLUMN[node.kind], y: row * 132 });
    }
    return map;
  }, [graph.nodes]);

  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of graph.edges) {
      if (!map.has(edge.source)) {
        map.set(edge.source, new Set());
      }
      if (!map.has(edge.target)) {
        map.set(edge.target, new Set());
      }
      map.get(edge.source)?.add(edge.target);
      map.get(edge.target)?.add(edge.source);
    }
    return map;
  }, [graph.edges]);

  const related = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    const set = new Set<string>([selectedId]);
    for (const id of adjacency.get(selectedId) ?? []) {
      set.add(id);
    }
    return set;
  }, [selectedId, adjacency]);

  const nodesById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);

  const { nodes, edges } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = graph.nodes.filter((node) => {
      if (!activeKinds.has(node.kind)) {
        return false;
      }
      if (activeFrameworks && !activeFrameworks.has(node.framework)) {
        return false;
      }
      if (needle && !`${node.label} ${node.framework} ${node.filePath}`.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
    const visibleIds = new Set(visible.map((node) => node.id));
    const visibleEdges = graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));

    let flowNodes = buildNodes(visible, positions);
    let flowEdges = toEdges(visibleEdges);

    if (related) {
      flowNodes = flowNodes.map((node) => ({
        ...node,
        className: related.has(node.id) ? 'related' : 'dimmed',
      }));
      flowEdges = flowEdges.map((edge) => ({
        ...edge,
        className: related.has(edge.source) && related.has(edge.target) ? 'related' : 'dimmed',
      }));
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [graph, query, activeKinds, activeFrameworks, related, positions]);

  const toggleKind = useCallback((kind: NodeKind) => {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  }, []);

  const toggleFramework = useCallback((framework: string) => {
    setActiveFrameworks((prev) => {
      const next = new Set(prev ?? frameworks);
      if (next.has(framework)) {
        next.delete(framework);
      } else {
        next.add(framework);
      }
      return next;
    });
  }, [frameworks]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedId((prev) => (prev === node.id ? null : node.id));
  }, []);

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

  const total = graph.nodes.length;

  return (
    <div className="flow-root">
      <header className="flow-toolbar">
        <h1>FlowLens</h1>
        <span className="flow-status">{status}</span>
        <div className="legend">
          {ALL_KINDS.map((kind) => (
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
      <div className="flow-filters">
        <input
          type="search"
          className="flow-search"
          placeholder="Buscar nodo, ruta o archivo..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="chip-group">
          {ALL_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`chip chip--kind k-${kind}${activeKinds.has(kind) ? ' is-on' : ''}`}
              onClick={() => toggleKind(kind)}
            >
              {KIND_LABEL[kind]}
            </button>
          ))}
        </div>
        {frameworks.length > 0 ? (
          <div className="chip-group">
            {frameworks.map((framework) => (
              <button
                key={framework}
                type="button"
                className={`chip${activeFrameworks?.has(framework) ? ' is-on' : ''}`}
                onClick={() => toggleFramework(framework)}
              >
                {framework}
              </button>
            ))}
          </div>
        ) : null}
        <span className="flow-count">
          {nodes.length}/{total}
        </span>
      </div>
      <div className="flow-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          minZoom={0.15}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="var(--vscode-editorWidget-border)" />
          <Controls showInteractive={false} />
        </ReactFlow>
        {total === 0 ? (
          <div className="flow-empty">
            Sin flujos detectados. Trabaja en un proyecto con rutas Express/NestJS y llamadas fetch/axios.
          </div>
        ) : null}
        {total > 0 && nodes.length === 0 ? (
          <div className="flow-empty">Ningún nodo coincide con los filtros actuales.</div>
        ) : null}
      </div>
    </div>
  );
}
