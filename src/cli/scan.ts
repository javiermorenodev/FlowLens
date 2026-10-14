import { FlowScanner } from '../core/scanner';

const target = process.argv[2];

if (!target) {
  console.error('Uso: node dist/cli/scan.js <ruta-del-proyecto>');
  process.exit(1);
}

const scanner = new FlowScanner();
const graph = scanner.scan(target);
console.log(JSON.stringify(graph, null, 2));
