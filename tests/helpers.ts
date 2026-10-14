import * as fs from 'node:fs';
import * as path from 'node:path';

const FIXTURE_ROOT = path.resolve(process.cwd(), 'fixtures', 'demo-app');

export function fixturePath(relative: string): string {
  return path.join(FIXTURE_ROOT, relative);
}

export function readFixture(relative: string): { filePath: string; content: string } {
  const filePath = fixturePath(relative);
  return { filePath, content: fs.readFileSync(filePath, 'utf8') };
}
