# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: founders and independents who already own a logo** and need a coherent, presentable identity for
  clients, partners and suppliers, without the days and budget of a studio.
- **Designers (freelance and agency)**: the product saves them the systematic part of a brand guideline (palette,
  contrasts, variants, rules, mockups, files) so they spend their time on judgement, not production. The output
  must be good enough for a designer to sign.
- **Developers and web agencies** receiving a logo: clean variants and design tokens.
- Market (inferred, owner not yet explicit): French-speaking Africa first (Cameroon), French then English; the
  product itself is not region-locked.

## Product Purpose

Drop a logo (with optional variants, brief, documents, slogan, brand name and reference fonts) and get, in
minutes, a professional brand guideline document, its mockups and its files, which can then be edited page by page,
by hand or by talking to the copilot.

Immediate success: win the GDG Fest (prize for the most innovative AI project), preselection 2026-11-09. The jury
must leave convinced the tool produces **professional-grade** guidelines and mockups, the level found on the
platforms where top designers publish (Behance, Dribbble, Pinterest).

## Positioning

The AI works like a senior art director that shows its evidence, on top of deterministic engines:

1. **It reads and explains**: Gemini analyses the logo and the brief, detects the sector, and justifies every choice
   with measurements from the engines (measured colours, contrast ratios) and quotes from the brief.
2. **It looks at the sector**: once the sector is known, it gathers how strong brands of that sector present their
   identity and mockups, and uses those references to direct layout, mockup choice and tone. References are
   analysed, cited and linked, never copied.
3. **The logo is sacred**: it is never redrawn by a generative model; variants and mockups are computed (pixel-exact
   placement, perspective, shading).
4. **Everything is a reversible command**: the AI and the user edit the same document through typed commands, so
   any AI change can be previewed, undone and replayed.
5. **Usable output**: PDF guideline, clean logo files and design tokens (CSS, Tailwind, Figma variables).

## Operating Context

- Flow: Home → Start (name, logo, brief) → Studio (chat on the left, live canvas in the centre where guideline
  pages then mockups appear as they are generated, inspector on the right) → per-page edits → Export.
- Pages are A4 landscape (297 by 210) by default, portrait per page. Each page and each mockup is editable on its own.
- Demo on a laptop in front of a jury, possibly with weak network: a replayable demo mode must keep the flow working.
- **Charta is a generic SaaS, not a one-brand product.** No brand name appears in product code or interface text.
  The landing and the demo show example brands, each a validated record (`DemoExample`) in
  `apps/web/src/landing/examples/data/`: at least three, from different sectors and in both languages (hospitality,
  bakery and coffee house, technology consulting). Logos are either owned by the project owner and cleared for public
  display, or fictional marks drawn for the project; never a third-party mark. `check-brand-names.ts` (run by the
  unit tests, so by `pnpm verify`) fails when an example brand is named outside tests, fixtures and that data folder.

## Capabilities and Constraints

- Implemented: secure logo upload (SVG sanitised, raster isolated), palette extraction, scales and contrast matrix,
  black/white variants, logo rules, document with typed commands and server-side undo/redo, guest sessions, live
  analysis events (SSE), mockup homography.
- To build for the demo: studio canvas and page renderers (one renderer shared by canvas, print and PDF), inspector,
  Gemini analysis and copilot, sector references, computed mockups on photo scenes, export, landing page.
- Gemini on the free tier (text and vision); no paid image generation. Mockup scenes come from the scene catalogue
  (`MCP-IMAGE-GENERATION/scenes_work`, Cloudflare FLUX, free).
- Accounts on Behance, Dribbble or Pinterest have no usable public search API; sector references must come from
  lawful sources (search grounding, curated reference library) and are never scraped or redistributed.
- Product name: the interface says **Charta**; the naming decision (O-1) is formally open.

## Brand Commitments

- Honest claims only: no invented customers, metrics, testimonials or competitor comparisons. Numbers shown on the
  landing are labelled as demonstration.
- The interface steps back in front of the user's brand colours: previews sit on neutral grey (chroma 0).
- Themes: day, night and system (system by default).

## Evidence on Hand

- Demo brands, logos and briefs: `apps/web/src/landing/examples/data/` (each record states its logo provenance).
- Owner's reference boards of professional brand guidelines: `corpus-reel/` (private, analysis only).
- Studio inspiration (SETO): `C:\Users\KURO\Documents\Projects\inspi studio`.
- Validated mock-up of the full flow: `prototypes/studio` (landing validated by the owner).
- No customers, testimonials or usage figures exist yet; none may be invented.

## Product Principles

1. **Deterministic before generative**: what can be computed is computed; the AI writes, classifies, directs and
   proposes.
2. **Show the evidence**: every AI decision cites what it is based on (measurement, brief, sector reference).
3. **Professional bar**: each page and mockup must stand next to the work published by top designers.
4. **Reversible by design**: every change, human or AI, is a command that can be undone.
5. **Accessible by default**: WCAG 2.2 AA in the interface and in the generated palettes.

## Accessibility & Inclusion

WCAG 2.2 AA is a delivery criterion; French and English interface; usable on modest laptops and slow networks.
