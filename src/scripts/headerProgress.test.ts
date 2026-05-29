import { describe, it, expect } from 'vitest';
import { headerProgress } from './headerProgress';

describe('headerProgress', () => {
  it('maps the top of the page to 0 (fully large)', () => {
    expect(headerProgress(0, 200)).toBe(0);
  });

  it('maps scroll at the collapse distance to 1 (fully compact)', () => {
    expect(headerProgress(200, 200)).toBe(1);
  });

  it('maps halfway through the collapse distance to ~0.5', () => {
    expect(headerProgress(100, 200)).toBeCloseTo(0.5, 5);
  });

  it('clamps overscroll past the collapse distance to 1', () => {
    expect(headerProgress(400, 200)).toBe(1);
  });

  it('clamps negative scroll (rubber-band overscroll) to 0', () => {
    expect(headerProgress(-50, 200)).toBe(0);
  });

  it('does not divide by zero or return NaN for a zero collapse distance', () => {
    expect(headerProgress(0, 0)).toBe(0);
    expect(headerProgress(100, 0)).toBe(1);
    expect(Number.isNaN(headerProgress(100, 0))).toBe(false);
  });

  it('treats a negative/degenerate collapse distance as collapsed when scrolled', () => {
    expect(headerProgress(100, -10)).toBe(1);
    expect(headerProgress(0, -10)).toBe(0);
    expect(Number.isNaN(headerProgress(50, NaN))).toBe(false);
  });
});
