---
title: "feat: Agent-friendly site — llms.txt, recipes.json, shareable bar URL"
date: 2026-07-22
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
origin: "GitHub issues #149, #150, #151"
---

# feat: Agent-friendly site — llms.txt, recipes.json, shareable bar URL

## Summary

Close issues #149, #150, #151: add a static `llms.txt`, a build-time `recipes.json` endpoint, and a shareable `?bar=` URL param for My Bar. All three make the GitHub Pages site easier for LLMs/agents to consume. Three independent implementation units, one PR.

---

## Problem Frame

The site is human-browsable only. Agents have no discovery file (#149), no machine-readable recipe list (#150), and bar inventory is locked in localStorage so it can't be pasted into an LLM or shared (#151).

## Requirements

- R1 (#149): `llms.txt` served at the site root describing purpose, recipe index URL, and license.
- R2 (#150): `recipes.json` served at the site root listing every published recipe with title, slug, spirits, method, difficulty, flavors, blurb, and absolute URL; generated at build time.
- R3 (#151): `?bar=slug,slug` on the index pre-populates My Bar selections (persisted to localStorage as normal); a share affordance copies the current URL with the bar param.

## Assumptions

Headless run — recorded instead of asked:

- A1: `recipes.json` uses lowercase taxonomy slugs (`mezcal`, `shaken`) rather than the issue's display-cased examples — machine consumers want canonical enum values; keys follow the issue (`spirits` pluralized to match the schema, `description` → `blurb` naming kept as `description` in output per issue).
- A2: Only `publish: true` recipes appear in `recipes.json` (inbox drafts stay hidden, same as the site index).
- A3: `?bar=` **replaces** the stored bar on load (that's the sharing semantic); after a successful apply the param is stripped via `history.replaceState` (mirroring `writeFilters`' merge-safe pattern) so a stale param can't silently revert later bar edits on reload/back-forward; unknown slugs are dropped; an empty/absent param changes nothing.
- A4: `llms.txt` content per issue #149, plus one line pointing at `recipes.json` (it exists once U2 lands and is exactly what an agent reading llms.txt wants next).
- A5: On GitHub Pages the "site root" is the project base (`/home-bartender/llms.txt`) — Astro's `public/` and `src/pages/` both land there; that satisfies the issues' intent. Known limitation: agents probing the *domain* root (`dancj.github.io/llms.txt`) won't find it — uncontrollable on a project Pages site.

## Key Technical Decisions

- **KTD1 — `public/llms.txt` static asset.** Astro copies `public/` verbatim into `dist/`. No code, no build step.
- **KTD2 — `src/pages/recipes.json.ts` static file endpoint.** Astro's `GET` endpoint with `getCollection('recipes')` renders once at build. URL built from the endpoint context's `site` (`.ts` endpoints have no `Astro` global — use the `APIContext` argument or `import.meta.env.SITE`) + `import.meta.env.BASE_URL` (config already derives both from `GITHUB_REPOSITORY`). Reuse `publishedRecipes()` and `recipeUrl()` from `src/lib/recipes.ts` where possible instead of re-implementing the publish filter and URL shape. The row-mapping logic lives in a pure `src/lib` module (repo convention: `astro:content`-free libs so vitest node env can test them — see `myBar.ts`, `related.ts` header comments).
- **KTD3 — `?bar=` handled in the existing index script + pure helpers in `src/lib/myBar.ts`.** Reuse `parseOwnedSpirits`-style validation against the full `SPIRITS` taxonomy. The index page's `writeFilters` already seeds from `location.search` and deletes only filter keys, so `bar` survives chip clicks untouched. Share button uses `navigator.clipboard.writeText`.

---

## Implementation Units

### U1. Add llms.txt

**Goal:** Discovery file at site root (issue #149).
**Requirements:** R1.
**Dependencies:** none.
**Files:** `public/llms.txt`.
**Approach:** Verbatim content from issue #149 (title, one-line description, recipe-list URL, CC BY 4.0 license line), plus a `## Data` line linking `https://dancj.github.io/home-bartender/recipes.json` (A4).
**Test scenarios:** Test expectation: none — static asset, no behavior. Verify by presence in `dist/` after `npm run build`.
**Verification:** `dist/llms.txt` exists after build with expected content.

### U2. recipes.json static endpoint

**Goal:** Machine-readable full recipe list (issue #150).
**Requirements:** R2.
**Dependencies:** none.
**Files:** `src/lib/recipesJson.ts` (new, pure), `src/lib/recipesJson.test.ts` (new), `src/pages/recipes.json.ts` (new endpoint).
**Approach:** Pure `recipeToJson(entry-shaped record, siteBase)` mapper in `src/lib/recipesJson.ts` taking `{ slug, title, blurb, spirits, method, difficulty, flavors }` plus a site+base prefix and returning the issue-#150 object shape (`url` = `<prefix>/recipes/<slug>/`). Endpoint uses the existing `publishedRecipes()` helper from `src/lib/recipes.ts` for the publish filter and mirrors `recipeUrl()`'s slug/trailing-slash handling (that file imports `astro:content`, so the pure mapper can't import it directly — keep the mapper standalone but note the parity), derives slug from the collection entry id basename (matches how recipe pages route), maps, and returns `new Response(JSON.stringify(...))` with `content-type: application/json`. Slug values stay taxonomy-canonical (A1).
**Execution note:** TDD the mapper (repo mandate); the endpoint is thin wiring over it.
**Patterns to follow:** `src/lib/myBar.ts` (pure-lib convention + header comment style), existing `src/lib/*.test.ts` vitest shape.
**Test scenarios:**
- Happy path: full recipe record maps to the documented key set with absolute URL ending `/recipes/<slug>/`.
- Edge: empty `flavors`/`spirits` arrays pass through as `[]`, not dropped.
- Edge: base prefix with and without trailing slash produces a single-slash URL.
- Filtering: a `publish: false` record is excluded from the collection output (mapper-level or endpoint-level list helper).
**Verification:** `npm test` green; after `npm run build`, `dist/recipes.json` exists, parses, and contains only published recipes.

### U3. Shareable bar URL via ?bar=

**Goal:** Bar inventory shareable/paste-able via URL (issue #151).
**Requirements:** R3.
**Dependencies:** none (independent of U1/U2).
**Files:** `src/lib/myBar.ts` (add helpers), `src/lib/myBar.test.ts` (extend), `src/pages/index.astro` (wire param + share button).
**Approach:** Add pure helpers to `myBar.ts`: `parseBarParam(raw: string | null, validSlugs)` → CSV to validated, deduped slug array (empty/absent → `null` meaning "no-op"), and `buildBarShareUrl(currentHref, owned)` → href with `bar` param set (or removed when bar empty). In the index init script, before the first `apply()`: read `?bar=`; when it parses to a non-null list, call `writeOwned(list)` (persists to localStorage per existing path, A3). Add a "Share bar" button in the My Bar drawer markup; click handler copies `buildBarShareUrl(location.href, owned)` via `navigator.clipboard.writeText`, flipping the button label to "Copied" only in the promise's resolve branch ("Copy failed" on rejection — unfocused document / denied permission). After the init-time `?bar=` apply succeeds, strip the `bar` param via `history.replaceState` (A3).
**Execution note:** TDD the two helpers; DOM wiring follows the page's existing untested-script convention.
**Patterns to follow:** `parseOwnedSpirits` (validate against full `SPIRITS`, tolerate junk), `writeFilters` merge-safe URL handling, existing chip/button markup in the My Bar drawer.
**Test scenarios:**
- Happy path: `"mezcal,bourbon,gin"` → `["mezcal","bourbon","gin"]`.
- Edge: unknown slugs dropped (`"mezcal,vodka-of-doom"` → `["mezcal"]`); duplicates deduped; whitespace around commas tolerated.
- Edge: `null`, `""`, and all-invalid input → `null` (caller must not wipe stored bar).
- Share URL: owned list lands as comma-joined `bar` param; existing params (`?sort=`, filters) preserved; empty owned removes the `bar` param.
**Verification:** `npm test` green; loading `/?bar=mezcal,bourbon` marks those chips pressed and persists; share button copies a URL that round-trips.

---

## Scope Boundaries

Out of scope: per-recipe JSON endpoints, JSON-LD/schema.org markup, sitemap changes, OpenAPI descriptions, reading `?bar=` on any page other than the index.

### Deferred to Follow-Up Work

- Extending `recipes.json` with ingredients/steps (issue #150's schema doesn't ask for them; add later if agents need full specs).

## Risks & Dependencies

- `Astro.site` is undefined in local dev (`SITE_URL`/`GITHUB_REPOSITORY` unset) — the endpoint must fall back gracefully (relative URLs or empty-string prefix) so `npm run build` locally doesn't crash. Covered by U2's base-prefix test.
- Clipboard API requires secure context — GitHub Pages is HTTPS; localhost is exempt. No fallback needed.

## Definition of Done

- `npm test` and `npm run build` pass.
- `dist/llms.txt` and `dist/recipes.json` present and correct after build.
- `?bar=` pre-populates and persists My Bar; share button copies a working URL.
- Issues #149, #150, #151 closable by the PR (`Closes` keywords in PR body).
