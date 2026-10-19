// Smoothness probe: scrolls a page under CPU throttling and reports frame times per scroll position.
// `node scripts/perf.mjs [hash] [throttle]`. A section whose frames often exceed 33 ms is janky.
import { chromium } from 'playwright-core';

const hash = process.argv[2] ?? '#/';
const throttle = Number(process.argv[3] ?? 4);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: process.env.GPU
    ? ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
    : [],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
if (process.env.MOTION)
  await context.addInitScript(
    (pref) => localStorage.setItem('charta.motion', pref),
    process.env.MOTION,
  );
const page = await context.newPage();
await page.goto(`${process.env.BASE ?? 'http://localhost:5180/'}${hash}`, {
  waitUntil: 'networkidle',
});
if (process.env.INJECT) await page.addStyleTag({ content: process.env.INJECT });
await page.waitForTimeout(1500);
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await page.evaluate(() => {
  window.__frames = [];
  let last = performance.now();
  const tick = (now) => {
    window.__frames.push([now - last, window.scrollY]);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < height; y += 120) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(50);
}
await page.waitForTimeout(500);
const frames = await page.evaluate(() => window.__frames);
const buckets = new Map();
for (const [dt, y] of frames) {
  const key = Math.floor(y / 900);
  const b = buckets.get(key) ?? { n: 0, slow: 0, worst: 0, sum: 0 };
  b.n += 1;
  b.sum += dt;
  b.worst = Math.max(b.worst, dt);
  if (dt > 33) b.slow += 1;
  buckets.set(key, b);
}
const ids = await page.evaluate(() =>
  [...document.querySelectorAll('main > section, footer')].map((s) => [
    s.id || s.querySelector('h2,h1')?.textContent?.slice(0, 24) || s.tagName,
    Math.floor((s.getBoundingClientRect().top + window.scrollY) / 900),
  ]),
);
console.log('sections (screen index):', ids.map(([n, i]) => `${i}:${n}`).join(' | '));
const all = frames.map(([dt]) => dt);
console.log(
  `TOTAL avg ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(1)} ms, >33ms ${String(all.filter((d) => d > 33).length)}/${String(all.length)}`,
);
for (const [key, b] of [...buckets].sort((a, c) => a[0] - c[0])) {
  console.log(
    `screen ${String(key).padStart(2)}  frames ${String(b.n).padStart(4)}  avg ${(b.sum / b.n).toFixed(1).padStart(5)} ms  >33ms ${String(b.slow).padStart(3)}  worst ${b.worst.toFixed(0)} ms`,
  );
}
await browser.close();
