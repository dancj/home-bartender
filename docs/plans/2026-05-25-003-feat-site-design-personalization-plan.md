---
title: "feat: Personalize site design (light, minimalist, playful, elegant)"
created: 2026-05-25
status: active
type: feat
depth: Standard
issue: 10
---

# feat: Personalize site design (light, minimalist, playful, elegant)

> Closes #10. Refreshes the visual identity of the home-bartender site end-to-end: typography pairing, signature palette on a warm-light surface, distinctive recipe spec block + ingredients/steps treatment, and editorial flourishes that nod to bar craft without being kitschy. Builds on the existing coupe-glass logo (shipped in #31) and the shadcn-style token architecture.

---

## Problem Frame

The site currently uses a fairly default/template aesthetic. Typography reads as system-default, the palette is uncommitted neutrals, and card/list/spec patterns follow generic recipe-site conventions. Nothing in the visual treatment ties to cocktails or bar craft. The brand mark (coupe-glass logo) shipped recently but the rest of the site doesn't reflect that voice.

**Goal:** Make the site feel distinctive, light, minimalist, and quietly playful — a personal collection with editorial polish, not a generic recipe directory.

**Inspiration references (user-named):**
- `firefox.com/en-US/` — playful visuals, big rounded cards, soft tinted surfaces.
- `apple.com/iphone/` — confident light theme, generous whitespace, near-white cards lifted from a slightly darker page surface.

**Not in this plan (deferred or out of identity):**
- Logo or brand-mark rework (shipped in #31).
- Content schema or recipe data model changes.
- Spec-icons work (mentioned in #10 — deferred to a follow-up issue).
- Search redesign (Pagefind chrome may pick up new tokens but is not redesigned).

---

## Key Technical Decisions

1. **Light theme only.** Drop the `prefers-color-scheme: dark` branch in `src/styles/global.css`. Frees the design to tune contrast, saturation, surface warmth, and shadow palette for one mode. (Confirmed with user.)

2. **Direction doc first.** Before any CSS, write `docs/design/direction.md` capturing the chosen type pairing, palette swatches, motif/illustration approach, card/radius vocabulary, and editorial-treatment notes, with the two inspiration sites and food-pub references (Punch, Imbibe, Bon Appétit) anchored as touchpoints. The doc is reviewable, gets committed, and serves as the brief for every downstream unit. (Confirmed with user.)

3. **Token rename for utility friendliness; semantic names preserved.** The current shadcn-style architecture defines colors in `:root` (e.g., `--bg: 0 0% 100%` as raw HSL triplets) and consumes them as `hsl(var(--bg))` across 9 files. To make utilities resolve cleanly under decision #4, tokens move into `@theme` with Tailwind v4's `--color-*` prefix (e.g., `--color-bg: hsl(...)`, `--color-surface: hsl(...)`). This produces utility classes like `bg-bg`, `bg-surface`, `text-fg-muted`. The semantic names hold (`--bg`, `--surface`, `--fg`); only the prefix and value-shape change. The 9 consuming files get swept once in U2 (mechanical find/replace of `hsl(var(--X))` → `var(--color-X)` or removal in favor of utilities).

4. **Utility-first via Tailwind v4, with custom CSS scoped to what utilities can't reach.** The repo already has Tailwind v4 wired (`@tailwindcss/vite`) and `@theme` will expose the token layer post-U2. Markup-level utilities become the default styling location — read the markup, see the styles, no cross-file hunt. Per-file `<style>` blocks shrink to the cases utilities cannot reach: typography systems applied to markdown-rendered DOM (`recipe-body :global(...)`, `prose :global(...)`), pseudo-element flourishes (drop cap `::first-letter`, dividers `::before`), Pagefind third-party DOM theming, and the chevron pseudo-element on the `<details>` filter toggle. When a utility class string exceeds ~80 chars or is repeated 3+ times across files, extract a component class in `global.css` via `@apply`. (User preference: "making code styling explicit in one place.")

5. **Type pairing chosen in the direction doc, not the plan.** Research returned a defensible default (keep Newsreader for body; consider Fraunces or Right Grotesk for display) but the final pick belongs in the direction doc unit so the user can affirm or redirect on visual evidence before the implementation units lock it in. (See [`Open Questions / Assumptions`](#open-questions--assumptions) for the candidate set.)

6. **Editorial treatments are additive primitives, not bespoke per-page CSS.** Drop caps, section dividers, pull quotes get implemented as reusable classes (`.drop-cap`, `.divider-bar`, `.pull-quote`) or via `recipe-body :global(...)` selectors so they land everywhere consistently and any future recipe page picks them up free.

---

## Output Structure

```
docs/
  design/
    direction.md                       (new — U1)

src/
  styles/
    global.css                         (rewrite — U2)

  layouts/
    BaseLayout.astro                   (refresh — U4)
    RecipeLayout.astro                 (refresh — U5)

  components/
    RecipeCard.astro                   (refresh — U3)

  pages/
    index.astro                        (refresh — U6)
    inbox.astro                        (refresh — U7)
    learn/index.astro                  (refresh — U7)
    learn/[slug].astro                 (refresh — U7)
    by-difficulty/[difficulty].astro   (verify — U7)
    by-flavor/[flavor].astro           (verify — U7)
    by-occasion/[occasion].astro       (verify — U7)
    by-spirit/[spirit].astro           (verify — U7)
    by-tag/[tag].astro                 (verify — U7)
```

---

## Implementation Units

### U1. Write `docs/design/direction.md`

**Goal:** Commit a reviewable design-direction document the rest of the plan executes against. This is the "mood board" #10 calls for, in markdown form.

**Requirements:** #10 — "Establish a small set of brand anchors: 1-2 typefaces, a signature accent color, a texture or motif"; "first step is probably a mood board / direction exploration before any code changes."

**Dependencies:** None.

**Files:**
- `docs/design/` (new directory)
- `docs/design/direction.md` (new)

**Approach:** Single-page direction doc with these sections:
- **References** — link Firefox + Apple iPhone, plus 2–4 food-craft references (Punch, Imbibe, Bon Appétit recipe pages) with one-line "what we're borrowing."
- **Voice** — 3–5 adjectives that govern the visual language (e.g., "warm, considered, quietly playful, editorial, hand-crafted-not-handmade").
- **What this is NOT** — name at least two specific things that would be correct for Bon Appétit / Punch / Imbibe but wrong here (e.g., "no hero photography on recipe pages — coupe-glass logo carries the brand image; no decorative botanical illustration; body text doesn't warm into brown — stays near-black on cream so type carries the editorial weight"). This is the AI-slop guard — without it, the candidate palette (cream + amaro red + serif + drop caps) defaults to "competent cocktail blog" territory. Anchor the visual moves back to the coupe-glass logo so the redesign reads as *this site's* personality, not the genre's.
- **Typography** — chosen display + body pairing with rationale and rejected alternatives. See [`Open Questions / Assumptions`](#open-questions--assumptions) for the candidate set. Include specific weights, line-heights, and size scale at body / h3 / h2 / h1 / hero.
- **Palette** — named tokens with hex values: warm-cream background (Pantone 2026 Cloud Dancer-adjacent, e.g., `#F5F0E8`), lifted near-white card surface, warmed near-black text (`#1A1612` not `#000`), single primary accent (cocktail-craft-adjacent — amaro red `#A23E2C` is the research-default), optional secondary used <10% of the time. Swatches inline as colored markdown code-spans or a small SVG sheet. **Required:** WCAG AA contrast ratios listed for every text/background pair and for the accent used as text on cream and on the accent's own fill.
- **Radius + surface vocabulary** — chosen radius scale (research says 20–28px for content cards reads "playful + elegant"; pills/chips stay at 999px), shadow vs border preference (no border + soft long shadow is the inspiration-site default), hover treatment (lift + tint, no scale).
- **Motion** — default transition duration + easing for micro-interactions (e.g., 150ms ease-out), specific values for the card lift (e.g., 200ms ease), and the named tokens that hold them (`--transition-base`, `--transition-lift`). Required because per-unit motion choices will drift otherwise.
- **Responsive breakpoints** — name the breakpoint scale (suggested: 3 stops at `<42rem`, `≥42rem`, `≥72rem`). For each: recipe-grid column count, card internal padding, hero type scale, filter-bar collapse behavior. This is the contract every other unit verifies against.
- **Focus + interaction states** — define the global focus ring style (e.g., `outline: 2px solid var(--color-accent); outline-offset: 3px`) and name the active/pressed state for cards and the focus-vs-selected distinction for chips. These propagate into U3/U6.
- **Editorial flourishes** — chosen list of touches to ship: drop cap on the lede paragraph (see U5 for the selector decision — the lede is the in-layout blockquote, not first body paragraph, since recipe markdown opens with `## Ingredients`); illustrated/typographic section divider between major recipe sections (Ingredients → Steps → Notes — see U5 for the selector strategy); pull-quote treatment via author opt-in markdown convention (e.g., `<aside class="pull-quote">…</aside>` in MDX). Reject anything that crosses into kitsch.
- **Print** — name the print-stylesheet behavior for recipe pages (white bg, shadows off, hide nav/search/related, single-column facts, drop-cap `float: none`).
- **Out of scope** — restate (logo, schema, spec-icons, search). Acknowledge: deferring spec-icons creates a coordination tradeoff with #10's "land together" ask — the redesign accepts some retrofit risk on icon weight/stroke/style when icons follow later.

**Patterns to follow:** `docs/brainstorms/2026-05-24-repo-identity-and-content-licensing-requirements.md` for tone and section discipline. `docs/release-pipeline.md` for plain-markdown formatting.

**Technical design:** none (prose doc).

**Verification:** Doc exists at `docs/design/direction.md`, all sections populated, references linked, palette hexes named, type pairing chosen with rationale. User reviews and either affirms or redirects before U2 starts.

**Test scenarios:** none — documentation unit, no behavior to test.

---

### U2. Refresh tokens; drop dark mode

**Goal:** Rewrite `src/styles/global.css`'s `@theme` and `:root` blocks to reflect the chosen palette, type stack, and radius scale. Delete the dark-mode media query. Add new tokens needed by later units (warm cream surface, lifted card surface, shadow scale, accent variants).

**Requirements:** #10 — "Color palette is neutral but uncommitted — no signature color story." Decision 1 (light-only).

**Dependencies:** U1.

**Files:**
- `src/styles/global.css`

**Approach:**
- **Move colors into `@theme` under `--color-*`.** Currently `:root` defines `--bg: 0 0% 100%` (raw HSL triplet) and consumers write `hsl(var(--bg))`. New shape: `@theme { --color-bg: hsl(...); --color-surface: hsl(...); ... }` with full color values. Tailwind v4 picks these up as utilities (`bg-bg`, `bg-surface`, `text-fg-muted`, `border-rule`). Semantic names hold (`bg`, `surface`, `fg`, `accent`, etc.); the prefix and value-shape are the only changes.
- **Sweep the 9 consuming files.** Mechanical find/replace: every `hsl(var(--X))` becomes `var(--color-X)` for the cases that stay in CSS (mostly the `:global(...)` typography rules in RecipeLayout / Search / learn pages), and direct utility classes for everything in markup (handled per-file in U3–U7). The 9 files: `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/layouts/RecipeLayout.astro`, `src/components/RecipeCard.astro`, `src/components/Search.astro`, `src/pages/index.astro`, `src/pages/inbox.astro`, `src/pages/learn/index.astro`, `src/pages/learn/[slug].astro`. ([Repo research confirmed this is the exact consumer set.](#))
- **Semantic-drift audit.** Token names hold but the *meaning* of `--color-surface` shifts (was near-white on near-white; now lifted near-white on warm cream). Walk every consumer and confirm the visual intent still holds — where the relationship inverts, either introduce a new token (`--color-surface-lifted`) or note the per-call-site re-evaluation in this unit's commit message. Don't trust "names held" as proxy for "consumers unaffected."
- Add new tokens to `@theme`: `--shadow-card` (soft long shadow per research — `0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.08)`), `--shadow-card-hover` (slightly elevated), `--color-accent-soft` (tinted accent for pill / badge fills), `--radius-card` (20–28px range per direction doc) distinct from `--radius-md` (6px, kept for inputs/buttons). `--radius-lg` is unused today — repurpose to `--radius-card` and drop the old name in the same commit.
- Add `--transition-base` and `--transition-lift` per direction doc motion section.
- Add font-loading guidance comment: if direction doc picks Fraunces (or any new face), the `@fontsource` import lands in `BaseLayout.astro` in U4 — note the dependency inline.
- Remove the entire `@media (prefers-color-scheme: dark) { :root { ... } }` block (`src/styles/global.css:42-60`). One block deletion.
- **Pagefind dark-mode interaction.** Pagefind UI ships its own `prefers-color-scheme` handling via `.pagefind-ui` variables. Once this site drops its dark branch, a visitor with system dark-mode may see Pagefind's dropdown switch to dark while the page stays light — mismatched chrome. Verify in U2 (browser dev-tools dark-mode emulation): if Pagefind activates its dark variant, set its variables explicitly in `Search.astro <style is:global>` to pin it to light.
- Add `@media (prefers-reduced-motion: reduce)` block that zeroes `--transition-base` and `--transition-lift`.
- Update existing component classes (`.card`, `.btn`, `.chip`, `.input`) — these may shrink or evaporate depending on whether U3+ rewrite their consumers as direct utility classes; keep what survives the ≥80-char / ≥3-uses extraction threshold from Decision #4.

**Execution note:** Land the token rewrite first, then verify the live site in the dev server (`npm run dev`) before touching downstream components. The token layer alone should already shift the visual feel meaningfully — that's the cheapest checkpoint.

**Patterns to follow:** existing `src/styles/global.css` `@theme` + `@layer base` + `@layer components` structure. Tailwind v4's [`@theme`](https://tailwindcss.com/docs/theme) directive treats `--color-*` keys as the color palette source.

**Technical design:** none — direct CSS rewrite against the direction doc.

**Verification:**
- `npm run dev` renders without console errors.
- Every page loads with the new palette (warm cream visible on `/`, `/recipes/<any-slug>/`, `/learn/`).
- The `prefers-color-scheme: dark` media query is removed; emulating dark mode in browser dev tools has no effect — the page renders in the new light design regardless of OS preference.
- Pagefind dropdown stays in the light palette under dark-mode emulation (no dark/light mismatch between page and search chrome).
- WCAG AA contrast check on every meaningful pair: `--color-fg` on `--color-bg`, `--color-fg` on `--color-surface`, `--color-fg-muted` on `--color-bg`, `--color-accent` as text on `--color-bg`, `--color-accent-fg` on `--color-accent` fills. Document the measured ratios in the U2 commit message.
- `@media (prefers-reduced-motion: reduce)` block present and zeroes the new transition tokens.
- `npm run build` still passes (`astro check` clean).
- All 11 existing color tokens retain their semantic names under the new `--color-*` prefix.

**Test scenarios:** none — pure styling/layout. (CLAUDE.md TDD policy explicitly exempts.)

---

### U3. Refresh card vocabulary (`.card` + `RecipeCard.astro`)

**Goal:** Make the recipe-grid cards distinctive — bigger radius, lifted soft-shadow surface, tinted hover, editorial type. This is the highest-volume visual element on the site and the most direct expression of the "Firefox-style big rounded cards" inspiration.

**Requirements:** #10 — "Layout patterns (cards, lists, spec blocks) follow standard recipe-site conventions without any unique treatment"; "Reconsider the recipe page layout — hero treatment, spec block presentation, ingredients list styling."

**Dependencies:** U2.

**Files:**
- `src/styles/global.css` (the `.card` component class block)
- `src/components/RecipeCard.astro`

**Approach:**
- Rewrite `RecipeCard.astro` markup to use Tailwind utilities directly: `class="block bg-surface rounded-card shadow-card hover:shadow-card-hover hover:-translate-y-px ... transition-[shadow,transform]"` (exact strings settle against direction doc tokens). Drop the scoped `<style>` block.
- Apply `--radius-card`, `--shadow-card`/`--shadow-card-hover`, lifted surface from U2. Honor the inner-radius rule (any nested image/element radius = card radius − padding).
- **Interaction states fully named:**
  - Hover (pointer): `lift + tint shift` (only inside `@media (hover: hover)` so touch devices skip the lift).
  - Active/pressed: `translate-y-[1px]` + shadow collapse (so touch + click users feel the press).
  - Focus-visible: global focus ring from direction doc (`outline-2 outline-accent outline-offset-2` or equivalent utility).
  - Disabled: not applicable to recipe cards (they don't have a disabled state).
- Hierarchy decisions for the card body (all expressed as utilities):
  - Title prominence: serif, size + weight from direction doc scale.
  - Blurb: italic serif at slightly lower contrast (`text-fg-muted`).
  - Meta row: small caps or chip-style mini-badges per direction doc call.
  - Eyebrow (primary spirit): direction doc may call for tinted-accent treatment (`text-accent-soft` or similar) instead of muted neutral.
- Card-internal padding follows the direction doc breakpoint table (24–32px desktop, scales down per the named scale — not "scale down on mobile" hand-wave).
- `.recipe-grid` gap moves to a utility on the `<ul>` in `index.astro` (U6). If the class survives — it's currently used once — fold it into U6 inline.
- **`.card` component class:** if RecipeCard is the only consumer post-rewrite, delete `.card` from `global.css`. If `learn/index.astro` sections also use it (per repo research) and the same utility string repeats, `@apply` it in `global.css` per Decision #4's threshold.

**Execution note:** This is the single most-visible change. Screenshot the index page before and after for the post-implementation review.

**Patterns to follow:** Astro `<style>`-block → markup utility migration. Honor Decision #4's threshold for when to `@apply` vs inline.

**Technical design:** none beyond what the direction doc specifies.

**Verification:**
- `/` (index) renders all recipe cards with new vocabulary.
- Hover state visibly lifts and tints without scaling (and does NOT fire on touch devices — verify in browser dev-tools touch emulation).
- Active/pressed state visible on touch + click.
- Focus-visible ring visible on keyboard tab through the card grid.
- Card hierarchy reads correctly at all three breakpoints named in the direction doc (not "desktop and mobile" generic — the specific widths).
- No layout shift compared to before (gap/padding changes are intentional, not regressions).
- Card anchor remains the full card surface (entire card is the link hit area, not just the title) — verify at mobile tap-target size.

**Test scenarios:** none — pure styling/layout. The card anchor's existing link behavior is untouched.

---

### U4. Refresh site shell (`BaseLayout.astro`)

**Goal:** Update the site header, footer, and main container to match the direction. Load any new fonts the direction doc picks. Make the header feel like part of the editorial, not generic chrome.

**Requirements:** #10 — typography hierarchy personality; coordinates with the brand mark (already shipped).

**Dependencies:** U2.

**Files:**
- `src/layouts/BaseLayout.astro`
- `package.json` (if a new `@fontsource/*` package is added)

**Approach:**
- If the direction doc picks a new display face (e.g., Fraunces), add the `@fontsource/fraunces` package and import the needed weights (e.g., 400, 500, 600, 600-italic) in `BaseLayout.astro` alongside the existing Newsreader imports. If the doc keeps Newsreader-only, no font change.
- **Migrate `<style>` block to utility classes in markup.** The header, nav, footer, and main container all move to utility strings on the markup elements. The sticky-blur treatment for the header is one of the few cases that may need a small scoped rule (the `backdrop-filter` requires careful specificity); evaluate after first-pass utility rewrite — if the utility version produces muddy contrast on cream, fall back to a scoped `<style>` block for the header chrome only.
- Nav link styling per direction doc — accent underline or tinted hover, focus-visible ring as per direction doc focus spec, transition via `--transition-base`.
- Logo sizing already responsive (full → coupe at 42rem). Verify still works against new bg. Confirm the 42rem breakpoint matches the direction doc breakpoint table — if the table picks a different first-stop, update the `<picture>` source's `media` attribute to match.
- Footer: reads tiny and centered today. Consider letting it breathe with a small-caps eyebrow ("Crafted by hand") plus the existing CC BY link, or leave alone if direction calls for restraint.
- Adjust main padding per direction doc — Apple/Firefox use more generous vertical breathing room; use the breakpoint-aware padding scale from the direction doc, not a single fixed value.

**Patterns to follow:** Astro `<style>`-block → markup utility migration per Decision #4.

**Technical design:** none beyond direction doc.

**Verification:**
- Header reads cleanly on all pages, sticky behavior intact.
- Logo + nav + search row hold at desktop and mobile.
- Any new font loads via `@fontsource` and renders without FOUT spike.
- Footer not broken.

**Test scenarios:** none — pure styling/layout.

---

### U5. Recipe page editorial treatment (`RecipeLayout.astro`)

**Goal:** Make a single recipe page feel like an editorial spread — distinctive hero, refined spec block ("facts"), editorial body typography with drop cap and dividers, polished attribution/related asides. This is the page a user actually reads when cooking; it deserves the most care.

**Requirements:** #10 — "Reconsider the recipe page layout — hero treatment, spec block presentation, ingredients list styling"; "editorial touches: pull quotes, drop caps on section intros, illustrated dividers between sections."

**Dependencies:** U2, U3 (chip/card vocabulary).

**Files:**
- `src/layouts/RecipeLayout.astro`
- `src/styles/global.css` (if drop-cap / divider / pull-quote primitives land as shared classes)

**Approach:**

**Layout markup → utility classes.** Header structure (`.recipe-header`, `.back`, `.facts`, `.taxonomy`, `.attribution`, `.related`) moves from the scoped `<style>` block to utility classes on the markup. The `<style>` block shrinks to the cases utilities can't reach (see Editorial Primitives below).

**Hero:** lift the recipe title (already `clamp(2rem, 5vw, 2.75rem)`, restyle via utilities/inline `style` for the clamp). Treat the `<p class="blurb">` element (RecipeLayout markup) as the **lede** — this is in-layout, not markdown-rendered, so it's the deterministic surface for the drop cap. Direction doc may call for the lede to be larger, less-muted, and drop-cap eligible.

**Facts spec block:** the current `.facts` dl is a 4-cell card. Restyle the dl with utilities — tighter or more generous spacing, eyebrow restyle, accent-tinted background or hairline divider between cells, optional re-order per direction doc. Keep semantic `<dl>`/`<dt>`/`<dd>` markup intact for screen-reader output.

**Body typography (`.recipe-body :global(...)`)** — stays as a scoped `<style>` block (utilities can't reach markdown-rendered DOM):
- Section headings (`## Ingredients`, `## Steps`): direction doc picks between current uppercase-sans-eyebrow, serif-with-rule, ornamental divider, or numbered scheme.
- Ingredients list: hanging-indent treatment, measurement column alignment, or chip-style ingredient pills — direction doc decides.
- Steps list: numbered-step custom counter with serif numerals, generous line-height.

**Editorial primitives** — kept as scoped CSS in `global.css` since pseudo-elements + markdown DOM aren't utility-addressable:

1. **Drop cap on the lede.** Target: `.recipe-header .blurb::first-letter`. The lede is in-layout markup (a `<p class="blurb">`), so this selector is deterministic regardless of what the recipe markdown body opens with. ([Feasibility review flagged that the recipe markdown body opens with `## Ingredients`, making `.recipe-body > p:first-child::first-letter` unreliable — the in-layout blurb resolves this cleanly.](#))
2. **Section dividers between major recipe sections.** Author opts in by structure: the body always has `## Ingredients`, `## Steps`, and optionally `## House-Made …`, `## How to Batch It`, `## Notes` (per `CLAUDE.md` body contract). Selector: `.recipe-body :global(h2:not(:first-child))::before { content: ''; display: block; ... }` — applies the divider above every section heading except the first (which doesn't need separation from the spec block).
3. **Pull quotes** — explicit author opt-in via a small MDX component or `<aside class="pull-quote">…</aside>` in markdown. Authoring convention documented in `TEMPLATE.md`. If author opt-in is too heavy, drop pull quotes from this round — direction doc decides.

**Attribution + Related asides:** treat as warm editorial footer, not utility chrome. Possibly merge into a single bottom-of-page editorial block.

**Print stylesheet** — add `@media print { ... }` block in `global.css` (or scoped to RecipeLayout) that: sets `--color-bg` and `--color-surface` to white; removes shadows; hides nav, search, and related-recipes; collapses the `.facts` dl to single-column flow; sets `.drop-cap::first-letter { float: none; font-size: 1.5em; }` so the floated drop cap doesn't orphan on page break. Recipe pages are the one page type users print.

**Execution note:** Pick one well-loved recipe (e.g., a published classic) as the visual reference page during dev. Screenshot it at desktop + mobile before and after.

**Patterns to follow:** Astro `<style>`-block → markup utility migration for layout chrome (Decision #4); existing `.recipe-body :global(...)` scoped pattern for markdown-rendered typography.

**Technical design:**
```
.recipe-header .blurb::first-letter {
  font-family: var(--font-display);
  font-size: 3.5em;
  float: left;
  line-height: 0.85;
  margin-right: 0.08em;
  margin-top: 0.05em;
  color: var(--color-accent);
}

.recipe-body :global(h2:not(:first-child))::before {
  content: '';
  display: block;
  width: 3rem;
  height: 1px;
  background: var(--color-rule);
  margin: 2rem auto 1.5rem;
}
```
*(Directional — exact metrics land in implementation against the direction doc's type + radius scale.)*

**Verification:**
- `/recipes/<slug>/` for a published classic renders the new layout end-to-end.
- Drop cap renders on the in-layout `.blurb` element across Chromium, Firefox, Safari (`::first-letter` quirks are real — verify each).
- Section dividers render above every `<h2>` in the body except the first.
- Spec block (`facts`) holds at the three named breakpoints from the direction doc (not "desktop and mobile" generic).
- Attribution and Related asides render correctly with and without data (try a recipe missing attribution).
- Print preview: nav/search/related hidden; bg white; shadows gone; drop cap doesn't float on print.

**Test scenarios:** none — pure styling/layout.

---

### U6. Refresh index page and filter UI

**Goal:** Polish the homepage hero, kicker, lede, and the collapsible filter bar so the index page feels coherent with the recipe-page editorial treatment.

**Requirements:** #10 — coherent visual language across pages.

**Dependencies:** U2, U3 (cards).

**Files:**
- `src/pages/index.astro`

**Approach:**
- **Migrate the scoped `<style>` block to utility classes in markup.** Most of the filter-bar, page-head, filter-groups, clear-btn, and empty-state styles become utility strings. Two cases stay scoped: the `<details>` summary chevron (a `::before` pseudo-element with transform animation — utilities can't reach it cleanly), and any class-name selectors targeting `<details>` open state (`details[open]`).
- Page-head: current "Recipe collection" eyebrow + "Home Bartender" h1 + serif italic lede is a good editorial pattern; tune type sizes, spacing, and possibly add an ornamental rule per direction doc.
- Filter bar: current `<details>` chevron + chip groups.
  - Lift the bar onto a tinted card surface (consistent with new card treatment in U3).
  - Chip restyling per direction doc — active state uses new accent. **Focus state must be distinct from active state** (active = "this filter is selected"; focus = "this is where keyboard focus is") — use the global focus-ring from direction doc focus spec, not just the active fill.
  - Clear-filters button: subtle restyle, possibly an icon/glyph instead of underline.
- Empty state: reads serif-italic muted — keep or elevate per direction.

**Patterns to follow:** Astro `<style>`-block → markup utility migration. Existing `<details>` chevron pattern is the kind of case Decision #4 calls out as scoped-CSS-only.

**Technical design:** none.

**Verification:**
- `/` renders the new hero treatment.
- **Interactive smoke test** (because the restyle touches markup with logic): filter bar opens/closes correctly via the `<details>` toggle; chips toggle active state with the new accent; URL query string still syncs on filter toggle and on browser back/forward; clear-filters button clears chips and URL. Verify by clicking through a 3-chip filter sequence + reload + back-button.
- Keyboard navigation: tab through chips, observe distinct focus and active states.
- Empty state appears when filters match zero recipes.

**Test scenarios:** none — pure styling/layout. The filter logic is untouched, but verify the interactive behavior manually since the restyle changes selector specificity and DOM structure.

---

### U7. Cascade through secondary pages

**Goal:** Confirm every other page picks up the new design via token inheritance and shared classes; restyle the small per-page `<style>` blocks where needed.

**Requirements:** #10 — coherent visual language across pages.

**Dependencies:** U2, U3, U4, U5, U6.

**Files:**
- `src/pages/inbox.astro` (has its own `<style>`)
- `src/pages/learn/index.astro` (has its own `<style>`)
- `src/pages/learn/[slug].astro` (has its own `<style>` — `.prose` body typography)
- `src/pages/by-difficulty/[difficulty].astro` (no scoped styles — verify cascade)
- `src/pages/by-flavor/[flavor].astro` (no scoped styles — verify cascade)
- `src/pages/by-occasion/[occasion].astro` (no scoped styles — verify cascade)
- `src/pages/by-spirit/[spirit].astro` (no scoped styles — verify cascade)
- `src/pages/by-tag/[tag].astro` (no scoped styles — verify cascade)
- `src/components/Search.astro` (Pagefind chrome overrides — confirm tokens still wire correctly; may need touch-up if Pagefind selectors hard-code surface assumptions)

**Approach:**
- Open each page in dev server and audit visually. The taxonomy pages should pick up new tokens for free (they have no scoped styles; they share `page-head`, `eyebrow`, `recipe-grid` and the RecipeCard from U3).
- `inbox.astro`: small `.gate` / `.count` styles — migrate to utilities; review against new surface palette and tighten. Confirm the `?preview=1` gate still gates correctly (this is interactive behavior, not pure styling — eyeball it).
- `learn/index.astro`: `.section-list`, `.section-title`, `.section-summary` — migrate to utilities; treatment matches U3 card vocabulary or deliberately differs per direction doc.
- `learn/[slug].astro`: `.prose :global(...)` stays as scoped CSS (markdown-rendered body, utilities can't reach). Apply the same drop-cap selector pattern as U5 if the learn-section body has a deterministic lede element; otherwise skip drop cap on learn pages and document why. Section dividers from U5 (`h2:not(:first-child)::before`) apply cleanly here too.
- `Search.astro`: Pagefind UI is themed via `.pagefind-ui` CSS variables in a `<style is:global>` block (stays scoped — third-party DOM). Re-verify the Pagefind dark-mode pin from U2 is still working post-token-migration. Confirm the dropdown legibility against the new warm-cream surface — Pagefind's default text-on-bg contrast assumes a neutral background; warm cream may push some text colors below AA. Tweak the in-component selectors if so.
- **Skip** `src/pages/by-style/[style].astro` — confirmed redirect stub per research, no styles to update.

**Patterns to follow:** Astro `<style>`-block → markup utility migration per Decision #4. `:global(...)` and `<style is:global>` stay as scoped CSS.

**Technical design:** none.

**Verification:**
- Every page in the file list above loads in dev with the new design.
- Pagefind search dropdown renders cleanly when triggered from any page, in both light browser preference and dark-emulation (no dark/light mismatch).
- `learn/<slug>/` body matches the editorial treatment from U5 (or explicitly diverges per direction doc).
- No page reads as visually orphaned from the rest of the site.
- `npm run build` succeeds end-to-end (`astro check` + `astro build` + Pagefind index).
- `inbox.astro` `?preview=1` gate still gates correctly.

**Test scenarios:** none — pure styling/layout sweep. Interactive behavior (Pagefind dropdown keyboard nav, inbox preview gate) verified manually.

---

## System-Wide Impact

- **Affected surfaces:** every rendered page (all routes under `src/pages/`). The shared token layer in `src/styles/global.css` is the single point of design coordination.
- **Affected stakeholders:** only the site owner (personal site, no other contributors actively styling).
- **Build pipeline:** `npm run build` → `astro check` + `astro build` + Pagefind index must still pass after each unit. No new build steps introduced.
- **CI:** `.github/workflows/test.yml` runs Vitest — unaffected (no test changes). `.github/workflows/deploy.yml` runs validate + test + build → deploy. Build-fail aborts deploy, so a broken token landing won't ship.
- **No data migrations, no schema changes, no external contract surfaces.**

---

## Scope Boundaries

**In scope:**
- All UI/visual changes to existing pages, layouts, components, and `global.css`.
- The `docs/design/direction.md` artifact.
- Adding one new `@fontsource/*` package if the direction doc picks a new display face.
- Dropping the dark-mode media query.

**Deferred to follow-up work (planned, separate PR/issue):**
- **Spec-icons** — referenced in #10 as `#TBD`. File as a separate issue, plan a follow-up that consumes the new design tokens (glass, method, ice glyphs). The redesign here intentionally leaves the spec block ready for icons to slot in.
- **Visual regression / Playwright screenshots** — surfaced in `docs/ideation/2026-05-23-site-and-pipeline-ideation.md` idea #4 as a separate "CI & deploy pipeline" thread. Independent of this redesign.

**Outside this product's identity (not planned):**
- Logo or brand-mark redesign (shipped in #31; out of scope per #10).
- Content schema / recipe data model changes (out of scope per #10).
- Search engine swap or major Pagefind UX rework (chrome restyles only).
- Dark mode (explicitly dropped per user decision).

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Direction doc + agent's instinct diverge from user's actual taste | Medium | U1 is a reviewable artifact gated before U2. User can redirect cheaply before any CSS lands. **Rollback protocol:** after U2 lands on a branch and dev-server review happens, define a go/no-go checkpoint where the user can either commit to the chosen palette + type or revert the U2 commit, revise `direction.md`, and re-run U2. Repeat after U3 (cards are highest-volume visual). This prevents the "ship something I don't love vs restart" forced choice mid-implementation. |
| Result reads as competent cocktail blog rather than distinctive personal collection | Medium | The U1 direction doc's **"What this is NOT"** section is the primary guard. Mid-U5 review: place the styled recipe page next to a screenshot of a Punch/Imbibe recipe page. If they read as siblings, redirect via the rollback protocol before U6/U7 lock the direction across the site. |
| Drop-cap CSS (`::first-letter`) renders inconsistently across browsers | Low (mitigated) | Targeting the in-layout `.blurb` element (not markdown-rendered body) makes the selector deterministic. Verify in Chromium, Firefox, Safari at U5; accept minor Safari quirks. |
| New font (if added) introduces FOUT/CLS on first load | Low | `@fontsource` self-hosts; `font-display: swap` is standard. Limit to the weights actually used. |
| Pagefind chrome breaks against new surface tokens or its own dark-mode activates against system preference | Medium | U2 verifies dark-emulation parity; U7 re-verifies post-cascade. Pin Pagefind's CSS variables in `Search.astro <style is:global>` if its dark-mode handling fires when the site has none. |
| Semantic drift on existing token names (`--color-surface` value flips meaning) regresses subtle visual relationships | Medium | U2's "semantic-drift audit" step requires walking every consumer of the renamed tokens. Where the visual relationship inverts, introduce a new token (`--color-surface-lifted`) rather than fight the meaning shift. |
| Interactive behavior regressions co-located with styling changes (filter chips, Pagefind dropdown, inbox preview, card tap targets) | Medium | CLAUDE.md TDD exemption covers *styling*, not behavior in restyled files. U3/U6/U7 verification calls out specific interactive smoke checks. |
| Dropping dark mode removes the variant the owner uses in dim-room contexts (phone in kitchen at night, etc.) | Low (acknowledged) | Personal site, user chose this. Cost named explicitly: revisiting requires a parallel dark token sweep, not a quick flip. Single committed mode lets the editorial direction land harder. |
| Spec-icons deferred per #10's "land together" coordination ask — icons may feel grafted when they land later | Medium | U1 direction doc's "Out of scope" section explicitly acknowledges the tradeoff. The redesign accepts retrofit risk on icon weight/stroke/style; mitigation is to keep the chosen radius/stroke vocabulary consistent so the icon follow-up has clear constraints. |
| Editorial flourishes (drop cap, dividers, pull quotes) feel kitschy or "themed restaurant" | Medium | U1's "What this is NOT" section names the rejected patterns explicitly. Screenshot review at each unit catches it early. |
| Utility-class strings on complex elements (filter bar, facts dl, search container) grow long and ugly | Low | Decision #4 threshold: extract via `@apply` when a class string exceeds ~80 chars or repeats 3+ times. |

---

## Open Questions / Assumptions

These resolve inside U1 (direction doc) rather than blocking the plan:

1. **Type pairing.** Candidate set:
   - **Newsreader-only** (display + body) — keep current, tighten hierarchy. Safest, no font loading change.
   - **Fraunces (display) + Newsreader (body)** — more personality at headings, Newsreader holds the reading experience. Adds `@fontsource/fraunces`.
   - **Newsreader (display + body) + Commissioner or IBM Plex Sans (UI/meta)** — adds a distinct sans face for chrome, replaces system-sans-only. Adds one `@fontsource/*` package.
2. **Accent color.** Research default is amaro red `#A23E2C` (cocktail-craft, sophisticated). Alternatives: vermouth amber `#B8732F`, maraschino `#7A1F2B`, muted Suze yellow `#A3A847`, or a non-bar accent if the direction wants subtler personality. User picks in U1.
3. **Background warmth.** Pure white `#fff` vs warm cream `#F5F0E8`-ish. Research strongly favors warm cream; user can override.
4. **Editorial flourishes — which ship.** Drop cap (yes/no), section dividers (yes/no), pull quotes (yes/no). Default: ship all three as opt-in primitives; apply drop cap by default to recipe-body, dividers between top-level sections, pull-quote only on author opt-in via markdown convention. User can narrow.
5. **Card padding scale.** Research suggests 24–32px desktop / scale down on mobile for "Apple-style" generosity. Confirm in direction doc; impacts grid gutters too.

**Assumption:** the redesign does not require touching `src/content.config.ts`, `scripts/validate.mjs`, or any taxonomy file. Visual change only.

**Assumption:** `npm run build` continues to pass throughout. Any unit whose build breaks is rolled back before commit, not merged forward.

---

## Verification Strategy

CLAUDE.md TDD policy exempts pure styling/layout. Verification happens visually + via existing build gates + accessibility checks + interactive smoke tests for units that touch markup with logic.

- **Each unit:** dev-server screenshot review at the three breakpoints named in the direction doc (not generic "desktop and mobile") before claiming done.
- **Accessibility gates** (U2 onward):
  - WCAG AA contrast verified for every text/background and accent pair (measured ratios documented in the U2 commit message).
  - Focus-visible ring present and visible on every interactive element (nav links, chips, card anchors, filter toggle, search input, clear-filters button).
  - `@media (prefers-reduced-motion: reduce)` zeroes transitions.
- **Interactive smoke checks** (U3 / U6 / U7):
  - U3: card anchor link fires; hover lift suppressed on touch (verify in dev-tools touch emulation); tap-target size adequate at mobile.
  - U6: filter bar opens/closes; chips toggle; URL query syncs; back/forward preserves state; keyboard tab order is sensible.
  - U7: Pagefind dropdown opens/closes from keyboard and click; inbox `?preview=1` gate still gates correctly.
- **End of plan:** full site walk-through — index, a published recipe, a learn page, inbox (gated), each by-* taxonomy page, search dropdown. Screenshots committed to PR description for review. Side-by-side with a Punch/Imbibe recipe page screenshot — if the new design reads as a sibling, the identity bet failed and the user should redirect via the rollback protocol before merging.
- **Build gates:** `npm run build` (which runs `astro check` + `astro build` + Pagefind) passes at the end of every unit. `npm test` (Vitest) is unaffected but re-run before PR to confirm no incidental breakage.
- **No new tests written.** The body-structure linter (`scripts/validate.mjs`, recent feat-19) continues to validate recipe content; design changes don't affect it.

---

## Sequencing Summary

```
U1 (Direction doc)
  └── U2 (Tokens + drop dark mode)
        └── U3 (Cards) ─────┐
        └── U4 (Site shell) ─┤
              └── U5 (Recipe page) ──┤
                    └── U6 (Index + filter) ──┐
                          └── U7 (Secondary pages cascade)
```

U1 must land first and be reviewed. U2 unlocks everything else. U3/U4 can run in parallel after U2. U5 depends on U2 + U3 (chip vocabulary). U6 depends on U2 + U3. U7 is last and depends on the rest of the visual system being in place.

**Recommended PR shape** (avoids both per-unit churn and a single unreviewable 6-unit PR, keeps staging visually coherent between merges):

- **PR1: U1.** Direction doc only, reviewable on its own. Decisive product review happens here — palette, typography, motif, breakpoints, focus/motion vocabulary all settled before any CSS lands.
- **PR2: U2 + U3 + U4.** Core visual shift: tokens migrate to `--color-*`, cards adopt the new vocabulary, site shell refreshes. Staging never sits in a half-styled state (cards inherit U2's tokens directly).
- **PR3: U5.** Recipe-page editorial treatment is large enough to merit its own review (drop cap, dividers, print styles, body typography).
- **PR4: U6 + U7.** Index polish + secondary-pages cascade. Once these merge, the redesign is complete.

User can compress further (e.g., merge PR2 + PR3) if review bandwidth allows, but per-unit PRs are not recommended — every intermediate merge would leave staging visually inconsistent.
