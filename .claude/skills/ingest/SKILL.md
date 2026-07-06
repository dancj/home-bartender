---
name: ingest
description: Bulk-ingest raw recipe material from intake/ into recipes/inbox/ drafts and ship them as one PR. Use when the user says "/ingest", "ingest the intake folder", or asks to bulk-import recipes.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Bulk Recipe Ingest

Batch-normalize raw recipe material from `intake/` into `recipes/inbox/` drafts, then open one PR per batch. Normalization rules are the "Email Recipe Processing" section of `CLAUDE.md` and the schema in `TEMPLATE.md` — this skill adds batching, not new rules. Read both before parsing.

## Flow

1. **Prepare.** Create `intake/` if missing (it is gitignored — raw material never gets committed). If it's empty, say so and stop.

2. **Enumerate and bound the batch.** List `intake/*` sorted oldest-first (modification time). Process **at most 10 files per invocation**. If more remain, report the remaining count at the end so the user re-invokes for the next chunk — one branch/PR per chunk keeps each PR reviewably small.
   - Text files (`.txt`, `.md`, pasted email exports): read directly.
   - Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`): read with the Read tool (it renders images).
   - Unsupported or unreadable formats (e.g. `.heic`, `.pdf` scans that fail to read, binary blobs): **flag them in the final report** — never silently skip.

3. **Parse and normalize each file** per the Email Recipe Processing rules in `CLAUDE.md`. In brief:
   - Slug = lowercase-hyphenated recipe name; file lands at `recipes/inbox/<slug>.md`.
   - `category: inbox`, `publish: false`.
   - Frontmatter carries `ingredients[]`, `steps[]`, top-level `garnish`, `float`, and `house_made{}` / `batch{}` where the source describes them. Body is `## Notes` (plus narrative-only sections) — never `## Ingredients` / `## Steps` headings.
   - Infer `glass`, `method`, `ice`, `difficulty`, `spirits[]`, `flavors[]` from taxonomy values only (`data/taxonomy.yaml` via `TEMPLATE.md` table).
   - Missing measurements stay blank — never guess.
   - Attribution only when the source names both creator AND venue; otherwise leave the block empty.
   - **Duplicate slugs:** if `recipes/**/<slug>.md` already exists, do not overwrite — flag the collision in the report and skip the file (or suffix `-2` only if the source is clearly a different recipe with the same name).
   - A file that can't be parsed as a recipe gets flagged in the report, not force-fitted.

4. **Validate.** Run `npm run validate` and fix any reported issues in the drafts before shipping.

5. **Ship one PR** (per the Contributing rules — never commit on `main`/`staging`):
   ```
   git checkout -b feat-inbox-bulk-<YYYY-MM-DD>
   git add recipes/inbox/
   git commit -m "feat(inbox): bulk-ingest <N> recipes"
   git push -u origin feat-inbox-bulk-<YYYY-MM-DD>
   gh pr create --title "feat(inbox): bulk-ingest <N> recipes" --body "..."
   ```
   The PR body lists each parsed recipe, flags missing measurements or inferred values per recipe, and lists skipped/unparseable/duplicate files. Where practical, quote a short excerpt of each source in the PR body so the reviewer can spot-check transcription — the gitignored source files won't be visible in the diff.

6. **Report** to the user: recipes written, files flagged (unparseable / unsupported format / duplicate slug), files remaining in `intake/`, branch name, PR URL. Suggest deleting successfully-ingested source files from `intake/` (user's call — the skill never deletes them).

Ingested drafts stay off the public site until promoted (`npm run promote -- <slug> --category=<...>`) after the PR merges.
