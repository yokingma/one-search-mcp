import type { ScrapeResult } from '../libs/agent-browser/types.js';

interface ExtractBrowser {
  scrapeUrl(
    url: string,
    options: {
      formats: ['markdown'];
      onlyMainContent: true;
    },
  ): Promise<ScrapeResult>;
}

export async function extractContentFromUrls(urls: string[], browser: ExtractBrowser): Promise<string> {
  const results: string[] = [];

  for (const url of urls) {
    try {
      const res = await browser.scrapeUrl(url, {
        formats: ['markdown'],
        onlyMainContent: true,
      });

      if (res.success && res.markdown) {
        results.push(`## Content from ${url}\n\n${res.markdown}`);
        continue;
      }

      results.push(`## Failed to extract from ${url}\n\nError: ${res.error || 'Unknown error'}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push(`## Failed to extract from ${url}\n\nError: ${errorMsg}`);
    }
  }

  return results.join('\n\n---\n\n');
}
