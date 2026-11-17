import { describe, it, expect } from 'vitest';
import { MOTION_DUR, MOTION_EASE_OUT, panelMotion, stepMotion } from './step-motion';

describe('step page motion', () => {
  it('brings the next page in from the right and sends the old one out to the left', () => {
    const motion = stepMotion(false, 1);
    expect(motion.custom).toBe(1);
    expect(motion.initial).toBe('enter');
    expect(motion.animate).toBe('center');
    expect(motion.exit).toBe('exit');
    const { enter, center, exit } = motion.variants!;
    expect(enter(1).x).toBeGreaterThan(0);
    expect(exit(1).x).toBeLessThan(0);
    expect(enter(1).opacity).toBe(0);
    expect(exit(1).opacity).toBe(0);
    expect(center).toEqual({ opacity: 1, x: 0 });
  });

  it('mirrors the travel when the reader goes back', () => {
    const { enter, exit } = stepMotion(false, -1).variants!;
    expect(enter(-1).x).toBe(-enter(1).x);
    expect(exit(-1).x).toBe(-exit(1).x);
    expect(enter(-1).x).toBeLessThan(0);
    expect(exit(-1).x).toBeGreaterThan(0);
  });

  it('lets the leaving page follow the direction of the move, not the one it was rendered with', () => {
    // AnimatePresence hands the current direction to the outgoing page as `custom`: the variant
    // is a function of that value, so a page rendered while going forward can still leave backward.
    const forward = stepMotion(false, 1).variants!;
    expect(forward.exit(-1).x).toBe(-forward.exit(1).x);
  });

  it('is a short nudge, not a slide across the panel, and uses the token curve and duration', () => {
    const motion = stepMotion(false, 1);
    expect(Math.abs(motion.variants!.enter(1).x)).toBeLessThanOrEqual(24);
    expect(motion.transition).toEqual({ duration: MOTION_DUR[2], ease: MOTION_EASE_OUT });
    expect(motion.transition.duration).toBeLessThan(0.25);
  });

  it('does not move at all under reduced motion', () => {
    for (const direction of [1, -1] as const) {
      const motion = stepMotion(true, direction);
      expect(motion.initial).toBe(false);
      expect(motion.animate).toEqual({ opacity: 1, x: 0 });
      expect(motion.transition).toEqual({ duration: 0 });
      expect('variants' in motion).toBe(false);
      expect('exit' in motion).toBe(false);
    }
  });
});

describe('panel motion', () => {
  it('arrives as one sheet: a short slide from its docked edge with a fade', () => {
    const motion = panelMotion(false);
    expect(motion.initial).not.toBe(false);
    const initial = motion.initial as { opacity: number; x: number };
    expect(initial.opacity).toBe(0);
    expect(initial.x).toBeGreaterThan(0);
    expect(initial.x).toBeLessThanOrEqual(48);
    expect(motion.animate).toEqual({ opacity: 1, x: 0 });
    expect(motion.transition).toEqual({ duration: MOTION_DUR[3], ease: MOTION_EASE_OUT });
  });

  it('leaves the way it came, and faster than it arrived', () => {
    const motion = panelMotion(false);
    const initial = motion.initial as { opacity: number; x: number };
    expect(motion.exit).toMatchObject({ opacity: 0, x: initial.x });
    expect(motion.exit!.transition.duration).toBeLessThan(motion.transition.duration);
  });

  it('appears and disappears in place under reduced motion', () => {
    const motion = panelMotion(true);
    expect(motion.initial).toBe(false);
    expect(motion.transition).toEqual({ duration: 0 });
    expect('exit' in motion).toBe(false);
  });
});
