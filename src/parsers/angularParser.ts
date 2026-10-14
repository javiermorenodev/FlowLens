import * as t from '@babel/types';
import { getStringValue, lineOf, parseCode, traverse } from './babelUtils';
import type { CallInfo, FrontendParser } from '../shared/types';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'request']);

function isHttpClient(expression: t.Expression | t.Super): boolean {
  if (t.isIdentifier(expression) && /^http/i.test(expression.name)) {
    return true;
  }
  if (t.isMemberExpression(expression) && !expression.computed && t.isIdentifier(expression.property)) {
    return /^http/i.test(expression.property.name);
  }
  return false;
}

export const angularParser: FrontendParser = {
  name: 'angular',
  detect(filePath, content) {
    if (!/\.[jt]s$/.test(filePath)) {
      return false;
    }
    return /HttpClient/.test(content) && /\.\s*(get|post|put|delete|patch|request)\s*[(<]/.test(content);
  },
  parse(filePath, content) {
    const ast = parseCode(content, filePath);
    const calls: CallInfo[] = [];
    if (!ast) {
      return calls;
    }
    traverse(ast, {
      CallExpression(callPath) {
        const { callee, arguments: args } = callPath.node;
        if (!t.isMemberExpression(callee) || callee.computed || !t.isIdentifier(callee.property)) {
          return;
        }
        const method = callee.property.name;
        if (!HTTP_METHODS.has(method)) {
          return;
        }
        if (!isHttpClient(callee.object)) {
          return;
        }
        if (method === 'request' && args[0] && t.isObjectExpression(args[0])) {
          let url: string | null = null;
          let requestMethod = 'GET';
          for (const property of args[0].properties) {
            if (!t.isObjectProperty(property) || !t.isIdentifier(property.key)) {
              continue;
            }
            if (property.key.name === 'url') {
              url = getStringValue(property.value);
            }
            if (property.key.name === 'method' && t.isStringLiteral(property.value)) {
              requestMethod = property.value.value;
            }
          }
          if (url) {
            calls.push({ method: requestMethod.toUpperCase(), path: url, filePath, line: lineOf(callPath.node), framework: 'angular' });
          }
          return;
        }
        const url = getStringValue(args[0]);
        if (url) {
          calls.push({ method: method.toUpperCase(), path: url, filePath, line: lineOf(callPath.node), framework: 'angular' });
        }
      },
    });
    return calls;
  },
};
