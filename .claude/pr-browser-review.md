# PR browser review — repo notes

- Serve: `npm run build && npx astro preview --port 4321` on `localhost:4321`. Prod build, so search and images work as shipped.
- Build kind (for the comment): Production build (`astro build` + `astro preview`)
- Local files to copy into the throwaway worktree: none
- Pre-flight: `npm run validate`
- Primary viewport: phone 390×844
- Pages: `/recipes/<slug>/` for each changed recipe file, `/syrups/<slug>/` for syrups, and the file path for `src/pages/*`. Hidden pages need `?preview=1`.
- Sign-in: none
- Read-only: nothing is submitted. Checklist state is localStorage only.
- Comment heading: `### Browser check:`
- Redact: none (no personal data)
