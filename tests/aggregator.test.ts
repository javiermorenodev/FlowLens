import { describe, expect, it } from 'vitest';
import { buildGraph, entityMatchesRoute, mergeGraphs, normalizePath, pathsMatch } from '../src/core/aggregator';
import { FlowScanner } from '../src/core/scanner';
import { fixturePath } from './helpers';
import type { CallInfo, EntityInfo, FlowGraph, RouteInfo } from '../src/shared/types';

describe('normalizePath', () => {
  it('normaliza barras y descarta query/fragmento', () => {
    expect(normalizePath('api//users/?page=1')).toBe('/api/users');
    expect(normalizePath('/api/users#frag')).toBe('/api/users');
    expect(normalizePath('')).toBe('/');
  });
});

describe('pathsMatch', () => {
  it('empareja rutas con parámetros', () => {
    expect(pathsMatch('/api/users/123', '/api/users/:id')).toBe(true);
    expect(pathsMatch('/api/products/7', '/api/products/:id')).toBe(true);
  });

  it('empareja por prefijo (segmento extra en la llamada)', () => {
    expect(pathsMatch('/api/orders/42', '/api/orders')).toBe(true);
  });

  it('empareja por sufijo (baseURL)', () => {
    expect(pathsMatch('/users', '/api/users')).toBe(true);
  });

  it('no empareja rutas distintas', () => {
    expect(pathsMatch('/api/users', '/api/tasks')).toBe(false);
  });
});

describe('buildGraph', () => {
  const routes: RouteInfo[] = [
    { method: 'GET', path: '/api/users', filePath: 'server.js', line: 1, framework: 'express' },
    { method: 'POST', path: '/api/users', filePath: 'server.js', line: 5, framework: 'express' },
  ];
  const calls: CallInfo[] = [
    { method: 'GET', path: '/api/users', filePath: 'app.tsx', line: 3, framework: 'js-http' },
  ];

  it('crea un nodo api por ruta y una arista por llamada que empareja', () => {
    const graph = buildGraph(routes, calls, 2);
    expect(graph.nodes.filter((node) => node.kind === 'api')).toHaveLength(2);
    expect(graph.nodes.filter((node) => node.kind === 'frontend')).toHaveLength(1);
    expect(graph.edges).toHaveLength(1);
  });

  it('no duplica nodos api para la misma ruta', () => {
    const graph = buildGraph([...routes, routes[0]], calls, 2);
    expect(graph.nodes.filter((node) => node.kind === 'api')).toHaveLength(2);
  });
});

describe('entityMatchesRoute', () => {
  it('empareja modelos con rutas por singular/plural', () => {
    expect(entityMatchesRoute('User', '/api/users')).toBe(true);
    expect(entityMatchesRoute('User', '/api/users/:id')).toBe(true);
    expect(entityMatchesRoute('Order', '/api/orders')).toBe(true);
    expect(entityMatchesRoute('Product', '/api/products/:id')).toBe(true);
  });

  it('no empareja entidades ajenas a la ruta', () => {
    expect(entityMatchesRoute('Log', '/api/users')).toBe(false);
    expect(entityMatchesRoute('audit_logs', '/api/orders')).toBe(false);
  });
});

describe('buildGraph (capa de datos)', () => {
  const routes: RouteInfo[] = [
    { method: 'GET', path: '/api/users', filePath: 'server.js', line: 1, framework: 'express' },
  ];
  const entities: EntityInfo[] = [
    { name: 'User', filePath: 'schema.prisma', line: 1, framework: 'prisma' },
    { name: 'Log', filePath: 'log.model.js', line: 1, framework: 'mongoose' },
  ];

  it('crea nodos de base de datos y aristas api -> tabla', () => {
    const graph = buildGraph(routes, [], 2, entities);
    expect(graph.nodes.filter((node) => node.kind === 'database')).toHaveLength(2);
    const dbEdge = graph.edges.find((edge) => edge.target === 'db:User');
    expect(dbEdge).toBeDefined();
    expect(dbEdge?.source).toBe('api:GET /api/users');
    expect(graph.edges.some((edge) => edge.target === 'db:Log')).toBe(false);
  });
});

describe('mergeGraphs (monorepo)', () => {
  const a: FlowGraph = {
    nodes: [{ id: 'api:GET /a', label: 'GET /a', kind: 'api', filePath: 'a.js', line: 1, framework: 'express' }],
    edges: [],
    scannedFiles: 3,
    generatedAt: 1,
  };
  const b: FlowGraph = {
    nodes: [
      { id: 'api:GET /a', label: 'GET /a', kind: 'api', filePath: 'b.js', line: 9, framework: 'express' },
      { id: 'api:GET /b', label: 'GET /b', kind: 'api', filePath: 'b.js', line: 2, framework: 'express' },
    ],
    edges: [{ id: 'x->y', source: 'api:GET /b', target: 'db:B', label: 'sql' }],
    scannedFiles: 4,
    generatedAt: 2,
  };

  it('une nodos y aristas de varios workspaces sin duplicar ids', () => {
    const merged = mergeGraphs([a, b]);
    expect(merged.nodes.map((node) => node.id).sort()).toEqual(['api:GET /a', 'api:GET /b']);
    expect(merged.edges).toHaveLength(1);
    expect(merged.scannedFiles).toBe(7);
  });
});

describe('FlowScanner (integration sobre el fixture)', () => {
  it('escanea el proyecto demo y construye el grafo', () => {
    const graph = new FlowScanner().scan(fixturePath('.'));
    expect(graph.scannedFiles).toBe(10);
    expect(graph.nodes.filter((node) => node.kind === 'api')).toHaveLength(10);
    expect(graph.nodes.filter((node) => node.kind === 'database')).toHaveLength(8);
    expect(graph.edges.length).toBeGreaterThanOrEqual(26);
    expect(graph.edges.some((edge) => edge.target === 'api:GET /api/products/:id')).toBe(true);
    expect(graph.edges.some((edge) => edge.target === 'api:GET /api/users/:id')).toBe(true);
    expect(graph.edges.some((edge) => edge.target === 'db:User')).toBe(true);
    expect(graph.edges.some((edge) => edge.target === 'db:Task')).toBe(true);
  });
});
