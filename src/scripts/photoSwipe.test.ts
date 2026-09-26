import { describe, it, expect } from 'vitest';
import { activeSlide } from './photoSwipe';

describe('activeSlide', () => {
  it('maps exact slide offsets to their index', () => {
    expect(activeSlide(0, 300, 2)).toBe(0);
    expect(activeSlide(300, 300, 2)).toBe(1);
  });

  it('rounds mid-scroll offsets to the nearest slide', () => {
    expect(activeSlide(149, 300, 2)).toBe(0);
    expect(activeSlide(151, 300, 2)).toBe(1);
  });

  it('clamps overscroll at both ends', () => {
    expect(activeSlide(900, 300, 2)).toBe(1);
    expect(activeSlide(-40, 300, 2)).toBe(0);
  });

  it('returns 0 for a zero slide width instead of NaN', () => {
    expect(activeSlide(100, 0, 2)).toBe(0);
  });
});
