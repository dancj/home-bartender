---
date: 2026-05-28
topic: collapsing-logo-header
---

# Collapsing Logo Header

## Summary

Replace the static header-body-footer chrome with a **collapsing header** used site-wide. On load the brand logo is large — a full-width wordmark on mobile, a centered wordmark on desktop — with the folder-tabs beneath it. As the page scrolls, the logo animates down into the existing slim sticky bar (small logo left, tabs right). A resolution fix ships alongside so the mark renders crisp on retina and mobile.

## Problem Frame

The logo is a brand asset worth featuring, but today it sits small and left-aligned in a fixed slim header that treats it as utilitarian chrome rather than identity. Separately, the mark looks low-quality on mobile: the in-header coupe is generated at 80×80 (`BaseLayout.astro:29`) but displayed at ~64px on retina screens that need 128–192px of source pixels, so it renders soft. The source PNGs are high-resolution (`logo-coupe.png` 525×525, `logo-full.png` 1024×360), so the softness is purely a too-small generated asset, not an art limitation.

## Key Decisions

- **Collapsing header over a separate hero band.** The large logo and the slim sticky header are two states of one element, not two components. Scrolling animates between them, so the tabs stay reachable throughout and the brand moment doesn't permanently consume vertical space.
- **Collapse target is today's slim header.** The large state resolves into the current chrome — small logo left, folder-tabs right — reusing the existing folder-tab treatment. Tabs stay anchored; only the logo and the surrounding band animate.
- **Hero on every page.** Every route opens in the large state and collapses on scroll, rather than reserving the hero for landing pages. Chosen for a consistent brand moment and a single shared behavior in `BaseLayout.astro`; the cost is that recipe and other detail pages open with the logo band above their content.
- **Mobile crossfades wordmark → coupe; desktop scales one mark.** Desktop uses the full wordmark in both states, so it scales smoothly. Mobile shows the full-width wordmark large and crossfades to the square coupe when collapsed, preserving the current collapsed-mobile look at the cost of a crossfade rather than a single-art scale.
- **Dark header chrome is retained.** The hero band and the collapsed bar both stay on the dark slab (`--color-header-bg` `#1A1810`) the brand PNGs were drawn for, per `docs/design/direction.md` "Header chrome". The hero is a taller instance of the same dark chrome, not a new surface.
- **No new logo artwork.** The quality fix re-exports crisper / higher-density assets from the existing source PNGs. No redraw.

## Requirements

**Large (hero) state**

- R1. On initial load of any page, the header renders in its large state: the brand wordmark displayed prominently with the folder-tabs beneath it.
- R2. On mobile (Compact, `<40rem`), the large state shows the full wordmark spanning the full width of the header.
- R3. On desktop (Comfortable / Wide, `≥40rem`), the large state shows the full wordmark at a generous size, horizontally centered.

**Collapse behavior**

- R4. As the user scrolls down, the header animates from the large state to the compact state — the logo scales down and the band shrinks — continuously tracking scroll position.
- R5. The compact state matches today's slim header: small logo on the left, folder-tabs on the right, sticky to the top of the viewport.
- R6. The folder-tabs remain present and clickable throughout the entire animation — they do not disappear or become unreachable in any scroll position.
- R7. On desktop the wordmark scales directly between large and small (one piece of art). On mobile the large wordmark crossfades into the compact coupe icon as the header collapses.
- R8. Scrolling back to the top reverses the animation, returning the header to its large state.

**Logo quality**

- R9. The logo renders crisply at every size and on high-DPI displays — in both the large hero state and the compact state, on mobile and desktop. Generated assets must carry enough source pixels for the displayed size at 2× density, sourced from the existing brand PNGs.

**Motion accessibility**

- R10. Under `prefers-reduced-motion: reduce`, the header does not animate on scroll. It presents a non-animated equivalent (e.g., the compact sticky header without the shrink tween), consistent with the reduced-motion mandate in `docs/design/direction.md` "Motion".

## Acceptance Examples

- AE1. Covers R1, R4, R5. **Given** a long page (taller than the viewport), **when** it loads and the user scrolls down past the logo, **then** the header animates from the large logo into the slim sticky bar and pins to the top with tabs reachable.
- AE2. Covers R7. **Given** a mobile viewport, **when** the header collapses on scroll, **then** the full wordmark crossfades into the coupe icon in the compact bar (not an abrupt swap mid-scroll).
- AE3. Covers R6. **Given** the header is mid-collapse (partially scrolled), **when** the user taps/clicks a tab, **then** navigation works — tabs are interactive in every intermediate state.
- AE4. Covers R10. **Given** a user with reduced-motion enabled, **when** they load and scroll any page, **then** no shrink animation plays and the header presents its compact sticky form.
- AE5. Short-page edge. **Given** a page shorter than the viewport (no scroll available), **when** it loads, **then** the header stays in the large state — there is no scroll distance to trigger collapse. This is accepted behavior unless a minimum-collapse rule is added later.

## Scope Boundaries

- No new or redrawn logo artwork — only re-exported assets from the existing source PNGs.
- Re-exporting the coupe to remove the `#282826` vs `#1A1810` seam against the header background stays a possible follow-up, not part of this work (already flagged in `docs/design/direction.md`).
- No changes to the footer or to the in-header search component (`src/components/Search.astro`).
- No landing-only / per-page hero variation — the every-page decision (R1) is deliberate; a page-height-based "start collapsed" rule is out of scope unless the short-page edge (AE5) proves annoying in practice.

## Dependencies / Assumptions

- The dark header palette and tokens (`--color-header-bg`, `--color-header-fg`, `--color-header-fg-muted`) and the folder-tab chrome already exist in `src/styles/global.css` and `src/layouts/BaseLayout.astro`; this work extends them rather than introducing new chrome.
- Assumes the continuous scroll-linked animation is implemented with compositor-friendly properties (transform / opacity) to stay smooth; the exact mechanism (scroll-driven CSS animation vs. a small scroll handler) is a planning decision.
- Assumes the existing source PNGs (1024×360 wordmark, 525×525 coupe) carry enough resolution for the largest displayed size at 2×; the desktop centered hero and mobile full-width hero should be validated against this during planning.

## Sources / Research

- `src/layouts/BaseLayout.astro` — current header markup, `<picture>` logo swap, folder-tab styles, and the `getImage` calls (lines 28–29) that generate the under-sized assets behind the quality issue.
- `docs/design/direction.md` — "Header chrome" (dark-slab rationale + WCAG ratios), "Motion" (reduced-motion mandate), "Responsive breakpoints" (Compact/Comfortable/Wide stops and the 40rem logo swap).
