import { describe, expect, it } from 'vitest';
import { buildGraph, normalizePath, pathsMatch } from '../src/core/aggregator';
import { FlowScanner } from '../src/core/scanner';
import { fixturePath } from './helpers';
import type { CallInfo, RouteInfo } from '../src/shared/types';

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

describe('FlowScanner (integration sobre el fixture)', () => {
  it('escanea el proyecto demo y construye el grafo', () => {
    const graph = new FlowScanner().scan(fixturePath('.'));
    expect(graph.scannedFiles).toBe(5);
    expect(graph.nodes.filter((node) => node.kind === 'api')).toHaveLength(10);
    expect(graph.edges.length).toBeGreaterThanOrEqual(10);
    expect(graph.edges.some((edge) => edge.target === 'api:GET /api/products/:id')).toBe(true);
  });
});
