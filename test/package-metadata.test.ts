import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

interface PackageJson {
  version: string;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
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

const MIN_MCP_SDK_VERSION = [1, 29, 0] as const;

function parseSemver(versionRange: string): [number, number, number] {
  const versionMatch = versionRange.match(/(\d+)\.(\d+)\.(\d+)/);

  if (!versionMatch) {
    throw new Error(`Unable to parse semver from: ${versionRange}`);
  }

  return [
    Number(versionMatch[1]),
    Number(versionMatch[2]),
    Number(versionMatch[3]),
  ];
}

function isVersionAtLeast(
  actual: [number, number, number],
  minimum: readonly [number, number, number],
): boolean {
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] > minimum[index]) {
      return true;
    }

    if (actual[index] < minimum[index]) {
      return false;
    }
  }

  return true;
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

  it('pins @modelcontextprotocol/sdk to a patched release', async () => {
    const packageJson = await readJsonFile<PackageJson>('package.json');
    const sdkVersionRange = packageJson.dependencies?.['@modelcontextprotocol/sdk'];

    expect(sdkVersionRange).toBeDefined();
    expect(isVersionAtLeast(parseSemver(sdkVersionRange!), MIN_MCP_SDK_VERSION)).toBe(true);
  });

  it('documents all supported search provider environment variables in server.json', async () => {
    const serverJson = await readJsonFile<ServerJson>('server.json');
    const environmentVariables = serverJson.packages?.[0]?.environmentVariables ?? [];
    const variablesByName = new Map(
      environmentVariables.map((variable) => [variable.name, variable.description]),
    );

    expect(variablesByName.get('SEARCH_PROVIDER')).toContain(
      'searxng, duckduckgo, bing, tavily, google, zhipu, exa, bocha, ydc, local',
    );
    expect(variablesByName.get('SEARCH_API_URL')).toContain(
      'Google Custom Search Engine ID for google',
    );
    expect(variablesByName.get('SEARCH_API_KEY')).toBe(
      'API key for search provider (required for tavily, bing, google, zhipu, exa, bocha)',
    );
    expect(variablesByName.get('YDC_API_KEY')).toContain(
      'You.com API key for ydc provider',
    );
    expect(variablesByName.get('ALLOW_PRIVATE_NETWORK')).toContain(
      'private, loopback, and link-local network targets',
    );
  });

  it('exposes MCP Inspector scripts for source and built server entrypoints', async () => {
    const packageJson = await readJsonFile<PackageJson>('package.json');

    expect(packageJson.scripts?.inspector).toBe(
      'npx -y @modelcontextprotocol/inspector npx tsx src/index.ts',
    );
    expect(packageJson.scripts?.['inspector:build']).toBe(
      'npm run build && npx -y @modelcontextprotocol/inspector node dist/index.js',
    );
  });
});
