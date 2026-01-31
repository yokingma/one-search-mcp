/**
 * The following code is based on
 * https://github.com/bytedance/UI-TARS-desktop/tree/main/packages/agent-infra/search/browser-search
 *
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import Turndown from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { defaultLogger as logger } from '../logger/index.js';
import { Page } from '../browser/index.js';
import UserAgent from 'user-agents';

/**
 * Safely parses a URL string into a URL object
 * @param url - The URL string to parse
 * @returns URL object or null if invalid
 */
const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

/**
 * Determines if a domain should be skipped based on a blocklist
 * @param url - The URL to check
 * @returns True if the domain should be skipped, false otherwise
 */
export const shouldSkipDomain = (url: string) => {
  const parsed = parseUrl(url);
  if (!parsed) return true;

  const { hostname } = parsed;
  return [
    'reddit.com',
    'www.reddit.com',
    'x.com',
    'twitter.com',
    'www.twitter.com',
    'youtube.com',
    'www.youtube.com',
  ].includes(hostname);
};

/**
 * Applies various stealth techniques to make the browser appear more like a regular user browser
 * @param page - Puppeteer page object
 */
export async function applyStealthScripts(page: Page) {
  const userAgent = new UserAgent({
    deviceCategory: 'desktop',
  }).toString();
  await page.setBypassCSP(true);
  await page.setUserAgent(userAgent);

  /**
   * https://intoli.com/blog/not-possible-to-block-chrome-headless/chrome-headless-test.html
   */
  await page.evaluate(() => {
    /**
     * Override the navigator.webdriver property
     * The webdriver read-only property of the navigator interface indicates whether the user agent is controlled by automation.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/webdriver
     */
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // Mock languages and plugins to mimic a real browser
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });

    Object.defineProperty(navigator, 'plugins', {
      get: () => [{}, {}, {}, {}, {}],
    });

    // Redefine the headless property
    Object.defineProperty(navigator, 'headless', {
      get: () => false,
    });

    // Override the permissions API
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({
          state: Notification.permission,
        } as PermissionStatus)
        : originalQuery(parameters);
  });
}

/**
 * Sets up request interception to block unnecessary resources and apply stealth techniques
 * @param page - Puppeteer page object
 */
export async function interceptRequest(page: Page) {
  await applyStealthScripts(page);
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    const resourceType = request.resourceType();

    if (resourceType !== 'document') {
      return request.abort();
    }

    if (request.isNavigationRequest()) {
      return request.continue();
    }

    return request.abort();
  });
}

/**
 * Interface representing extracted page information
 */
interface PageInfo {
  /** Page title */
  title: string;
  /** Page content in HTML format */
  content: string;
}

/**
 * !NOTE: This function runs in the context of the browser page, not Node.js
 * 
 * Extracts readable content from a web page using Readability
 * @param window Browser window object
 * @param readabilityScript Readability library script as string
 * @returns Extracted page information (title and content)
 */
export function extractPageInformation(
  window: Window,
  readabilityScript: string,
): PageInfo {
  const Readability = new Function(
    'module',
    `${readabilityScript}\nreturn module.exports`,
  )({});

  const document = window.document;

  // Remove non-content elements to improve extraction quality
  document
    .querySelectorAll(
      'script,noscript,style,link,svg,img,video,iframe,canvas,.reflist',
    )
    .forEach((el) => el.remove());

  // Parse the document using Readability
  const article = new Readability(document).parse();
  const content = article?.content || '';
  const title = document.title;

  return {
    content,
    title: article?.title || title,
  };
}

export interface ToMarkdownOptions extends Turndown.Options {
  gfmExtension?: boolean;
}

/**
 * Convert HTML content to Markdown format
 * @param html HTML string
 * @param options Conversion options
 * @returns Markdown string
 */
export function toMarkdown(
  html: string,
  options: ToMarkdownOptions = {},
): string {
  if (!html) return '';

  try {
    const {
      codeBlockStyle = 'fenced',
      headingStyle = 'atx',
      emDelimiter = '*',
      strongDelimiter = '**',
      gfmExtension = true,
    } = options;

    const turndown = new Turndown({
      codeBlockStyle,
      headingStyle,
      emDelimiter,
      strongDelimiter,
    });

    if (gfmExtension) {
      turndown.use(gfm);
    }

    return turndown.turndown(html);
  } catch (error) {
    logger.error('Error converting HTML to Markdown:', error);
    return html;
  }
}
