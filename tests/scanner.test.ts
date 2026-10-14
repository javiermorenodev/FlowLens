import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FlowScanner } from '../src/core/scanner';

const BOOT = "const express = require('express');\nconst app = express();\n";
const ONE_ROUTE = `${BOOT}app.get('/api/users', handler);\n`;
const TWO_ROUTES = `${BOOT}app.get('/api/users', handler);\napp.get('/api/orders', handler);\n`;
const T0 = new Date('2024-01-01T00:00:00Z');
const T1 = new Date('2024-06-01T00:00:00Z');

function countApi(graph: { nodes: Array<{ kind: string }> }): number {
  return graph.nodes.filter((node) => node.kind === 'api').length;
}

describe('FlowScanner (caché por mtime)', () => {
  it('reutiliza el parseo cuando el mtime no cambia', () => {
    const dir = mkdtempSync(join(tmpdir(), 'flowlens-'));
    try {
      const file = join(dir, 'routes.js');
      writeFileSync(file, ONE_ROUTE);
      utimesSync(file, T0, T0);
      const scanner = new FlowScanner();
      expect(countApi(scanner.scan(dir))).toBe(1);

      writeFileSync(file, TWO_ROUTES);
      utimesSync(file, T0, T0);

      expect(countApi(scanner.updateFile(file))).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('re-parsea cuando el mtime cambia', () => {
    const dir = mkdtempSync(join(tmpdir(), 'flowlens-'));
    try {
      const file = join(dir, 'routes.js');
      writeFileSync(file, ONE_ROUTE);
      utimesSync(file, T0, T0);
      const scanner = new FlowScanner();
      expect(countApi(scanner.scan(dir))).toBe(1);

      writeFileSync(file, TWO_ROUTES);
      utimesSync(file, T1, T1);

      expect(countApi(scanner.updateFile(file))).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
