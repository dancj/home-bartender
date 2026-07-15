---
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
execution: code
product_contract_source: ce-plan-bootstrap
type: fix
created: 2026-07-13
branch: fix-118-my-bar-index
closes: [118, 117, 116]
---

# fix: My Bar visible-ownership gating, cross-tab sync, and spirit-sort tie-break coverage

## Summary

Three P3 polish fixes on the recipe index, all surfaced by the `ce-code-review` run
`20260704-131909-8f6afa31`. Two are behavioral (My Bar empty state, cross-tab ownership
sync), one closes a test gap in the spirit-sort comparator. All three are small and land on
one branch, `fix-118-my-bar-index`.

The FamilyMap mobile issue (#130) ships on a separate branch and is out of scope here.

---

## Problem Frame

The My Bar feature stores owned spirits durably against the **full taxonomy** (a deliberate
decision — see `src/lib/myBar.ts:14-22` and its round-trip test at
`src/lib/myBar.test.ts:50`), but the index page only renders a **chip per spirit that
appears in a published recipe**. Those two sets are not the same, and the client script
conflates them by reading `owned.length` where it means "owned *and visible*".

Taxonomy already ships spirits with zero published recipes (`rye`, `brandy`), so the
divergence is reachable today, not hypothetical.

Separately, ownership is read from `localStorage` once at page init, so two open tabs
silently clobber each other's toggles; and `compareCards`'s both-spirits-empty branch has no
test pinning its title-order fallback.

---

## Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R1 | The My Bar empty state ("Mark spirits in My Bar…") shows iff `makeable` is active and the user owns no spirit that has a **visible chip**. | #118 |
| R2 | The My Bar drawer auto-reveal fires on the same condition as R1 — the two must never disagree. | #118 (derived; see KTD1) |
| R3 | Ownership storage stays durable against the full taxonomy. Nothing in this change may prune an owned-but-unpublished spirit. | #118, `myBar.ts:14-22` |
| R4 | A My Bar toggle in one tab is reflected in every other open index tab — chips, count, filtering, and empty state. | #117 |
| R5 | Two recipes with no primary spirit sort by title in `spirit` mode, and that contract is pinned by a test. | #116 |

---

## Key Technical Decisions

### KTD1 — Fix the shared predicate, not just the reported line

#118's evidence names `src/pages/index.astro:257` (now :269), but `owned.length === 0` is
load-bearing in **two** places:

- `applyFilters` (`:269`) — gates which empty state renders.
- `maybeRevealMyBar` (`:295`) — gates whether the My Bar `<details>` auto-opens.

Patching only the reported line produces a *new* contradiction: with only an invisible
spirit owned (e.g. `rye`), the empty state would say "Mark spirits in My Bar to see what you
can make" while the My Bar drawer stays collapsed — the exact UI the message tells the user
to go use. Both call sites take the same new predicate.

### KTD2 — The predicate is a pure function in `src/lib/myBar.ts`

`.astro` client scripts are not reachable from vitest (node env, no `astro:content`), which
is precisely why `myBar.ts` / `indexSort.ts` exist — the file header states the convention.
Putting the visible-ownership check in the client script would make the repo's mandatory
red-green TDD impossible for U2.

Add one small exported function alongside `isMakeable` / `parseOwnedSpirits`. Signature is
directional, not prescriptive — something shaped like
`hasVisibleOwned(owned: readonly string[], shownSlugs: Iterable<string>): boolean`. The
client script passes the slugs it scraped off the rendered chips.

This is an *additive* change to the module: `parseOwnedSpirits` keeps validating against the
full `SPIRITS` taxonomy (R3). Visibility is a **render-time** concern, applied at the point
of display; it must not leak into the storage round-trip.

### KTD3 — `applyFilters` already re-syncs chip state, so #117's listener is genuinely two lines

The issue notes the storage handler "must also re-sync the chip pressed/aria state, not just
re-run `applyFilters`." Reading the code, that concern is already satisfied:
`applyFilters` re-derives `aria-pressed` for every My Bar chip (`:281-284`) and rewrites the
owned count (`:285-286`) from the current `owned` on every invocation. So reassigning `owned`
and calling `applyFilters()` is sufficient. No extra resync code — do not add a redundant
second loop.

### KTD4 — Leave the "N owned" count reporting durable ownership

The count (`:285`) reads `owned.length`, which includes invisible spirits. Changing it to a
visible-only count would hide durable user data with no affordance to recover it; leaving it
is honest about what is stored. It is also outside what #118 asks for — the issue explicitly
defers the un-own affordance ("can wait for real need"). Recorded as an open question rather
than silently changed.

---

## Implementation Units

### U1. Pin the spirit-sort tie-break for two zero-spirit recipes

**Goal:** Close the test gap at `src/lib/indexSort.ts:28` so a refactor cannot silently
destabilize the ordering of two spirit-less recipes.

**Requirements:** R5 (closes #116)

**Dependencies:** none — independent of U2/U3, touches a different file.

**Files:**
- `src/lib/indexSort.test.ts` (modify — add to the existing `compareCards spirit mode` describe block)

**Approach:** Test-only. `compareCards`'s spirit branch is
`if (!as || !bs) return (as ? -1 : bs ? 1 : 0) || byTitle(a, b);` — when *both* spirits are
empty the leading expression is `0`, so it falls through to `byTitle`. That fallback is
currently unasserted. No production change; the behavior is already correct.

**Patterns to follow:** Mirror the shape of the existing
`'sorts a missing primary spirit last'` test (`indexSort.test.ts:36`) — same `card()` /
`sort()` helpers, same `toEqual` on the title array.

**Test scenarios:**
- Two cards with empty `primarySpirit`, constructed out of title order (`Bee` before `Ant`),
  sorted in `spirit` mode → `['Ant', 'Bee']`.

**Execution note:** This unit is characterization coverage for behavior that already passes.
It will **not** go red first — that is expected and correct for a test-gap fix. Confirm the
assertion genuinely exercises the both-empty branch (i.e. it would fail if `byTitle` were
dropped from that line) rather than asserting a coincidence of input order.

**Verification:** `npm test` passes with the new assertion present.

---

### U2. Gate the My Bar empty state and drawer-reveal on *visible* ownership

**Goal:** An owned spirit with no published recipe no longer defeats the My Bar empty state
or the drawer auto-reveal.

**Requirements:** R1, R2, R3 (closes #118)

**Dependencies:** none (do U2 before U3 — both touch the same client script region, and
sequencing avoids a self-inflicted conflict).

**Files:**
- `src/lib/myBar.ts` (modify — add the visible-ownership predicate)
- `src/lib/myBar.test.ts` (modify — cover it)
- `src/pages/index.astro` (modify — call it from both sites named in KTD1)

**Approach:** Per KTD2, add the pure predicate to `myBar.ts`. In the client script, derive
the visible slug set once from the already-collected `myBarButtons`
(`b.dataset.mybar`) — the array is built at `:155` and is stable for the page's lifetime, so
it can be computed once outside `applyFilters` rather than rebuilt per call.

Replace the `owned.length === 0` test in **both** `applyFilters` (`:269`) and
`maybeRevealMyBar` (`:295`) with the negated predicate. Per KTD4, leave the `myBarCountEl`
text on `owned.length`.

**Patterns to follow:** `isMakeable` in `src/lib/myBar.ts:9` — same small-pure-predicate
shape, same `Iterable<string>`-tolerant parameter style, same JSDoc convention explaining
*why* the distinction exists.

**Test scenarios** (all against the new predicate in `src/lib/myBar.test.ts`):
- Owns `gin`, `gin` chip is shown → visible ownership is `true`.
- Owns only `rye`, shown chips are `['gin','rum']` (the reachable #118 state) → `false`.
- Owns nothing, chips shown → `false`.
- Owns `gin` and `rye`, only `gin` shown (partial overlap) → `true`.
- Owns something, **zero** chips shown (all recipes unpublished) → `false`.
- Regression guard for R3: `parseOwnedSpirits` still round-trips a taxonomy-valid,
  zero-recipe slug — visibility must not have leaked into storage validation. The existing
  test at `myBar.test.ts:50` covers this; confirm it still passes rather than duplicating it.

**Execution note:** Repo mandates red-green. Write the predicate's failing tests first — they
will not compile/pass until the export exists. The `.astro` wiring itself is not unit-testable
(KTD2); it is verified by the browser check below.

**Verification:** `npm test` green. In the browser: with `?makeable=1` and only `rye` marked
owned via `localStorage`, the "Mark spirits in My Bar…" empty state renders (not the generic
"No recipes match") **and** the My Bar drawer is open.

---

### U3. Sync ownership across tabs via the `storage` event

**Goal:** A My Bar toggle in one tab stops being silently overwritten by the next toggle in
another tab.

**Requirements:** R4 (closes #117)

**Dependencies:** U2 (same file region in `src/pages/index.astro`; land U2 first).

**Files:**
- `src/pages/index.astro` (modify — add a `storage` listener near the other listener wiring)

**Approach:** `owned` is read once at `:188` and each toggle rewrites the whole array
(`:189-192`, `:318-325`), so tab A's next write clobbers tab B's. Listen for the `storage`
event, which fires in *other* tabs on a same-origin `localStorage` write, reassign `owned`
from `e.newValue` through `parseOwnedSpirits` (still against the full `SPIRITS` taxonomy —
R3), and re-run `applyFilters()`.

Per KTD3, `applyFilters` already reconciles chip `aria-pressed` and the owned count from
`owned`, so no additional resync is needed. Guard on `e.key === MY_BAR_STORAGE_KEY` — the
page also writes `INDEX_VIEW_STORAGE_KEY` (`:345-360`), and an unguarded handler would
re-parse a view-mode payload as an ownership array.

Note `e.newValue` is `null` when the key is cleared; `parseOwnedSpirits` already returns `[]`
for `null` (`myBar.ts:27`), so the cleared case needs no special handling.

**Patterns to follow:** The existing listener block at `:299-335` (`popstate`, chip clicks) —
same registration style and same `applyFilters(f)` call shape.

**Test scenarios:** `Test expectation: none in vitest` — this unit is DOM/browser-event
wiring against `window`, and the pure logic it depends on (`parseOwnedSpirits` null and
round-trip behavior) is already covered in `src/lib/myBar.test.ts`. There is no new pure
logic to unit-test. Verified by the browser scenario below instead.

**Verification:** Open the index in two tabs. Mark `gin` in tab A → tab B's `gin` chip turns
on, its count updates, and (with `?makeable=1`) its card list re-filters without a reload.
Toggle in tab B → tab A reflects it. Neither tab clobbers the other on a subsequent toggle.

---

## Scope Boundaries

**In scope:** the three issues above, on `fix-118-my-bar-index`, branched from `staging`.

### Deferred to Follow-Up Work

- **Un-own affordance for invisible spirits** (#118 second half). The issue explicitly defers
  it: "Un-own affordance for invisible spirits can wait for real need." Gating the empty
  state makes the UI *consistent*; it does not give the user a way to un-own a `rye` that has
  no chip. Reachable workaround today: clear `hb:my-bar` in devtools.
- **FamilyMap mobile visual structure (#130).** Separate branch, separate PR.

### Non-goals

- Changing the storage schema or the full-taxonomy validation contract (R3 forbids it).
- Any change to `compareCards`'s production logic — #116 is a test gap, not a bug.

---

## Open Questions

- **Should the "N owned" count show visible or durable ownership?** Currently durable
  (`owned.length`), so it can read "1 owned" with no chip lit. KTD4 leaves it alone as the
  honest report of stored state and because #118 does not ask for it. If it proves confusing
  in practice, the fix belongs with the deferred un-own affordance, not here.

---

## Verification Contract

- `npm test` — full vitest suite green, including the new `indexSort` tie-break assertion and
  the new `myBar` visible-ownership tests.
- `npm run validate` — recipe/taxonomy validation unaffected but must stay green.
- `astro check` (via `npm run build`) — TypeScript clean, including the new export's types.
- Browser: the U2 and U3 scenarios above, exercised manually on the index page.

## Definition of Done

- U1, U2, U3 landed on `fix-118-my-bar-index`.
- Verification Contract fully green.
- PR opened against `staging` with `Closes #118`, `Closes #117`, `Closes #116` in the body.
- No change to the durable-ownership storage contract (R3 holds).
