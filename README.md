# FlowLens

> El mapa mental visual de tu fullstack. Rastrea el flujo de datos desde un componente de UI hasta la base de datos, dentro de tu editor.

FlowLens analiza tu proyecto en tiempo real y dibuja un **grafo interactivo** que conecta el Frontend, los Endpoints del Backend y (próximamente) las tablas de la base de datos. Abre un Webview dentro del editor, hace zoom, arrastra y con doble clic salta al código exacto.

## ✨ Características

- **Detección automática** de rutas backend y llamadas de red frontend.
- **Grafo interactivo** (React Flow) agrupado por capas: Frontend → API → Backend.
- **Doble clic** en un nodo para abrir el archivo y la línea exacta.
- **Actualización en vivo** con File System Watcher y caché incremental.
- **Tema del editor**: usa las variables de color nativas de VS Code/Antigravity.

## 🧩 Frameworks soportados

| Capa | Framework | Estado |
| --- | --- | --- |
| Backend | Express | ✅ |
| Backend | NestJS | ✅ |
| Frontend | React (fetch / axios / React Query) | ✅ |
| Frontend | Vue (SFC) | ✅ |
| Frontend | Angular (HttpClient) | ✅ |
| Datos | Prisma / Sequelize / Mongoose / SQL | 🚧 Roadmap |

## 🖥️ Superficies

El core es **agnóstico al editor** (`src/core`, `src/parsers`). Funciona en:

- **Visual Studio Code**
- **Antigravity** (fork de VS Code)
- **CLI** (roadmap): reutiliza el core para exportar el grafo a JSON/SVG.

## 🚀 Desarrollo

Requisitos: Node.js 18+ y VS Code 1.85+.

```bash
npm install
npm run build
```

Para depurar la extensión: abre el proyecto en VS Code y pulsa `F5` (*Run Extension*). En la ventana de desarrollo, ejecuta el comando **FlowLens: Abrir Mapa de Flujo** desde la paleta (`Cmd/Ctrl+Shift+P`).

### Scripts

| Script | Descripción |
| --- | --- |
| `npm run build` | Compila extensión + webview con esbuild. |
| `npm run watch` | Build en modo observación. |
| `npm run check` | Type-check sin emitir. |
| `npm run scan <ruta>` | Escanea un proyecto y vuelca el grafo como JSON (útil para depurar parsers). |

### Estructura

```
src/
  extension.ts        # Punto de entrada de la extensión (VS Code API)
  core/               # Scanner + Aggregator (agnóstico al editor)
  parsers/            # Parsers de frameworks (BackendParser / FrontendParser)
  shared/             # Tipos y mensajes compartidos core <-> webview
  webview/            # UI React + React Flow
  cli/                # CLI de escaneo/export
fixtures/demo-app/    # Proyecto multi-framework para pruebas
```

## 📚 Documentación

- [Especificación y arquitectura](docs/SPEC.md)

## 🤝 Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md). Buscamos contribuciones en parsers nuevos, rendimiento y UX del grafo. Los issues con `good first issue` son un buen punto de partida.

## 📄 Licencia

[MIT](LICENSE)
