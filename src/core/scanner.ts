import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildGraph } from './aggregator';
import { expressParser } from '../parsers/expressParser';
import { nestParser } from '../parsers/nestParser';
import { jsHttpParser } from '../parsers/jsHttpParser';
import { angularParser } from '../parsers/angularParser';
import { prismaParser } from '../parsers/prismaParser';
import { sequelizeParser } from '../parsers/sequelizeParser';
import { mongooseParser } from '../parsers/mongooseParser';
import { sqlParser } from '../parsers/sqlParser';
import type { BackendParser, CallInfo, EntityInfo, FlowGraph, FrontendParser, RouteInfo, SchemaParser } from '../shared/types';

const BACKEND_PARSERS: BackendParser[] = [expressParser, nestParser];
const FRONTEND_PARSERS: FrontendParser[] = [jsHttpParser, angularParser];
const SCHEMA_PARSERS: SchemaParser[] = [prismaParser, sequelizeParser, mongooseParser, sqlParser];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', '.git', '.next', 'coverage', '.cache', 'vendor', '.turbo', '.output']);
const CODE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx', '.vue', '.prisma', '.sql']);

interface CacheEntry {
  routes: RouteInfo[];
  calls: CallInfo[];
  entities: EntityInfo[];
}

export class FlowScanner {
  private readonly cache = new Map<string, CacheEntry>();

  scan(root: string): FlowGraph {
    const files = this.collectFiles(root);
    const seen = new Set(files);
    for (const file of files) {
      if (!this.cache.has(file)) {
        this.cache.set(file, this.readFile(file));
      }
    }
    for (const key of [...this.cache.keys()]) {
      if (!seen.has(key)) {
        this.cache.delete(key);
      }
    }
    return this.graph();
  }

  updateFile(filePath: string): FlowGraph {
    if (CODE_EXTENSIONS.has(path.extname(filePath))) {
      this.cache.set(filePath, this.readFile(filePath));
    }
    return this.graph();
  }

  removeFile(filePath: string): FlowGraph {
    this.cache.delete(filePath);
    return this.graph();
  }

  private graph(): FlowGraph {
    const routes: RouteInfo[] = [];
    const calls: CallInfo[] = [];
    const entities: EntityInfo[] = [];
    for (const entry of this.cache.values()) {
      routes.push(...entry.routes);
      calls.push(...entry.calls);
      entities.push(...entry.entities);
    }
    return buildGraph(routes, calls, this.cache.size, entities);
  }

  private readFile(filePath: string): CacheEntry {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return this.parseFile(filePath, content);
    } catch {
      return { routes: [], calls: [], entities: [] };
    }
  }

  private parseFile(filePath: string, content: string): CacheEntry {
    const routes: RouteInfo[] = [];
    const calls: CallInfo[] = [];
    const entities: EntityInfo[] = [];
    for (const parser of BACKEND_PARSERS) {
      if (parser.detect(filePath, content)) {
        routes.push(...parser.parse(filePath, content));
      }
    }
    for (const parser of FRONTEND_PARSERS) {
      if (parser.detect(filePath, content)) {
        calls.push(...parser.parse(filePath, content));
      }
    }
    for (const parser of SCHEMA_PARSERS) {
      if (parser.detect(filePath, content)) {
        entities.push(...parser.parse(filePath, content));
      }
    }
    return { routes, calls, entities };
  }

  private collectFiles(root: string): string[] {
    const files: string[] = [];
    const walk = (dir: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.')) {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            walk(full);
          }
        } else if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
          files.push(full);
        }
      }
    };
    walk(root);
    return files;
  }
}
