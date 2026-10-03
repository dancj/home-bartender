---
title: Syrups & Mixers Section - Plan
type: feat
date: 2026-10-02
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Syrups & Mixers Section - Plan

## Goal Capsule

- **Objective:** A visitor finds house syrups and mixers (starting with Peach Syrup and Super Juice) in their own top-level area, separate from the cocktail recipes on the home page.
- **Means:** A third content collection `syrups` (`syrups/*.md`) with an index page at `/syrups/` and detail pages at `/syrups/<slug>/`; Super Juice moves from `sections/` into it and keeps its calculator.
- **Authority:** GitHub issue #223 > settled decisions below > this plan.
- **Stop conditions:** Stop if moving Super Juice breaks the `/learn/` index build in a way that needs more than repointing its link.
- **Ships as:** one PR from `feat-223-syrups-section` into `staging`, body `Closes #223`. Not merged by the agent.

## Product Contract

### Summary

New "Syrups" area for house-made syrups and mixers, seeded with the user's Peach Syrup and the existing Super Juice page.

### Problem Frame

The home page is the cocktail collection. Standalone preps like a macerated peach syrup or super juice aren't cocktails and don't fit the recipe schema (glass/method/ice are required). They need their own home.

### Requirements

- **R1.** `/syrups/` lists every published syrup/mixer as a link with its title and blurb.
- **R2.** `/syrups/peach-syrup/` shows the Peach Syrup from issue #223: title, blurb, yield, ingredients (2 ripe peaches, ¾ cup sugar, ¾ cup water), maceration steps, and a note that maceration keeps fresher peach flavor than boiling.
- **R3.** `/syrups/super-juice/` renders the existing Super Juice prose plus `SuperJuiceCalculator`.
- **R4.** `/learn/super-juice/` redirects to `/syrups/super-juice/`; the Learn index's Super Juice chapter links to the new URL.
- **R5.** Primary nav gets a "Syrups" link, marked current on `/syrups/*`.
- **R6.** Cocktail recipe pages, `/recipes.json`, and recipe validation are unchanged.

### Scope Boundaries

- Out: linking cocktails' `house_made` blocks to syrup pages (YAGNI until a syrup is reused).
- Out: taxonomy/filters/icons for syrups; validator rules for the syrups collection (Zod covers shape).
- Out: intake paths (email/issue form/ingest) for syrups — add when a second syrup arrives that way.

### Assumptions

- Route name `/syrups/`, nav label "Syrups" (covers mixers too; short tab label).
- Peach Syrup hero image: pull the issue's photo into `syrups/peach-syrup.jpg` if downloadable; otherwise omit (no fabricated paths).
- Learn index keeps its Super Juice chapter (condensed teaser + calculator) — only the "Full chapter" link moves.

## Key Technical Decisions

- **KTD1 — Separate collection, not recipes.** (session-settled: user-directed — "a whole separate area of syrups and mixers"; rejected: recipe under `recipes/originals/`.) New `syrups` collection with its own minimal schema.
- **KTD2 — Peach Syrup is the user's own creation.** (session-settled: user-directed.) No attribution block; schema doesn't carry one.
- **KTD3 — Super Juice lives in syrups.** (session-settled: user-directed — "and the super juices too"; rejected: leave under /learn only.) `git mv sections/super-juice.md syrups/super-juice.md`; redirect old URL via `astro.config.mjs` `redirects`, same pattern as the roots rename.
- **KTD4 — Schema:** `{ title, blurb, publish (default true), yield?, ingredients[] (default []), steps[] (default []), hero_image? }`. Super Juice uses only title/blurb + body prose; Peach Syrup uses structured fields plus a `## Notes` body.
- **KTD5 — Pages:** `src/pages/syrups/index.astro`, `src/pages/syrups/[slug].astro` (generic, excludes `super-juice`), `src/pages/syrups/super-juice.astro` (dedicated, mirrors current learn page + calculator). Reuse `BaseLayout` and `learn-prose.css`.

## Implementation Units

### U1. Syrups collection + Peach Syrup content
- Files: `src/content.config.ts`, `syrups/peach-syrup.md`, `syrups/super-juice.md` (moved from `sections/`).
- Exclude `super-juice` from `learn/[slug].astro` dedicated set no longer needed (section gone) — remove that slug.

### U2. Pages + nav + redirect
- Files: `src/pages/syrups/index.astro`, `src/pages/syrups/[slug].astro`, `src/pages/syrups/super-juice.astro` (moved from `src/pages/learn/super-juice.astro`), `src/layouts/BaseLayout.astro`, `astro.config.mjs`, `src/pages/learn/index.astro`, `src/styles/learn-prose.css` (comment only).

### U3. Docs
- `CLAUDE.md` Directory Structure: add `syrups/`.

## Verification

- Execution note: units are content, schema, and page wiring — TDD skip category (boilerplate wiring / content). No new pure logic; no new unit tests.
- `npm test` stays green; `npm run validate` green; `npm run build` (astro check + build) succeeds and emits `dist/syrups/index.html`, `dist/syrups/peach-syrup/index.html`, `dist/syrups/super-juice/index.html`, and a redirect at `dist/learn/super-juice/index.html`.
- Browser check: nav shows Syrups; peach syrup page renders ingredients/steps; super juice calculator works at new URL.
