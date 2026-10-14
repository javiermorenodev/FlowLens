import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const extensionOptions = {
  entryPoints: ['src/extension.ts', 'src/cli/scan.ts'],
  outbase: 'src',
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  external: ['vscode'],
  sourcemap: true,
  logLevel: 'info',
};

const webviewOptions = {
  entryPoints: ['src/webview/index.tsx'],
  outdir: 'dist/webview',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',
  sourcemap: true,
  logLevel: 'info',
};

if (watch) {
  const extensionCtx = await esbuild.context(extensionOptions);
  const webviewCtx = await esbuild.context(webviewOptions);
  await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
  console.log('[esbuild] watching...');
} else {
  await Promise.all([esbuild.build(extensionOptions), esbuild.build(webviewOptions)]);
  console.log('[esbuild] build complete');
}
