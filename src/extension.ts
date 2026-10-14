import * as path from 'node:path';
import * as vscode from 'vscode';
import { ScannerManager } from './core/manager';
import { mergeGraphs } from './core/aggregator';
import type { CoreToWebview, OpenTarget, WebviewToCore } from './shared/messages';

const CODE_FILE = /\.(?:[cm]?[jt]sx?|vue|prisma|sql)$/;

export function activate(context: vscode.ExtensionContext): void {
  const scanner = new ScannerManager(path.join(context.extensionPath, 'dist', 'core', 'scanner-worker.js'));
  let panel: vscode.WebviewPanel | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const post = (message: CoreToWebview): void => {
    void panel?.webview.postMessage(message);
  };

  const publish = async (): Promise<void> => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      post({ type: 'error', message: 'Abre una carpeta de proyecto para visualizar el flujo.' });
      return;
    }
    try {
      const graphs = await Promise.all(folders.map((folder) => scanner.scan(folder.uri.fsPath)));
      post({ type: 'graph', payload: graphs.length === 1 ? graphs[0] : mergeGraphs(graphs) });
    } catch (error) {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const schedulePublish = (filePath: string, removed = false): void => {
    if (debounce) {
      clearTimeout(debounce);
    }
    debounce = setTimeout(() => {
      if (!panel) {
        return;
      }
      void (removed ? scanner.removeFile(filePath) : scanner.updateFile(filePath)).then(publish).catch(() => publish());
    }, 400);
  };

  const prioritizeFocusedFile = (editor: vscode.TextEditor | undefined): void => {
    const filePath = editor?.document.uri.scheme === 'file' ? editor.document.uri.fsPath : undefined;
    if (!filePath || !CODE_FILE.test(filePath)) {
      return;
    }
    void scanner.updateFile(filePath).then(publish).catch(() => undefined);
  };

  const revealLocation = async (target: OpenTarget, viewColumn: vscode.ViewColumn): Promise<void> => {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(target.filePath));
    const editor = await vscode.window.showTextDocument(document, {
      viewColumn,
      preview: false,
      preserveFocus: true,
    });
    const position = new vscode.Position(Math.max(0, target.line - 1), 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  };

  const openPair = async (primary: OpenTarget, secondary: OpenTarget): Promise<void> => {
    await revealLocation(primary, vscode.ViewColumn.One);
    await revealLocation(secondary, vscode.ViewColumn.Two);
    panel?.reveal(vscode.ViewColumn.Three, true);
  };

  const exportGraph = async (format: 'png' | 'svg', dataUrl: string): Promise<void> => {
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      void vscode.window.showErrorMessage('FlowLens: no se pudo generar la imagen.');
      return;
    }
    const folder = vscode.workspace.workspaceFolders?.[0];
    const defaultUri = folder
      ? vscode.Uri.joinPath(folder.uri, `flowlens-graph.${format}`)
      : vscode.Uri.file(`flowlens-graph.${format}`);
    const target = await vscode.window.showSaveDialog({
      defaultUri,
      filters: format === 'png' ? { PNG: ['png'] } : { SVG: ['svg'] },
    });
    if (!target) {
      return;
    }
    await vscode.workspace.fs.writeFile(target, Buffer.from(base64, 'base64'));
    void vscode.window.showInformationMessage(`FlowLens: grafo exportado a ${target.fsPath}`);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('flowlens.open', () => {
      if (panel) {
        panel.reveal();
        publish();
        return;
      }
      panel = vscode.window.createWebviewPanel(
        'flowlens',
        'FlowLens',
        { viewColumn: vscode.ViewColumn.Two, preserveFocus: false },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
        },
      );
      panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri);
      panel.webview.onDidReceiveMessage((message: WebviewToCore) => {
        switch (message.type) {
          case 'ready':
          case 'refresh':
            void publish();
            break;
          case 'openFile':
            void revealLocation(message, vscode.ViewColumn.One);
            break;
          case 'openPair':
            void openPair(message.primary, message.secondary);
            break;
          case 'export':
            void exportGraph(message.format, message.dataUrl);
            break;
        }
      });
      panel.onDidDispose(() => {
        panel = undefined;
      });
    }),
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{js,cjs,mjs,jsx,ts,tsx,vue,prisma,sql}');
  watcher.onDidChange((uri) => {
    if (uri.scheme === 'file') {
      schedulePublish(uri.fsPath);
    }
  });
  watcher.onDidCreate((uri) => {
    if (uri.scheme === 'file') {
      schedulePublish(uri.fsPath);
    }
  });
  watcher.onDidDelete((uri) => {
    if (uri.scheme === 'file') {
      schedulePublish(uri.fsPath, true);
    }
  });
  context.subscriptions.push(watcher);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => prioritizeFocusedFile(editor)),
  );

  context.subscriptions.push({ dispose: () => scanner.dispose() });
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let value = '';
  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'index.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'index.css'));
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>FlowLens</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
}
