// Objective gates of the prototype (docs/09_DESIGN_SYSTEM.md §5, kit XIAS): axe WCAG 2.2 AA with zero
// violations, no horizontal overflow at 320 / 390 / 1440 px, touch targets ≥ 24 px (2.5.8), no page error
// under prefers-reduced-motion. `node scripts/gates.mjs [baseUrl]`; exit code 1 on any failure.
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5180/';
const routes = ['#/', '#/start', '#/studio'];
const widths = [320, 390, 1440];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
let failed = 0;
const report = (ok, line) => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${line}`);
};

for (const route of routes) {
  for (const width of widths) {
    for (const motion of ['no-preference', 'reduce']) {
      const context = await browser.newContext({
        viewport: { width, height: 860 },
        reducedMotion: motion,
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(base + route, { waitUntil: 'networkidle' });
      // Let the simulated analysis finish so the final studio is what gets audited.
      await page.waitForTimeout(
        // Entrances finished too: an element caught mid-fade would read as low contrast.
        route.includes('studio') ? 12000 : 2000,
      );
      const label = `${route.padEnd(16)} ${String(width).padStart(4)} px  ${motion.padEnd(13)}`;
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      report(overflow <= 0, `${label} overflow ${String(overflow)} px`);
      report(
        errors.length === 0,
        `${label} page errors ${String(errors.length)} ${errors.join(' | ').slice(0, 200)}`,
      );
      if (motion === 'no-preference') {
        // Decorative stacks are aria-hidden; their overlapping cards fool the contrast rule (it reads the
        // background of the card on top), so they are excluded explicitly and listed here.
        const axe = await new AxeBuilder({ page })
          .exclude('[data-decorative]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const details = axe.violations
          .map((v) => `${v.id}×${String(v.nodes.length)} [${v.nodes[0]?.target.join(' ') ?? ''}]`)
          .join(', ');
        report(
          axe.violations.length === 0,
          `${label} axe ${String(axe.violations.length)} ${details}`.slice(0, 600),
        );
        const small = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              'button, a[href], [role="tab"], [role="radio"], input, textarea',
            ),
          ]
            .filter((node) => {
              const box = node.getBoundingClientRect();
              const style = getComputedStyle(node);
              const hidden =
                box.width === 0 ||
                style.visibility === 'hidden' ||
                node.closest('[aria-hidden="true"]');
              const inline = style.display === 'inline' && node.closest('p, li');
              return (
                !hidden && !inline && node.type !== 'range' && (box.width < 24 || box.height < 24)
              );
            })
            .map(
              (node) =>
                `${node.tagName.toLowerCase()}(${node.getAttribute('aria-label') ?? node.textContent?.trim().slice(0, 20) ?? ''})`,
            ),
        );
        report(
          small.length === 0,
          `${label} targets < 24 px: ${String(small.length)} ${small.slice(0, 5).join(', ')}`,
        );
      }
      await context.close();
    }
  }
}
await browser.close();
console.log(failed === 0 ? '\nALL GATES PASS' : `\n${String(failed)} GATE(S) FAILING`);
process.exitCode = failed === 0 ? 0 : 1;
