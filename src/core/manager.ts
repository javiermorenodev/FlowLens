import { Worker } from 'node:worker_threads';
import { FlowScanner } from './scanner';
import type { FlowGraph } from '../shared/types';
import type { WorkerCommand, WorkerResponse } from '../shared/workerProtocol';

interface Pending {
  resolve: (graph: FlowGraph) => void;
  reject: (error: Error) => void;
}

export class ScannerManager {
  private worker: Worker | undefined;
  private workerFailed = false;
  private readonly fallback = new FlowScanner();
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(private readonly workerPath: string) {}

  async scan(root: string): Promise<FlowGraph> {
    return this.request({ type: 'scan', root });
  }

  async updateFile(filePath: string): Promise<FlowGraph> {
    return this.request({ type: 'update', filePath });
  }

  async removeFile(filePath: string): Promise<FlowGraph> {
    return this.request({ type: 'remove', filePath });
  }

  dispose(): void {
    void this.worker?.terminate();
    this.worker = undefined;
    this.rejectAll(new Error('scanner worker disposed'));
  }

  private async request(command: WorkerCommand): Promise<FlowGraph> {
    const worker = this.ensureWorker();
    if (!worker) {
      return this.runFallback(command);
    }
    try {
      return await this.postToWorker(worker, command);
    } catch {
      this.failWorker(new Error('scanner worker failed'));
      return this.runFallback(command);
    }
  }

  private postToWorker(worker: Worker, command: WorkerCommand): Promise<FlowGraph> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<FlowGraph>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ ...command, id });
    });
  }

  private ensureWorker(): Worker | undefined {
    if (this.workerFailed) {
      return undefined;
    }
    if (this.worker) {
      return this.worker;
    }
    try {
      const worker = new Worker(this.workerPath);
      worker.on('message', (message: WorkerResponse) => {
        const pending = this.pending.get(message.id);
        if (!pending) {
          return;
        }
        this.pending.delete(message.id);
        if ('graph' in message) {
          pending.resolve(message.graph);
        } else {
          pending.reject(new Error(message.error));
        }
      });
      worker.on('error', () => this.failWorker(new Error('scanner worker error')));
      worker.on('exit', () => this.failWorker(new Error('scanner worker exited')));
      this.worker = worker;
    } catch {
      this.workerFailed = true;
      this.worker = undefined;
    }
    return this.worker;
  }

  private failWorker(error: Error): void {
    this.worker = undefined;
    this.workerFailed = true;
    this.rejectAll(error);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private runFallback(command: WorkerCommand): FlowGraph {
    switch (command.type) {
      case 'scan':
        return this.fallback.scan(command.root);
      case 'update':
        return this.fallback.updateFile(command.filePath);
      case 'remove':
        return this.fallback.removeFile(command.filePath);
    }
  }
}
