/**
 * Pure scroll → collapse-progress mapping for the collapsing site header.
 *
 * Returns how far the header has collapsed for a given scroll position:
 *   0 = fully large (hero), 1 = fully compact (slim bar).
 * The DOM wiring (scroll listener, reading CSS custom props, writing
 * `--header-progress`) lives in the inline script in `BaseLayout.astro`; this
 * stays a pure function so it can be unit-tested without a browser.
 *
 * @param scrollY          Current vertical scroll offset in px (`window.scrollY`).
 * @param collapseDistance Scroll distance over which the header fully collapses,
 *                         in px (the band's large-minus-compact height).
 */
export function headerProgress(scrollY: number, collapseDistance: number): number {
  // Guard degenerate distances (0, negative, NaN): nothing to interpolate over,
  // so the header is compact the moment the page is scrolled at all.
  if (!(collapseDistance > 0)) {
    return scrollY > 0 ? 1 : 0;
  }
  const raw = scrollY / collapseDistance;
  return Math.min(1, Math.max(0, raw));
}
