import type { CallInfo, FlowEdge, FlowGraph, FlowNode, RouteInfo } from '../shared/types';

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

function suffixMatch(routeSegments: string[], callSegments: string[]): boolean {
  const length = Math.min(routeSegments.length, callSegments.length);
  if (length === 0) {
    return false;
  }
  for (let index = 1; index <= length; index += 1) {
    if (!segmentMatches(routeSegments[routeSegments.length - index], callSegments[callSegments.length - index])) {
      return false;
    }
  }
  return true;
}

export function pathsMatch(callPath: string, routePath: string): boolean {
  const call = segments(callPath);
  const route = segments(routePath);
  return prefixMatch(route, call) || suffixMatch(route, call);
}

export function buildGraph(routes: RouteInfo[], calls: CallInfo[], scannedFiles: number): FlowGraph {
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const edgeIds = new Set<string>();
  const uniqueRoutes: RouteInfo[] = [];

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

    const target =
      uniqueRoutes.find((route) => route.method === method && pathsMatch(call.path, route.path)) ??
      uniqueRoutes.find((route) => pathsMatch(call.path, route.path));

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
