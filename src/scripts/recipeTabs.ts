/**
 * Pure tab-resolution logic for the recipe detail page's tabbed body.
 *
 * The DOM wiring (reading panel ids, toggling `hidden`, adding ARIA roles,
 * keyboard nav, focus) lives in the inline island in `RecipeLayout.astro`;
 * these stay pure functions so they can be unit-tested without a browser
 * (vitest runs in the `node` environment — no DOM). Mirrors the split used
 * by `headerProgress.ts`.
 */

export type TabId = 'recipe' | 'batching' | 'notes' | 'source';

export interface TabFlags {
  hasBatch: boolean;
  hasNotes: boolean;
  hasSource: boolean;
}

/**
 * Ordered list of logical tab ids to render. Always leads with `recipe`
 * (ingredients/steps are the floor of a recipe); optional tabs follow in a
 * fixed order and are simply omitted when absent — no gaps, no reordering.
 */
export function buildTabList(flags: TabFlags): TabId[] {
  const tabs: TabId[] = ['recipe'];
  if (flags.hasBatch) tabs.push('batching');
  if (flags.hasNotes) tabs.push('notes');
  if (flags.hasSource) tabs.push('source');
  return tabs;
}

/**
 * Resolve which tab a URL hash selects, given the tabs this recipe actually
 * renders. Tolerant of a leading `#` and of the `panel-` id namespace so both
 * `#batching` and `#panel-batching` resolve to `batching`. Unknown, empty, or
 * unavailable targets fall back to the first (default) tab.
 *
 * A hash that points at a heading *inside* a panel (e.g. `#storage`) is not a
 * tab id — the island maps those to their owning panel via `closest()` before
 * calling this; this function only decides among panel ids.
 *
 * @param hash      `location.hash` (may be empty, `#id`, or `#panel-id`).
 * @param available Tab ids this recipe renders (from `buildTabList`).
 */
export function resolveActiveTab(hash: string, available: string[]): string {
  const fallback = available[0];
  const normalized = hash.replace(/^#/, '').replace(/^panel-/, '');
  return available.includes(normalized) ? normalized : fallback;
}

/**
 * Roving-tabindex keyboard navigation: given a key, the current tab index, and
 * the tab count, return the index to move to — or -1 for a key this widget
 * doesn't handle. Arrow keys wrap; Home/End jump to the ends.
 */
export function nextTabIndex(key: string, current: number, count: number): number {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return -1;
  }
}
