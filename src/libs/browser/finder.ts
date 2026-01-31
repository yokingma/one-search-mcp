/**
 * The following code is modified based on
 * https://github.com/egoist/local-web-search/blob/main/src/find-browser.ts
 * Copy from
 * https://github.com/bytedance/UI-TARS-desktop/blob/main/packages/agent-infra/browser/src/browser-finder.ts
 *
 * MIT Licensed
 * Copyright (c) 2025 ChatWise (https://chatwise.app) <kevin@chatwise.app>
 * https://github.com/egoist/local-web-search/blob/main/LICENSE
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger, defaultLogger } from '../logger/index.js';

/**
 * Interface defining browser locations and configurations
 * Contains paths and settings for different operating systems
 * @interface Browser
 */
interface Browser {
  /**
   * Browser name identifier
   */
  name: string;

  /**
   * Executable paths by platform
   * @property {string} win32 - Windows executable path
   * @property {string} darwin - macOS executable path
   * @property {string} linux - Linux executable path
   */
  executable: {
    win32: string;
    darwin: string;
    linux: string;
  };

  /**
   * User data directory paths by platform
   * @property {string} win32 - Windows user data directory
   * @property {string} darwin - macOS user data directory
   * @property {string} linux - Linux user data directory
   */
  userDataDir: {
    win32: string;
    darwin: string;
    linux: string;
  };
}

/**
 * Class responsible for finding and managing browser installations
 * Detects installed browsers and their profiles across different platforms
 */
export class BrowserFinder {
  /**
   * Logger instance for diagnostic output
   */
  private logger: Logger;

  /**
   * Creates a new BrowserFinder instance
   * @param {Logger} [logger] - Optional custom logger
   */
  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
  }

  /**
   * Getter that returns the list of supported browsers with their platform-specific paths
   * @returns {Browser[]} Array of browser configurations
   * @private
   */
  private get browsers(): Browser[] {
    // Get HOME_DIR inside the getter to ensure it's always current
    const HOME_DIR = os.homedir();
    const LOCAL_APP_DATA = process.env.LOCALAPPDATA;

    return [
      {
        name: 'Chromium',
        executable: {
          win32: 'C:\\Program Files\\Chromium\\Application\\chrome.exe',
          darwin: '/Applications/Chromium.app/Contents/MacOS/Chromium',
          linux: '/usr/bin/chromium',
        },
        userDataDir: {
          win32: `${LOCAL_APP_DATA}\\Chromium\\User Data`,
          darwin: `${HOME_DIR}/Library/Application Support/Chromium`,
          linux: `${HOME_DIR}/.config/chromium`,
        },
      },
      {
        name: 'Google Chrome',
        executable: {
          win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          darwin:
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          linux: '/usr/bin/google-chrome',
        },
        userDataDir: {
          win32: `${LOCAL_APP_DATA}\\Google\\Chrome\\User Data`,
          darwin: `${HOME_DIR}/Library/Application Support/Google/Chrome`,
          linux: `${HOME_DIR}/.config/google-chrome`,
        },
      },
      {
        name: 'Google Chrome Canary',
        executable: {
          win32:
            'C:\\Program Files\\Google\\Chrome Canary\\Application\\chrome.exe',
          darwin:
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
          linux: '/usr/bin/google-chrome-canary',
        },
        userDataDir: {
          win32: `${LOCAL_APP_DATA}\\Google\\Chrome Canary\\User Data`,
          darwin: `${HOME_DIR}/Library/Application Support/Google/Chrome Canary`,
          linux: `${HOME_DIR}/.config/google-chrome-canary`,
        },
      },
      {
        name: 'Microsoft Edge',
        executable: {
          win32: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          darwin: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          linux: '/usr/bin/microsoft-edge',
        },
        userDataDir: {
          win32: `${LOCAL_APP_DATA}\\Microsoft\\Edge\\User Data`,
          darwin: `${HOME_DIR}/Library/Application Support/Microsoft Edge`,
          linux: `${HOME_DIR}/.config/microsoft-edge`,
        },
      },
    ];
  }

  /**
   * Find a specific browser or the first available browser
   * @param {string} [name] - Optional browser name to find
   * @returns {{ executable: string; userDataDir: string }} Browser executable and user data paths
   * @throws {Error} If no supported browser is found or the platform is unsupported
   */
  findBrowser(name?: string): {
    executable: string;
    userDataDir: string;
  } {
    const platform = process.platform;
    this.logger.info('Finding browser on platform:', platform);

    if (platform !== 'darwin' && platform !== 'win32' && platform !== 'linux') {
      const error = new Error(`Unsupported platform: ${platform}`);
      this.logger.error(error.message);
      throw error;
    }

    const browser = name
      ? this.browsers.find(
        (b) => b.name === name && fs.existsSync(b.executable[platform]),
      )
      : this.browsers.find((b) => fs.existsSync(b.executable[platform]));

    this.logger.log('browser', browser);

    if (!browser) {
      const error = name
        ? new Error(`Cannot find browser: ${name}`)
        : new Error(
          'Cannot find a supported browser on your system. Please install Chrome, Chromium, Edge, or Brave.',
        );
      this.logger.error(error.message);
      throw error;
    }

    const result = {
      executable: browser.executable[platform],
      userDataDir: browser.userDataDir[platform],
    };

    this.logger.success(`Found browser: ${browser.name}`);
    this.logger.info('Browser details:', result);

    return result;
  }

  /**
   * Get browser profiles for a specific browser
   * Reads the Local State file to extract profile information
   * @param {string} [browserName] - Optional browser name to get profiles for
   * @returns {Array<{ displayName: string; path: string }>} Array of profile objects with display names and paths
   */
  getBrowserProfiles(
    browserName?: string,
  ): Array<{ displayName: string; path: string }> {
    const browser = this.findBrowser(browserName);

    try {
      const localState = JSON.parse(
        fs.readFileSync(path.join(browser.userDataDir, 'Local State'), 'utf8'),
      );
      const profileInfo = localState.profile.info_cache;

      return Object.entries(profileInfo).map(
        ([profileName, info]: [string, any]) => ({
          displayName: info.name,
          path: path.join(browser.userDataDir, profileName),
        }),
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Legacy method for backwards compatibility
   * Finds Chrome browser executable path
   * @deprecated Use findBrowser instead
   * @returns {string | null} Chrome executable path or null if not found
   */
  findChrome(): string | null {
    try {
      const { executable } = this.findBrowser('Google Chrome');
      return executable;
    } catch {
      return null;
    }
  }
}
