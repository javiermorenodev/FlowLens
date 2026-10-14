import { describe, expect, it } from 'vitest';
import { ScannerManager } from '../src/core/manager';
import { fixturePath } from './helpers';

describe('ScannerManager', () => {
  it('cae al scanner síncrono si el worker no arranca', async () => {
    const manager = new ScannerManager(fixturePath('__no_such_worker__.js'));
    try {
      const graph = await manager.scan(fixturePath('.'));
      expect(graph.nodes.filter((node) => node.kind === 'api')).toHaveLength(10);
      expect(graph.nodes.filter((node) => node.kind === 'database')).toHaveLength(8);
    } finally {
      manager.dispose();
    }
  });
});
