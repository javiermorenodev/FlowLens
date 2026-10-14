import type { EntityInfo, SchemaParser } from '../shared/types';

const CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?["`[]?([A-Za-z_][A-Za-z0-9_.]*)["`\]]?/gi;

export const sqlParser: SchemaParser = {
  name: 'sql',
  detect(filePath, content) {
    if (filePath.endsWith('.sql')) {
      return true;
    }
    return /create\s+table\s+/i.test(content);
  },
  parse(filePath, content) {
    const entities: EntityInfo[] = [];
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      CREATE_TABLE.lastIndex = 0;
      let match = CREATE_TABLE.exec(line);
      while (match) {
        const raw = match[1];
        const name = raw.includes('.') ? raw.slice(raw.lastIndexOf('.') + 1) : raw;
        entities.push({ name, filePath, line: index + 1, framework: 'sql' });
        match = CREATE_TABLE.exec(line);
      }
    });
    return entities;
  },
};
