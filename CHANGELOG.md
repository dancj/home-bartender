# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).

Versions follow [CalVer](https://calver.org/) in the form `YYYY.M.D.N`, where `N` is a same-day release counter starting at `1`. The release workflow tags `release-<version>` on `main` and opens a `docs:` PR back to `staging` with the new entry — a human merges that PR so the entry rides the next release.

## [Unreleased]
## [2026.5.29.1] - 2026-05-29

### Features

- #43 — feat: Stage A — typed recipe components with frontmatter-driven body sections (@dancj)
- #36 — feat: core visual shift — tokens, cards, shell (U2+U3+U4) (@dancj)
- #35 — feat: design direction doc for site personalization (U1) (@dancj)
- #30 — feat: Add body-structure linter for recipes (@dancj)
- #29 — feat: Add npm run promote <slug> to one-shot inbox → published (@dancj)
- #27 — feat: tighten content license to CC BY-NC + repo identity cleanup (@dancj)
- #11 — feat: canonical taxonomy registry (single source of truth) (@dancj)
- #6 — feat: auto-maintain staging→main release PR (with CHANGELOG) (@dancj)
- #5 — feat: add Vitest with anchor test and CI gating (@dancj)

### Fixes

- #7 — fix: use origin/main..HEAD for the staging-ahead check (@dancj)

### Platform

- #51 — chore(deps): update dependency node to v24 (@app/renovate)
- #50 — fix(ci): unbreak release-changelog tagging workflow (@dancj)
- #48 — feat(layout): collapsing logo header (@dancj)
- #46 — chore(deps): update dependency astro to v6.4.2 (@app/renovate)
- #45 — feat(layout): folder-tab nav, full-bleed logo, leaner home + learn pages (@dancj)
- #44 — chore(deps): update dependency astro to v6.4.1 (@app/renovate)
- #42 — chore(deps): update dependency lint-staged to v17 (@app/renovate)
- #41 — chore(deps): update actions/cache action to v5 (@app/renovate)
- #39 — chore(#20): DX hardening — pre-commit hook, .astro CI cache, named deploy gates (@dancj)
- #38 — chore(deps): update dependency astro to v6.3.8 (@app/renovate)
- #34 — chore(deps): update dependency png-to-ico to v3 (@app/renovate)
- #33 — feat(brand): add logo and favicon (@dancj)
- #26 — chore(deps): update dependency node to v24 (@app/renovate)
- #25 — chore(deps): update actions/upload-pages-artifact action to v5 - autoclosed (@app/renovate)
- #24 — chore(deps): update actions/setup-node action to v6 (@app/renovate)
- #16 — chore(deps): update actions/deploy-pages action to v5 (@app/renovate)
- #15 — chore(deps): update actions/checkout action to v6 (@app/renovate)
- #12 — chore: add Renovate config (@dancj)
- #2 — docs: spell out branch + PR steps for email recipe ingest (@dancj)
- #1 — Docs/pr workflow and inbox copy (@dancj)
