import { describe, expect, it, vi } from 'vitest';
import { createToolHandler } from '../src/server/tool-handler.ts';

describe('createToolHandler', () => {
  it('passes the MCP abort signal into the wrapped handler', async () => {
    const signal = new AbortController().signal;
    const handler = vi.fn(async (_args: { query: string }, context: { signal: AbortSignal }) => {
      expect(context.signal).toBe(signal);
      return {
        content: [
          {
            type: 'text' as const,
            text: 'ok',
          },
        ],
      };
    });

    const wrappedHandler = createToolHandler('one_search', handler);

    await expect(
      wrappedHandler(
        { query: 'mcp' },
        { signal } as { signal: AbortSignal },
      ),
    ).resolves.toEqual({
      content: [
        {
          type: 'text',
          text: 'ok',
        },
      ],
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });
});
