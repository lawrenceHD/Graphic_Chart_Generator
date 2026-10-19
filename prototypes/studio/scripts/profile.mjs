// CPU profile of a scroll through the page: self time by function (production build has readable names
// only for exported ones, so the call site file:line is printed too).
import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${process.env.BASE ?? 'http://localhost:5180/'}#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < height; y += 120) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(50);
}
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
profile.samples.forEach((id, i) => {
  const n = byId.get(id);
  const f = n.callFrame;
  const key = `${f.functionName || '(anon)'} @${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`;
  self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0));
});
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`sampled ${(total / 1000).toFixed(0)} ms`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 22))
  console.log(`${(v / 1000).toFixed(1).padStart(7)} ms  ${k.slice(0, 110)}`);
await browser.close();
