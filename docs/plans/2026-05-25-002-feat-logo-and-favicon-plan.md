---
title: Add logo and favicon
type: feat
status: active
date: 2026-05-25
---

# Add logo and favicon

## Summary

Replace the placeholder favicon with a multi-format set generated from the new coupe-glass artwork, and render the row-of-glasses logo + "Home Bartender" wordmark in the site header on a dark chip. On narrow viewports the header swaps the wide row-of-glasses panel for the coupe icon so the sticky header stays one row tall.

---

## Requirements

- R1. Site serves a complete favicon set (multi-res ICO, PNGs, Apple touch icon, web manifest) generated from the coupe-glass artwork, replacing the placeholder SVG.
- R2. Every page emits the favicon set in `<head>`, with paths that resolve correctly under the deployed GitHub Pages base URL.
- R3. Site header renders the row-of-glasses logo alongside the "Home Bartender" wordmark, both linking to home.
- R4. On viewports at or below the existing `42rem` breakpoint, the header swaps to the coupe icon + wordmark so it stays a single row.
- R5. Logo artwork is wrapped in a dark chip so the cream-on-near-black colors stay intact against the site's light background.
- R6. `npm run build` continues to succeed and Pagefind continues to index.

---

## Scope Boundaries

- No OG / social card image (separate follow-up).
- No homepage hero, footer logo, recipe page header, or other branding surfaces.
- No new theme behavior — existing `prefers-color-scheme` palette is unchanged.
- No SVG re-creation of the artwork — assets ship as raster PNGs sourced from the provided images.

### Deferred to Follow-Up Work

- OG / Twitter card image generation from the brand artwork: separate issue.
- Tighter dark-mode chip treatment (e.g. transparent chip when `prefers-color-scheme: dark`): can be tuned post-merge if it looks off.

---

## Context & Research

### Relevant Code and Patterns

- `src/layouts/BaseLayout.astro` — single layout that owns the `<head>`, the sticky `.site-header`, and the mobile media query at `42rem`. All favicon links and header markup land here.
- `src/styles/global.css` — defines `--bg`, `--surface`, `--surface-muted`, `--rule`, `--radius-md`, `--radius-sm` HSL tokens with a `@media (prefers-color-scheme: dark)` override. The dark chip should be a literal near-black color (matching the artwork background), not a theme token, because the artwork itself is not theme-aware.
- `astro.config.mjs` — `site` and `base` are derived from `GITHUB_REPOSITORY` / `SITE_URL` / `SITE_BASE` env vars. The existing favicon link already prefixes with `import.meta.env.BASE_URL` — new links follow the same pattern.
- `public/` — Astro copies this directory to `dist/` as-is. Favicon outputs and brand images live here so they're served at predictable paths.
- Source artwork (525×525 coupe; 1024×360 row-of-glasses, ~2.84:1 aspect) is currently in `/Users/developer/.claude/image-cache/296913ff-eeb7-47f0-85de-dce2c1ec1a9e/` (1.png = coupe, 2.png = row-of-glasses) and must be copied into the repo as part of U1.

### Institutional Learnings

- `docs/solutions/` was searched; no existing learnings on favicon or branding work.

### External References

- None required — Astro's static asset model and `<head>` favicon conventions are well-established. `sharp` is already in the Astro dependency tree (transitively) and is the standard Node image-resize library.

---

## Key Technical Decisions

- **Favicon generation runs as a committed one-shot script, not at build time.** A `scripts/generate-favicons.mjs` script consumes the coupe source PNG and writes ICO + PNG outputs into `public/`. Outputs are committed. Rationale: brand assets change rarely; build-time generation adds a dev dependency for no real benefit on a static personal site. The script exists so the assets can be regenerated reproducibly if the source changes.
- **Tooling: `sharp` for PNG resizing, `png-to-ico` for the multi-res ICO.** Both are added as `devDependencies` (only needed when regenerating). Rationale: `sharp` is the de-facto Node image resizer; `png-to-ico` is the lightest pure-JS multi-res ICO writer.
- **Source images live in `public/brand/` alongside generated outputs.** Specifically `public/brand/logo-full.png` (row-of-glasses) is the served logo asset; `public/brand/logo-coupe.png` is the coupe source, also served (reused as the mobile brand mark and the apple-touch source). Rationale: the coupe is referenced from the layout for the mobile fallback, so it needs to be in `public/` anyway. Keeping both source images together in `public/brand/` is the simplest layout.
- **Header logo swap uses two `<img>` elements with CSS visibility, not JS or `<picture>`.** Both `<img>` tags render; one is `display: none` above/below the breakpoint. Rationale: matches the existing CSS-grid responsive pattern in `.site-header-row`, keeps the layout component pure markup, no runtime cost.
- **Dark chip uses a literal HSL value matching the artwork's background, not a theme token.** The artwork was designed against a near-black; theme tokens shift in dark mode. Rationale: keeping the chip color tied to the artwork preserves the designed look in both light and dark page modes.
- **`alt=""` on the logo image.** The wordmark renders alongside as accessible text, so the image is decorative. Rationale: screen readers shouldn't double-announce.

---

## Open Questions

### Resolved During Planning

- **Header layout on narrow viewports**: swap to coupe icon + wordmark below `42rem` (existing breakpoint).
- **Asset treatment on light background**: wrap in dark chip; do not recolor.
- **Favicon generation timing**: one-shot script with committed outputs; not build-time.

### Deferred to Implementation

- **Exact pixel heights for the logo chip at desktop and mobile**: tuned visually during U4 against the existing `0.875rem` header padding.
- **Whether the apple-touch-icon needs explicit background padding**: if iOS renders the icon with the dark artwork running edge-to-edge looks acceptable, no extra padding. Otherwise the script gets a `--apple-padding` flag during U2.
- **Web manifest `theme_color` / `background_color`**: pick during U2 based on the dark chip's resolved HSL.

---

## Implementation Units

### U1. Add source artwork and favicon-generation script

**Goal:** Commit the two source images and a reproducible script that generates the favicon set from the coupe source. Add the script dependencies.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `public/brand/logo-full.png` (copied from the cached `2.png`, 1024×360)
- Create: `public/brand/logo-coupe.png` (copied from the cached `1.png`, 525×525)
- Create: `scripts/generate-favicons.mjs`
- Modify: `package.json` (add `devDependencies`: `sharp`, `png-to-ico`; add npm script `"generate-favicons": "node scripts/generate-favicons.mjs"`)

**Approach:**
- Source image path inside the script is `public/brand/logo-coupe.png`; outputs are written into `public/`.
- Script generates: `favicon.ico` (16/32/48 multi-res), `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`.
- Script also writes `public/site.webmanifest` with `name`, `short_name`, `icons[]` referencing the 192/512 PNGs, `theme_color`, `background_color` matching the dark-chip color, and `display: "browser"`.
- Script is idempotent: deletes existing outputs then regenerates.
- Document the regeneration ritual (`npm run generate-favicons`) in a short comment at the top of the script.

**Patterns to follow:**
- Existing `scripts/*.mjs` (e.g. `validate.mjs`, `promote.mjs`, `codegen-taxonomy.mjs`) — ESM, top-of-file usage comment, exits with non-zero on failure.

**Test scenarios:**
- Test expectation: none — one-shot generation script; outputs are committed artifacts verified by inspection and by U3's head wiring rendering correctly. No behavioral logic to characterize.

**Verification:**
- `npm run generate-favicons` runs to completion and produces all expected files in `public/`.
- `git status` after running shows the expected new/modified files; no unrelated noise.

---

### U2. Generate and commit the favicon asset set

**Goal:** Run the U1 script and commit the produced favicon assets so the deployed site has real binary assets, not just a script.

**Requirements:** R1

**Dependencies:** U1

**Files:**
- Create (generated, committed): `public/favicon.ico`
- Create (generated, committed): `public/favicon-16.png`
- Create (generated, committed): `public/favicon-32.png`
- Create (generated, committed): `public/apple-touch-icon.png`
- Create (generated, committed): `public/icon-192.png`
- Create (generated, committed): `public/icon-512.png`
- Create (generated, committed): `public/site.webmanifest`

**Approach:**
- This unit is purely the artifact-commit step: run the U1 script, eyeball the outputs (open `favicon-32.png` and `apple-touch-icon.png` to confirm the coupe is centered and not crushed), commit.
- If the apple-touch icon looks like the coupe runs edge-to-edge in an unflattering way, return to U1 and add a small inset (~10% padding) before re-running.

**Test scenarios:**
- Test expectation: none — committing generated artifacts; correctness is visual.

**Verification:**
- All seven files are present in `public/` and tracked by git.
- Opening each PNG locally shows the expected coupe-glass artwork at the expected dimensions.

---

### U3. Wire favicon set into the site `<head>`

**Goal:** Replace the single placeholder `<link rel="icon">` in `BaseLayout.astro` with a complete favicon link set, and remove the unused placeholder SVG.

**Requirements:** R2, R6

**Dependencies:** U2

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Delete: `public/favicon.svg`

**Approach:**
- Replace the single existing favicon link (line 25 of `BaseLayout.astro`) with the standard link set, all prefixed with `${base}`:
  - `<link rel="icon" type="image/x-icon" href={\`${base}/favicon.ico\`} />` (legacy fallback)
  - `<link rel="icon" type="image/png" sizes="16x16" href={\`${base}/favicon-16.png\`} />`
  - `<link rel="icon" type="image/png" sizes="32x32" href={\`${base}/favicon-32.png\`} />`
  - `<link rel="apple-touch-icon" sizes="180x180" href={\`${base}/apple-touch-icon.png\`} />`
  - `<link rel="manifest" href={\`${base}/site.webmanifest\`} />`
- Delete the placeholder `public/favicon.svg` — no references remain after this change.

**Patterns to follow:**
- The existing `${base}` interpolation pattern in `BaseLayout.astro` (the `base` constant is already derived at the top of the frontmatter as `import.meta.env.BASE_URL.replace(/\/$/, '')`).

**Test scenarios:**
- Test expectation: none — pure static markup change. Correctness is verified by `npm run build` succeeding and inspection of the rendered head in `dist/`.

**Verification:**
- `npm run build` succeeds (which runs `astro check`, `astro build`, and `pagefind`).
- `dist/index.html` `<head>` contains the five new link tags with paths under the configured base (e.g. `/home-bartender/favicon.ico` when `SITE_BASE=/home-bartender`).
- `dist/favicon.ico`, `dist/site.webmanifest`, and the PNGs exist at the expected paths.
- `public/favicon.svg` no longer exists.

---

### U4. Render responsive logo + wordmark in the header

**Goal:** Update the `.brand` link so it renders the row-of-glasses logo on a dark chip alongside the "Home Bartender" wordmark on desktop, and swaps to the coupe icon below the `42rem` breakpoint.

**Requirements:** R3, R4, R5

**Dependencies:** U1 (needs the brand images in `public/brand/`)

**Files:**
- Modify: `src/layouts/BaseLayout.astro` (markup inside `.brand` and the corresponding styles in the `<style>` block)

**Approach:**
- Inside the `.brand` anchor, render: a logo wrapper `<span class="brand-mark">` containing two `<img>` tags (one for the row-of-glasses, one for the coupe, each with the appropriate `class` for media-query toggling and `alt=""`), followed by a `<span class="brand-wordmark">Home Bartender</span>`.
- New CSS:
  - `.brand` becomes `display: inline-flex; align-items: center; gap: 0.5rem;`.
  - `.brand-mark` is the dark chip: literal near-black HSL background matching the artwork (proposed: `hsl(240 6% 8%)` — tune in implementation), small radius (`var(--radius-sm)`), tight padding (~`0.25rem 0.4rem`).
  - Logo image heights set in CSS at ~`28px` desktop (constrains the row-of-glasses to ~80px wide given the 2.84:1 aspect) and ~`28px` mobile for the coupe (square).
  - `.brand-mark .logo-full` visible by default; `.brand-mark .logo-coupe` hidden by default. Inside the existing `@media (max-width: 42rem)` block, swap: hide `.logo-full`, show `.logo-coupe`.
- Preserve all other header behavior — nav links, search, sticky positioning, the existing mobile grid template areas.
- `<img>` tags reference `${base}/brand/logo-full.png` and `${base}/brand/logo-coupe.png`.

**Technical design:**

*This sketch is directional only — pixel values and exact CSS shorthand will be tuned in implementation.*

```
.brand                      flex row, gap, link
  └─ .brand-mark            dark chip (rounded near-black bg)
       ├─ <img class="logo-full">    (desktop only)
       └─ <img class="logo-coupe">   (mobile only)
  └─ .brand-wordmark        existing "Home Bartender" text

@media (max-width: 42rem)
  .logo-full  { display: none; }
  .logo-coupe { display: inline-block; }
```

**Patterns to follow:**
- The existing `@media (max-width: 42rem)` block in `BaseLayout.astro` that already restructures `.site-header-row` for mobile — extend it rather than introducing a new breakpoint.

**Test scenarios:**
- Test expectation: none — pure layout/styling work per the project's TDD-skip rule (CLAUDE.md). Correctness is visual and verified manually in dev and against the build artifact.

**Verification:**
- `npm run dev` and visit `/` at desktop width: row-of-glasses logo on a dark chip + "Home Bartender" wordmark, both clickable, both linking to home.
- Resize browser below `42rem` (~672px): logo swaps to coupe; header still fits in one row; wordmark stays beside it; search bar still wraps to its own row per existing rules.
- `npm run build` succeeds; the resulting `dist/index.html` includes the two `<img>` tags and the new CSS.
- Page passes basic visual smoke test in light and dark OS appearance (the dark chip stays the same color in both; surrounding header chrome shifts with the theme).

---

## System-Wide Impact

- **Interaction graph:** Only `src/layouts/BaseLayout.astro` is touched in the application code. Every page using `BaseLayout` (which is every page) inherits the change.
- **Error propagation:** N/A — static assets only.
- **State lifecycle risks:** None.
- **API surface parity:** None — internal layout change.
- **Integration coverage:** Pagefind indexing must continue to work because the build pipeline (`astro check && astro build && pagefind --site dist`) is unchanged. Verified by U3's verification step.
- **Unchanged invariants:** Existing CSS theme tokens, the `prefers-color-scheme: dark` palette, the `42rem` breakpoint behavior for nav/search wrapping, and the `${base}` URL prefix convention are all preserved.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Apple touch icon looks bad if the coupe runs edge-to-edge (iOS Home Screen renders it without a background). | Pre-deferred in Open Questions — inspect during U2; add inset padding in U1 script if needed before final commit. |
| Dark chip looks awkward in dark mode (chip color and page bg are both near-black). | Acceptable for v1 — the chip still has a 1px-radius distinction from the page surround, and the deferred follow-up explicitly covers tightening dark-mode chip treatment if it bothers us. |
| Generated favicon assets drift from source if the source images are replaced without rerunning the script. | The script is committed and the regeneration ritual is documented in the script header. Future maintainers regenerate via `npm run generate-favicons`. |
| `sharp` adds platform-specific binary deps that could fail to install on some CI runners. | `sharp` is a `devDependency` only; CI build (`npm run build`) doesn't invoke favicon generation, just consumes the committed outputs. If `npm ci` fails to install `sharp` on someone's machine they can still build and serve the site. |

---

## Documentation / Operational Notes

- No CHANGELOG entry needed beyond what the merged PR title produces in the auto-release-pr flow.
- README does not currently document branding assets and does not need to start; the script's top-of-file comment is sufficient self-documentation for now.

---

## Sources & References

- Related issue: #31
- Related code: `src/layouts/BaseLayout.astro`, `src/styles/global.css`, `astro.config.mjs`, `scripts/*.mjs`
- Source artwork: `/Users/developer/.claude/image-cache/296913ff-eeb7-47f0-85de-dce2c1ec1a9e/1.png` (coupe, 525×525), `/Users/developer/.claude/image-cache/296913ff-eeb7-47f0-85de-dce2c1ec1a9e/2.png` (row-of-glasses, 1024×360) — copied into `public/brand/` as part of U1
