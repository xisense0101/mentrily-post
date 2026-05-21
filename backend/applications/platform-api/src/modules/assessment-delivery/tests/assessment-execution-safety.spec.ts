import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const moduleRoot = path.resolve(import.meta.dirname, '..');

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'tests') {
          return [];
        }
        return collectFiles(entryPath);
      }
      return entryPath.endsWith('.ts') ? [entryPath] : [];
    }),
  );
  return files.flat();
}

function token(parts: string[]): string {
  return parts.join('');
}

describe('Assessment execution safety', () => {
  it('module source does not contain real execution mechanisms', async () => {
    const files = await collectFiles(moduleRoot);
    const forbiddenTokens = [
      token(['child', '_process']),
      token(['ex', 'ec(']),
      token(['sp', 'awn(']),
      token(['ev', 'al(']),
      token(['new ', 'Function']),
      token(['Do', 'cker']),
      token(['Jud', 'ge0']),
      token(['Pis', 'ton']),
    ];

    for (const file of files) {
      const contents = await readFile(file, 'utf8');
      for (const forbidden of forbiddenTokens) {
        expect(contents.includes(forbidden), `${forbidden} found in ${file}`).toBe(false);
      }
    }
  });
});
