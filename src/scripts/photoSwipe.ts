// Which photo in the mobile swipe row is (mostly) in view, for the dot
// indicator. Pure so it's testable without a DOM.
export function activeSlide(scrollLeft: number, slideWidth: number, count: number): number {
  if (slideWidth <= 0 || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / slideWidth)));
}
