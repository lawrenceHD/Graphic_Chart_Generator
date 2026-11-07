---
name: Charta
description: Brand guidelines built live from a logo, on warm paper, where only the user's brand carries colour.
colors:
  paper-canvas: "oklch(0.965 0.008 85)"
  paper-surface: "oklch(0.99 0.004 85)"
  paper-elevated: "oklch(0.925 0.012 85)"
  preview-grey: "oklch(0.9 0 0)"
  hairline: "oklch(0.84 0.01 85)"
  hairline-strong: "oklch(0.45 0.01 85)"
  ink: "oklch(0.2 0.01 60)"
  ink-secondary: "oklch(0.38 0.01 60)"
  ink-muted: "oklch(0.46 0.01 60)"
  on-ink: "oklch(0.975 0.008 85)"
  focus-violet: "oklch(0.5 0.2 268)"
  success: "oklch(0.5 0.14 150)"
  warning: "oklch(0.55 0.14 70)"
  danger: "oklch(0.55 0.2 25)"
  night-canvas: "oklch(0.16 0.008 60)"
  night-surface: "oklch(0.2 0.009 60)"
  night-elevated: "oklch(0.25 0.011 60)"
  night-preview-grey: "oklch(0.31 0 0)"
  night-ink: "oklch(0.96 0.008 85)"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9vw, 8rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  measure:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  sheet: "24px"
  pill: "999px"
spacing:
  unit: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
  chip:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  input-prompt:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "16px 20px"
  inspector-card:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  preview-tile:
    backgroundColor: "{colors.preview-grey}"
    rounded: "{rounded.md}"
---

# Design System: Charta

## Overview

**Creative North Star: "The Proofing Table"**

Charta is a print studio's proofing table rendered in software: warm uncoated paper, dense black ink, and on the
table the client's work, which is the only thing allowed to be in colour. The interface is the table and the
light; the brand guideline being built is the subject. Every surface, rule and label exists to make the user's logo,
palette and mockups look like they came out of a senior designer's studio.

The world is calm and exact. Typography carries the hierarchy (a heavy, slightly quirky grotesque for display, a
precise neo-grotesque for work, a monospace for every measured value), not effects or colour. Shapes are soft and
generous: pill buttons, round-cornered sheets, a dotted drafting canvas. Measurements (hex, OKLCH, contrast ratios,
seconds) are always shown in monospace with tabular figures, because the product's claim is that they are computed,
not guessed.

The same world serves two modes: the landing persuades with oversized display type and live proof chips; the
studio operates with three quiet columns (chat, canvas, inspector) around a canvas of pages that appear as they
are generated. Day, night and system themes share the same paper and ink, only inverted.

**Key Characteristics:**

- Warm paper neutrals (hue 85) and warm ink (hue 60), never pure white or pure black.
- Colour in the interface comes from the user's brand only; chrome stays achromatic-warm.
- Brand previews always sit on neutral grey with zero chroma.
- Pill controls, 16 to 24 px sheets, hairline borders, soft ambient shadows.
- Monospace for every measured value.

## Colors

A two-temperature neutral system, warm paper and warm ink, with a single cool focus colour and no brand accent of
its own.

### Primary

- **Proofing Ink** (`ink`): primary buttons, primary text, active states, the "Exporter" action. It is the
  interface's only strong colour; Charta's accent is its ink.

### Neutral

- **Paper Canvas** (`paper-canvas`): page background and the studio's drafting canvas (with a dotted grid).
- **Paper Surface** (`paper-surface`): panels, cards, inputs, chips.
- **Paper Elevated** (`paper-elevated`): hovered rows, selected cards, skeletons.
- **Preview Grey** (`preview-grey`): behind every logo, swatch and variant preview; chroma 0 so the brand colours
  are perceived truthfully.
- **Hairline** (`hairline`): decorative separators only; never the only boundary of an interactive control.
- **Hairline Strong** (`hairline-strong`): borders of inputs and controls (3:1 against paper).
- **Ink Secondary / Ink Muted** (`ink-secondary`, `ink-muted`): supporting copy and metadata; muted still passes
  4.5:1 on paper.
- **Night set** (`night-*`): the same roles inverted for the night theme, same hues.

### Status and focus

- **Focus Violet** (`focus-violet`): the 2 px focus ring, chosen cool so it is never confused with a brand colour.
- **Success / Warning / Danger**: step states, contrast verdicts, errors; always paired with an icon or a word.

### Named Rules

**The Client Owns Colour Rule.** No saturated colour in the chrome. Saturated colour on screen is either the
user's brand or a status, and nothing else.

**The Grey Light Box Rule.** A brand colour or logo is only ever previewed on `preview-grey` (chroma 0) or on a
surface the user chose, never on the warm paper.

## Typography

**Display Font:** Bricolage Grotesque (with system sans fallback)
**Body Font:** Geist (with system sans fallback)
**Label/Mono Font:** Geist Mono

**Character:** a confident, slightly irregular grotesque for the voice, paired with a disciplined neo-grotesque for
the work and a monospace for the evidence.

### Hierarchy

- **Display** (800, `clamp(3rem, 9vw, 8rem)`, 0.92): landing hero only.
- **Headline** (700, 48 px, 1.05): landing section titles, guideline page titles inside sheets.
- **Title** (600, 20 px, 1.3): panel titles, dialog titles.
- **Body** (400, 16 px, 1.5): copy, chat messages; 65 to 75 characters per line.
- **Label** (500, 14 px): buttons, chips, field labels.
- **Measure** (Geist Mono 400, 12 px, tabular figures): hex, OKLCH, ratios, timings, page numbers.

### Named Rules

**The Evidence Is Mono Rule.** Any computed value (colour code, ratio, size, time) is set in Geist Mono with
tabular figures. Prose never contains a raw measurement in the body font.

## Layout

Spacing runs on a 4 px unit (8, 16, 24, 40 in practice). The landing is a centred column up to 1200 px with full
bleed sections. The studio is a fixed three-column workspace at desktop widths: chat and analysis on the left
(about 340 px), the canvas in the centre (fluid, dotted grid, zoom control floating at the bottom), the inspector on
the right (about 300 px). Guideline pages are A4 landscape sheets (297 by 210) by default, portrait per page. Below 1024 px the
side columns become sheets over the canvas.

## Elevation & Depth

Mostly flat and tonal: panels separate from the canvas by surface colour and a hairline. Shadows are ambient and
reserved for objects that sit on the canvas (guideline sheets, the floating zoom control, popovers).

### Shadow Vocabulary

- **Sheet** (`box-shadow: 0 1px 2px oklch(0.2 0.01 60 / 0.06), 0 12px 32px -12px oklch(0.2 0.01 60 / 0.18)`):
  guideline pages and mockups resting on the canvas.
- **Float** (`box-shadow: 0 8px 24px -8px oklch(0.2 0.01 60 / 0.2)`): floating controls and popovers.

### Named Rules

**The Paper Weight Rule.** Only things that represent a printed artefact (sheets, mockups) or float above the
work cast a shadow. Panels and cards do not.

## Shapes

Soft geometry: pill buttons, chips and the zoom bar (999 px); 16 px cards in the inspector; 24 px sheets, prompt
fields and large containers; 6 to 10 px for small swatches and preview tiles. Borders are 1 px hairlines. The canvas
carries a dotted drafting grid; sheets carry a page number and a running header in monospace.

## Components

### Buttons

- **Shape:** full pill (999 px).
- **Primary:** ink background, paper text, 14 px label, 14 px by 28 px padding; one per screen.
- **Secondary:** paper surface with a strong hairline, ink text.
- **Hover / Focus:** slight darkening or surface shift over 150 ms; 2 px violet focus ring with 2 px offset.
- **Icon buttons:** 40 px round, ghost at rest; minimum 44 px target on touch.

### Chips

- **Style:** pill, paper surface, hairline, label type; status chips carry a coloured dot plus text.
- **Proof chips:** measured values in mono (for example a contrast ratio with a check), used on the landing and in
  the chat to cite evidence.

### Cards / Containers

- **Corner Style:** 16 px (inspector cards), 24 px (sheets).
- **Background:** paper surface on paper canvas.
- **Shadow Strategy:** none for cards; Sheet shadow for guideline pages.
- **Internal Padding:** 16 px.

### Inputs / Fields

- **Style:** paper surface, strong hairline, 24 px radius for the chat prompt, 10 px for form fields.
- **Focus:** violet ring; the send button inside the prompt is a round ink button.
- **Error:** danger text below the field with the what, why and how.

### Navigation

- **Studio top bar:** back, brand logo thumbnail and name, progress pill ("Charte prête"), undo/redo, share,
  theme switch, primary Export button at the far right.
- **Landing nav:** wordmark "Charta", four text links, a single ink pill CTA.

### Guideline Sheet (signature component)

An A4 landscape sheet (297 by 210) on the canvas with a mono running header (brand, "Charte graphique", page number), a headline title,
and content composed only from the document. States: skeleton (shimmer on opacity only), filled, selected (ink
outline), error. It is the same component in the canvas, on `/print` and in the PDF.

## Do's and Don'ts

### Do:

- **Do** keep the interface to paper, ink and status colours; let the user's brand provide all other colour.
- **Do** preview every logo and swatch on `preview-grey`.
- **Do** set every measured value in Geist Mono with tabular figures.
- **Do** keep one primary ink button per screen.
- **Do** honour `prefers-reduced-motion`: skeletons and reveals fall back to instant states.

### Example brands

- **Do** treat every example brand as data (`landing/examples/data`), never as a design decision: the interface looks
  identical whichever brand fills the sheets, and only the brand's own colours and fonts change.
- **Do** compose guideline pages from juxtaposed flat colour fields, without a frame or a plate around the logo, and
  give each page a professional reference.
- **Don't** hard-code a brand name, colour or logo in a component, a stylesheet or a message; messages take the
  brand as a `{brand}` parameter.

### Don't:

- **Don't** use pure white `#FFFFFF` or pure black `#000000` in the chrome.
- **Don't** give the interface its own brand accent colour.
- **Don't** put a shadow on panels or inspector cards.
- **Don't** show raw JSON or event codes to the user; the journal speaks in sentences.
- **Don't** use emoji as icons.
