import * as t from '@babel/types';
import { extractVueScript, getPathPattern, getStringValue, lineOf, parseCode, traverse } from './babelUtils';
import type { CallInfo, FrontendParser } from '../shared/types';

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'head', 'options']);
const QUERY_HOOKS = new Set(['useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery']);

function readProperty(expression: t.ObjectExpression, name: string): t.Node | null {
  for (const property of expression.properties) {
    if (!t.isObjectProperty(property)) {
      continue;
    }
    const key = property.key;
    const matches = (t.isIdentifier(key) && key.name === name) || (t.isStringLiteral(key) && key.value === name);
    if (matches && (t.isExpression(property.value) || t.isPatternLike(property.value))) {
      return property.value;
    }
  }
  return null;
}

function isAxiosCreate(init: t.Node): init is t.CallExpression {
  if (!t.isCallExpression(init)) {
    return false;
  }
  const callee = init.callee;
  return (
    t.isMemberExpression(callee) &&
    !callee.computed &&
    t.isIdentifier(callee.object) &&
    callee.object.name === 'axios' &&
    t.isIdentifier(callee.property) &&
    callee.property.name === 'create'
  );
}

function joinUrl(base: string, url: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url) || url.startsWith('//')) {
    return url;
  }
  const left = base.replace(/\/+$/, '');
  const right = url.replace(/^\/+/, '');
  const joined = `${left}/${right}`;
  return joined.startsWith('/') ? joined : `/${joined}`;
}

function collectBaseUrls(ast: t.File): Map<string, string> {
  const map = new Map<string, string>();
  traverse(ast, {
    VariableDeclarator(nodePath) {
      const { id, init } = nodePath.node;
      if (!t.isIdentifier(id) || !init || !isAxiosCreate(init)) {
        return;
      }
      const options = init.arguments[0];
      if (!options || !t.isObjectExpression(options)) {
        return;
      }
      const base = getStringValue(readProperty(options, 'baseURL'));
      if (base) {
        map.set(id.name, base);
      }
    },
  });
  return map;
}

export const jsHttpParser: FrontendParser = {
  name: 'js-http',
  detect(filePath, content) {
    if (filePath.endsWith('.vue')) {
      return /<script/.test(content) && /(fetch\s*\(|axios|\buse(Query|Mutation|InfiniteQuery|SuspenseQuery)\s*\()/.test(content);
    }
    if (!/\.[cm]?[jt]sx?$/.test(filePath)) {
      return false;
    }
    return /(fetch\s*\(|axios\s*[.(]|\buse(Query|Mutation|InfiniteQuery|SuspenseQuery)\s*\()/.test(content);
  },
  parse(filePath, content) {
    let code = content;
    let lineOffset = 0;
    if (filePath.endsWith('.vue')) {
      const script = extractVueScript(content);
      if (!script) {
        return [];
      }
      code = script.code;
      lineOffset = script.offset;
    }

    const ast = parseCode(code, filePath);
    const calls: CallInfo[] = [];
    if (!ast) {
      return calls;
    }

    const baseUrls = collectBaseUrls(ast);

    const push = (method: string, rawPath: string | null, node: t.Node, framework = 'js-http') => {
      if (!rawPath) {
        return;
      }
      calls.push({
        method: method.toUpperCase(),
        path: rawPath,
        filePath,
        line: lineOf(node) + lineOffset,
        framework,
      });
    };

    const readFetchMethod = (options: t.Node | null): string => {
      if (options && t.isObjectExpression(options)) {
        const method = readProperty(options, 'method');
        return getStringValue(method) ?? 'GET';
      }
      return 'GET';
    };

    traverse(ast, {
      CallExpression(callPath) {
        const { callee, arguments: args } = callPath.node;

        if (t.isIdentifier(callee) && callee.name === 'fetch' && args[0]) {
          push(readFetchMethod(args[1] ?? null), getPathPattern(args[0]), callPath.node);
          return;
        }

        if (
          t.isMemberExpression(callee) &&
          !callee.computed &&
          t.isIdentifier(callee.object) &&
          callee.object.name === 'axios' &&
          t.isIdentifier(callee.property)
        ) {
          const method = callee.property.name;
          if (method === 'request' && args[0] && t.isObjectExpression(args[0])) {
            push(
              getStringValue(readProperty(args[0], 'method')) ?? 'GET',
              getPathPattern(readProperty(args[0], 'url')),
              callPath.node,
            );
            return;
          }
          if (HTTP_METHODS.has(method)) {
            push(method, getPathPattern(args[0]), callPath.node);
          }
          return;
        }

        if (
          t.isMemberExpression(callee) &&
          !callee.computed &&
          t.isIdentifier(callee.object) &&
          t.isIdentifier(callee.property)
        ) {
          const base = baseUrls.get(callee.object.name);
          if (base && HTTP_METHODS.has(callee.property.name)) {
            const url = getPathPattern(args[0]);
            push(callee.property.name, url ? joinUrl(base, url) : null, callPath.node);
            return;
          }
        }

        if (t.isIdentifier(callee) && callee.name === 'axios' && args[0]) {
          if (t.isObjectExpression(args[0])) {
            push(
              getStringValue(readProperty(args[0], 'method')) ?? 'GET',
              getPathPattern(readProperty(args[0], 'url')),
              callPath.node,
            );
            return;
          }
          const method = args[1] && t.isObjectExpression(args[1]) ? getStringValue(readProperty(args[1], 'method')) ?? 'GET' : 'GET';
          push(method, getPathPattern(args[0]), callPath.node);
          return;
        }

        if (t.isIdentifier(callee) && QUERY_HOOKS.has(callee.name) && args[0] && t.isObjectExpression(args[0])) {
          callPath.traverse({
            CallExpression(inner) {
              const node = inner.node;
              const innerCallee = node.callee;
              if (t.isIdentifier(innerCallee) && innerCallee.name === 'fetch' && node.arguments[0]) {
                push(readFetchMethod(node.arguments[1] ?? null), getPathPattern(node.arguments[0]), node, 'react-query');
                return;
              }
              if (
                t.isMemberExpression(innerCallee) &&
                t.isIdentifier(innerCallee.object) &&
                t.isIdentifier(innerCallee.property) &&
                HTTP_METHODS.has(innerCallee.property.name)
              ) {
                const objectName = innerCallee.object.name;
                const innerBase = objectName === 'axios' ? undefined : baseUrls.get(objectName);
                if (objectName !== 'axios' && !innerBase) {
                  return;
                }
                const url = getPathPattern(node.arguments[0]);
                push(
                  innerCallee.property.name,
                  url ? (innerBase ? joinUrl(innerBase, url) : url) : null,
                  node,
                  'react-query',
                );
              }
            },
          });
        }
      },
    });

    return calls;
  },
};
