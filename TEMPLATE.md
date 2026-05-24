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

```markdown
# Recipe Name

> *One-line description — same as the blurb in frontmatter.*

## Ingredients

- X oz [spirit]
- X oz [modifier]
- X oz [acid/juice]
- X oz [sweetener]
- [Garnish], for garnish

## House-Made [Syrup / Infusion]  (optional)

*Makes ~X oz. Keeps X weeks refrigerated.*

- ingredient
- ingredient

1. Step
2. Step

## Steps

1. Step
2. Step
3. Step

## How to Batch It  (optional)

*Makes 8 servings:*

- batch amounts...

[Batch instructions — how to prep, store, and serve.]

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

The one-off `scripts/migrate-to-frontmatter.mjs` converts pre-frontmatter recipes (bold-fact prose headers) into this schema. It's idempotent — running it on already-migrated files is a no-op. Kept around in case future contributors want to bulk-import recipes that match the old format.
