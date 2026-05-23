# Home Bartender

A personal cocktail recipe collection — markdown files in, static site out.

**Live site: https://dancj.github.io/home-bartender/**

Recipes are markdown with YAML frontmatter (see [`TEMPLATE.md`](TEMPLATE.md)). The site is built with [Astro](https://astro.build) and [Pagefind](https://pagefind.app), and deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml`. New recipes arrive via email/WhatsApp, get parsed by a personal AI assistant, land in `recipes/inbox/` with `publish: false`, and become live after a quick human review.

## Structure

```
recipes/
  classics/      ← established cocktails (with attribution to original creator)
  originals/     ← personal creations and experiments
  seasonal/      ← seasonal/holiday recipes
  inbox/         ← drafts awaiting review (publish: false)
sections/        ← prose: techniques, tools, glossary
src/             ← the Astro app (layouts, pages, components)
scripts/         ← migration + validation utilities
```

## Working with the site

```sh
npm install          # one-time
npm run dev          # local dev server at localhost:4321
npm run validate     # check every recipe's frontmatter against the schema
npm run build        # full production build → dist/ (includes Pagefind index)
```

Pushing to `main` deploys via GitHub Actions.

## License

Two licenses, one repo:

- **[`LICENSE-CODE`](LICENSE-CODE)** — MIT for the framework code (Astro app, scripts, workflow, configs)
- **[`LICENSE-CONTENT`](LICENSE-CONTENT)** — CC BY 4.0 for the recipe prose and section writeups

Recipe specs (ingredients, ratios, methods) aren't copyrightable — those are facts and techniques. Borrowed recipes credit their original creator via the per-recipe `attribution` frontmatter block.
