# Changelog

Todas las novedades relevantes de este proyecto se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added
- Core agnóstico al editor: scanner con caché incremental y aggregator de rutas.
- Parsers: Express, NestJS, JS/TS (fetch/axios/React Query), Angular y Vue.
- Webview con React Flow, tema del editor y doble clic para abrir el archivo.
- **Split view automático**: al hacer clic en una arista se abre la llamada frontend a la izquierda y el endpoint backend a la derecha.
- File System Watcher con debounce para actualización en vivo.
- CLI de escaneo (`npm run scan`) para depurar el grafo.
- Fixture multi-framework en `fixtures/demo-app`.
- **Tests unitarios** con Vitest (parsers + aggregator) integrados en CI.

### Fixed
- El parser NestJS ahora emite rutas canónicas (`/api/tasks` en vez de `api/tasks/`).
