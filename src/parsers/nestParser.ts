import * as t from '@babel/types';
import { decoratorCallName, getStringValue, lineOf, parseCode, traverse } from './babelUtils';
import type { BackendParser, RouteInfo } from '../shared/types';

const METHOD_DECORATORS = new Set(['Get', 'Post', 'Put', 'Delete', 'Patch', 'Options', 'Head', 'All']);

function joinPath(base: string, sub: string): string {
  const left = base.replace(/\/+$/, '');
  const right = sub.replace(/^\/+/, '');
  const joined = `${left}/${right}`;
  const collapsed = joined.replace(/\/+/g, '/');
  return collapsed === '' ? '/' : collapsed;
}

export const nestParser: BackendParser = {
  name: 'nestjs',
  detect(filePath, content) {
    if (!/\.[jt]s$/.test(filePath)) {
      return false;
    }
    return /@Controller\s*\(/.test(content) && /@(Get|Post|Put|Delete|Patch|Options|Head|All)\s*\(/.test(content);
  },
  parse(filePath, content) {
    const ast = parseCode(content, filePath);
    const routes: RouteInfo[] = [];
    if (!ast) {
      return routes;
    }
    traverse(ast, {
      ClassDeclaration(classPath) {
        const decorators = classPath.node.decorators ?? [];
        const controllerDecorator = decorators.find((decorator) => decoratorCallName(decorator) === 'Controller');
        if (!controllerDecorator || !t.isCallExpression(controllerDecorator.expression)) {
          return;
        }
        const basePath = getStringValue(controllerDecorator.expression.arguments[0]) ?? '';
        for (const member of classPath.node.body.body) {
          const memberDecorators = 'decorators' in member ? member.decorators : null;
          if (!memberDecorators) {
            continue;
          }
          const methodDecorator = memberDecorators.find((decorator) => {
            const name = decoratorCallName(decorator);
            return name !== null && METHOD_DECORATORS.has(name);
          });
          if (!methodDecorator) {
            continue;
          }
          const methodName = decoratorCallName(methodDecorator);
          if (!methodName || !t.isCallExpression(methodDecorator.expression)) {
            continue;
          }
          const subPath = getStringValue(methodDecorator.expression.arguments[0]) ?? '';
          routes.push({
            method: methodName.toUpperCase(),
            path: joinPath(basePath, subPath),
            filePath,
            line: lineOf(member),
            framework: 'nestjs',
          });
        }
      },
    });
    return routes;
  },
};
