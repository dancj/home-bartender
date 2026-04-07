---
name: assemble-book
description: Regenerate the full Typst book draft (book.typ) from current recipes and sections. Use when recipes have been added, edited, or reorganized and you need a fresh PDF-ready draft.
argument-hint: [optional: --compile to also run typst compile]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Assemble Book

Regenerate `book.typ` — the full Typst draft of The Home Bartender — from the current state of all recipe and section files.

## Steps

### 1. Gather all content

- Read every `.md` file in `recipes/classics/`, `recipes/originals/`, `recipes/seasonal/`, and `recipes/inbox/`
- Read every `.md` file in `sections/` (introduction, tools, techniques, glossary)
- Read `TEMPLATE.md` for the canonical recipe format

### 2. Determine recipe order

- Collect ALL recipes from all subdirectories (classics, originals, seasonal, inbox)
- Sort alphabetically by recipe name
- Do not separate by category — the book presents all recipes in one alphabetical sequence

### 3. Parse each recipe markdown

For each recipe `.md` file, extract:
- **Name** — the `# Title`
- **Tagline** — the `> *italic line*`
- **Metadata** — Glass, Method, Ice, Difficulty
- **Flavors** — any flavor tags (e.g., `SMOKY` `CITRUS`)
- **Ingredients** — the ingredient list with measurements
- **House-Made section** — if present (syrups, infusions, fat-washes)
- **Steps** — the numbered method
- **Batch section** — "How to Batch It" if present
- **Notes** — the notes section
- **If You Like This, Try** — cross-references if present

### 4. Generate book.typ

Write `book.typ` using the Typst template established in the project. The structure is:

```
Title Page ("The Home Bartender", "DRAFT — [current month year]")
Table of Contents (list all recipes alphabetically)
Introduction (from sections/introduction.md)
Tools (from sections/tools.md)
Techniques (from sections/techniques.md)
Chapter divider: "Recipes"
  [Each recipe on its own page, alphabetically]
Glossary (from sections/glossary.md)
```

Each recipe MUST fit on a single page. Recipe page includes:
- Title (centered, 22pt, accent color — reduce to 20pt or 18pt for long names)
- Tagline (italic, 9.5pt, muted)
- Metadata bar (glass, method, ice, difficulty — white on accent, 8pt)
- Flavor tags (if present)
- Ingredients grid (measurement column + ingredient column)
- House-Made section (if applicable)
- Method (numbered steps)
- Batch section (if applicable)
- Notes
- "If you like this, try" as compact inline text (muted, 8pt) — NOT a boxed callout
- NO image placeholders — omit entirely

### 5. Typst styling reference

Use these exact design tokens (already defined in book.typ):
- Page: 5.5 × 8.5 in, 0.6in x-margin, 0.55in y-margin
- Font: Libertinus Serif, 9pt
- Par leading: 0.5em; list/enum spacing: 0.4em
- Accent: `#2c4a3e` (deep botanical green)
- Soft: `#f5f0e8` (warm cream)
- Muted: `#8c7b6b` (warm gray-brown)
- Rule: `#ddd8cf` (divider line)

### 6. Compile (if requested)

If `$ARGUMENTS` contains `--compile`, run:
```bash
typst compile book.typ book.pdf
```
And confirm the page count and any warnings.

## Important

- Every recipe in the repo should appear in the book — do not skip inbox recipes
- Alphabetize by display name (e.g., "Army & Navy" sorts under A)
- If a recipe is missing key fields (Glass, Method, etc.), include it anyway with what's available
- Do NOT modify the source recipe `.md` files — only read them and generate `book.typ`
- Preserve all house-made syrup/infusion recipes exactly
- Image placeholders should reference the `assets/` directory structure
