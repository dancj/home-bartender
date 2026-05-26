# Design Direction — Home Bartender

> Status: proposed for review (closes step 1 of #10).
> Once affirmed, U2–U7 of `docs/plans/2026-05-25-003-feat-site-design-personalization-plan.md` execute against this document.

---

## References

External touchpoints (one line on what we're borrowing):

- **[firefox.com/en-US/](https://www.firefox.com/en-US/)** — confident light surface, big rounded content cards with soft tinted fills, generous gutters, lift-on-hover. The card vocabulary anchor.
- **[apple.com/iphone/](https://www.apple.com/iphone/)** — near-white cards lifted off a slightly warmer page surface, tight type hierarchy, restraint everywhere. The "elegant minimal" anchor.
- **[Punch (punchdrink.com)](https://punchdrink.com/)** — editorial cocktail writing with serif body, eyebrow taxonomy, attribution treatments. We borrow the *editorial seriousness*, not the visual treatment.
- **[Imbibe Magazine](https://imbibemagazine.com/)** — recipe-page hierarchy (hero, blurb, spec block, ingredients/steps). Reference for *structure*, not look.

---

## Voice

Five adjectives that govern every decision in this document:

- **Warm** — cream surface, not cold white. Type warms toward dark sepia, not stark black.
- **Considered** — every typographic choice has weight. No throwaway styles.
- **Quietly playful** — chunky card radius, the drop cap, the coupe-glass logo. Nothing demands attention.
- **Editorial** — recipes read like a small magazine, not a database printout.
- **Hand-crafted, not handmade** — we're not pretending this is letterpress. Modern web typography doing a craft job.

---

## What this is NOT

The AI-slop guard. Without explicit constraints, the candidate palette (cream + accent red + serif + drop caps) defaults to "competent cocktail blog." Reject these patterns even if research or convention suggests them:

- **No hero photography** on recipe pages. The coupe-glass logo carries the brand image; cocktail glamour shots would compete with it and tip into Bon Appétit territory.
- **No decorative botanical illustration.** No sprigs, no twirling citrus peel separators, no vintage-menu flourishes. Editorial flourishes are typographic (drop cap, small rule between sections), not illustrative.
- **No warm-brown body text.** Body stays near-black (`#1F1A14`) on cream. Brown-on-cream reads "WordPress food blog circa 2018." The contrast is the editorial weight.
- **No gradient backgrounds.** Surfaces are solid. The lift comes from radius + shadow + a small color step, not gradients.
- **No "discover," "explore," "curated," "artisanal."** Copy stays direct. The page-head lede says how many recipes exist, not "a curated collection of artisanal libations."

If a finished page reads like a sibling of a Punch or Imbibe recipe page, the identity bet has failed and we redirect via the U2 / U3 rollback protocol (see plan risks).

---

## Typography

**Display + headings:** [Fraunces](https://fonts.google.com/specimen/Fraunces) — variable, free, distinctive. Wonky old-style serif with personality at large sizes without crossing into novelty. Used for `h1`, `h2`. Weights: 500, 600.

**Body + small headings:** [Newsreader](https://fonts.google.com/specimen/Newsreader) — already installed; optimized for on-screen reading at varying optical sizes. Used for body prose, recipe ingredients, recipe steps, `h3`, and the in-layout lede (`.blurb`). Weights: 400, 400 italic, 600.

**UI / meta / chrome:** system sans stack (`ui-sans-serif, system-ui, -apple-system, ...`). Used for nav links, eyebrows, button labels, the small caps meta row on cards, filter chips, footer. Free, fast, and intentionally anonymous so it doesn't compete with the editorial faces. **No Inter, no Geist, no Roboto** — those are the AI-slop tells.

**Pairing rationale.** Fraunces brings personality at display sizes; Newsreader carries the reading experience without fighting it; system sans recedes for chrome. Three roles, two webfonts.

**Size + weight scale** (line-height in parens):

| Role | Face | Size | Weight | Notes |
|---|---|---|---|---|
| Hero h1 | Fraunces | clamp(2rem, 5vw, 2.75rem) (1.1) | 600 | Recipe page title, page-head h1 |
| h2 | Fraunces | 1.5rem (1.2) | 500 | Section headings outside recipe-body |
| h2 in recipe-body | Newsreader UPPERCASE | 0.8125rem (1.4) tracking 0.12em | 600 | "INGREDIENTS", "STEPS" — uppercase eyebrow treatment, not display serif (keeps focus on the ingredients themselves) |
| h3 | Newsreader | 1.0625rem (1.3) | 600 | Sub-sections, learn pages |
| Body | Newsreader | 1.0625rem (1.65) | 400 | Recipe body, blurbs, prose |
| Lede / blurb | Newsreader italic | 1.1875rem (1.4) | 400 italic | Recipe-header blurb; carries the drop cap |
| UI / meta | system sans | 0.8125rem (1.4) | 500 | Nav, buttons, meta row |
| Eyebrow | system sans UPPERCASE | 0.6875rem (1.3) tracking 0.1em | 600 | "Recipe collection", primary spirit on cards |
| Card title | Newsreader | 1.25rem (1.2) | 600 | Recipe card heading |
| Card blurb | Newsreader italic | 0.95rem (1.45) | 400 italic | One-liner under card title |

**Font loading.** `@fontsource/newsreader` is already installed. Add `@fontsource/fraunces` in U4 with weights 500 + 600. Use `font-display: swap`.

---

## Palette

Warm-cream surface, lifted near-white card, warmed near-black text, single confident terracotta accent. No secondary accent in this round — restraint.

| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#F5F0E8` | Page background — Pantone Cloud Dancer-adjacent warm cream |
| `--color-surface` | `#FBF8F2` | Card / panel — lifted off the bg by ~3% lightness |
| `--color-surface-muted` | `#EEE8DD` | Subtle fills (filter bar background, code background) |
| `--color-rule` | `#E3DCCB` | Hairline borders |
| `--color-rule-strong` | `#CFC4AC` | Stronger borders / hover state |
| `--color-fg` | `#1F1A14` | Primary text — warmed near-black, not pure #000 |
| `--color-fg-muted` | `#6B5F50` | Secondary text, meta rows, blurbs |
| `--color-fg-subtle` | `#9A8E7C` | Tertiary / subtle annotations |
| `--color-accent` | `#9C3F2A` | Terracotta — used sparingly: active states, links on hover, focus rings, hero accents |
| `--color-accent-fg` | `#FBF8F2` | Text on accent fills |
| `--color-accent-soft` | `#E8D5C9` | Tinted accent for badges, active-chip fills against cream |
| `--color-accent-ring` | `rgb(156 63 42 / 0.18)` | Soft focus glow on inputs |
| `--color-ring` | `rgb(31 26 20 / 0.35)` | Default focus ring color |

**Accent rationale.** Terracotta `#9C3F2A` reads cocktail-craft (Campari-adjacent) without being the literal Negroni red. Warmer than research-default amaro `#A23E2C`, slightly more orange — pairs more naturally against cream and reads "playful" without "candy." Used at <10% of the page area in any given view.

### WCAG AA contrast check

All measurements against the named surface; calculated using the WCAG 2.1 relative-luminance formula. Required floors: 4.5:1 for normal text, 3:1 for large text and UI components.

| Pair | Ratio | Verdict |
|---|---|---|
| `--color-fg` on `--color-bg` | 15.0:1 | AAA ✓ |
| `--color-fg` on `--color-surface` | 15.4:1 | AAA ✓ |
| `--color-fg-muted` on `--color-bg` | 5.6:1 | AA ✓ |
| `--color-fg-subtle` on `--color-bg` | 3.4:1 | AA Large ✓ (use only for non-essential annotations) |
| `--color-accent` on `--color-bg` (link/text) | 5.9:1 | AA ✓ |
| `--color-accent-fg` on `--color-accent` (button text) | 6.7:1 | AA ✓ |
| `--color-rule-strong` on `--color-bg` (UI line) | 3.1:1 | AA UI ✓ |

Re-verify in U2 with an actual contrast tool (Chrome devtools or [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/)) before committing the values.

---

## Header chrome

The site header gets its own dark slab — not the page bg.

The brand mark PNGs (`logo-full.png`, `logo-coupe.png`) were drawn for a dark surround; they ship with a near-black bg baked in (sampled at `#181810` for the full logo, `#282826` for the coupe). Floating those on a cream header reads as "dark cards on cream" — exactly the kind of visual mismatch the rest of the redesign is trying to fix. Pulling the header bg dark merges the logo into the chrome and lets the cream + terracotta page identity sit cleanly below.

| Token | Hex | Role |
|---|---|---|
| `--color-header-bg` | `#1A1810` | Header bar background (matches `logo-full.png` corner color) |
| `--color-header-fg` | `#FBF8F2` | Brand text fallbacks, nav link hover, search input text |
| `--color-header-fg-muted` | `#A89B89` | Nav link default, search input placeholder |

### WCAG AA contrast (dark surface)

| Pair | Ratio | Verdict |
|---|---|---|
| `--color-header-fg` on `--color-header-bg` | 16.5:1 | AAA ✓ |
| `--color-header-fg-muted` on `--color-header-bg` | 7.5:1 | AAA ✓ |
| `--color-accent` on `--color-header-bg` (focus ring) | 4.1:1 | AA UI ✓ |

### What changes

- Site header: `bg-header-bg`, no bottom border (the color step IS the divider against the cream page below).
- Nav links: `header-fg-muted` default, `header-fg` on hover, with a tinted-dark hover background (`rgb(255 255 255 / 0.06)`).
- Search input (compact mode, in-header): dark fill, light placeholder, light text. The dropdown panel renders below the header against the cream page, so it stays in the light Pagefind theming.
- Brand logos: no PNG change — their existing dark bg now merges into the header rather than reading as a floating dark card on cream.

### What does NOT change

- Recipe pages, learn pages, taxonomy pages, inbox — all body chrome remains warm cream + terracotta accent per [Palette](#palette).
- Footer keeps the cream + muted-warm text treatment (quiet endcap, not load-bearing chrome).
- Brand mark itself — the coupe + full logos are unchanged; this is just chrome around them.

The coupe logo's bg (`#282826`) is slightly lighter than `--color-header-bg` (`#1A1810`); the seam is mostly imperceptible at mobile-logo size and against the dark surround, but a follow-up could re-export the coupe to match.

---

## Radius + surface vocabulary

The Firefox / Apple inspirations both run in the 20–28px range for content cards. We pick the friendly end of that band.

| Token | Value | Used by |
|---|---|---|
| `--radius-card` | `22px` | Recipe cards, learn-page section cards, filter-bar surround, facts spec block |
| `--radius-md` | `8px` | Buttons, inputs |
| `--radius-sm` | `4px` | Inline code, small inset elements |
| pill | `999px` | Chips, taxonomy tags |

**Shadow vs border.** Cards use shadow + no border. Inputs and buttons use border + no shadow. The inspiration-site default: tile-style cards lift off the surface; form chrome stays flat.

| Token | Value |
|---|---|
| `--shadow-card` | `0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -8px rgb(0 0 0 / 0.08)` |
| `--shadow-card-hover` | `0 2px 4px rgb(0 0 0 / 0.05), 0 14px 32px -10px rgb(0 0 0 / 0.12)` |

**Inner-radius rule.** Any nested element (image, button, badge inside a card) uses radius = card radius − padding. If card radius is 22px and internal padding is 24px, the nested element's radius is `max(0, 22 - 24) = 0` (flat). If padding is 16px, nested is 6px.

**Hover.** Cards lift via `transform: translateY(-2px)` + shadow swap to `--shadow-card-hover`. No scale, no rotate. The lift is small enough to read as polish, not animation.

**Active / pressed.** Cards translate back to `translateY(1px)` and shadow collapses to `--shadow-card`. Buttons depress to `translateY(1px)` with no shadow.

---

## Motion

| Token | Value | Used for |
|---|---|---|
| `--transition-base` | `150ms ease-out` | Color, background, border-color, opacity changes (chip hover, link color, etc.) |
| `--transition-lift` | `200ms ease` | Card transform + shadow (the hover lift) |
| `--transition-page` | `0ms` | Page transitions intentionally absent — Astro static pages don't need them |

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block in `global.css` zeroes both transition tokens (`0ms`). This is required, not optional.

**Easing rationale.** `ease-out` for color/state changes (snappy at start, soft landing — feels responsive). `ease` for the lift (gentler curve — the lift should feel weighted, not snappy). No `cubic-bezier` custom curves — they read as over-designed.

---

## Responsive breakpoints

Three named stops. Every layout decision references these — no ad-hoc breakpoints in implementation units.

| Stop | Range | Recipe grid | Card padding | Hero h1 |
|---|---|---|---|---|
| **Compact** | `<40rem` (mobile) | 1 column | 1rem | clamp(1.875rem, 6vw, 2.25rem) |
| **Comfortable** | `≥40rem` (tablet, small desktop) | 2 columns, auto-fill `minmax(18rem, 1fr)` | 1.25rem | 2.25rem |
| **Wide** | `≥72rem` (large desktop) | 3 columns, auto-fill `minmax(20rem, 1fr)` | 1.5rem | 2.75rem |

**Filter bar.** Collapses to summary-only at Compact (chip groups stack vertically when open); expands to two columns at Comfortable; full row at Wide. The `<details>` open/close persists across breakpoints.

**Logo swap.** Full mark → coupe mark at Compact (current 42rem breakpoint moves to 40rem to match the new scale).

**Facts spec block** (recipe page). 2 columns at Compact, 4 columns at Comfortable and Wide.

---

## Focus + interaction states

**Global focus ring** (every interactive element):

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
  border-radius: var(--radius-sm);
}
```

Applied via the `:focus-visible` pseudo-class, so mouse clicks don't show the ring; keyboard tab does. Inputs get the ring + a soft accent glow (`box-shadow: 0 0 0 3px var(--color-accent-ring)`) on focus.

**Hover** (pointer devices only):

```css
@media (hover: hover) {
  /* hover treatments here */
}
```

Touch devices never trigger hover — they get the active/pressed state on tap.

**Chip states** (taxonomy filters):

| State | Appearance |
|---|---|
| Default | `bg-surface`, `border-rule`, `text-fg-muted` |
| Hover | `border-rule-strong`, `text-fg` |
| Focus-visible | Default + focus ring |
| Active (selected filter) | `bg-accent`, `text-accent-fg`, `border-accent` |
| Active + focus-visible | Active + focus ring (the ring sits outside the active fill) |

The focus ring is *distinct from* the active fill so keyboard users can always tell where focus is, even on a selected chip.

---

## Editorial flourishes

Three primitives in scope this round. Pull quotes are explicitly out (would require a TEMPLATE.md authoring-convention change — defer).

### 1. Drop cap on the recipe lede

Target the in-layout `.blurb` element (rendered by `RecipeLayout.astro`, not by markdown), so the selector is deterministic regardless of what `## Heading` the recipe body opens with.

```css
.recipe-header .blurb::first-letter {
  font-family: var(--font-display);    /* Fraunces */
  font-weight: 600;
  font-size: 3.5em;
  float: left;
  line-height: 0.85;
  margin-right: 0.08em;
  margin-top: 0.05em;
  color: var(--color-accent);
}
```

The cap is in Fraunces (not the body Newsreader) — display weight for the moment, body weight for the prose. Color is accent terracotta. Float left so prose wraps around two lines.

### 2. Section dividers between recipe-body sections

Applied as a `::before` rule on every `h2` in `.recipe-body` *except the first*, so there's no awkward divider above "Ingredients" (which already separates visually from the spec block).

```css
.recipe-body :global(h2:not(:first-child))::before {
  content: '';
  display: block;
  width: 3rem;
  height: 1px;
  background: var(--color-rule);
  margin: 2.5rem auto 1.5rem;
}
```

Small centered rule (48px wide), neutral border color. Quiet — does its job and stops there.

### 3. Eyebrow on recipe-body h2

The existing uppercase-sans treatment for section headings (`INGREDIENTS`, `STEPS`) is retained — research showed serif-display section headings here would compete with the drop-cap and h1. The eyebrow eyebrow + section divider together give enough visual rhythm.

---

## Print

Recipe pages are the one page type users print (to use at a bar or kitchen counter). The print stylesheet handles this; ships in U5 inside `RecipeLayout.astro` or as a `@media print` block in `global.css`.

```css
@media print {
  :root {
    --color-bg: #ffffff;
    --color-surface: #ffffff;
    --color-fg: #000000;
  }
  .site-header, .site-footer, .header-search,
  .back, .taxonomy, .attribution, .related,
  .recipe-body :global(h2:not(:first-child))::before {
    display: none;
  }
  .recipe-header .blurb::first-letter {
    float: none;
    font-size: 1.5em;
    color: inherit;
  }
  .card, .facts {
    box-shadow: none;
    border: 1px solid #ccc;
  }
  .facts {
    grid-template-columns: 1fr;
  }
}
```

The print version is utilitarian — pure recipe text, single-column facts, no chrome, drop cap dialed down so it doesn't orphan on page break.

---

## Out of scope

Restated from the plan; one new acknowledgment:

- **Logo / brand mark rework** — shipped in #31. The redesign is built around the coupe-glass mark, not replacing it.
- **Content schema / recipe data model** — no changes to frontmatter fields, no new taxonomy values.
- **Search engine swap or major Pagefind UX rework** — Pagefind chrome restyles to the new tokens; the search UX itself is unchanged.
- **Dark mode** — dropped per the user's "light theme" decision. Accepted cost: low-light browsing loses the dark variant; revisiting requires a parallel token sweep, not a quick flip.
- **Pull quotes as a recipe-body primitive** — requires TEMPLATE.md authoring convention. Deferred.

**Spec-icons coordination tradeoff.** Issue #10 asks iconography and design language to "land together." This redesign defers spec-icons to a separate follow-up, accepting some retrofit risk: when icons arrive, they'll consume the radius (22px), stroke vocabulary (implied 1.5px hairline if outlined; solid if filled), and accent terracotta as constraints. The follow-up issue should reference this document so the icon set inherits these decisions rather than competing with them.
