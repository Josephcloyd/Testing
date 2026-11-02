/**
 * Shared motion language. Mirrors the motion tokens in design/tokens.css
 * so CSS transitions and Web Animations API timelines feel identical.
 */

export const EASE = Object.freeze({
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  settle: "cubic-bezier(0.34, 1.56, 0.64, 1)",
});

export const DURATION = Object.freeze({
  micro: 160,
  short: 320,
  medium: 600,
  long: 900,
});

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

/** @returns {boolean} true when the visitor asked for reduced motion */
export function prefersReducedMotion() {
  return reducedMotionQuery.matches;
}

/**
 * Subscribe to reduced-motion preference changes.
 * @param {(reduced: boolean) => void} callback
 */
export function onReducedMotionChange(callback) {
  reducedMotionQuery.addEventListener("change", (event) => callback(event.matches));
}

/**
 * Resolves when every animation has finished; cancelled animations resolve too.
 * @param {Animation[]} animations
 * @returns {Promise<void>}
 */
export function allFinished(animations) {
  return Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
    () => undefined
  );
}
