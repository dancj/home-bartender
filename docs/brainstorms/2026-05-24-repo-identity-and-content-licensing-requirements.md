---
date: 2026-05-24
topic: repo-identity-and-content-licensing
---

# Repo Identity and Content Licensing

## Summary

Adopt a single-repo product identity for `home-bartender` with explicit dual licensing — MIT on the framework code, CC BY-NC 4.0 on the recipe and prose content. No repo split, no rename, no contributor docs yet. The promote-script work (issue #18) becomes a separate follow-on brainstorm now that this shape is settled.

---

## Problem Frame

The repo is 2 days old, public, and dual-positioned in its own description: *"Personal home bartender recipe collection and the framework that builds it."* Today's de facto state is permissive-by-omission — framework code carries no explicit license (default = all rights reserved), and recipe content carries no usage terms at all. There is a quiet tension between *"this is Dan's personal recipe collection"* (private value; possible book monetization later) and *"anyone can clone this repo to start their own"* (the framework framing).

The tension hasn't bitten yet — zero forks, zero stars — but each future commit hardens the current ambiguity, and downstream work (notably the promote-script in issue #18) is shaped differently depending on whether recipes live in this public source tree or in a private overlay. Picking the product shape now, before the work compounds and before a clone-and-rebrand or a content-scrape forces the question, is cheaper than picking it later.

---

## Actors

- A1. **Maintainer (Dan)**: writes recipes, runs the publish pipeline, controls all merges.
- A2. **Hypothetical framework cloner**: someone who finds this repo and wants to start their own recipe site from it. Currently zero such users exist, but the framework framing implies they're welcome.
- A3. **Hypothetical content reuser**: someone who wants to reuse the recipe text or prose itself — a blog, a print zine, a competing site, a commercial publication. License terms target this actor specifically.
- A4. **Hypothetical future contributor**: a developer contributing to the framework or a recipe contributor to the corpus. Out of scope to actively recruit in v1, but doors should remain open for later.

---

## Key Flows

Omitted. This work is a positioning and licensing change, not a flow-shaped product feature. Actors, Requirements, Scope Boundaries, and Key Decisions together pin down who is affected and what changes without introducing new user or agent paths.

---

## Requirements

**Repo identity**

- R1. The repo retains its current name (`home-bartender`) and its dual identity ("personal recipe collection AND the framework that builds it"). No rename, no reframe.
- R2. The repo stays single-repo. Recipes and framework code live in the same source tree, version-controlled together.

**Licensing**

- R3. Framework code is licensed under MIT.
- R4. Recipe content (everything under `recipes/`) and prose content (everything under `sections/`) are licensed under CC BY-NC 4.0 (Attribution-NonCommercial 4.0 International).
- R5. The license split is discoverable from the repo root. A reader should be able to tell, without grepping, which license applies to which directory.
- R6. The README (or equivalent landing surface) explicitly states the dual-license shape, including a one-line plain-English summary of what each license permits.

Quick reference of what each license allows for this repo:

| Action                              | Framework code (MIT) | Recipe / prose content (CC BY-NC)     |
| ----------------------------------- | -------------------- | ------------------------------------- |
| Use as-is, personally               | ✓                    | ✓                                     |
| Modify and use, personally          | ✓                    | ✓                                     |
| Commercial use                      | ✓                    | ✗ (requires separate permission)      |
| Redistribute                        | ✓ (with notice)      | ✓ (with attribution, non-commercial)  |
| Sublicense / relicense              | ✓                    | ✗ (NC term inherits to derivatives)   |
| Attribution required                | Copyright + notice   | Credit to the maintainer              |

**Cleanup of stale framing**

- R7. CLAUDE.md's outdated reference to a non-existent `npm run publish` script is removed. The corrected prose in `src/pages/inbox.astro` (already updated to point at `npm run validate`) becomes the de facto source of truth for the inbox-promotion flow until the promote-script work lands.
- R8. The GitHub repo description is reviewed and updated if needed so it reads accurately to the dual-licensed shape. No specific wording is mandated; the direction is "accurate to the new state."

---

## Acceptance Examples

- AE1. **Covers R5, R6.** Given a developer lands on the GitHub repo page, when they read the README without clicking into subdirectories, they can tell that code is MIT and recipe/prose content is CC BY-NC.
- AE2. **Covers R4.** Given someone wants to reproduce a recipe from this site on a commercial cocktail blog, the CC BY-NC license unambiguously prohibits that without separate permission from the maintainer.
- AE3. **Covers R3, R4.** Given someone wants to fork the framework code for their own recipe site without copying the recipes, MIT on code makes that unambiguously permitted.

---

## Success Criteria

- The license boundary between framework code and recipe/prose content is unambiguous to a casual reader — they don't need to consult the maintainer to know what they can and can't do with each part of the repo.
- A future fork-and-republish attempt of the recipe content has clear legal teeth via CC BY-NC, without imposing any operational cost (no two-repo split, no private content sync) on the maintainer.
- The promote-script follow-on brainstorm (issue #18) can proceed assuming a stable single-repo shape, without re-litigating the public/private question.

---

## Scope Boundaries

### Deferred for later

- "Fork this for your own collection" docs / contributor onboarding documentation. Premature without actual contributor interest; revisit when someone signals intent.
- Promote-script (`npm run promote <slug>`) behavior. Spins off as its own brainstorm against issue #18 now that the repo shape is settled.
- A formal `CONTRIBUTING.md`, code of conduct, or PR templates. Same trigger as above — wait for contributors before investing in contributor docs.
- Per-recipe contributor attribution mechanics if/when recipe contributions become real. Schema already supports an `attribution` block; v1 of this change doesn't extend it.

### Outside this product's identity

- Splitting into two repos (public framework + private recipe overlay). Considered and rejected — the ongoing ops complexity tax (cross-repo CI access, build-time content sync, fragmented PR workflows) isn't justified when the monetization driver isn't load-bearing today.
- Renaming or reframing the repo as "Dan's home bartender site only" (dropping the framework framing entirely). Considered and rejected — would close future contributor doors prematurely without solving a current problem.
- Migrating the intake side (nanoclaw / WhatsApp / email staging) into this repo. The intake pipeline lives in the maintainer's private tooling and is not part of this public artifact's identity.
- Going fully private. Rejected — would surrender free GitHub Actions minutes for public repos, the portfolio/showcase value, and the optionality of attracting contributors.

---

## Key Decisions

- **Single repo over two-repo split.** Chose option A2 (single repo + content license) over option B (public framework + private recipes). The load-bearing argument for B was protecting future book/monetization value; on closer examination, the maintainer concluded a book remains publishable even with open-source recipes, and the permanent carrying cost of two-repo sync isn't justified by a hypothetical benefit.
- **CC BY-NC for content, rejecting CC0 / CC BY / CC BY-SA / CC BY-ND.**
  - CC0 and CC BY were rejected because they permit commercial re-use, which the maintainer wants to prevent on closer thought ("remove commercial use permission please").
  - CC BY-SA was rejected because forcing forkers to relicense their own work is heavier-handed than needed.
  - CC BY-ND was rejected because cocktail culture is inherently derivative ("a cleaner Negroni Sbagliato") and ND would block legitimate adaptations.
  - CC BY-NC threads the needle: attribution required, derivatives allowed, no commercial use.
- **No "fork this" / contributor docs in v1.** Brainstormed and explicitly deferred. Adding contributor docs is cheap to build but creates an implicit promise to maintain a contributor experience the maintainer is not ready to commit to today.
- **Cleanup of the stale `npm run publish` reference is rolled into this work.** The brainstorm touched the same docs-framing surface; splitting it into its own PR would be more ceremony than value.

---

## Dependencies / Assumptions

- Assumes CC BY-NC 4.0 (the current stable version) is the right pin. If a newer CC license version ships before implementation, default to the latest stable unless the maintainer redirects.
- Assumes the framework code is the maintainer's original work and no third-party-licensed code embedded in the framework portion would conflict with MIT. No evidence of such conflicts in the current repo at brainstorm time; verify during implementation.
- Assumes the existing recipes that include an `attribution` block (classics borrowed from other sources) remain attributed per the existing recipe schema. This brainstorm does not change attribution conventions for borrowed recipes — only the maintainer-side license terms on the corpus as packaged here.

---

## Outstanding Questions

None blocking. The CC version pin is the only soft uncertainty and is handled as an assumption above.
