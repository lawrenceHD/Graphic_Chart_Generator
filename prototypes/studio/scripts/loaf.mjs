// Long Animation Frames during a scroll of the page: where the time of slow frames goes.
import { chromium } from 'playwright-core';
const base = process.env.BASE ?? 'http://localhost:5181/';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: process.env.GPU
    ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
    : [],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto(`${base}${process.argv[2] ?? '#/'}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  window.__loaf = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      window.__loaf.push({
        d: e.duration,
        block: e.blockingDuration,
        render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
        style: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
        scripts: e.scripts.map((s) => ({
          d: s.duration,
          fn: s.sourceFunctionName,
          inv: s.invoker,
          type: s.invokerType,
          forced: s.forcedStyleAndLayoutDuration,
        })),
      });
  }).observe({ type: 'long-animation-frame', buffered: false });
});
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < height; y += 120) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(50);
}
await page.waitForTimeout(500);
const loaf = await page.evaluate(() => window.__loaf);
const total = loaf.reduce((a, e) => a + e.d, 0);
const scriptTime = loaf.reduce((a, e) => a + e.scripts.reduce((x, s) => x + s.d, 0), 0);
const styleTime = loaf.reduce((a, e) => a + e.style, 0);
console.log(
  `long frames ${String(loaf.length)}, total ${total.toFixed(0)} ms, scripts ${scriptTime.toFixed(0)} ms, style+layout+paint tail ${styleTime.toFixed(0)} ms`,
);
const by = new Map();
for (const e of loaf)
  for (const s of e.scripts) {
    const k = `${s.type}:${s.inv}`.slice(0, 80);
    by.set(k, (by.get(k) ?? 0) + s.d);
  }
console.log(
  [...by]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => `${v.toFixed(0).padStart(6)} ms  ${k}`)
    .join('\n'),
);
const forced = loaf.reduce((a, e) => a + e.scripts.reduce((x, s) => x + (s.forced ?? 0), 0), 0);
console.log(`forced style/layout inside scripts: ${forced.toFixed(0)} ms`);
await browser.close();
