---
date: 2026-05-23
topic: site-and-pipeline
focus: efficiencies and room for improvement in structure / devops
mode: repo-grounded
---

# Ideation: Home Bartender Site & Pipeline

## Grounding Context

**Stack:** TypeScript + Astro 6 + Tailwind + Pagefind, deployed to GitHub Pages.

**Pipeline:**
- `npm run validate` (scripts/validate.mjs): taxonomy enums, cross-refs, slug uniqueness, dir/category match
- `npm test` (Vitest)
- `npm run build`: `astro check` + `astro build` + Pagefind index
- `.github/workflows/test.yml`: PR + staging/main pushes — runs `npm test`
- `.github/workflows/deploy.yml`: push to main → validate → test → build → upload → Pages
- `.github/workflows/auto-release-pr.yml`: push to staging → upserts release PR with bot-maintained HTML-comment-delimited managed block
- `.github/workflows/release-changelog.yml`: merge to main → tag release + open CHANGELOG PR

**Notable pain points (from CLAUDE.md and a scan):**
- Manual inbox→category promotion (3 coordinated edits + `git mv`); `src/pages/inbox.astro` references an `npm run publish` script that doesn't exist
- Two enum sources of truth: `src/content.config.ts` (Zod) and `scripts/validate.mjs` (validator) — CLAUDE.md instructs contributors to keep both in sync
- Email→PR ingestion has a manual gh-token fallback when permissions fail
- No PR preview deploys (GitHub Pages doesn't support them natively)
- Release PR body requires careful handling around HTML comment markers
- Pagefind only built on production deploy; dev/local search is broken
- CI doesn't cache `node_modules` or `.astro/data-store.json`

**Past learnings:** None recorded — `docs/solutions/` does not exist. Capturing this ideation's followups via `/ce-compound` is a candidate seed.

**External research highlights:**
- Astro Content Layer API + `.astro` cache: reportedly 10min → 30s in CI when cached on content-file hashes
- Cloudflare Pages free tier provides native per-PR preview URLs as a drop-in GH Pages alternative
- `release-please` / `changesets` are designed for npm packages; the bespoke staging→main release PR here is right-sized
- Pagefind is the correct search choice for this catalog size; known gaps are dev-mode parity and no typo tolerance
- husky + lint-staged or Lefthook are the standard pre-commit patterns
- markdownlint catches body-structure issues Zod can't see

## Topic Axes

1. Authoring & inbox flow
2. Validation & schema integrity
3. CI & deploy pipeline
4. Release & changelog automation
5. Site experience & search

## Ranked Ideas

### 1. Single-source taxonomy registry
**Description:** Collapse Zod enums (`src/content.config.ts`) and validator canonical sets (`scripts/validate.mjs`) into one `src/taxonomy.ts` (or `data/taxonomy.yaml`). Both files import from it; adding "mezcal" or "yuzu" is a one-line edit. Optionally generate TEMPLATE.md's reference tables from the same source.
**Axis:** Validation & schema integrity
**Basis:** `direct:` CLAUDE.md: *"When introducing a new enum value (a new spirit, flavor, occasion, etc.), update **both** `src/content.config.ts` and `scripts/validate.mjs` in the same change."*
**Rationale:** Two registries that must agree drift by definition; the repo encodes the discipline in docs because it can't enforce it in code. One file flips this from "remember to update two places" to "edit one array." Compounds: every future surface that needs the taxonomy (filter chips, structured editor dropdowns) binds to the same source.
**Downsides:** Touches build module resolution; might require converting `validate.mjs` to TS, or sharing via a generated artifact with a CI staleness check.
**Confidence:** 90%
**Complexity:** Low
**Status:** Explored (handed off to ce-brainstorm 2026-05-23)

### 2. One-command inbox promotion (`npm run promote <slug>`)
**Description:** A small Node script that takes a slug, locates `recipes/inbox/<slug>.md`, mutates frontmatter (`category` → singular form, `publish: false` → `true`), `git mv`s it to the matching category dir, re-runs `npm run validate`. Optional `--category` override and `--pr` flag that opens the branch + PR via `gh`.
**Axis:** Authoring & inbox flow
**Basis:** `direct:` CLAUDE.md Recipe Pipeline §3: *"manually: (a) move the file to the matching category dir, (b) change `category:` to the singular form, (c) flip `publish: true`. There is no `npm run publish` script despite what `src/pages/inbox.astro` currently claims."*
**Rationale:** Inbox is the highest-traffic mutation path and the most error-prone step (three coordinated edits + a manual `git mv`). The fix also closes a documented UI lie: `src/pages/inbox.astro` advertises a script that doesn't exist.
**Downsides:** Adds another script to maintain — but the surface is tiny and easy to test.
**Confidence:** 90%
**Complexity:** Low
**Status:** Unexplored

### 3. DX hardening bundle: pre-commit + Astro CI cache + named gates + auto-tag
**Description:** Four small wins shipped as one thread. (a) Lefthook (or husky) pre-commit hook running `npm run validate --files` on staged `.md` files. (b) Cache `node_modules` and `.astro/data-store.json` in `deploy.yml` keyed on `hashFiles('recipes/**', 'sections/**', 'package-lock.json')`. (c) Restructure `deploy.yml` jobs as named go/no-go gates emitting structured summary lines ("HOLD: pagefind, index grew 340%"). (d) Auto-tag on main merge: `git tag v$(date +%Y%m%d) && git push --tags`.
**Axis:** CI & deploy pipeline
**Basis:** `external:` walterra.dev reports `.astro` cache cuts builds 10min → 30s. `withastro/action` defaults `cache: true`. `direct:` `.github/workflows/deploy.yml` uses raw `actions/setup-node@v4` + `npm ci` + `npm run build` with no `.astro` cache.
**Rationale:** Each piece individually is small; together they compress the inner loop dramatically and make CI failures legible instead of opaque. Pre-commit catches the 80% case (taxonomy + ref errors) in <5s vs the 90s CI roundtrip. The cache pays back every push forever. Named gates make the next regression a one-glance diagnosis.
**Downsides:** Lefthook adds a binary dependency (some find this friction outweighs benefit on small repos). Mis-keyed cache can mask test flakes. Auto-tag adds noise to the tag list.
**Confidence:** 85%
**Complexity:** Low-Medium
**Status:** Unexplored

### 4. PR preview deploys + visual regression
**Description:** Add Cloudflare Pages free tier as a parallel build target for per-PR preview URLs (GitHub Pages has no native PR previews). Add a Playwright job that takes screenshots at three viewports for recipes whose source files changed in the PR, posting before/after thumbnails as a sticky bot comment. Production stays on GitHub Pages or migrates fully.
**Axis:** CI & deploy pipeline + Site experience & search
**Basis:** `external:` Cloudflare Pages provides native per-PR preview URLs at zero ongoing cost; Playwright `toHaveScreenshot()` scoped to changed files keeps CI bounded. `direct:` `.github/workflows/deploy.yml` only deploys on push to main; no preview workflow exists.
**Rationale:** Recipe rendering bugs (broken images, ingredient-list wrap, list-bullet drift in Tailwind prose) are invisible to type-checks and frontmatter validators. Today's review is "read the YAML and trust the renderer." Preview URLs convert that into "click and verify." Visual regression catches the next CSS change that silently breaks a recipe layout. Together they close the highest-payoff DX gap after the inner loop.
**Downsides:** Adds Cloudflare as a second host (auth, domain config, cost-cap on free tier). Visual baselines live in repo and need rebaseline discipline. Fork PRs may have token issues for the bot comment.
**Confidence:** 75%
**Complexity:** Medium
**Status:** Unexplored

### 5. Body-structure linter (markdownlint + custom rules)
**Description:** Add `markdownlint-cli2` with a config asserting structural rules: every published recipe has `## Ingredients` and `## Steps`, has `## House-Made …` when an ingredient line references a known house syrup, and ingredient lines parse as a list. Wire into `npm run validate` and pre-commit.
**Axis:** Validation & schema integrity
**Basis:** `direct:` CLAUDE.md Recipe Pipeline §2: *"the body has at minimum `## Ingredients` and `## Steps` (plus `## House-Made …`, `## How to Batch It`, `## Notes` where relevant)"* — but no automation enforces it. `scripts/validate.mjs` only reads frontmatter.
**Rationale:** Zod validates frontmatter shape but never the body. A recipe could render today with no ingredients and pass every gate. Body linting is the most likely silent-bad-content failure mode and the cheapest to catch in CI. Pairs naturally with #1: the linter could also flag ingredient references to syrups whose `## House-Made` section is missing.
**Downsides:** Defines a "publishable recipe" contract beyond frontmatter — needs alignment on which sections are mandatory vs warned. False positives on legitimate exceptions (a built drink with no shake step).
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

### 6. Component primitives + ingredient ontology
**Description:** Two-stage architectural shift. **Stage A:** replace freeform `## Ingredients` / `## Steps` markdown sections with typed Astro components (`<Ingredients>`, `<Steps>`, `<BatchTable>`, `<HouseMade>`). Each section becomes structured data with one source of truth for layout. **Stage B:** introduce a third content collection `ingredients/` where each ingredient is a typed entity (`mezcal-vida.md`, `lime-juice.md`, `demerara-syrup.md`) with attributes (type, abv, sweetness, common-substitutes). Recipes reference ingredient slugs by ID; validator extends to verify refs.
**Axis:** Authoring & inbox flow + Site experience & search
**Basis:** `reasoned:` Today every recipe re-invents ingredient/step layout in prose. Once sections are components, layout changes ship in one file and ingredient quantities become queryable data. Once ingredients are a collection, one data investment unlocks: shopping-list aggregation, "what can I make tonight" filter (bar-inventory join), substitution suggestions, ingredient-pivot pages ("all mezcal recipes"), and a future API. Without it, every one of those features re-parses freeform ingredient strings.
**Downsides:** Highest-cost item on this list. Requires a one-time migration of every existing recipe to component invocations + ingredient extraction. Risk of over-engineering if downstream surfaces never materialize. Stages A and B can ship independently — Stage A alone is a meaningful win.
**Confidence:** 65%
**Complexity:** High
**Status:** Unexplored

### 7. Public `/releases/` page on the site
**Description:** Have `auto-release-pr.yml` also emit `data/releases.json` (or `content/releases/<date>.md`) with the same categorized breakdown + Closes list it puts in the PR body. Astro renders `/releases/[date]/` from it as a public, permalinked changelog. Optional homepage "what's new" callout.
**Axis:** Release & changelog automation + Site experience & search
**Basis:** `reasoned:` The auto-release-pr workflow already gathers + categorizes the PR breakdown. The data exists; only the destination is GitHub-locked. Mirroring it to a site page is mostly free and survives repo migration. Deliberately does NOT touch the just-shipped HTML-comment managed-block contract — that gets to bake.
**Rationale:** Surfaces work the user already does as a reader-facing artifact. Compounds: recipe-level "added in vYYYYMMDD" badges, RSS for power users, "what's new" homepage section.
**Downsides:** Introduces a new content type with its own layout/SEO concerns; risks scope creep into "site has a blog now" territory. Lowest-confidence survivor because the user just spent serious effort on the release pipeline — adding another mirror right now might be too soon.
**Confidence:** 60%
**Complexity:** Low-Medium
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| G | Pagefind dev parity + index caching | Borderline value; caching half overlaps with #3's `.astro` cache work |
| H | Release-PR managed-block sidecar / SHA verification | Release pipeline just shipped (`c5ce8bf`, `233259d`) — let it bake before re-architecting |
| I | Collapse staging→main + delete release workflow | Same — undoes a deliberate, recently-merged design choice |
| L | Stable HB-NNNN IDs + typed relationship graph | Real value but `related[]` works today; defer until a rename actually breaks something |
| M | JSON API export of recipe collection | Hypothetical until a consumer exists; ship when first downstream surface is real |
| N | Replace Pagefind with client-side Fuse.js | Defensible reframe for a small catalog but speculative without prototype |
| O | Web-form recipe ingestion | Requires auth + hosting; email→PR works for a rare ingestion path |
| P | `npm run prep` mise-en-place manifest | Redundant with Astro Content Layer's `.astro/data-store.json` |
| R | `tested:` frontmatter + preprint-style lifecycle | Content/UX scope rather than pipeline — better as separate ideation |
| S | Per-recipe PDF print cards | Site/product feature; scope mismatch with "pipeline & structure" focus |
| T | `/ask/` bartender-agent query endpoint | Site/product feature; scope mismatch |
| U | Recipes as git submodules / per-contributor forks | Premature for a solo project; introduces real ops cost for hypothetical scale |
| V | Commit-to-publish (kill inbox entirely) | Subsumed by #2 — keep the inbox concept, automate the ritual |
| W | Portable `dist-portable.zip` build mode | Low value vs cost; GitHub itself is the disaster-recovery layer |
| F (folded) | markdownlint body-structure linter | Surviving as #5 |

## Next Steps

This ideation produced 7 survivors across all five axes. Three (#1, #2, #5) are low-complexity, high-confidence wins ready for `ce-brainstorm` → `ce-plan` immediately. Two (#3, #4) are bundles where the brainstorm step matters — picking which sub-pieces ship together vs separately. Two (#6, #7) are bigger architectural bets worth more scoping discussion before committing.
