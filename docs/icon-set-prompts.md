# Icon Set Generation Prompts

Reference prompts for generating the bartender-specific icon set (tracked in [#57](https://github.com/dancj/home-bartender/issues/57)). Built for image generators like Gemini on web.

Every facet value comes from `data/taxonomy.yaml` (the single source of truth). If the taxonomy changes, update both that file and this doc.

## How to use

1. Paste one prompt block below into the generator.
2. Keep the **STYLE block identical across every run** — that's what makes all 86 icons read as one family.
3. Save each result by its slug (`coupe.png`, `tequila.png`, …) so the files map straight onto the taxonomy.
4. Image generators return raster images, not SVG. Drop the generated grid PNGs into `docs/imgs/`, add an entry to `data/icon-grids.json` (group, slice options, row-major slug order — `null` skips a duplicate/variant cell), and run `npm run icons` to slice + vectorize them into `src/assets/icons/<group>/<slug>.svg` (requires `brew install potrace`). Sliced raster previews land in `.icon-work/` for QA.

**Background:** prompts use a solid **white** background. The first three groups (categories, methods, ice) were drafted with transparent backgrounds before switching — re-run them on white if you want the whole set consistent.

## Shared STYLE block

```
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all icons
```

## Counts

| Group | Count |
|---|---|
| Categories | 4 |
| Methods | 4 |
| Ice | 4 |
| Difficulty | 3 |
| Format | 3 |
| Families | 6 |
| Glassware | 13 |
| Spirits | 14 |
| Flavors | 19 |
| Occasions | 7 |
| Structural headings | 9 |
| **Total** | **86** |

`martini` and `wine` each appear in two facets (glass + family / spirit) — decide whether they share one glyph or get context-specific variants.

---

## 1. Categories (4)

```
Create a set of 4 matching icons for a home bartender website. Bartender/cocktail themed.

STYLE (apply identically to all 4):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 4

ICONS:
1. "classic" — an established, timeless cocktail. Metaphor: a vintage coupe glass or a bow-tie motif.
2. "original" — a contributor's own signature creation. Metaphor: a sparkle/star or a signature pen stroke.
3. "seasonal" — holiday/seasonal drinks. Metaphor: a sprig of garnish (mint/rosemary) or a sun-and-snowflake pairing.
4. "inbox" — new draft recipes pending review. Metaphor: a serving tray or a clipboard.

Output each icon separately on a solid white background so I can export them individually.
```

## 2. Methods (4)

```
Create a set of 4 matching icons for a home bartender website. Bartender/cocktail themed.

STYLE (apply identically to all 4):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 4

ICONS:
1. "shaken" — cocktail made in a shaker. Metaphor: a Boston/cobbler shaker, optionally with motion lines.
2. "stirred" — stirred in a mixing glass. Metaphor: a bar spoon in a mixing glass, optionally with a swirl.
3. "built" — assembled directly in the serving glass. Metaphor: a highball glass with ingredients layering/pouring in.
4. "blended" — blended with ice. Metaphor: a blender jar, optionally with motion/swirl lines.

Output each icon separately on a solid white background so I can export them individually.
```

## 3. Ice (4)

```
Create a set of 4 matching icons for a home bartender website. Bartender/cocktail themed.

STYLE (apply identically to all 4):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 4

ICONS:
1. "cubed" — standard ice cubes. Metaphor: two or three small square ice cubes.
2. "large-cube" — one big rock. Metaphor: a single large square ice cube.
3. "crushed" — crushed/pebble ice. Metaphor: a small mound of irregular crushed ice fragments.
4. "none" — served without ice. Metaphor: a single ice cube with a slash/no-symbol through it.

Output each icon separately on a solid white background so I can export them individually.
```

> Watch: `cubed` vs `large-cube` read only through size/quantity. If they converge, specify "large-cube fills most of the frame; cubed shows three small cubes taking up less than half."

## 4. Difficulty (3)

```
Create a set of 3 matching icons for a home bartender website. Bartender/cocktail themed.

STYLE (apply identically to all 3):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 3

ICONS:
1. "easy" — beginner-friendly, few steps. Metaphor: one filled dot of three.
2. "medium" — moderate effort. Metaphor: two filled dots of three.
3. "advanced" — complex, many steps/techniques. Metaphor: three filled dots of three.

Output each icon separately on a solid white background so I can export them individually.
```

> A filled/unfilled pip scale (1, 2, 3 dots) reads more clearly as difficulty than a glass-count metaphor (which looks like serving size).

## 5. Format (3)

```
Create a set of 3 matching icons for a home bartender website. Bartender/cocktail themed.

STYLE (apply identically to all 3):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 3

ICONS:
1. "single" — one cocktail, one serving. Metaphor: a single cocktail glass.
2. "batch" — pre-mixed in quantity. Metaphor: a pitcher or carafe, optionally with a couple of glasses beside it.
3. "punch" — large-format communal serving. Metaphor: a punch bowl with a ladle.

Output each icon separately on a solid white background so I can export them individually.
```

## 6. Families (6)

```
Create a set of 6 matching icons for a home bartender website. Bartender/cocktail themed.

STYLE (apply identically to all 6):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 6

ICONS (these are cocktail "family" templates — represent each by its archetypal drink in its signature glass):
1. "old-fashioned" — spirit + sugar + bitters. Metaphor: a rocks glass with a large ice cube and an orange peel/twist.
2. "martini" — spirit + fortified wine, stirred. Metaphor: a martini or Nick & Nora glass with an olive.
3. "daiquiri" — spirit + citrus + sweetener, shaken. Metaphor: a coupe glass with a lime wheel.
4. "sidecar" — spirit + citrus + orange liqueur. Metaphor: a coupe glass with a sugar rim.
5. "whiskey-highball" — spirit + bubbly modifier, tall. Metaphor: a highball glass with bubbles and a long ice cube.
6. "flip" — spirit + sugar + whole egg. Metaphor: a small footed glass with frothy top and a dusting of nutmeg.

Output each icon separately on a solid white background so I can export them individually.
```

> Families ride on glass + garnish, so they overlap with Glassware. The garnish detail (olive, lime wheel, sugar rim, nutmeg froth, orange twist) is what keeps them distinct — if the generator simplifies garnish away, they collapse into plain glasses.

## 7. Glassware (13)

```
Create a set of 13 matching icons for a home bartender website. Each is a distinct piece of glassware/drinkware, shown empty.

STYLE (apply identically to all 13):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 13
- Draw each glass empty, front-on profile, so the SHAPE is the only distinguishing feature

ICONS:
1. "coupe" — shallow, wide, rounded-bowl stemmed glass.
2. "nick-and-nora" — small stemmed glass with a gently rounded, slightly tulip bowl (smaller and more closed than a coupe).
3. "rocks" — short, wide, straight-sided tumbler.
4. "double-rocks" — same tumbler shape as rocks but noticeably taller/larger.
5. "highball" — tall, straight-sided tumbler, medium width.
6. "collins" — tall, straight-sided tumbler, narrower and taller than highball.
7. "flute" — tall, very narrow stemmed champagne glass.
8. "wine" — stemmed glass with a rounded, tulip-shaped bowl.
9. "margarita" — stemmed glass with a wide, stepped/double-bowl coupette shape.
10. "martini" — stemmed glass with a sharp V-shaped conical bowl.
11. "mug" — handled mug (e.g. copper mug / Irish coffee mug) with a side handle.
12. "snifter" — short-stemmed, wide-bottomed, inward-tapering brandy glass.
13. "julep-tin" — metal julep cup/tin: a straight-sided, slightly tapered handleless metal cup.

Output each icon separately on a solid white background so I can export them individually.
```

> 13 in one shot may strain the generator. If sloppy, split into stemware (coupe, nick-and-nora, flute, wine, margarita, martini, snifter) and tumblers/other (rocks, double-rocks, highball, collins, mug, julep-tin) — same STYLE block in both. Near-twins to police: `rocks`/`double-rocks` (size) and `highball`/`collins` (proportion).

## 8. Spirits (14)

```
Create a set of 14 matching icons for a home bartender website. Each represents a category of spirit/wine.

STYLE (apply identically to all 14):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 14

ICONS (distinguish by the symbol described, NOT by generic bottle shape):
1. "tequila" — a blue agave plant (spiky rosette).
2. "mezcal" — an agave plant with a wisp of smoke rising (smoky).
3. "whiskey" — a classic whiskey bottle with a short neck.
4. "bourbon" — an oak barrel (charred-oak aged).
5. "rye" — a stalk/sheaf of rye grain.
6. "scotch" — a Scottish thistle flower.
7. "gin" — a sprig of juniper with a few berries.
8. "vodka" — a clean, simple bottle with a single drop or snowflake accent (neutral/clear).
9. "rum" — a stalk of sugarcane.
10. "brandy" — a cluster of grapes.
11. "aperitif" — a stemmed spritz glass with a citrus slice (bitter aperitif).
12. "liqueur" — a small, ornate cordial bottle.
13. "wine" — a wine bottle.
14. "champagne" — a champagne bottle with the cork popping out.

Output each icon separately on a solid white background so I can export them individually.
```

> 14 in one shot may strain the generator. If sloppy, split into by-plant (tequila, mezcal, rye, gin, rum, brandy) and by-vessel (whiskey, bourbon, scotch, vodka, aperitif, liqueur, wine, champagne). Watch `tequila`/`mezcal` (smoke wisp is the only tell) and `wine`/`champagne` (popping cork is the tell).

## 9. Flavors (19) — run as 3 batches

### Batch 1 — Fruit & citrus (6)

```
Create a set of 6 matching icons for a home bartender website. Each represents a cocktail flavor note.

STYLE (apply identically to all 6):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 6

ICONS:
1. "citrus" — a citrus wheel (cross-section slice).
2. "fruity" — a cluster of mixed berries/cherries.
3. "sweet" — a single sugar cube.
4. "sour" — a whole lemon with a pucker/squiggle accent.
5. "tart" — a lime wedge with a small zig-zag accent.
6. "bright" — a simple sunburst / radiating rays.

Output each icon separately on a solid white background.
```

### Batch 2 — Botanical & aromatic (6)

```
Create a set of 6 matching icons for a home bartender website. Each represents a cocktail flavor note.

STYLE (apply identically to all 6):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 6

ICONS:
1. "herbal" — a single mint sprig (two-three leaves on a stem).
2. "floral" — a single blossom flower, top view.
3. "botanical" — a juniper sprig with berries (mixed botanicals).
4. "spice" — a star anise pod.
5. "nutty" — a single almond or walnut.
6. "smoky" — a rising wisp of smoke.

Output each icon separately on a solid white background.
```

### Batch 3 — Texture & profile (7)

```
Create a set of 7 matching icons for a home bartender website. Each represents a cocktail flavor note.

STYLE (apply identically to all 7):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 7

ICONS:
1. "chocolate" — a square of chocolate / a chocolate bar segment.
2. "rich" — a thick dollop/droplet with a glossy highlight (luxurious, full-bodied).
3. "spirit-forward" — a neat pour in a rocks glass, no ice (strong, boozy).
4. "bitter" — a bitters dash bottle with a single drop.
5. "bubbly" — a cluster of rising bubbles/fizz.
6. "savory" — a single olive on a pick.
7. "refreshing" — a mint leaf with a water droplet.

Output each icon separately on a solid white background.
```

> Pairs to inspect: `sour`/`tart` (lemon vs lime wedge — may need to share a glyph), `savory` olive vs the martini/aperitif olive (the pick is the differentiator), `bright` sunburst vs `refreshing` (keep bright a pure sunburst).

## 10. Occasions (7)

```
Create a set of 7 matching icons for a home bartender website. Each represents an occasion/mood for a cocktail.

STYLE (apply identically to all 7):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 7

ICONS:
1. "weeknight" — a simple clock face showing an evening hour (quick, after-work).
2. "batch-friendly" — a pitcher pouring into two glasses (makes many servings).
3. "showstopper" — a starburst / small firework (impressive centerpiece).
4. "brunch" — a champagne flute with an orange slice (mimosa / daytime).
5. "nightcap" — a crescent moon with a small star (end of night).
6. "summer" — a bright sun.
7. "winter" — a snowflake.

Output each icon separately on a solid white background.
```

> Cross-group overlaps: `batch-friendly` (pitcher) vs `format:batch` and section `batch`; `summer` (plain sun) vs `brunch` (flute) vs flavor `bright` (sunburst); `nightcap` (moon) vs `weeknight` (clock).

## 11. Structural section headings (9)

These are recipe-page chrome, not taxonomy slugs. Suggested filenames use a `section-` prefix.

```
Create a set of 9 matching icons for a home bartender website. Each labels a section of a recipe page.

STYLE (apply identically to all 9):
- Monochrome: solid black on a solid WHITE background
- Single consistent stroke weight, line-art style (not filled silhouettes)
- Square 1:1 framing, generous even padding, each icon optically the same size
- Minimal and clean — readable at 24px, no text, no labels, no shadows or gradients
- Cohesive set: same visual language and detail level across all 9

ICONS:
1. "ingredients" — a bar jigger (double-cone measuring tool).
2. "steps" — a numbered list (three short lines with 1, 2, 3 markers).
3. "garnish" — a citrus twist spiral.
4. "float" — a glass with a distinct thin top layer floating above the liquid.
5. "house-made" — a mason jar with a lid (homemade syrup/prep).
6. "batch" — a pitcher pouring into two glasses.
7. "notes" — a notepad with a pencil.
8. "variations" — a branching path / fork splitting into two arrows.
9. "related" — two interlocking chain links.

Output each icon separately on a solid white background.
```

> `batch` here = occasions `batch-friendly` = `format:batch` (all the pitcher — can share one glyph). `garnish` twist vs flavor `citrus` wheel vs `herbal` sprig — keep them distinct. `float` is the abstract one; if muddy, try "a single drop hovering just above the surface of a drink."
