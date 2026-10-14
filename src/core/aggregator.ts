import type { CallInfo, EntityInfo, FlowEdge, FlowGraph, FlowNode, RouteInfo } from '../shared/types';

export function normalizePath(raw: string): string {
  let value = raw.trim().split('?')[0].split('#')[0];
  if (!value) {
    return '/';
  }
  if (!value.startsWith('/')) {
    value = `/${value}`;
  }
  value = value.replace(/\/{2,}/g, '/');
  if (value.length > 1 && value.endsWith('/')) {
    value = value.slice(0, -1);
  }
  return value;
}

function segmentMatches(routeSegment: string, callSegment: string): boolean {
  return routeSegment.startsWith(':') || routeSegment.startsWith('*') || routeSegment === callSegment;
}

function segments(value: string): string[] {
  return normalizePath(value).split('/').filter(Boolean);
}

function prefixMatch(routeSegments: string[], callSegments: string[]): boolean {
  const length = Math.min(routeSegments.length, callSegments.length);
  if (length === 0) {
    return false;
  }
  for (let index = 0; index < length; index += 1) {
    if (!segmentMatches(routeSegments[index], callSegments[index])) {
      return false;
    }
  }
  return true;
}

export function matchScore(callPath: string, routePath: string): number {
  const call = segments(callPath);
  const route = segments(routePath);
  if (call.length === 0 || route.length === 0) {
    return 0;
  }
  if (call.length === route.length) {
    if (call.every((segment, index) => segment === route[index])) {
      return 100;
    }
    return prefixMatch(route, call) ? 80 : 0;
  }
  if (route.length < call.length) {
    return prefixMatch(route, call) ? 40 : 0;
  }
  const tail = route.slice(route.length - call.length);
  if (call.every((segment, index) => segmentMatches(tail[index], segment))) {
    return 30;
  }
  return 0;
}

export function pathsMatch(callPath: string, routePath: string): boolean {
  return matchScore(callPath, routePath) > 0;
}

function singularize(word: string): string {
  if (word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (/(?:ses|xes|zes|ches|shes)$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

export function entityMatchesRoute(entityName: string, routePath: string): boolean {
  const target = entityName.toLowerCase();
  const targetSingular = singularize(target);
  for (const segment of segments(routePath)) {
    if (segment.startsWith(':') || segment.startsWith('*')) {
      continue;
    }
    const lower = segment.toLowerCase();
    if (lower === target || lower === targetSingular || singularize(lower) === targetSingular) {
      return true;
    }
  }
  return false;
}

export function buildGraph(
  routes: RouteInfo[],
  calls: CallInfo[],
  scannedFiles: number,
  entities: EntityInfo[] = [],
): FlowGraph {  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const edgeIds = new Set<string>();
  const uniqueRoutes: RouteInfo[] = [];

  for (const entity of entities) {
    const id = `db:${entity.name}`;
    if (nodes.has(id)) {
      continue;
    }
    nodes.set(id, {
      id,
      label: entity.name,
      kind: 'database',
      filePath: entity.filePath,
      line: entity.line,
      framework: entity.framework,
      detail: entity.framework,
    });
  }

  for (const route of routes) {
    const method = route.method.toUpperCase();
    const path = normalizePath(route.path);
    const id = `api:${method} ${path}`;
    if (nodes.has(id)) {
      continue;
    }
    uniqueRoutes.push({ ...route, method, path });
    nodes.set(id, {
      id,
      label: `${method} ${path}`,
      kind: 'api',
      filePath: route.filePath,
      line: route.line,
      framework: route.framework,
      detail: route.framework,
    });
    for (const entity of entities) {
      if (!entityMatchesRoute(entity.name, path)) {
        continue;
      }
      const dbId = `db:${entity.name}`;
      const edgeId = `${id}->${dbId}`;
      if (edgeIds.has(edgeId)) {
        continue;
      }
      edgeIds.add(edgeId);
      edges.push({ id: edgeId, source: id, target: dbId, label: entity.framework });
    }
  }

  for (const call of calls) {
    const method = call.method.toUpperCase();
    const path = normalizePath(call.path);
    const id = `fe:${call.filePath}:${call.line}:${method}:${path}`;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: `${method} ${path}`,
        kind: 'frontend',
        filePath: call.filePath,
        line: call.line,
        framework: call.framework,
        detail: call.framework,
      });
    }

    let target: RouteInfo | undefined;
    let bestScore = 0;
    for (const route of uniqueRoutes) {
      const base = matchScore(call.path, route.path);
      if (base === 0) {
        continue;
      }
      const score = base + (route.method === method ? 5 : 0);
      if (score > bestScore) {
        bestScore = score;
        target = route;
      }
    }

    if (!target) {
      continue;
    }

    const targetId = `api:${target.method} ${target.path}`;
    const edgeId = `${id}->${targetId}`;
    if (edgeIds.has(edgeId)) {
      continue;
    }
    edgeIds.add(edgeId);
    edges.push({ id: edgeId, source: id, target: targetId, label: method });
  }

  return {
    nodes: [...nodes.values()],
    edges,
    scannedFiles,
    generatedAt: Date.now(),
  };
}

export function mergeGraphs(graphs: FlowGraph[]): FlowGraph {
  const nodeMap = new Map<string, FlowNode>();
  const edgeMap = new Map<string, FlowEdge>();
  let scannedFiles = 0;
  for (const graph of graphs) {
    scannedFiles += graph.scannedFiles;
    for (const node of graph.nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node);
      }
    }
    for (const edge of graph.edges) {
      if (!edgeMap.has(edge.id)) {
        edgeMap.set(edge.id, edge);
      }
    }
  }
  return {
    nodes: [...nodeMap.values()],
    edges: [...edgeMap.values()],
    scannedFiles,
    generatedAt: Date.now(),
  };
}
