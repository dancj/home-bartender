---
title: "feat: Repo identity and content licensing"
type: feat
status: completed
date: 2026-05-24
origin: docs/brainstorms/2026-05-24-repo-identity-and-content-licensing-requirements.md
---

# feat: Repo identity and content licensing

## Summary

Implement the dual-license shape settled in the brainstorm. The repo already has both `LICENSE-CODE` (MIT body + custom Scope: footer) and `LICENSE-CONTENT` (custom CC BY 4.0 summary) at the root, plus a README License section pointing at them. All three sources currently agree on **CC BY 4.0** for content; this plan moves them coherently to **CC BY-NC 4.0**, removes the stale `npm run publish` parenthetical from CLAUDE.md, and reviews the GitHub repo description.

---

## Problem Frame

The brainstorm settled on dual licensing — MIT for framework code, CC BY-NC 4.0 for recipe/prose content — to discourage fork-and-republish of the content corpus without paying the operational cost of a private overlay. The plan's first authoring assumed the repo had no LICENSE files at the root ("permissive-by-omission" baseline) and described U1/U2 as creating those files. **That premise was wrong.** The repo has carried both `LICENSE-CODE` and `LICENSE-CONTENT` since commit `e5b0853` (2026-05-23), and the README's License section links to them. All three sources currently agree on **CC BY 4.0** for content. The plan now moves them coherently to **CC BY-NC**.

See origin's Problem Frame for the broader product-shape reasoning behind the dual-license choice.

---

## Requirements

R-IDs preserved from origin so plan-to-origin cross-references resolve cleanly. Plan-local additions use R9+.

- R3. Framework code is licensed under MIT, with `LICENSE-CODE` at the repo root containing the canonical MIT body. *(origin: R3)*
- R4. Recipe content (everything under `recipes/`) and prose content (everything under `sections/`) are licensed under CC BY-NC 4.0, with `LICENSE-CONTENT` at the repo root reflecting the BY-NC terms. *(origin: R4)*
- R5. The license split is discoverable from the repo root: a reader can tell from the README and root file names alone which license applies to which directory, without grepping. *(origin: R5)*
- R6. The README's License section accurately states the dual-license shape — MIT for code, CC BY-NC 4.0 for content — with a one-line plain-English summary of each and resolved links to `LICENSE-CODE` and `LICENSE-CONTENT`. *(origin: R6)*
- R7. CLAUDE.md's stale `npm run publish` parenthetical (the last sentence of the "Recipe Pipeline > Lifecycle > 3. Publish" step) is removed; `src/pages/inbox.astro` already points at `npm run validate` and needs no change. *(origin: R7)*
- R8. The GitHub repo description is reviewed against the new shape and updated via `gh repo edit` if it reads stale. The current description already reads accurate to the dual-positioned framing. *(origin: R8)*
- R9. After the change, `npm run validate`, `npm run build`, and `npm test` all pass cleanly with no new warnings. *(plan-local — smoke check)*

**Origin actors:** Maintainer (Dan), hypothetical framework cloner, hypothetical content reuser, hypothetical future contributor.

**Origin acceptance examples:** README-readability check (AE1, AE3 — covered by U3); commercial-blog prohibition (AE2 — enforced by `LICENSE-CONTENT`'s BY-NC terms via U2, made discoverable via U3).

---

## Scope Boundaries

### Deferred for later

*(Carried from origin — product/version sequencing.)*

- "Fork this for your own collection" / contributor onboarding documentation. Premature without actual contributor interest.
- Promote-script (`npm run promote <slug>`) behavior. Spins off as its own follow-on brainstorm against issue #18.
- Formal `CONTRIBUTING.md`, code of conduct, or PR templates.
- Per-recipe contributor attribution mechanics for future recipe contributions (existing `attribution` frontmatter schema preserved).

### Outside this product's identity

*(Carried from origin — positioning rejection.)*

- Splitting into two repos (public framework + private recipe overlay).
- Renaming or reframing the repo as "Dan's home bartender site only" (dropping framework framing).
- Migrating the intake side (nanoclaw / WhatsApp / email staging) into this repo.
- Going fully private.

### Deferred to Follow-Up Work

*(Plan-local implementation sequencing.)*

- SPDX license headers in framework source files (`src/**`, `scripts/**`). Adds machine-detectable discoverability granularity but unnecessary given root LICENSE files + clear README for v1.
- Per-directory `LICENSE` markers in `recipes/` and `sections/`. Redundant given root files plus the README explanation.
- A separate `NOTICE` file. Not required by MIT or CC BY-NC for original work.
- Replacing the LICENSE-CONTENT custom summary with canonical CC BY-NC legal code. Considered during plan revision and rejected — the reader-friendly summary structure was kept intentionally.
- Stripping the LICENSE-CODE "Scope:" footer to make it pure canonical MIT. Considered and rejected — the footer's cross-reference to LICENSE-CONTENT serves humans reading the file directly.

---

## Context & Research

### Relevant Code and Patterns

- `LICENSE-CODE` (already exists, 30 lines, dated 2026-05-23): standard MIT body for lines 1–21, then a custom "Scope:" footer (lines 23–29) clarifying which directories the license covers and cross-referencing `LICENSE-CONTENT` under CC BY 4.0. Copyright line (line 3): `Copyright (c) 2026 Dan Thayer`.
- `LICENSE-CONTENT` (already exists, 33 lines, dated 2026-05-23): a custom CC BY 4.0 summary (not canonical legal code) with reader-friendly "What this covers / What this does NOT cover / How to attribute" sections. Copyright line (line 3): `Copyright (c) 2026 Dan Thayer`.
- `README.md` (lines 33–40): License section linking to both files; states "CC BY 4.0" for content (currently matches the LICENSE-CONTENT file). All three sources move together to CC BY-NC.
- `CLAUDE.md` (line 126): the stale `npm run publish` parenthetical lives at the end of step 3 in "Recipe Pipeline > Lifecycle > Publish".
- `src/pages/inbox.astro`: already correctly tells users to run `npm run validate`; no change required.
- Current GitHub repo description (verified via `gh repo view`): *"Personal home bartender recipe collection and the framework that builds it. Markdown recipes → Astro → GitHub Pages."*

### Institutional Learnings

- `docs/solutions/` does not exist yet; no prior learnings apply.

### External References

- Canonical MIT text: https://opensource.org/license/mit
- CC BY-NC 4.0 deed: https://creativecommons.org/licenses/by-nc/4.0/
- CC BY-NC 4.0 legal code: https://creativecommons.org/licenses/by-nc/4.0/legalcode.txt
- Commit `e5b0853` introduced the original dual-license setup (CC BY); this plan supersedes that license choice in favor of CC BY-NC per the brainstorm.

---

## Key Technical Decisions

- **LICENSE-CONTENT keeps the custom summary format** (vs canonical legal code or hybrid). User-confirmed during plan revision: the existing summary's reader-friendly "What covers / doesn't cover / how to attribute" structure is more valuable than auto-detect-friendly canonical text. Swap CC BY → CC BY-NC throughout, update the deed URL, no structural change.
- **LICENSE-CODE keeps the Scope: footer** (vs strip to pure canonical MIT). User-confirmed: the footer's cross-reference to LICENSE-CONTENT serves humans reading the file directly. Update the embedded "CC BY 4.0" → "CC BY-NC 4.0".
- **Copyright holder remains "Dan Thayer"** as currently set in both LICENSE files. The earlier plan suggested shortening to "Dan" — that was based on the false premise of starting from scratch. The existing fuller form has higher legal precision and there's no reason to regress.
- **R-IDs preserved from origin** so plan cross-references resolve without an intermediate mapping section. Plan-local additions (the smoke-check requirement) start at R9 to avoid clash.
- **No per-directory LICENSE markers or SPDX headers in v1** — root files plus the README explanation continue to satisfy discoverability (R5). Easy to add later if a reader actually misreads the boundary.
- **GitHub repo description update tracked as a unit** even if implementation leaves it unchanged — keeps R8 visible and forces an explicit "still accurate?" moment.

---

## Open Questions

### Resolved During Planning

- README License section says CC BY 4.0 with "facts/techniques aren't copyrightable" rationale, contradicting the brainstorm's CC BY-NC decision → resolved during plan-time discussion: user confirmed the brainstorm decision (CC BY-NC) overrides the README; the rationale prose is rewritten in U3 to acknowledge what NC actually protects (prose, headnotes, compilation) while preserving the accurate observation that ingredient lists and ratios aren't copyrightable on their own.
- Copyright holder name → resolved during plan revision: keep existing "Dan Thayer" (already in both LICENSE files). The earlier "use Dan" suggestion was made under the wrong premise (no existing files) and is reversed.
- LICENSE-CONTENT format → resolved during plan revision: keep the custom summary structure, swap CC BY → CC BY-NC. Canonical legal code rejected as less reader-friendly; hybrid (summary + legal code) rejected as unnecessary ceremony.
- LICENSE-CODE Scope: footer → resolved during plan revision: keep, update the embedded CC BY 4.0 reference to CC BY-NC 4.0. Pure canonical MIT (without footer) rejected to preserve the informative cross-reference.

### Deferred to Implementation

- Whether `gh repo edit` works with the current token's scopes. If it fails in U5, leave a one-line note in the PR description so the maintainer updates by hand.
- Exact wording of the README's one-line plain-English license summary per bullet — small enough to settle while writing U3.

---

## Implementation Units

### U1. Update LICENSE-CODE Scope: footer to CC BY-NC reference

**Goal:** Update the existing `LICENSE-CODE` so the Scope: footer's cross-reference to LICENSE-CONTENT moves from "CC BY 4.0" to "CC BY-NC 4.0". The MIT body and copyright line are unchanged.

**Requirements:** R3, R5

**Dependencies:** None

**Files:**
- Modify: `LICENSE-CODE`

**Approach:**
- Leave lines 1–21 (the canonical MIT body) byte-identical.
- Leave line 3's copyright line (`Copyright (c) 2026 Dan Thayer`) untouched.
- Update the Scope: footer (lines 23–29): change the single "CC BY 4.0" reference to "CC BY-NC 4.0". No other footer changes; the prose about which directories are framework code stays accurate.

**Patterns to follow:**
- Existing footer prose style; minimal diff.

**Test scenarios:**
- Test expectation: none — single-token replacement in license-text footer, no behavior change.

**Verification:**
- `grep -F "CC BY 4.0" LICENSE-CODE` returns no matches.
- `grep -F "CC BY-NC 4.0" LICENSE-CODE` returns exactly one match (the updated footer line).
- The MIT body (lines 1–21) is byte-identical to its pre-change state.

---

### U2. Update LICENSE-CONTENT to CC BY-NC 4.0

**Goal:** Update the existing `LICENSE-CONTENT` from CC BY 4.0 to CC BY-NC 4.0, preserving the custom summary structure (header, copyright, four labeled sections).

**Requirements:** R4, R5

**Dependencies:** None

**Files:**
- Modify: `LICENSE-CONTENT`

**Approach:**
- Update the header line (line 1) from "Creative Commons Attribution 4.0 International (CC BY 4.0)" → "Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)".
- Leave the copyright line (line 3: `Copyright (c) 2026 Dan Thayer`) untouched.
- Update the prose paragraph (lines 5–6) referencing "Creative Commons Attribution 4.0 International License" → "Creative Commons Attribution-NonCommercial 4.0 International License".
- Update the deed URL (line 9) from `https://creativecommons.org/licenses/by/4.0/` → `https://creativecommons.org/licenses/by-nc/4.0/`.
- Leave the "What this covers" section (lines 11–17) substantively unchanged — every listed item still applies under BY-NC.
- Leave the "What this does NOT cover" section (lines 19–27) unchanged — its three carve-outs (ingredient specs, attributed recipes, framework code) all remain accurate under BY-NC.
- Leave the "How to attribute" section (lines 29–33) unchanged — attribution requirements are identical between BY and BY-NC.

**Patterns to follow:**
- Existing file's structure and tone; only license-name and URL changes propagate.

**Test scenarios:**
- Test expectation: none — text replacement only, no behavior change.

**Verification:**
- `grep -E "CC BY 4\.0|Attribution 4\.0" LICENSE-CONTENT` returns no matches.
- `grep -E "CC BY-NC 4\.0|Attribution-NonCommercial 4\.0" LICENSE-CONTENT` returns at least 2 matches (header line + prose paragraph).
- The deed URL points at `/by-nc/4.0/`, not `/by/4.0/`.
- The four section headings ("What this covers", "What this does NOT cover", "How to attribute") are preserved verbatim.

---

### U3. Rewrite README License section to match BY-NC and clarify rationale

**Goal:** Bring the README's existing License section in line with the now-BY-NC files — swap "CC BY 4.0" → "CC BY-NC 4.0", revise the rationale prose to accurately describe what NC protects, and ensure the links to LICENSE files reflect the updated state.

**Requirements:** R5, R6

**Dependencies:** U2 (LICENSE-CONTENT is updated so the README's claim and the file content agree before merge). U1 is independent but co-lands.

**Files:**
- Modify: `README.md` (License section, lines 33–40)

**Approach:**
- Keep the section's existing two-bullet structure pointing at `LICENSE-CODE` and `LICENSE-CONTENT`.
- Change "CC BY 4.0" → "CC BY-NC 4.0 (Attribution-NonCommercial 4.0 International)" in the content bullet.
- Add a one-line plain-English summary to each bullet: e.g., MIT bullet — "for the framework code (Astro app, scripts, workflow, configs) — modify and reuse freely with attribution"; CC BY-NC bullet — "for the recipe prose and section writeups — credit required, non-commercial use only".
- Rewrite the third paragraph (currently line 40): preserve the accurate observation that ingredient lists, ratios, and techniques aren't copyrightable on their own, but add that the recipe **prose**, **headnotes**, and the **compilation** are copyrightable — and that's what CC BY-NC protects. Keep the pointer to per-recipe `attribution` frontmatter for borrowed recipes.
- Traceability note (no doc change required): AE2 (commercial-blog prohibition) is *enforced* by `LICENSE-CONTENT`'s BY-NC terms (U2), not by the README text. U3 makes the prohibition *discoverable* via the README; U2 makes it *binding*. This unit covers AE1 and AE3 directly.

**Patterns to follow:**
- The existing README section's tone and structure (bullet-per-license, short rationale paragraph) — preserve it.

**Test scenarios:**
- *Happy path.* Covers AE1. Reader visits the GitHub repo page, reads the README License section without clicking into subdirectories, can tell at a glance MIT covers framework code and CC BY-NC covers recipe/prose content.
- *Happy path.* Covers AE3. Reader who wants to fork the framework code (without recipes) confirms from the README + LICENSE-CODE that MIT permits this unambiguously.
- *Integration.* Both license file links resolve when clicked from the rendered README on GitHub (no 404). Files already exist, so this should hold from the moment the PR opens.
- *Edge case.* GitHub's license-detection sidebar may surface only one of the two licenses (the detector prefers files literally named `LICENSE`). With `LICENSE-CODE`/`LICENSE-CONTENT` plus the Scope: footer and the custom-summary CC text respectively, sidebar coverage is partial; acceptable since the README explicitly explains the dual-license shape.

**Verification:**
- README License section names CC BY-NC 4.0 (not CC BY 4.0).
- Both file links resolve when opened from the rendered README.
- The rationale paragraph reads accurately for the NC stance — no remaining text implying recipes are fully unencumbered.

---

### U4. Clean up CLAUDE.md stale `npm run publish` reference

**Goal:** Remove the now-incorrect parenthetical claim about `src/pages/inbox.astro` advertising a `npm run publish` script (the page has already been corrected to point at `npm run validate`).

**Requirements:** R7

**Dependencies:** None

**Files:**
- Modify: `CLAUDE.md` (the parenthetical at the end of step 3 in "Recipe Pipeline > Lifecycle > Publish", currently line 126)

**Approach:**
- Locate the trailing sentence: *"There is no `npm run publish` script despite what `src/pages/inbox.astro` currently claims."*
- Remove the entire sentence. The preceding manual publish instructions (steps a/b/c) remain accurate as-is and don't need a "this script doesn't exist" disclaimer once the page no longer claims it does.
- Do not modify the manual publish step instructions themselves; the promote-script work (issue #18) handles that under its own brainstorm.

**Patterns to follow:**
- Tight in-place CLAUDE.md edits; no surrounding restructure.

**Test scenarios:**
- Test expectation: none — pure documentation correction, no behavior change.

**Verification:**
- `grep "npm run publish" CLAUDE.md` returns no matches.
- The Recipe Pipeline > Lifecycle > Publish step still reads coherently without the removed sentence.

---

### U5. Review the GitHub repo description

**Goal:** Confirm the GitHub repo description aligns with the dual-licensed product identity; update via `gh repo edit` only if it reads stale.

**Requirements:** R8

**Dependencies:** None (external action; can land in any order alongside the file changes).

**Files:**
- No repo files modified. External change (if needed) via `gh repo edit dancj/home-bartender --description "..."`.

**Approach:**
- Current description (verified during research): *"Personal home bartender recipe collection and the framework that builds it. Markdown recipes → Astro → GitHub Pages."*
- Assessment: already names both "personal recipe collection" and "the framework that builds it" — accurate to the dual-licensed framing. No change required by default.
- If the maintainer decides during implementation that an explicit license hint would help, update via `gh repo edit` (reproducible) rather than the GitHub web UI.
- If `gh repo edit` fails on token scope (history of this per CLAUDE.md's email-ingest workflow), flag in the PR description for manual maintainer follow-up.

**Patterns to follow:**
- N/A (external action).

**Test scenarios:**
- Test expectation: none — external state observation/change, no internal behavior.

**Verification:**
- `gh repo view dancj/home-bartender --json description` matches the intended description (unchanged is the default; updated only if intentional).

---

## System-Wide Impact

- **Interaction graph:** None. Changes are isolated to documentation and license files; no callbacks, middleware, or shared state touched.
- **Error propagation:** N/A — no runtime code changed.
- **State lifecycle risks:** None.
- **API surface parity:** N/A.
- **Integration coverage:** The README links `LICENSE-CODE` and `LICENSE-CONTENT` — those links already resolve today (files exist), and the U2/U3 updates preserve that. Covered by U3 verification.
- **Unchanged invariants:** Recipe content collection, taxonomy, build pipeline, deploy workflow, all test suites — all unaffected. The repo's stated license terms tighten from BY to BY-NC; no behavior changes.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| GitHub's license-detection sidebar may only surface one license (the detector prefers a file named `LICENSE`; `LICENSE-CODE` plus a Scope: footer is non-canonical, and `LICENSE-CONTENT` is a custom summary rather than legal code). | Acceptable — the README explicitly explains the dual-license shape and links both files. Sidebar accuracy is polish, not a correctness blocker. The decision to prioritise reader-friendly summaries over auto-detection was explicit. |
| Maintainer decides post-implementation that CC BY-NC is too restrictive (or that BY would have been fine) after seeing it live. | Reversible — both files are simple to swap; brainstorm doc explicitly notes the license decision was the most-debated point. |
| `gh repo edit` may fail due to token scope. | U5's default is "no change" since the current description is already accurate. If a change is intentional and `gh` fails, fall back to a PR-description note for manual maintainer follow-up. |
| Replacing CC BY with CC BY-NC retroactively could surprise anyone already relying on the BY terms. | The repo had 0 forks and 0 stars at brainstorm time; no current reliance exists. The PR commit message should be explicit about the license tightening so the history is unambiguous if a future reuser checks back. |

---

## Documentation / Operational Notes

- Single PR per repo convention bundles all changes (LICENSE files, README, CLAUDE.md). Smoke-check via `npm run validate`, `npm run build`, `npm test` before requesting review.
- After merge, the public-facing GitHub repo page surfaces the tightened licenses; no downstream consumers to coordinate with.
- The brainstorm doc (`docs/brainstorms/2026-05-24-repo-identity-and-content-licensing-requirements.md`) was committed separately on the same feature branch (`feat-repo-identity-and-content-licensing`); the PR description should reference both the brainstorm doc and this plan, and explicitly call out that this supersedes the license choice from commit `e5b0853`.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-24-repo-identity-and-content-licensing-requirements.md](docs/brainstorms/2026-05-24-repo-identity-and-content-licensing-requirements.md)
- **Prior license commit (superseded by this plan):** `e5b0853 — chore: dual-license (MIT + CC BY 4.0), expand gitignore for Node/Astro`
- Related issue: #18 (promote-script — gated on this plan landing, per brainstorm Q2 decision)
- Related code: `LICENSE-CODE`, `LICENSE-CONTENT`, `README.md`, `CLAUDE.md`, `src/pages/inbox.astro`
- External docs: [MIT license](https://opensource.org/license/mit), [CC BY-NC 4.0 deed](https://creativecommons.org/licenses/by-nc/4.0/), [CC BY-NC 4.0 legal code](https://creativecommons.org/licenses/by-nc/4.0/legalcode.txt)
