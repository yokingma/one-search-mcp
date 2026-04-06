import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

interface PackageJson {
  version: string;
  tsup?: {
    sourcemap?: boolean;
  };
}

interface ServerJson {
  version: string;
  packages?: Array<{
    version: string;
    environmentVariables?: Array<{
      name: string;
      description: string;
    }>;
  }>;
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.join(ROOT_DIR, relativePath);
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

async function readRuntimeVersion(): Promise<string> {
  const indexPath = path.join(ROOT_DIR, 'src/index.ts');
  const content = await readFile(indexPath, 'utf8');
  const versionMatch = content.match(/version:\s*'([^']+)'/);

  if (!versionMatch) {
    throw new Error('Unable to find runtime version in src/index.ts');
  }

  return versionMatch[1];
}

describe('package metadata', () => {
  it('keeps published versions aligned and disables sourcemaps in build output', async () => {
    const packageJson = await readJsonFile<PackageJson>('package.json');
    const serverJson = await readJsonFile<ServerJson>('server.json');
    const runtimeVersion = await readRuntimeVersion();

    expect(serverJson.version).toBe(packageJson.version);
    expect(serverJson.packages?.[0]?.version).toBe(packageJson.version);
    expect(runtimeVersion).toBe(packageJson.version);
    expect(packageJson.tsup?.sourcemap).toBe(false);
  });

  it('documents all supported search provider environment variables in server.json', async () => {
    const serverJson = await readJsonFile<ServerJson>('server.json');
    const environmentVariables = serverJson.packages?.[0]?.environmentVariables ?? [];
    const variablesByName = new Map(
      environmentVariables.map((variable) => [variable.name, variable.description]),
    );

    expect(variablesByName.get('SEARCH_PROVIDER')).toContain(
      'searxng, duckduckgo, bing, tavily, google, zhipu, exa, bocha, local',
    );
    expect(variablesByName.get('SEARCH_API_URL')).toContain(
      'Google Custom Search Engine ID for google',
    );
    expect(variablesByName.get('SEARCH_API_KEY')).toContain(
      'tavily, bing, google, zhipu, exa, bocha',
    );
  });
});
