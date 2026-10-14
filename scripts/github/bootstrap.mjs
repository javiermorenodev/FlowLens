#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const repoArg = process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1]);
const reset = process.argv.includes('--reset');

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runGh(args, input, attempts) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const stdio = input === undefined ? ['ignore', 'pipe', 'inherit'] : ['pipe', 'pipe', 'inherit'];
      return execFileSync('gh', args, { input, encoding: 'utf8', stdio }).trim();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const wait = 1500 * attempt;
        console.log(`  ! error transitorio, reintento ${attempt}/${attempts - 1} en ${wait}ms`);
        sleepSync(wait);
      }
    }
  }
  console.error(`\n✗ Falló: gh ${args.join(' ')}`);
  throw lastError;
}

function gh(args, input) {
  return runGh(args, input, 1);
}

function ghRetry(args, input) {
  return runGh(args, input, 6);
}

const LABELS = [
  ['type: feature', '0e8a16', 'Nueva funcionalidad'],
  ['type: bug', 'd73a4a', 'Algo no funciona'],
  ['type: chore', 'c2e0c6', 'Mantenimiento, infraestructura'],
  ['type: docs', '0075ca', 'Documentación'],
  ['type: refactor', 'fbca04', 'Reestructuración sin cambio de comportamiento'],
  ['type: test', '5319e7', 'Pruebas automatizadas'],
  ['type: perf', 'b60205', 'Rendimiento'],
  ['area: core', '1d76db', 'Scanner, aggregator, watcher'],
  ['area: parser', '0052cc', 'Parsers de frameworks'],
  ['area: webview', '5319e7', 'UI del grafo (React Flow)'],
  ['area: extension-core', '1d76db', 'Integración con la API del editor'],
  ['area: ci', 'bfd4f2', 'Integración continua'],
  ['area: dx', 'bfd4f2', 'Experiencia de desarrollo y empaquetado'],
  ['area: docs', '0075ca', 'Documentación y guías'],
  ['area: test', '5319e7', 'Pruebas y cobertura'],
  ['framework: express', 'ededed', 'Express'],
  ['framework: nestjs', 'ededed', 'NestJS'],
  ['framework: react', 'ededed', 'React / React Query'],
  ['framework: vue', 'ededed', 'Vue'],
  ['framework: angular', 'ededed', 'Angular'],
  ['framework: data', 'ededed', 'Capa de datos (ORM/SQL)'],
  ['priority: P0', 'b60205', 'Crítico, bloquea'],
  ['priority: P1', 'd93f0b', 'Alto'],
  ['priority: P2', 'fbca04', 'Medio'],
  ['priority: P3', 'c2e0c6', 'Bajo'],
  ['size: S', 'd4c5f9', 'Menos de medio día'],
  ['size: M', 'c5def5', 'Un día'],
  ['size: L', 'bfd4f2', 'Varios días'],
  ['good first issue', '7057ff', 'Ideal para empezar a contribuir'],
  ['help wanted', '008672', 'Se agradece ayuda externa'],
];

const MILESTONES = [
  ['v0.1 — MVP IDE', 'Fases 1-3: infraestructura, escáner backend y frontend multi-framework.'],
  ['v0.2 — Interactividad', 'Fase 4: navegación, filtros y experiencia del grafo.'],
  ['v0.3 — Capa de datos', 'Fase 5: ORM y SQL, del endpoint a la tabla.'],
  ['v0.4 — Rendimiento', 'Escaneo en segundo plano, cache y monorepos.'],
  ['v1.0 — Marketplace & DX', 'Publicación, docs, tests e internacionalización.'],
];

const DONE_NOTE = 'Implementado en el scaffolding inicial (commit fundacional). Se cierra para mantener el backlog limpio; reabrir si hace falta.';

const BACKLOG = [
  {
    title: 'Configurar proyecto base con esbuild (extensión + webview)',
    labels: ['area: core', 'type: chore', 'size: M', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Configurar build con esbuild para dos targets (extensión Node CJS y webview browser IIFE), tsconfig estricto y scripts de desarrollo.\n\n**Criterios**\n- `npm run build`, `npm run watch` y `npm run check` funcionan.\n- F5 lanza el Extension Development Host.',
  },
  {
    title: 'Webview panel con canal de mensajes bidireccional',
    labels: ['area: webview', 'type: feature', 'size: L', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Crear el Webview con CSP con nonce, inyección de scripts/estilos y paso de mensajes core ↔ webview (`ready`, `graph`, `openFile`, `refresh`, `error`).',
  },
  {
    title: 'Lienzo React Flow con nodos y tema del editor',
    labels: ['area: webview', 'type: feature', 'size: L', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Renderizar el grafo con React Flow, nodos por capa (Frontend → API), aristas animadas, controles y colores basados en variables del tema.',
  },
  {
    title: 'File System Watcher con debounce y caché incremental',
    labels: ['area: core', 'type: feature', 'size: M', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Escuchar cambios/altas/bajas de archivos, reescanear solo lo afectado y republicar el grafo sin bloquear.',
  },
  {
    title: 'Parser Express (rutas)',
    labels: ['area: parser', 'framework: express', 'type: feature', 'size: M', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Detectar `app.get/post/put/delete/patch/all`, `router.*` y `app.route(...)`, con heurística para evitar falsos positivos (`Map.get`, etc.).',
  },
  {
    title: 'Parser NestJS (decoradores @Controller/@Get)',
    labels: ['area: parser', 'framework: nestjs', 'type: feature', 'size: M', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Extraer la ruta base del `@Controller` y combinar con los decoradores de método (`@Get`, `@Post`, ...).',
  },
  {
    title: 'Parser JS/TS: fetch, axios y React Query',
    labels: ['area: parser', 'framework: react', 'type: feature', 'size: M', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Detectar `fetch(url, {method})`, `axios[.method](url)`, `axios({url, method})` y llamadas dentro de `useQuery`/`useMutation`.',
  },
  {
    title: 'Parser Angular (HttpClient)',
    labels: ['area: parser', 'framework: angular', 'type: feature', 'size: M', 'priority: P1'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Detectar `this.http.get/post/...` y `request({url, method})`.',
  },
  {
    title: 'Parser Vue (SFC)',
    labels: ['area: parser', 'framework: vue', 'type: feature', 'size: M', 'priority: P1'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Extraer el bloque `<script>`/`<script setup>` de los `.vue` y aplicar el parser JS/TS, ajustando el offset de líneas.',
  },
  {
    title: 'Aggregator: matching de rutas con parámetros',
    labels: ['area: core', 'type: feature', 'size: M', 'priority: P0'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: 'Normalizar rutas y emparejar llamadas con rutas usando segmentos con parámetros (`:id`), prefijo y sufijo (soporte de `baseURL`).',
  },
  {
    title: 'CLI de escaneo para depurar parsers',
    labels: ['area: dx', 'type: chore', 'size: S', 'priority: P2'],
    milestone: 'v0.1 — MVP IDE',
    done: true,
    body: '`npm run scan <ruta>` que vuelca el grafo a JSON. Base para el futuro CLI standalone.',
  },
  {
    title: 'Split view automático frontend/backend al abrir desde el nodo',
    labels: ['area: webview', 'area: extension-core', 'type: feature', 'size: M', 'priority: P1'],
    milestone: 'v0.2 — Interactividad',
    body: 'Al hacer doble clic en una arista, abrir la llamada frontend a la izquierda y el endpoint backend a la derecha en columnas separadas.',
  },
  {
    title: 'onEdgeClick: navegar a la llamada o al endpoint',
    labels: ['area: webview', 'type: feature', 'size: S', 'priority: P2'],
    milestone: 'v0.2 — Interactividad',
    body: 'Permitir clic en una arista para inspeccionar el origen/destino y abrir el archivo correspondiente.',
  },
  {
    title: 'Resaltar nodos y aristas relacionados al seleccionar',
    labels: ['area: webview', 'type: feature', 'size: M', 'priority: P2'],
    milestone: 'v0.2 — Interactividad',
    body: 'Al seleccionar un nodo, atenuar el resto y resaltar su vecindario (entrante/saliente).',
  },
  {
    title: 'Filtros por capa y por framework',
    labels: ['area: webview', 'type: feature', 'size: M', 'priority: P2'],
    milestone: 'v0.2 — Interactividad',
    body: 'Toggles para mostrar/ocultar Frontend, API y (futuro) DB, y filtrar por framework.',
  },
  {
    title: 'Búsqueda de rutas y endpoints en el mapa',
    labels: ['area: webview', 'type: feature', 'size: S', 'priority: P3', 'good first issue'],
    milestone: 'v0.2 — Interactividad',
    body: 'Campo de búsqueda que centra el grafo en el nodo coincidente.',
  },
  {
    title: 'Detectar URLs dinámicas (template literals con variables)',
    labels: ['area: parser', 'type: feature', 'size: M', 'priority: P2'],
    milestone: 'v0.2 — Interactividad',
    body: 'Reconocer `` `/api/users/${id}` `` y normalizar la parte dinámica a `:param` para enlazar con la ruta.',
  },
  {
    title: 'Resolver baseURL de instancias axios.create / fetch base',
    labels: ['area: parser', 'type: feature', 'size: M', 'priority: P2'],
    milestone: 'v0.2 — Interactividad',
    body: 'Seguir instancias configuradas (`axios.create({ baseURL: "/api" })`) y prefijar las llamadas.',
  },
  {
    title: 'Persistir posición/zoom del grafo',
    labels: ['area: webview', 'type: feature', 'size: S', 'priority: P3', 'good first issue'],
    milestone: 'v0.2 — Interactividad',
    body: 'Guardar el layout del grafo con `vscode.setState`/`getState` para conservarlo entre sesiones.',
  },
  {
    title: 'Exportar el grafo a SVG/PNG',
    labels: ['area: webview', 'type: feature', 'size: M', 'priority: P3', 'good first issue'],
    milestone: 'v0.2 — Interactividad',
    body: 'Botón para exportar la vista actual como imagen y compartirla.',
  },
  {
    title: 'Parser Prisma (modelos y consultas)',
    labels: ['area: parser', 'framework: data', 'type: feature', 'size: L', 'priority: P1'],
    milestone: 'v0.3 — Capa de datos',
    body: 'Leer `schema.prisma` para nodos de modelo y detectar `prisma.model.findMany()` para aristas endpoint → tabla.',
  },
  {
    title: 'Parser Sequelize',
    labels: ['area: parser', 'framework: data', 'type: feature', 'size: L', 'priority: P2'],
    milestone: 'v0.3 — Capa de datos',
    body: 'Detectar `sequelize.define`, modelos y consultas (`Model.findAll`) para enlazar con endpoints.',
  },
  {
    title: 'Parser Mongoose',
    labels: ['area: parser', 'framework: data', 'type: feature', 'size: L', 'priority: P2'],
    milestone: 'v0.3 — Capa de datos',
    body: 'Detectar `mongoose.model(...)` y consultas (`Model.find`, `.save`) para nodos de colección.',
  },
  {
    title: 'Parser SQL nativo (heurística)',
    labels: ['area: parser', 'framework: data', 'type: feature', 'size: L', 'priority: P3'],
    milestone: 'v0.3 — Capa de datos',
    body: 'Detectar `FROM <tabla>`/`JOIN <tabla>` en strings SQL y crear nodos de tabla.',
  },
  {
    title: 'Nodos de tabla/colección y aristas endpoint → tabla',
    labels: ['area: core', 'type: feature', 'size: M', 'priority: P1'],
    milestone: 'v0.3 — Capa de datos',
    body: 'Extender el aggregator y el layout del webview con la cuarta columna (Database).',
  },
  {
    title: 'Mover el análisis de AST a un Worker Thread',
    labels: ['area: core', 'type: perf', 'size: L', 'priority: P1'],
    milestone: 'v0.4 — Rendimiento',
    body: 'Evitar bloquear el hilo principal de la extensión en proyectos grandes ejecutando el escaneo en un worker.',
  },
  {
    title: 'Cache por hash/mtime e invalidación selectiva',
    labels: ['area: core', 'type: perf', 'size: M', 'priority: P2'],
    milestone: 'v0.4 — Rendimiento',
    body: 'Evitar reescanear archivos sin cambios reales usando mtime/hash.',
  },
  {
    title: 'Escaneo incremental de archivos abiertos/modificados',
    labels: ['area: core', 'type: perf', 'size: M', 'priority: P2'],
    milestone: 'v0.4 — Rendimiento',
    body: 'Priorizar archivos en foco y procesar el resto en segundo plano.',
  },
  {
    title: 'Soporte para monorepos (múltiples workspace folders)',
    labels: ['area: extension-core', 'type: feature', 'size: L', 'priority: P2'],
    milestone: 'v0.4 — Rendimiento',
    body: 'Escopar el grafo por workspace folder y permitir cambiar de proyecto desde la UI.',
  },
  {
    title: 'Configuración de la extensión (excludes y frameworks activos)',
    labels: ['area: dx', 'type: feature', 'size: M', 'priority: P2'],
    milestone: 'v1.0 — Marketplace & DX',
    body: 'Añadir settings: `flowlens.exclude`, `flowlens.frameworks`, `flowlens.maxFiles`.',
  },
  {
    title: 'Icono y branding del Marketplace',
    labels: ['area: dx', 'type: chore', 'size: S', 'priority: P2', 'good first issue'],
    milestone: 'v1.0 — Marketplace & DX',
    body: 'Diseñar el icono (128x128) y la portada del Marketplace.',
  },
  {
    title: 'README con GIFs y documentación de uso',
    labels: ['area: docs', 'type: docs', 'size: M', 'priority: P1', 'good first issue'],
    milestone: 'v1.0 — Marketplace & DX',
    body: 'Añadir capturas/GIFs del grafo en acción y una guía rápida de inicio.',
  },
  {
    title: 'Tests unitarios de parsers con fixtures',
    labels: ['area: test', 'type: test', 'size: L', 'priority: P1'],
    milestone: 'v1.0 — Marketplace & DX',
    body: 'Setup de test runner (vitest) y casos por parser usando `fixtures/demo-app`.',
  },
  {
    title: 'CI: build + typecheck + tests en GitHub Actions',
    labels: ['area: ci', 'type: chore', 'size: M', 'priority: P1'],
    milestone: 'v1.0 — Marketplace & DX',
    body: 'Workflow en PRs y main. Ya existe un smoke test de scan; añadir los tests unitarios.',
  },
  {
    title: 'Publicar en VS Code Marketplace y Open VSX',
    labels: ['area: dx', 'type: chore', 'size: M', 'priority: P2'],
    milestone: 'v1.0 — Marketplace & DX',
    body: 'Configurar `vsce`/`ovsx`, tokens y un release automatizado. Necesario para usar en Antigravity vía Open VSX.',
  },
  {
    title: 'Internacionalización de la UI (ES/EN)',
    labels: ['area: webview', 'type: feature', 'size: M', 'priority: P3'],
    milestone: 'v1.0 — Marketplace & DX',
    body: 'Extraer los textos a un sistema i18n ligero y detectar el idioma del editor.',
  },
];

function ensureAuth() {
  try {
    gh(['auth', 'status']);
  } catch {
    console.error('\n✗ No estás autenticado en GitHub. Ejecuta: gh auth login\n');
    process.exit(1);
  }
}

function main() {
  ensureAuth();
  const repo = repoArg ?? gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
  const repoFlag = ['-R', repo];
  console.log(`\n→ Repositorio: ${repo}\n`);

  if (reset) {
    console.log('Reset: borrando issues existentes...');
    const numbers = JSON.parse(gh(['issue', 'list', '--state', 'all', '--limit', '500', '--json', 'number', ...repoFlag]) || '[]');
    for (const { number } of numbers) {
      ghRetry(['issue', 'delete', String(number), '--yes', ...repoFlag]);
      console.log(`  ✗ #${number} borrado`);
    }
  }

  console.log('\nLabels:');
  for (const [name, color, description] of LABELS) {
    ghRetry(['label', 'create', name, '--color', color, '--description', description, '--force', ...repoFlag]);
    console.log(`  ✓ ${name}`);
  }

  console.log('\nMilestones:');
  const existingMilestones = new Set(JSON.parse(gh(['api', `repos/${repo}/milestones`, '--jq', '[.[].title]']) || '[]'));
  for (const [title, description] of MILESTONES) {
    if (existingMilestones.has(title)) {
      console.log(`  · ${title} (ya existe)`);
      continue;
    }
    ghRetry(['api', `repos/${repo}/milestones`, '-f', `title=${title}`, '-f', `description=${description}`]);
    console.log(`  ✓ ${title}`);
  }

  console.log('\nIssues:');
  const existing = new Set(
    JSON.parse(gh(['issue', 'list', '--state', 'all', '--limit', '500', '--json', 'title', ...repoFlag]) || '[]').map(
      (issue) => issue.title,
    ),
  );
  let created = 0;
  for (const issue of BACKLOG) {
    if (existing.has(issue.title)) {
      console.log(`  · ${issue.title} (ya existe)`);
      continue;
    }
    const args = ['issue', 'create', '--title', issue.title, '--body-file', '-', '--milestone', issue.milestone, ...repoFlag];
    for (const label of issue.labels) {
      args.push('--label', label);
    }
    const url = ghRetry(args, issue.body);
    if (issue.done) {
      ghRetry(['issue', 'close', url, '--comment', DONE_NOTE, ...repoFlag]);
    }
    created += 1;
    console.log(`  ✓ ${issue.title}${issue.done ? ' (cerrado)' : ''}`);
  }

  console.log(`\n✔ Listo. Issues creados: ${created}/${BACKLOG.length}\n`);
}

main();
