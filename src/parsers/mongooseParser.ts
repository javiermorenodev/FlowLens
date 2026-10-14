import * as t from '@babel/types';
import { getStringValue, lineOf, parseCode, traverse } from './babelUtils';
import type { EntityInfo, SchemaParser } from '../shared/types';

export const mongooseParser: SchemaParser = {
  name: 'mongoose',
  detect(filePath, content) {
    if (!/\.[cm]?[jt]sx?$/.test(filePath)) {
      return false;
    }
    return /mongoose/.test(content) && /\.model\s*\(/.test(content);
  },
  parse(filePath, content) {
    const ast = parseCode(content, filePath);
    const entities: EntityInfo[] = [];
    if (!ast) {
      return entities;
    }
    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!t.isMemberExpression(callee) || callee.computed || !t.isIdentifier(callee.property)) {
          return;
        }
        if (callee.property.name !== 'model') {
          return;
        }
        const name = getStringValue(args[0]);
        if (name) {
          entities.push({ name, filePath, line: lineOf(path.node), framework: 'mongoose' });
        }
      },
    });
    return entities;
  },
};
