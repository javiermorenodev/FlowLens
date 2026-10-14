import { describe, expect, it } from 'vitest';
import { readFixture } from './helpers';
import { expressParser } from '../src/parsers/expressParser';
import { nestParser } from '../src/parsers/nestParser';
import { jsHttpParser } from '../src/parsers/jsHttpParser';
import { angularParser } from '../src/parsers/angularParser';
import { prismaParser } from '../src/parsers/prismaParser';
import { sequelizeParser } from '../src/parsers/sequelizeParser';
import { mongooseParser } from '../src/parsers/mongooseParser';
import { sqlParser } from '../src/parsers/sqlParser';

function specs(entries: Array<{ method: string; path: string }>): string[] {
  return entries.map((entry) => `${entry.method} ${entry.path}`).sort();
}

function entityNames(entries: Array<{ name: string }>): string[] {
  return entries.map((entry) => entry.name).sort();
}

describe('expressParser', () => {
  const file = readFixture('server/express-app.js');

  it('detecta el archivo como Express', () => {
    expect(expressParser.detect(file.filePath, file.content)).toBe(true);
  });

  it('extrae todas las rutas con su método', () => {
    expect(specs(expressParser.parse(file.filePath, file.content))).toEqual(
      [
        'GET /api/users',
        'GET /api/users/:id',
        'POST /api/users',
        'DELETE /api/users/:id',
        'GET /api/orders',
        'GET /api/products/:id',
      ].sort(),
    );
  });

  it('no confunde Map.get con una ruta', () => {
    const source = "const cache = new Map();\ncache.get('/api/users');\n";
    expect(expressParser.parse('cache.js', source)).toEqual([]);
  });
});

describe('nestParser', () => {
  const file = readFixture('server/tasks.controller.ts');

  it('detecta el controlador NestJS', () => {
    expect(nestParser.detect(file.filePath, file.content)).toBe(true);
  });

  it('combina la ruta base del @Controller con los decoradores de método', () => {
    expect(specs(nestParser.parse(file.filePath, file.content))).toEqual(
      ['GET /api/tasks', 'GET /api/tasks/:id', 'POST /api/tasks', 'DELETE /api/tasks/:id'].sort(),
    );
  });
});

describe('jsHttpParser (React)', () => {
  const file = readFixture('client/react/UserList.tsx');

  it('detecta fetch, axios y React Query', () => {
    expect(jsHttpParser.detect(file.filePath, file.content)).toBe(true);
  });

  it('extrae las llamadas de red', () => {
    const calls = jsHttpParser.parse(file.filePath, file.content);
    expect(specs(calls)).toContain('GET /api/users');
    expect(specs(calls)).toContain('POST /api/users');
    expect(specs(calls)).toContain('GET /api/orders');
    expect(specs(calls)).toContain('GET /api/orders/42');
    expect(specs(calls)).toContain('GET /api/tasks');
  });

  it('marca las llamadas dentro de hooks como react-query', () => {
    const calls = jsHttpParser.parse(file.filePath, file.content);
    expect(calls.some((call) => call.framework === 'react-query')).toBe(true);
  });
});

describe('jsHttpParser (Vue)', () => {
  const file = readFixture('client/vue/UsersView.vue');

  it('detecta y parsea el bloque <script>', () => {
    expect(jsHttpParser.detect(file.filePath, file.content)).toBe(true);
    expect(specs(jsHttpParser.parse(file.filePath, file.content))).toContain('GET /api/products/7');
  });
});

describe('jsHttpParser (axios instance + urls dinámicas)', () => {
  const file = readFixture('client/react/apiClient.ts');

  it('aplana el baseURL de axios.create en cada llamada', () => {
    expect(specs(jsHttpParser.parse(file.filePath, file.content))).toEqual(
      ['GET /api/users', 'GET /api/users/:param', 'POST /api/users', 'DELETE /api/users/:param'].sort(),
    );
  });

  it('convierte template literals en segmentos :param', () => {
    const source = 'fetch(`/api/users/${id}/orders/${orderId}`);\n';
    expect(specs(jsHttpParser.parse('dynamic.ts', source))).toEqual(['GET /api/users/:param/orders/:param']);
  });

  it('no confunde métodos de otros objetos con instancias axios', () => {
    const source = "const store = new Map();\nstore.get('/api/users');\n";
    expect(jsHttpParser.parse('store.ts', source)).toEqual([]);
  });
});

describe('angularParser', () => {
  const file = readFixture('client/angular/users.service.ts');

  it('detecta HttpClient', () => {
    expect(angularParser.detect(file.filePath, file.content)).toBe(true);
  });

  it('extrae las llamadas del HttpClient', () => {
    expect(specs(angularParser.parse(file.filePath, file.content))).toEqual(
      ['GET /api/users', 'POST /api/users', 'GET /api/orders'].sort(),
    );
  });
});

describe('prismaParser', () => {
  const file = readFixture('server/prisma/schema.prisma');

  it('detecta el esquema y extrae los modelos', () => {
    expect(prismaParser.detect(file.filePath, file.content)).toBe(true);
    expect(entityNames(prismaParser.parse(file.filePath, file.content))).toEqual(
      ['Order', 'Product', 'Task', 'User'].sort(),
    );
  });

  it('no marca datasource ni generator como modelos', () => {
    expect(entityNames(prismaParser.parse(file.filePath, file.content))).not.toContain('db');
    expect(entityNames(prismaParser.parse(file.filePath, file.content))).not.toContain('client');
  });
});

describe('sequelizeParser', () => {
  const file = readFixture('server/models/session.model.js');

  it('detecta sequelize.define con el nombre del modelo', () => {
    expect(sequelizeParser.detect(file.filePath, file.content)).toBe(true);
    expect(entityNames(sequelizeParser.parse(file.filePath, file.content))).toEqual(['Session']);
  });

  it('no se activa en archivos sin sequelize', () => {
    expect(sequelizeParser.detect('plain.js', "const x = obj.define('Nope', {});")).toBe(false);
  });
});

describe('mongooseParser', () => {
  const file = readFixture('server/models/log.model.js');

  it('detecta mongoose.model', () => {
    expect(mongooseParser.detect(file.filePath, file.content)).toBe(true);
    expect(entityNames(mongooseParser.parse(file.filePath, file.content))).toEqual(['Log']);
  });
});

describe('sqlParser', () => {
  const file = readFixture('server/db/audit.sql');

  it('detecta CREATE TABLE y normaliza el nombre', () => {
    expect(sqlParser.detect(file.filePath, file.content)).toBe(true);
    expect(entityNames(sqlParser.parse(file.filePath, file.content))).toEqual(['audit_logs', 'metrics']);
  });
});
