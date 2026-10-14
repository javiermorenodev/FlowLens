# 🚀 Proyecto: FlowLens

## 🗺️ Visualización y Control de Flujo — El "Mapa Mental" del Fullstack

FlowLens es una extensión de IDE que genera un **mapa visual interactivo en tiempo real** (a través de un Webview) de toda la arquitectura de la aplicación. Elimina la fricción cognitiva al conectar el Frontend, el Backend y la Base de Datos, permitiendo rastrear flujos de datos completos: desde un componente o evento de interfaz en el Frontend, pasando por la llamada de red (API/Endpoints) en el Backend, hasta llegar a las consultas en la Base de Datos.

Este documento contiene la especificación inicial, arquitectura y roadmap del proyecto.

## 🖥️ Superficies soportadas

El **core es agnóstico al editor**. Toda la lógica de análisis (scanner + parsers + aggregator) vive en `src/core` y `src/parsers`, sin dependencias de VS Code.

| Superficie | Estado | Notas |
| --- | --- | --- |
| VS Code | Soporte oficial | Extensión nativa (`src/extension.ts`) |
| Antigravity | Compatible | Fork de VS Code: la misma extensión funciona |
| CLI | Futuro | Reutiliza el core para exportar el grafo (JSON/SVG/Mermaid) |
| Web viewer | Futuro lejano | Explora/comparte el grafo generado por el CLI |

---

## 🏗️ Arquitectura del Sistema

La extensión se divide en tres capas fundamentales que se comunican de forma bidireccional:

### 1. Extension Core (Node.js / TypeScript)
*   **File System Watcher:** Escucha de forma activa los cambios en el espacio de trabajo del usuario.
*   **AST Analyzer / Parser (@babel/parser, tree-sitter):** Procesa los archivos modificados para extraer árboles de sintaxis abstracta. Identifica componentes, llamadas `fetch/axios`, rutas de servidor y consultas ORM.
*   **Data Aggregator:** Consolida las dependencias descubiertas en un objeto JSON estructurado con `nodes` (componentes, rutas, tablas) y `edges` (conexiones/flujos).

### 2. Webview Panel (Frontend de la Extensión)
*   **Entorno:** Desarrollado en **React** para mantener un estado fluido y reactivo.
*   **Diseño:** Estilizado con **Tailwind CSS** o CSS con variables nativas (`var(--vscode-editor-background)`) para adaptarse al tema del editor.
*   **Lienzo Gráfico:** Implementado con **React Flow**. Permite zoom, arrastre, agrupación de nodos por capas (Front, API, Back, DB) y personalización estética de los bloques.

### 3. Canal de Comunicación (VS Code Message API)
*   Permite enviar el JSON de datos desde el Core hacia el Webview.
*   Permite al Webview notificar al Core cuando el usuario interactúa con el mapa (ej: clics, doble clics).

---

## 🛠️ Stack Tecnológico

*   **Lenguaje Base:** TypeScript.
*   **Análisis Estático de Código:** `@babel/parser`, `@babel/traverse` y `@babel/types`.
*   **Visualización en Webview:** React + React Flow.
*   **Empaquetado:** esbuild (extensión + webview en un solo paso).

---

## 🚀 Roadmap del MVP

### Fase 1: Prototipo Base e Infraestructura ✅
*   Proyecto base con esbuild (extensión + webview).
*   Webview con canal de mensajes bidireccional.
*   Lienzo con React Flow renderizando nodos.

### Fase 2: Escáner Backend (Mapeo de Rutas) ✅
*   Parser Express (`app.get`, `router.post`, `app.route`).
*   Parser NestJS (`@Controller`, `@Get`, `@Post`, ...).

### Fase 3: Escáner Frontend (Mapeo de Consumo) ✅
*   Parser JS/TS (`fetch`, `axios`, React Query `useQuery`/`useMutation`).
*   Parser Angular (`HttpClient`).
*   Parser Vue (extracción de SFC `<script>`).

### Fase 4: Interactividad e Hipervínculo (El "Efecto Lente")
*   `onNodeDoubleClick` / `onEdgeClick` en React Flow.
*   Mensaje al Core con archivo y línea exacta.
*   `vscode.window.showTextDocument` para abrir los archivos.
*   **Meta:** split view automático (Frontend a la izquierda, Backend a la derecha).

### Fase 5: Expansión de Capas
*   **Capa de Datos:** Prisma, Sequelize, Mongoose o SQL nativo.
*   **Telemetría en Vivo:** logs del entorno local para iluminar líneas en tiempo real.

---

## 💡 Notas de Implementación & Rendimiento

1.  **Evitar el lag del Hilo Principal:** El análisis de AST puede ser pesado. Correr el escaneo en segundo plano, usar caché de archivos no modificados y, de ser necesario, delegar a un *Worker Thread*.
2.  **Abstracción de Lenguajes:** Los parsers implementan una interfaz común (`BackendParser` / `FrontendParser`). Esto permite soportar Python (FastAPI/Django), Go o Rust sin alterar el Webview.
