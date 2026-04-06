import http from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { BrowserFinder } from '../src/libs/browser/finder.ts';

const execFileAsync = promisify(execFile);
const REQUEST_TIMEOUT_MS = 30_000;
const SHUTDOWN_GRACE_MS = 2_000;

interface ProcessInfo {
  pid: number;
  ppid: number;
  command: string;
}

function serializeMessage(message: unknown): string {
  return `${JSON.stringify(message)}\n`;
}

function hasLocalBrowser(): boolean {
  try {
    const finder = new BrowserFinder();
    finder.findBrowser();
    return true;
  } catch {
    return false;
  }
}

async function listProcesses(): Promise<ProcessInfo[]> {
  const { stdout } = await execFileAsync('ps', ['-ax', '-o', 'pid=,ppid=,command=']);

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(.*)$/);

      if (!match) {
        throw new Error(`Failed to parse process line: ${line}`);
      }

      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        command: match[3],
      };
    });
}

async function listDescendants(rootPid: number): Promise<ProcessInfo[]> {
  const processes = await listProcesses();
  const childrenByParent = new Map<number, ProcessInfo[]>();

  for (const processInfo of processes) {
    const siblings = childrenByParent.get(processInfo.ppid) ?? [];
    siblings.push(processInfo);
    childrenByParent.set(processInfo.ppid, siblings);
  }

  const descendants: ProcessInfo[] = [];
  const queue = [rootPid];

  while (queue.length > 0) {
    const pid = queue.shift();

    if (pid === undefined) {
      continue;
    }

    for (const child of childrenByParent.get(pid) ?? []) {
      descendants.push(child);
      queue.push(child.pid);
    }
  }

  return descendants;
}

function isBrowserProcess(command: string): boolean {
  return /chrome|chromium|msedge/i.test(command);
}

async function waitFor<T>(
  callback: () => Promise<T | undefined>,
  timeoutMs: number,
  intervalMs = 100,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const value = await callback();

    if (value !== undefined) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out after ${timeoutMs}ms`);
}

async function forceKill(pid: number): Promise<void> {
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // Ignore already-exited processes
  }
}

const integrationTest = process.platform === 'win32' || !hasLocalBrowser() ? it.skip : it;

describe('stdio disconnect integration', () => {
  integrationTest('cleans up browser children when stdin closes during an in-flight scrape request', async () => {
    const server = http.createServer((_, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end('<html><body><main>integration test</main></body></html>');
    });

    await once(server.listen(0, '127.0.0.1'), 'listening');
    const address = server.address();

    if (address === null || typeof address === 'string') {
      throw new Error('Expected TCP address');
    }

    const tsxCommand = path.resolve(
      process.cwd(),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
    );

    const child = spawn(tsxCommand, ['src/index.ts'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        SEARCH_PROVIDER: 'local',
      },
    });

    child.stderr.resume();

    let nextId = 1;
    let stdoutBuffer = '';
    const pendingResponses = new Map<number, {
      resolve: (message: unknown) => void;
      reject: (error: Error) => void;
    }>();

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString('utf8');

      while (true) {
        const newlineIndex = stdoutBuffer.indexOf('\n');

        if (newlineIndex === -1) {
          break;
        }

        const line = stdoutBuffer.slice(0, newlineIndex).trim();
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);

        if (!line) {
          continue;
        }

        const message = JSON.parse(line) as {
          id?: number;
          result?: unknown;
          error?: { message?: string };
        };

        if (typeof message.id !== 'number') {
          continue;
        }

        const pending = pendingResponses.get(message.id);

        if (!pending) {
          continue;
        }

        pendingResponses.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message ?? 'Unknown JSON-RPC error'));
          continue;
        }

        pending.resolve(message.result);
      }
    });

    child.on('close', () => {
      for (const pending of pendingResponses.values()) {
        pending.reject(new Error('Server process closed'));
      }
      pendingResponses.clear();
    });

    const sendRequest = async (method: string, params?: Record<string, unknown>) => {
      const id = nextId++;

      const response = new Promise<unknown>((resolve, reject) => {
        pendingResponses.set(id, { resolve, reject });
      });

      child.stdin.write(serializeMessage({
        jsonrpc: '2.0',
        id,
        method,
        ...(params ? { params } : {}),
      }));

      return await response;
    };

    const sendNotification = (method: string, params?: Record<string, unknown>) => {
      child.stdin.write(serializeMessage({
        jsonrpc: '2.0',
        method,
        ...(params ? { params } : {}),
      }));
    };

    const activePids = new Set<number>();

    try {
      await sendRequest('initialize', {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: {
          name: 'integration-test-client',
          version: '1.0.0',
        },
      });
      sendNotification('notifications/initialized');

      child.stdin.write(serializeMessage({
        jsonrpc: '2.0',
        id: nextId++,
        method: 'tools/call',
        params: {
          name: 'one_scrape',
          arguments: {
            url: `http://127.0.0.1:${address.port}`,
            formats: ['markdown'],
            waitFor: 20_000,
          },
        },
      }));

      const browserDescendants = await waitFor(async () => {
        const descendants = await listDescendants(child.pid!);
        const matches = descendants.filter((processInfo) => isBrowserProcess(processInfo.command));
        return matches.length > 0 ? matches : undefined;
      }, 10_000);

      for (const processInfo of browserDescendants) {
        activePids.add(processInfo.pid);
      }

      child.stdin.end();

      await waitFor(async () => {
        if (child.exitCode !== null) {
          return true;
        }

        return undefined;
      }, SHUTDOWN_GRACE_MS);

      const remainingPids = await waitFor(async () => {
        const processes = await listProcesses();
        const stillAlive = processes.filter((processInfo) => activePids.has(processInfo.pid));
        return stillAlive.length === 0 ? stillAlive : undefined;
      }, SHUTDOWN_GRACE_MS);

      expect(remainingPids).toEqual([]);
    } finally {
      await forceKill(child.pid!);

      const descendants = await listDescendants(child.pid!).catch(() => []);
      await Promise.allSettled(descendants.map(async (processInfo) => {
        await forceKill(processInfo.pid);
      }));

      server.close();
      await once(server, 'close');
    }
  }, REQUEST_TIMEOUT_MS);
});
