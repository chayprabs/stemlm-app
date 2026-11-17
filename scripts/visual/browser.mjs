/**
 * Where the visual tools find Playwright and a browser.
 *
 * Playwright is a machine-level tool, not a project dependency: it is resolved the CommonJS way
 * (NODE_PATH or a global install), so the tools add nothing to the extension's lockfile.
 * When the browser build that this Playwright expects is not installed, point STEMLM_CHROMIUM at
 * any recent Chromium or Chrome executable instead.
 */
import { createRequire } from 'node:module';

export const { chromium } = createRequire(import.meta.url)('playwright');

const executablePath = process.env.STEMLM_CHROMIUM;

/** Headless, and able to load an extension (full Chromium, not the headless shell). */
export const BROWSER = executablePath ? { headless: true, executablePath } : { headless: true, channel: 'chromium' };
