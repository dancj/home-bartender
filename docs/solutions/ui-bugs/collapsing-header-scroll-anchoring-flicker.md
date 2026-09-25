---
title: Collapsing header flickers endlessly because Chromium scroll anchoring fights it
date: 2026-09-24
category: ui-bugs
module: site header (BaseLayout)
problem_type: ui_bug
component: frontend
symptoms:
  - Sticky header flips between hero and compact every frame and never settles
  - Only happens when you stop scrolling at one exact spot, so it looks like it depends on viewport width
  - scrollY jumps back and forth by roughly the header's height delta (about 112px on desktop)
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: chromium 1208 (Playwright 1.58); also observed in Brave
tags: [collapsing-header, scroll-anchoring, overflow-anchor, sticky-header, flicker, jitter, playwright, scroll-linked-layout]
---

# Collapsing header flickers endlessly because Chromium scroll anchoring fights it

## Problem

The collapsing site header changes its **in-flow** height based on `scrollY`. At one scroll position, right where the collapse finishes, Chromium's scroll anchoring and the header's scroll script push each other back and forth every frame. The header flickers between hero and compact until the user scrolls away. Tracked in #198.

## Symptoms

- The header flashes between hero and compact with no input, forever.
- It seems to happen only at some viewport widths. That's misleading: it depends on the scroll position, and width matters only because a breakpoint changes the collapse distance.
- In a Playwright probe at `scrollTo(0, 113)` on desktop, `scrollY` alternated between 112 and 1–3 and the header height between 172 and 64px on every frame.

## What Didn't Work

- **Scroll runway (PR #182).** The earlier fix added `min-height: calc(100vh + 9rem)` to `body` (`src/styles/global.css:144`). This makes sure every page can scroll past the collapse distance, so the browser never clamps `scrollY` when the header shrinks. That fixed a real loop on short pages, but the recipe index has plenty of content and still looped. PR #182 was titled "…at borderline viewport widths", so the width red herring misled that fix too.
- **Screenshots and eyeballing.** The loop only happens at one exact pixel, so you can't reliably reproduce it by hand or in a screenshot. What found it was a scripted sweep (below).

## Solution

Turn off scroll anchoring for the document in `src/styles/global.css`:

```css
body {
  min-height: calc(100vh + 9rem);
  overflow-anchor: none;   /* #198 */
  /* … */
}
```

Verified with the sweep below. Before the fix, the live site oscillated at all 6 widths tested (390, 768, 1024, 1280, 1485, 1920). After it, a local build oscillated at none of them.

## Why This Works

The header's real height is interpolated from `--header-progress` (`src/layouts/BaseLayout.astro:220`). Progress is `scrollY / (--hb-large − --hb-compact)`, clamped to [0, 1] (`src/layouts/BaseLayout.astro:149`, `:155`; `src/scripts/headerProgress.ts`). `--hb-compact` is 4rem, and `--hb-large` is 12.4rem on mobile and 11rem at the desktop breakpoint (`BaseLayout.astro:194`, `:195`, `:270`). That puts the collapse distance at about 134px on mobile and 112px on desktop.

Scroll anchoring (`overflow-anchor: auto`, the Chromium default) keeps the element you're looking at in place when content above it changes size. When the header reaches full compact, it loses about 108px of in-flow height. Anchoring then moves `scrollY` back by about 108px, so it lands near 3. Progress drops to about 0, the header grows back to full hero, and anchoring moves `scrollY` forward by 108px again. The loop is self-sustaining and only fires where one anchoring step moves progress across the whole range, which is right at the collapse distance.

The scroll script already manages the link between header height and scroll position. Anchoring can only fight it, so disabling it costs nothing here.

## Prevention

- **Any scroll-linked element that changes in-flow height needs `overflow-anchor: none`** on its scroller, or it needs to stop affecting layout (use `transform` or a fixed-height spacer). This includes future sticky tabs, a collapsing filter bar, and anything like `FamilyMap`'s scroll-linked redraw.
- **Don't trust "only at some widths" for scroll bugs.** Sweep scroll positions at a few widths before blaming a breakpoint.
- **Repro harness.** Playwright is not a repo dependency. Install it in a scratch directory (`npm i playwright`) and run the script against `astro preview` or the live site. Anything that prints a hit is a loop:

  ```js
  import { chromium } from 'playwright';
  const browser = await chromium.launch();
  for (const w of [390, 768, 1024, 1280, 1485, 1920]) {
    const page = await browser.newPage({ viewport: { width: w, height: 850 } });
    await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
    const bad = await page.evaluate(async () => {
      const raf = () => new Promise(r => requestAnimationFrame(r));
      const bad = [];
      for (let y = 60; y <= 240; y++) {
        scrollTo(0, y);
        for (let i = 0; i < 3; i++) await raf();
        const ys = new Set();
        for (let i = 0; i < 6; i++) { await raf(); ys.add(Math.round(scrollY)); }
        if (ys.size > 1) bad.push(`${y}:${[...ys]}`);
      }
      return bad;
    });
    console.log(w, bad.length ? bad.join(' ') : 'none');
    await page.close();
  }
  await browser.close();
  ```

## Related Issues

- #198 — this bug
- PR #182 — earlier scroll-runway fix for the short-page variant of the same feedback loop
- `docs/plans/2026-05-28-001-feat-collapsing-logo-header-plan.md` — original collapsing-header design
