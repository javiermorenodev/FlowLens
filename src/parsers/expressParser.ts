import * as t from '@babel/types';
import { getStringValue, lineOf, parseCode, traverse } from './babelUtils';
import type { BackendParser, RouteInfo } from '../shared/types';

const ROUTE_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'all', 'options', 'head']);
const NON_ROUTE_OBJECTS = new Set([
  'map',
  'weakmap',
  'cache',
  'store',
  'config',
  'params',
  'headers',
  'cookies',
  'session',
  'storage',
  'state',
  'registry',
  'pool',
  'queue',
  'metrics',
  'stats',
  'data',
  'result',
  'options',
  'env',
  'i18n',
]);

function objectName(expression: t.Expression | t.Super): string {
  if (t.isIdentifier(expression)) {
    return expression.name;
  }
  if (t.isMemberExpression(expression)) {
    if (t.isIdentifier(expression.property)) {
      return expression.property.name;
    }
    if (t.isIdentifier(expression.object)) {
      return expression.object.name;
    }
  }
  return '';
}

function isRouteTarget(name: string): boolean {
  const lower = name.toLowerCase();
  if (!name) {
    return false;
  }
  if (NON_ROUTE_OBJECTS.has(lower)) {
    return false;
  }
  if (/(?:Map|Cache|Store|Registry|Dict)$/.test(name)) {
    return false;
  }
  return true;
}

export const expressParser: BackendParser = {
  name: 'express',
  detect(filePath, content) {
    if (!/\.[cm]?[jt]sx?$/.test(filePath)) {
      return false;
    }
    return /\.\s*(get|post|put|delete|patch|all|route|use)\s*\(/.test(content) && /(express|router|Router|server|app\b)/.test(content);
  },
  parse(filePath, content) {
    const ast = parseCode(content, filePath);
    const routes: RouteInfo[] = [];
    if (!ast) {
      return routes;
    }
    traverse(ast, {
      CallExpression(path) {
        const { callee, arguments: args } = path.node;
        if (args.length === 0) {
          return;
        }
        if (!t.isMemberExpression(callee) || callee.computed || !t.isIdentifier(callee.property)) {
          return;
        }
        const method = callee.property.name;
        if (!ROUTE_METHODS.has(method)) {
          return;
        }
        const target = objectName(callee.object);
        if (!isRouteTarget(target)) {
          return;
        }
        const routePath = getStringValue(args[0]);
        if (!routePath) {
          return;
        }
        routes.push({
          method: method.toUpperCase(),
          path: routePath,
          filePath,
          line: lineOf(path.node),
          framework: 'express',
        });
      },
    });
    return routes;
  },
};
