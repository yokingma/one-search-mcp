import { describe, expect, it, vi } from 'vitest';
import { extractContentFromUrls } from '../src/extract/process-extract.ts';
import { ExtractSchema } from '../src/schemas.ts';

describe('extractContentFromUrls', () => {
  it('only accepts urls in the extract input schema', () => {
    expect(ExtractSchema.safeParse({
      urls: ['https://example.com'],
      prompt: 'summarize this page',
    }).success).toBe(false);

    expect(ExtractSchema.parse({
      urls: ['https://example.com'],
    })).toEqual({
      urls: ['https://example.com'],
    });
  });

  it('combines scraped markdown into preprocessed text blocks', async () => {
    const browser = {
      scrapeUrl: vi.fn(async (url: string) => ({
        success: true,
        markdown: `Content for ${url}`,
      })),
    };

    const result = await extractContentFromUrls(
      ['https://example.com', 'https://iana.org'],
      browser,
    );

    expect(browser.scrapeUrl).toHaveBeenNthCalledWith(1, 'https://example.com', {
      formats: ['markdown'],
      onlyMainContent: true,
    });
    expect(browser.scrapeUrl).toHaveBeenNthCalledWith(2, 'https://iana.org', {
      formats: ['markdown'],
      onlyMainContent: true,
    });
    expect(result).toBe(
      '## Content from https://example.com\n\nContent for https://example.com\n\n---\n\n## Content from https://iana.org\n\nContent for https://iana.org',
    );
  });

  it('reports scrape failures inline for the affected URL', async () => {
    const browser = {
      scrapeUrl: vi
        .fn()
        .mockResolvedValueOnce({
          success: false,
          error: 'Network error',
        })
        .mockResolvedValueOnce({
          success: true,
          markdown: 'Recovered content',
        }),
    };

    const result = await extractContentFromUrls(
      ['https://bad.example', 'https://good.example'],
      browser,
    );

    expect(result).toBe(
      '## Failed to extract from https://bad.example\n\nError: Network error\n\n---\n\n## Content from https://good.example\n\nRecovered content',
    );
  });
});
