---
title: Recipe Photos - Plan
type: feat
date: 2026-09-25
topic: recipe-photos
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
---

# Recipe Photos - Plan

## Goal Capsule

- **Objective:** Every recipe Dan photographs shows its cocktail shot as the featured photo and its ingredient lineup on the recipe page, and adding a new batch of photos takes one command and one PR.
- **Product authority:** Dan (repo owner). First batch is Last Word; the rest of the recipe list follows as shots land.
- **Means:** reuse the `hero_image` / `gallery` pipeline, add a batch intake script (KTD1–KTD3), and restyle the detail rail (KTD4, KTD5).
- **Open blockers:** None for U1–U3. U4 needs Dan's unprocessed Last Word originals in `intake/photos/`.
- **Stop conditions:** stop and ask if a change would alter card layout, desktop hero framing, or the `hero_image` / `gallery` schema.
- **Ships via:** feature-branch PR against `staging`, reviewed and merged by Dan.

## Product Contract

### Summary

Standardize two shots per recipe: a cocktail hero and an ingredient lineup. The hero becomes the card and detail photo. The lineup goes in the existing gallery, shown uncropped. On mobile, the two photos share one swipeable frame. A single intake command files a batch of slug-named photos and wires their frontmatter.

### Problem Frame

The `astro:assets` photo pipeline shipped in PR #195, but no recipe has a photo yet. Dan's shots are 3:4 portrait. The gallery frame is 1:1, which cuts the bottle tops or the counter off a lineup shot. On phones the rail stacks above the title, so a lone gallery shot shows as a half-width thumbnail next to an empty cell. Wiring ~70 recipes by hand (move file, edit frontmatter, fix crops) doesn't scale to a shoot-a-batch workflow.

### Key Decisions

- **Lineup shot lives in the existing gallery, not a new field.** Reuses the pipeline #195 already built; no schema change. Governs R3, R4. (session-settled: user-directed — chosen over a dedicated `ingredients_image` beside the ingredient list and over keeping the 1:1 crop.)
- **Mobile shows hero + gallery as one swipe row.** Keeps the title close to the top of a phone screen and still shows the lineup. Governs R5. (session-settled: user-directed — chosen over hiding the gallery on mobile and over stacking full-width photos.)
- **Semantic filename suffix `-ingredients`, not `-2`.** A filename that says what the shot is lets the intake command route it without guessing. Governs R1, R7.
- **Photos live next to the recipe `.md` (existing convention).** No new directory tree. Governs R1.

### Requirements

**Naming and storage**

- R1. A recipe's photos sit beside its markdown file as `<slug>.<ext>` (hero) and `<slug>-ingredients.<ext>` (lineup).
- R2. Committed photos are downscaled at intake to a capped long edge so ~140 photos don't bloat the repo.

**Detail page**

- R3. The gallery frame is 3:4, so a 3:4 lineup shot shows uncropped.
- R4. The lineup image carries descriptive alt text ("Ingredients for <title>"), not an empty alt.
- R5. Below the 700px breakpoint, hero and gallery photos render as one horizontal swipe row: one photo per snap point, the next photo peeking at the edge, and a position indicator. Desktop keeps the current stacked rail.
- R6. Recipes with a hero and no gallery, or no photos at all, look as they do today (no empty swipe row, fallback tile unchanged).

**Batch intake**

- R7. One command ingests every photo in `intake/photos/`: it matches each file to a recipe by slug, moves it beside the recipe, and sets `hero_image` / `gallery` in frontmatter.
- R8. The command refuses files whose slug matches no recipe and reports them, leaving them in place; it never guesses a match.
- R9. Re-running the command for a recipe that already has photos replaces them rather than duplicating gallery entries.

**First batch**

- R10. Last Word ships with both shots wired: `recipes/classics/last-word.*` hero and `last-word-ingredients.*` in the gallery.

### Acceptance Examples

- AE1. **Covers R7, R8.** Given `intake/photos/` holds `last-word.jpg`, `last-word-ingredients.jpg`, and `lst-word.jpg`, when the command runs, then the first two move next to `recipes/classics/last-word.md` with frontmatter set, and `lst-word.jpg` stays in intake with an "unknown slug" report.
- AE2. **Covers R9.** Given Last Word already has `gallery: [./last-word-ingredients.jpg]`, when a new `last-word-ingredients.jpg` is ingested, then the file is replaced and `gallery` still has one entry.
- AE3. **Covers R5, R6.** On a 390px-wide screen, Last Word shows the hero with the lineup peeking at the right edge. Army and Navy (no photos) shows the unchanged fallback tile with no swipe row.

### Scope Boundaries

- Card thumbnails stay hero-only (4:5); the lineup never appears on browse cards.
- No lightbox or zoom.
- No auto-discovery of photos without frontmatter; the build keeps failing loudly on a missing file.
- No camera-roll renaming or EXIF-based matching. Dan names files by slug.

### Dependencies / Assumptions

- Source photos are 3:4 portrait. The hero's 4:5 frame trims ~6% top and bottom, which is acceptable for a centered subject.
- Photos are camera originals ≥1000px wide. The two Last Word shots shared in-session are 896px and 768px wide, and the lineup's label text looks mangled by an AI enhance/upscale pass. Use the unprocessed originals for R10.
- `sharp` is already a devDependency and is available for the R2 downscale.

### Sources / Research

- `src/layouts/RecipeLayout.astro` — hero rail, `.detail-gallery` (1:1 frame), 700px breakpoint.
- `src/components/RecipeCard.astro` — 4:5 card photo.
- `src/content.config.ts` — `hero_image` / `gallery` `image()` schema.
- `docs/plans/2026-09-18-001-feat-recipe-browse-detail-refresh-plan.md` — KD3, the original photo/fallback decisions.
- `scripts/promote.mjs` — existing frontmatter-rewrite script, a pattern for R7.

Product Contract preservation: Product Contract unchanged except that the three Deferred-to-Planning questions are resolved into KTD2, KTD5, and KTD6 and removed.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **Frontmatter is rewritten line by line, mirroring `scripts/promote.mjs`.** Round-tripping through the `yaml` package would reformat every recipe's frontmatter. The script replaces the `hero_image:` and flow-style `gallery:` lines in place and inserts either key just before the closing `---` when it is absent (2 of 29 recipes, e.g. `recipes/classics/smoky-ginger-sour-his.md`). A block-style `gallery:` list is an error that asks for a hand edit, not a guess. Implements R7, R9.
- KTD2. **`sharp` normalizes every photo to JPEG: auto-rotate from EXIF, fit inside 1600px on the long edge without enlarging, quality ~82.** `sharp` is already a devDependency (used by `scripts/prep-icons.mjs`). Its default output strips metadata, which also drops phone GPS tags from committed photos. Implements R2. (session-settled: user-approved — chosen over keeping source format/size: one predictable output and a lean repo.)
- KTD3. **Accepted inputs are `.jpg`, `.jpeg`, `.png`, and `.webp`. `.heic` is rejected with an "export as JPEG" message.** Prebuilt `sharp` binaries lack HEIC decoding. Implements R8. (session-settled: user-approved — chosen over adding a HEIC decoder dependency.)
- KTD4. **Mobile swipe slides are all 3:4. The desktop hero stays 4:5 and cards are untouched.** The sources are 3:4, so the phone hero shows uncropped and both slides line up. Governs R3, R5. (session-settled: user-approved — chosen over 4:5 slides, which would crop the lineup.)
- KTD5. **The swipe row is CSS scroll-snap. The rail gets a `--swipe` modifier only when the gallery is non-empty, and dots come from a tiny client script.** Below 700px the gallery wrapper becomes `display: contents`, so the hero and gallery images are sibling snap slides. A pure `activeSlide()` helper in `src/scripts/` maps scroll offset to a dot index, following `src/scripts/recipeTabs.ts`. Without JS the dots stay static with the first one active. Implements R5, R6.
- KTD6. **`npm run photos` moves files and edits frontmatter but never commits.** Batches ship through the normal feature-branch PR flow in `CLAUDE.md`. (session-settled: user-approved — chosen over auto-commit/PR: keeps git actions explicit.)
- KTD7. **Intake validates the whole batch before touching anything, then processes each valid file and deletes its intake source only after its output and frontmatter are written.** Rejected files stay in `intake/photos/`, and the command exits non-zero when any are rejected. Slugs resolve across `recipes/{classics,originals,seasonal,inbox}/` (the validator guarantees uniqueness). Implements R7, R8.

### Assumptions

- A recipe with a gallery photo but no hero renders as a no-photo recipe: the gallery stays hidden and the fallback tile shows. This is the recommended default for a state R6 does not cover, and it can be overridden at PR review. Applies to U2 and U3.

### High-Level Technical Design

Intake flow (directional):

```mermaid
flowchart LR
  A[intake/photos/*] --> B{parse name}
  B -->|bad ext / unknown slug| R[report, leave in place]
  B -->|slug + role hero/ingredients| C[sharp: rotate, fit 1600, jpeg]
  C --> D[write recipes/&lt;dir&gt;/&lt;slug&gt;[-ingredients].jpg]
  D --> E[rewrite hero_image / gallery lines]
  E --> F[delete intake source]
```

`intake/` is already gitignored, so staged photos never get committed by accident.

---

## Implementation Units

### U1. Photo intake script

**Goal:** `npm run photos` turns a folder of slug-named photos into wired recipe photos.

**Requirements:** R1, R2, R7, R8, R9; AE1, AE2; KTD1, KTD2, KTD3, KTD6, KTD7.

**Dependencies:** none.

**Files:**
- `scripts/photos.mjs` (new)
- `scripts/photos.test.mjs` (new)
- `package.json` (add `photos` script)
- `CLAUDE.md` (Image fields convention: `-ingredients` naming, `npm run photos`, 3:4 gallery)

**Approach:**
1. Pure helpers: parse a filename into `{ slug, role, ext }`, build a slug→recipe-path index, and rewrite frontmatter for a given role (KTD1).
2. An orchestrator with injected `readFile` / `writeFile` / `unlink` / `readdir` / `resize`, mirroring the DI shape of `promote()` in `scripts/promote.mjs`, so tests need no disk or `sharp`.
3. A thin CLI entry that wires the real fs and `sharp` and prints a moved/rejected summary.

**Execution note:** Implement test-first per `CLAUDE.md` TDD rules.

**Patterns to follow:** `scripts/promote.mjs` (DI, line-based frontmatter edits, slug path-separator guard), `scripts/promote.test.mjs`.

**Test scenarios:**
- `last-word.jpg` parses to slug `last-word`, role hero. `last-word-ingredients.JPG` parses to role ingredients (case-insensitive extension).
- `last-word.heic` is rejected with a message naming JPEG export.
- A filename containing `..` or `/` is rejected (path guard).
- Hero rewrite: `hero_image: ""` becomes `hero_image: ./last-word.jpg`. Every other frontmatter line and the body are byte-identical.
- Gallery rewrite: `gallery: []` becomes `gallery: [./last-word-ingredients.jpg]`.
- Covers AE2. Gallery already containing the ingredients entry keeps exactly one entry. Other existing entries are preserved.
- A recipe missing both keys gets them inserted before the closing `---`.
- A block-style `gallery:` list throws a hand-edit error.
- Covers AE1. A batch of `last-word.jpg`, `last-word-ingredients.jpg`, and `lst-word.jpg`: two outputs written next to `recipes/classics/last-word.md`, frontmatter updated, both sources deleted, `lst-word.jpg` untouched and reported, and the result signals failure.
- The resize function is called with the source path and a `.jpg` destination. If resize throws, the source is not deleted and the recipe file is not rewritten.

**Verification:** tests pass. A manual dry run on a scratch copy moves files and edits frontmatter as the tests describe.

### U2. Gallery frame and alt text

**Goal:** The lineup shot shows uncropped on desktop with meaningful alt text.

**Requirements:** R3, R4, R6; KTD4.

**Dependencies:** none.

**Files:** `src/layouts/RecipeLayout.astro`

**Approach:**
1. Change `.detail-gallery img` from 1:1 to 3:4.
2. Replace `alt=""` on gallery images with `Ingredients for {title}`.
3. Center a lone gallery item at single-column width instead of spanning both columns. Spanning would put a ~800px-tall image under the ~750px hero, and the sticky rail would outgrow the viewport and clip the lineup.
4. Raise the gallery `<Image>` to the hero's `widths` set (300/600/900) with `sizes` covering the ~85vw mobile slide, so the lineup's labels stay sharp in both layouts.

**Test expectation:** none — template and styling only. Covered by `astro check` and a visual check.

**Verification:** desktop Last Word shows the full bottle lineup, sharp, without the rail outgrowing the viewport. A recipe with no photos is unchanged.

### U3. Mobile swipe row

**Goal:** Below 700px, hero and gallery photos form one swipeable row with position dots.

**Requirements:** R5, R6; AE3; KTD4, KTD5.

**Dependencies:** U2.

**Files:**
- `src/layouts/RecipeLayout.astro`
- `src/scripts/photoSwipe.ts` (new)
- `src/scripts/photoSwipe.test.ts` (new)

**Approach:**
1. Add a `detail-rail--swipe` class when `galleryItems.length > 0`.
2. Under the 700px media query, `--swipe` makes the rail a horizontal flex scroller with `scroll-snap-type: x mandatory`. Slides are ~85% wide so the next one peeks, and every slide is 3:4. The gallery wrapper becomes `display: contents`.
3. Render dots only for the swipe variant, and hide them above 700px.
4. A client `<script>` in the layout uses `activeSlide()` on scroll to set `aria-current` on the matching dot.
5. Give the swipe container `tabindex="0"` and `aria-label="Recipe photos"` so keyboard users can reach the second slide with native arrow-key scrolling.

**Execution note:** write `activeSlide()` test-first. Verify the CSS visually at 390px.

**Patterns to follow:** `src/scripts/recipeTabs.ts` + its test and the `<script>` import at the bottom of `RecipeLayout.astro`.

**Test scenarios:**
- `activeSlide(0, 300, 2)` returns 0. `activeSlide(300, 300, 2)` returns 1.
- A mid-scroll offset rounds to the nearest slide (149 → 0, 151 → 1).
- A recipe with gallery entries but no `hero_image` renders the fallback tile, no gallery, and no swipe row (per Assumptions; verify visually).
- An offset past the end clamps to `count - 1`. A negative offset (iOS overscroll) clamps to 0.
- A slide width of 0 returns 0 rather than NaN.

**Verification:** Covers AE3. At 390px Last Word swipes between the hero and the lineup with the dot tracking. Army and Navy shows the unchanged fallback tile and no dots. Desktop is unchanged apart from U2.

### U4. Last Word photos

**Goal:** Last Word ships with its hero and lineup photos.

**Requirements:** R10.

**Dependencies:** U1, U2, U3. Blocked on Dan dropping unprocessed originals into `intake/photos/` as `last-word.jpg` and `last-word-ingredients.jpg`.

**Files:**
- `recipes/classics/last-word.md`
- `recipes/classics/last-word.jpg` (new)
- `recipes/classics/last-word-ingredients.jpg` (new)

**Approach:** Run `npm run photos` and commit the outputs plus the frontmatter change.

**Test expectation:** none — content change. `npm run build` resolving both images is the check.

**Verification:** Last Word's card and detail page show the photos. `hero_image` and `gallery` point at the new files.

---

## Verification Contract

- `npm test` — Vitest, including the new `scripts/photos.test.mjs` and `src/scripts/photoSwipe.test.ts`. CI gates this on the PR (`.github/workflows/test.yml`).
- `npm run validate` — recipe frontmatter/structure after U4.
- `npm run build` — `astro check` plus image resolution. This is the only gate that proves `hero_image` / `gallery` paths resolve, and PR CI does not run it, so run it locally.
- Visual: `npm run dev`, check Last Word and one no-photo recipe at desktop width and at 390px.

## Definition of Done

- R1–R9 are met, with U1–U3 merged via PR to `staging`. R10 is met once U4 lands, in the same PR if the originals arrive in time, otherwise a follow-up PR.
- Every test scenario above exists and passes. `npm run build` is green.
- `CLAUDE.md`'s "Image fields" convention is updated: 3:4 gallery, `-ingredients` naming, and `npm run photos`.
- No leftover experimental code or unused CSS from abandoned approaches.
