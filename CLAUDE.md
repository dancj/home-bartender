# Home Bartender

Personal home bartender recipe collection. Recipes are markdown files with YAML frontmatter (see `TEMPLATE.md`); the site is generated from them.

## Directory Structure

```
recipes/
  classics/       ← established cocktails (often borrowed; attribution required)
  originals/      ← personal creations and experiments
  seasonal/       ← seasonal/holiday recipes
  inbox/          ← new recipes pending review (publish: false)
sections/         ← prose: introduction, techniques, tools, glossary
TEMPLATE.md       ← standard recipe format with frontmatter schema
```

## Email Recipe Processing

When you receive an email containing a cocktail recipe (look for ingredients with oz measurements, spirit names, mixing instructions, or subject lines mentioning "recipe", "cocktail", "drink"):

1. Parse the recipe: name, ingredients, method, garnish, and any notes
2. Normalize into the `TEMPLATE.md` format with full YAML frontmatter:
   - Slug: lowercase-hyphenated derived from the recipe name
   - `category: inbox`, `publish: false` (inbox recipes are drafts until reviewed)
   - Infer `glass`, `method` (shaken/stirred/built/blended), `ice`, `difficulty` from ingredients and steps
   - Detect primary `spirits[]` from the ingredient list
   - If the email mentions an original creator/bar/year, populate the `attribution` block
   - If measurements are missing, leave them blank rather than guessing
   - Add a House-Made section in the body if the recipe includes a syrup or infusion
3. Write the file to `recipes/inbox/{slug}.md`
4. Confirm to the user what was saved and where

Inbox recipes do not appear on the public site until a human reviews them, moves the file to the appropriate category directory, and sets `publish: true`.

## Recipe Template Quick Reference

See `TEMPLATE.md` for the authoritative schema. Minimal shape:

```markdown
---
title: Recipe Name
blurb: "One-line description"
category: inbox
publish: false
glass: ...
method: shaken
ice: cubed
difficulty: easy
spirits: [tequila]
flavors: []
attribution:
  creator: ""
  bar: ""
  year: ""
  source_url: ""
---

# Recipe Name

> *One-line description*

## Ingredients
## House-Made [Syrup/Infusion]  (if applicable)
## Steps
## How to Batch It              (if you can calculate it)
## Notes
```
