// Screenshots of every screen at phone and desktop sizes, with console errors and horizontal overflow:
// `node scripts/shots.mjs [baseUrl] [outDir]`. Uses the installed Chrome through playwright-core.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5180/';
const out = process.argv[3] ?? 'shots';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const routes = [
  ['landing', '#/', true],
  ['start', '#/start', false],
  ['studio-live', '#/studio', false],
  ['studio-done', '#/studio', false],
];
const sizes = [
  ['mobile', 390, 844],
  ['desktop', 1440, 900],
];
let failures = 0;
for (const [name, hash, full] of routes) {
  for (const [tag, width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    await page.goto(base + hash, { waitUntil: 'networkidle' });
    await page.waitForTimeout(
      name === 'studio-live' ? 3500 : name === 'studio-done' ? 11000 : 1500,
    );
    if (full) {
      // Scroll through once so in-view animations play before the full-page capture.
      for (let y = 0; y < 30000; y += 500) {
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(800);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    await page.screenshot({ path: `${out}/${name}-${tag}.png`, fullPage: full });
    if (overflow > 0 || errors.length > 0) failures += 1;
    console.log(
      name.padEnd(12),
      tag.padEnd(8),
      'overflowX',
      overflow,
      'errors',
      errors.length,
      errors.slice(0, 2).join(' | ').slice(0, 300),
    );
    await context.close();
  }
}
await browser.close();
process.exitCode = failures > 0 ? 1 : 0;
