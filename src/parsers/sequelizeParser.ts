import * as t from '@babel/types';
import { getStringValue, lineOf, parseCode, traverse } from './babelUtils';
import type { EntityInfo, SchemaParser } from '../shared/types';

function readStringProperty(expression: t.ObjectExpression, name: string): string | null {
  for (const property of expression.properties) {
    if (!t.isObjectProperty(property)) {
      continue;
    }
    const key = property.key;
    const matches = (t.isIdentifier(key) && key.name === name) || (t.isStringLiteral(key) && key.value === name);
    if (matches) {
      return getStringValue(property.value as t.Node);
    }
  }
  return null;
}

export const sequelizeParser: SchemaParser = {
  name: 'sequelize',
  detect(filePath, content) {
    if (!/\.[cm]?[jt]sx?$/.test(filePath)) {
      return false;
    }
    return /(sequelize|DataTypes)/.test(content) && /(\.define\s*\(|\.init\s*\(|extends\s+Model)/.test(content);
  },
  parse(filePath, content) {
    const ast = parseCode(content, filePath);
    const entities: EntityInfo[] = [];
    if (!ast) {
      return entities;
    }
    const push = (name: string | null, node: t.Node): void => {
      if (name) {
        entities.push({ name, filePath, line: lineOf(node), framework: 'sequelize' });
      }
    };
    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (!t.isMemberExpression(callee) || callee.computed || !t.isIdentifier(callee.property)) {
          return;
        }
        if (callee.property.name === 'define') {
          push(getStringValue(args[0]), path.node);
        } else if (callee.property.name === 'init' && args[1] && t.isObjectExpression(args[1])) {
          push(readStringProperty(args[1], 'modelName'), path.node);
        }
      },
      ClassDeclaration(path) {
        const { superClass, id } = path.node;
        if (!superClass || !id) {
          return;
        }
        const superName = t.isIdentifier(superClass)
          ? superClass.name
          : t.isMemberExpression(superClass) && t.isIdentifier(superClass.property)
            ? superClass.property.name
            : '';
        if (superName === 'Model') {
          push(id.name, path.node);
        }
      },
    });
    return entities;
  },
};
