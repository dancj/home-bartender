# Cocktail Book

This is Dan's cocktail recipe book project. Recipes are stored as markdown files following `TEMPLATE.md`.

## Directory Structure

```
recipes/
  classics/       ← established cocktails
  originals/      ← Dan's creations and experiments
  seasonal/       ← seasonal/holiday recipes
  inbox/          ← new recipes pending review
sections/         ← intro prose, techniques, tools, glossary
INDEX.md          ← master index by spirit, style, occasion, difficulty
TEMPLATE.md       ← standard recipe format
```

## Email Recipe Processing

When you receive an email containing a cocktail recipe (look for ingredients with oz measurements, spirit names, mixing instructions, or subject lines mentioning "recipe", "cocktail", "drink"):

1. Parse the recipe: name, ingredients, method, garnish, and any notes
2. Normalize it into the `TEMPLATE.md` format — fill in as much as you can:
   - Infer glass type, method (shaken/stirred/built), ice, and difficulty from the ingredients and steps
   - If measurements are missing, leave them as-is rather than guessing
   - Add a House-Made section if the recipe includes a syrup or infusion
3. Write the file to `/workspace/extra/cocktail-book/recipes/inbox/{recipe-name}.md` using lowercase-hyphenated naming
4. Confirm to the user what you saved and where

Do NOT update INDEX.md automatically — inbox recipes get reviewed and categorized manually.

## Recipe Template Quick Reference

```markdown
# Recipe Name
> *One-line description*

**Glass:** ... **Method:** ... **Ice:** ... **Difficulty:** ...

## Ingredients
## House-Made [Syrup/Infusion]  (if applicable)
## Steps
## How to Batch It              (if you can calculate it)
## Notes
```
