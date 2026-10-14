import * as vscode from 'vscode';
import { FlowScanner } from './core/scanner';
import type { CoreToWebview, OpenTarget, WebviewToCore } from './shared/messages';

export function activate(context: vscode.ExtensionContext): void {
  const scanner = new FlowScanner();
  let panel: vscode.WebviewPanel | undefined;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  const post = (message: CoreToWebview): void => {
    void panel?.webview.postMessage(message);
  };

  const publish = (): void => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      post({ type: 'error', message: 'Abre una carpeta de proyecto para visualizar el flujo.' });
      return;
    }
    try {
      post({ type: 'graph', payload: scanner.scan(folder.uri.fsPath) });
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
      if (removed) {
        scanner.removeFile(filePath);
      } else {
        scanner.updateFile(filePath);
      }
      publish();
    }, 400);
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
            publish();
            break;
          case 'openFile':
            void revealLocation(message, vscode.ViewColumn.One);
            break;
          case 'openPair':
            void openPair(message.primary, message.secondary);
            break;
        }
      });
      panel.onDidDispose(() => {
        panel = undefined;
      });
    }),
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{js,cjs,mjs,jsx,ts,tsx,vue}');
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
