import type { EntityInfo, SchemaParser } from '../shared/types';

const MODEL_DECL = /^\s*(?:model|view)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/;

export const prismaParser: SchemaParser = {
  name: 'prisma',
  detect(filePath, content) {
    if (filePath.endsWith('.prisma')) {
      return true;
    }
    return /^\s*datasource\s+\w+\s*\{/m.test(content) && /^\s*model\s+\w+\s*\{/m.test(content);
  },
  parse(filePath, content) {
    const entities: EntityInfo[] = [];
    content.split(/\r?\n/).forEach((line, index) => {
      const match = MODEL_DECL.exec(line);
      if (match) {
        entities.push({ name: match[1], filePath, line: index + 1, framework: 'prisma' });
      }
    });
    return entities;
  },
};
