import { parse, type ParserOptions } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';

const PLUGINS: ParserOptions['plugins'] = ['typescript', 'jsx', 'decorators-legacy', 'classProperties', 'classPrivateProperties', 'classPrivateMethods'];

export { traverse };

export function parseCode(code: string, filename: string): t.File | null {
  try {
    return parse(code, {
      sourceType: 'module',
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      sourceFilename: filename,
      plugins: PLUGINS,
    });
  } catch {
    return null;
  }
}

export function getStringValue(node: t.Node | null | undefined): string | null {
  if (!node) {
    return null;
  }
  if (t.isStringLiteral(node) || t.isNumericLiteral(node)) {
    return String(node.value);
  }
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('');
  }
  return null;
}

export function decoratorCallName(decorator: t.Decorator): string | null {
  const expression = decorator.expression;
  if (t.isCallExpression(expression) && t.isIdentifier(expression.callee)) {
    return expression.callee.name;
  }
  if (t.isIdentifier(expression)) {
    return expression.name;
  }
  return null;
}

export function lineOf(node: t.Node): number {
  return node.loc?.start.line ?? 0;
}

export function extractVueScript(content: string): { code: string; offset: number } | null {
  const match = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/.exec(content);
  if (!match || match.index === undefined) {
    return null;
  }
  const openTagEnd = content.indexOf('>', match.index);
  const offset = content.slice(0, openTagEnd + 1).split('\n').length - 1;
  return { code: match[1], offset };
}
