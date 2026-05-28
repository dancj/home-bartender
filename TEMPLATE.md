# Recipe Template

Every recipe in `recipes/**/*.md` follows this shape. The frontmatter block is required and is what the site uses to render, filter, and search.

## Frontmatter Schema

```yaml
---
title: Recipe Name
blurb: "One-line description — spirit, style, occasion, or vibe."

# Categorization (category should match the parent directory)
category: classic            # classic | original | seasonal | inbox
publish: true                # false for inbox drafts — hidden from the site

# The drink itself
glass: rocks                 # canonical slug (see Canonical Taxonomy table below)
glass_note: ""               # optional addendum (e.g. "or coupe", "with a big cube")
method: shaken               # shaken | stirred | built | blended
method_note: ""              # optional addendum (e.g. "topped", "dry shake first")
ice: cubed                   # cubed | large-cube | crushed | none
ice_note: ""                 # optional
difficulty: easy             # easy | medium | advanced

# Cocktail Codex root family — optional, populated intentionally per recipe
family: old-fashioned        # old-fashioned | martini | daiquiri | sidecar | whiskey-highball | flip

# Format / serving
spirits: [tequila]           # canonical set (see below); empty for mocktails
format: single               # single | batch | punch
serves: 1

# Filterable taxonomy
flavors: [citrus, refreshing]
tags: []                     # free-form descriptors that don't fit any canonical surface (e.g. "smoky-sour", "spicy")
occasions: [weeknight]       # weeknight | batch-friendly | showstopper | brunch | nightcap | summer | winter

# Structured recipe content (renders via shared Astro components)
ingredients:
  - 2 oz blanco tequila
  - 1 oz fresh lime juice
  - ½ oz Cointreau
garnish: Salt rim            # optional — `**Garnish:**` bold-callout convention, one canonical place
float: ""                    # optional — `**Float:**` bold-callout convention (e.g. ¼ oz Laphroaig)
steps:
  - Combine in a shaker with ice.
  - Shake hard, strain into a rocks glass.

# House-Made preparation (optional, single object — change to an array if a recipe ever needs more)
house_made:
  name: Honey-Ginger Syrup   # rendered as "House-Made <name>"
  yield: Makes ~4 oz. Keeps 2–3 weeks refrigerated.   # optional italic line
  ingredients:               # optional — omit when the procedure produces the ingredient (e.g. bacon-washed bourbon)
    - 1 cup honey
    - 1 cup water
  steps:
    - Combine honey and water in a small saucepan.
    - Simmer 10 minutes, strain, cool.

# Batch / punch scale-up (optional)
batch:
  yield: Makes 8 servings.
  ingredients:               # optional
    - 16 oz blanco tequila
    - 8 oz lime juice
  instructions: |            # PLAIN TEXT — markdown syntax renders literally. Split on blank lines into <p> blocks.
    Combine all in a pitcher. Stir to chill.
    Pour over ice in salt-rimmed glasses.

# Attribution for borrowed recipes (leave empty for originals)
attribution:
  creator: ""                # e.g. "Sam Ross"
  bar: ""                    # e.g. "Milk & Honey, NYC"
  year: ""                   # e.g. "2005"
  source_url: ""

# Cross-linking
related: []                  # slugs of related recipes — validated at build time
aliases: []                  # previous slugs this recipe was known as (for redirects)

# Reserved for Phase 2 (leave empty for now)
hero_image: ""
gallery: []
preparations: []

created: 2026-05-22          # ISO date; updated is derived from git
---
```

## Canonical Taxonomy

Add new values by editing `data/taxonomy.yaml` and running `npm run codegen` — the table below regenerates automatically (along with `src/taxonomy.generated.ts` and `scripts/taxonomy.generated.mjs`). CI fails if any generated artifact is stale.

<!-- taxonomy:start -->
| Field | Allowed values |
|-------|----------------|
| `category` | `classic`, `original`, `seasonal`, `inbox` |
| `method` | `shaken`, `stirred`, `built`, `blended` |
| `ice` | `cubed`, `large-cube`, `crushed`, `none` |
| `difficulty` | `easy`, `medium`, `advanced` |
| `format` | `single`, `batch`, `punch` |
| `family` | `old-fashioned`, `martini`, `daiquiri`, `sidecar`, `whiskey-highball`, `flip` |
| `glass` | `coupe`, `nick-and-nora`, `rocks`, `double-rocks`, `highball`, `collins`, `flute`, `wine`, `margarita`, `martini`, `mug`, `snifter`, `julep-tin` |
| `spirits` | `tequila`, `mezcal`, `whiskey`, `bourbon`, `rye`, `scotch`, `gin`, `vodka`, `rum`, `brandy`, `aperitif`, `liqueur`, `wine`, `champagne` |
| `flavors` | `citrus`, `nutty`, `smoky`, `sour`, `spice`, `herbal`, `floral`, `botanical`, `bright`, `chocolate`, `rich`, `sweet`, `spirit-forward`, `bitter`, `fruity`, `tart`, `bubbly`, `savory`, `refreshing` |
| `occasions` | `weeknight`, `batch-friendly`, `showstopper`, `brunch`, `nightcap`, `summer`, `winter` |
<!-- taxonomy:end -->

## Body

Structured content (ingredients, steps, house-made preparations, batch instructions) lives in frontmatter and renders via the recipe layout's typed Astro components — see `src/components/recipe/`. The body is for narrative prose only: `## Notes` and any narrative-only sections (e.g. `## Variations`). The body linter (`scripts/validate.mjs`) errors on residual `## Ingredients` / `## Steps` / `## House-Made …` / `## How to Batch It` headings in the body — those are migration leftovers.

```markdown
# Recipe Name

> *One-line description — same as the blurb in frontmatter.*

## Notes

*Origin story, substitutions, variations, tips.*
```

## Validation

```sh
node scripts/validate.mjs
```

Run before committing. Fails on:
- Invalid frontmatter
- Non-canonical enum values
- `related[]` entries that don't resolve to a recipe file
- Duplicate slugs across directories

## Migration

Two one-off migration scripts live under `scripts/`. Both are idempotent (re-runs are no-ops) and are kept around for historical reference:

- `scripts/migrate-to-frontmatter.mjs` — pre-frontmatter bold-fact prose headers → frontmatter schema. Run once during the initial schema cutover.
- `scripts/migrate-body-to-frontmatter.mjs` — Stage A (issue #23, 2026-05-27): freeform `## Ingredients` / `## Steps` / `## House-Made …` / `## How to Batch It` body sections → structured `ingredients[]` / `steps[]` / `house_made{}` / `batch{}` frontmatter fields, with `**Garnish:**` / `**Float:**` bold callouts and inline garnish list items extracted to top-level `garnish` / `float` strings.
