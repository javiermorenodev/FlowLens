import { parentPort } from 'node:worker_threads';
import { FlowScanner } from './scanner';
import type { FlowGraph } from '../shared/types';
import type { WorkerRequest, WorkerResponse } from '../shared/workerProtocol';

if (!parentPort) {
  throw new Error('scanner-worker debe ejecutarse como worker thread');
}

const port = parentPort;
const scanner = new FlowScanner();

port.on('message', (message: WorkerRequest) => {
  let response: WorkerResponse;
  try {
    let graph: FlowGraph;
    switch (message.type) {
      case 'scan':
        graph = scanner.scan(message.root);
        break;
      case 'update':
        graph = scanner.updateFile(message.filePath);
        break;
      case 'remove':
        graph = scanner.removeFile(message.filePath);
        break;
    }
    response = { id: message.id, graph };
  } catch (error) {
    response = { id: message.id, error: error instanceof Error ? error.message : String(error) };
  }
  port.postMessage(response);
});
