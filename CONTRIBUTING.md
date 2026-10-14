# Contribuir a FlowLens

¡Gracias por tu interés! Estas guías mantienen el proyecto sano y predecible.

## Entorno de desarrollo

```bash
git clone https://github.com/<owner>/flowlens.git
cd flowlens
npm install
npm run build
```

- `npm run watch` para recompilar en caliente.
- `F5` en VS Code para lanzar el *Extension Development Host*.

## Flujo de trabajo

1. Busca o abre un issue antes de empezar. Usa `good first issue` para tareas acotadas.
2. Crea una rama: `feat/<tema>`, `fix/<tema>`, `docs/<tema>`, `perf/<tema>`.
3. Haz commits pequeños con mensajes en modo imperativo (`Add Vue parser`, `Fix route matching`).
4. Antes de abrir el PR, asegúrate de que pasan:

   ```bash
   npm run check
   npm run build
   ```

5. Abre el PR rellenando la plantilla y enlazando el issue (`Closes #123`).

## Añadir un parser nuevo

Los parsers implementan una interfaz común. Para un backend:

```ts
export const miParser: BackendParser = {
  name: 'mi-framework',
  detect(filePath, content) { return /* heurística rápida */; },
  parse(filePath, content) { return /* RouteInfo[] */; },
};
```

Para un frontend, usa `FrontendParser` y devuelve `CallInfo[]`. Registra el parser en `src/core/scanner.ts` y añade un caso al fixture en `fixtures/demo-app`.

## Estilo de código

- TypeScript estricto; evita `any`.
- Sin comentarios salvo que aporten contexto no obvio.
- Mantén el core (`src/core`, `src/parsers`) libre de dependencias de VS Code.

## Tests

Aún no hay suite automatizada de tests (ver issues con `area:test`). Mientras tanto, valida con:

```bash
npm run scan fixtures/demo-app
```

## Código de conducta

Al participar aceptas el [Código de Conducta](CODE_OF_CONDUCT.md).
