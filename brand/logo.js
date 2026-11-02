/**
 * Animated SRZ crossed-arrows logo.
 *
 * - Intro: brand/logo.css shoots the arrows, traces the glyphs and raises "SRZ";
 *   this module flies the lockup into the navbar.
 * - Idle: every 9–14 s one glyph pulses, taking turns clockwise from the A.
 * - Hover / focus / tap: "release" — the arrows fire toward their tips and spring
 *   back while the glyphs push outward and settle.
 *
 * Exports `introDone`, a promise that resolves once the intro has cleared (or was skipped),
 * so page reveals can start right after the handoff.
 */
import { EASE, DURATION, prefersReducedMotion, allFinished } from "../design/motion.js";

const INTRO_SEEN_KEY = "ars-intro-seen";
const INTRO_CLASS = "intro-play";
// Timeline (ms): arrows 0–500 · glyphs 460–1160 · SRZ 700–1280 · mark flies 1250–1750 · SRZ unrolls 1750–2000
const HANDOFF_AT_MS = 1250;
const HANDOFF_MS = 500;
const BACKDROP_FADE_MS = 320;
const WORD_FADE_MS = 220;
const WORD_UNROLL_MS = 250;
const LATE_START_MS = 1700; // past this point a handoff would collide with the CSS failsafe
const IDLE_MIN_MS = 9000;
const IDLE_JITTER_MS = 5000;

/** Push direction for each glyph during the hover "release" (viewBox units). */
const GLYPH_PUSH = Object.freeze({
  a: [0, -16],
  square: [16, 0],
  triangle: [0, 16],
  gem: [-16, 0],
});
const ARROW_FIRE_DISTANCE = 24;
/** Pressing only a modifier (e.g. starting a shortcut) shouldn't skip the intro. */
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

const root = document.documentElement;

function rememberIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Storage can be blocked (private mode); the intro simply plays again next visit.
  }
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Animates `from` so it lands exactly on `to`'s box (FLIP with a uniform scale).
 * @param {Element} from
 * @param {Element} to
 * @param {Keyframe[]} [extra] additional properties to interpolate on the way
 * @returns {Animation}
 */
function flyOnto(from, to, extra = [{}, {}]) {
  const start = from.getBoundingClientRect();
  const end = to.getBoundingClientRect();
  const scale = end.width / start.width;
  const dx = end.left - start.left;
  const dy = end.top + end.height / 2 - (start.top + (start.height * scale) / 2);

  return from.animate(
    [
      { transform: "none", ...extra[0] },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, ...extra[1] },
    ],
    { duration: HANDOFF_MS, easing: EASE.inOut, fill: "forwards" }
  );
}

function clearIntro(intro) {
  intro.remove();
  root.classList.remove(INTRO_CLASS);
  rememberIntroSeen();
}

function elapsedIntroTime(intro) {
  const [running] = intro.querySelector(".logo-shaft")?.getAnimations() ?? [];
  return typeof running?.currentTime === "number" ? running.currentTime : 0;
}

/**
 * Starts the flight into the navbar.
 * @returns {Animation[]} the running animations (cancelled if the visitor skips)
 */
function handOff(intro, brand) {
  const navMark = brand.querySelector(".logo-mark");
  const navStyle = getComputedStyle(brand);

  const introMark = intro.querySelector(".logo-mark");

  // The navbar mark uses heavier strokes and its own colour; blend both on the way
  // so the landing is seamless.
  const strokes = [
    { "--logo-shaft": "2.2", "--logo-glyph": "3.2", color: getComputedStyle(introMark).color },
    {
      "--logo-shaft": navStyle.getPropertyValue("--logo-shaft").trim() || "6",
      "--logo-glyph": navStyle.getPropertyValue("--logo-glyph").trim() || "7.5",
      color: getComputedStyle(navMark).color,
    },
  ];

  // Only the mark flies; flying both would cross mid-air because they scale at different rates.
  return [
    flyOnto(introMark, navMark, strokes),
    intro.querySelector(".logo-word").animate(
      [
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(-12px)" },
      ],
      { duration: WORD_FADE_MS, easing: EASE.out, fill: "forwards" }
    ),
    // Hold the backdrop while the lockup is in flight so it never crosses the hero headline.
    intro.querySelector(".intro-bg").animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: BACKDROP_FADE_MS,
      delay: HANDOFF_MS - BACKDROP_FADE_MS,
      easing: "ease-in",
      fill: "forwards",
    }),
  ];
}

/**
 * Runs the intro handoff if the inline head script started an intro.
 * Always settles (never rejects) and always clears the intro, so the page can't be left hidden.
 * @returns {Promise<void>}
 */
async function runIntro() {
  const intro = document.querySelector(".intro");
  const brand = document.querySelector(".site-header .brand");

  if (!root.classList.contains(INTRO_CLASS) || !intro || !brand) {
    intro?.remove();
    return;
  }

  if (prefersReducedMotion()) {
    clearIntro(intro);
    return;
  }

  let skipped = false;
  let flights = [];
  let resolveSkip;
  const skipSignal = new Promise((resolve) => {
    resolveSkip = resolve;
  });

  const skip = (event) => {
    if (event.type === "keydown" && MODIFIER_KEYS.has(event.key)) {
      return;
    }
    skipped = true;
    flights.forEach((animation) => animation.cancel());
    clearIntro(intro);
    resolveSkip();
  };

  intro.addEventListener("pointerdown", skip, { once: true });
  window.addEventListener("keydown", skip);

  try {
    const elapsed = elapsedIntroTime(intro);

    if (elapsed < LATE_START_MS) {
      await Promise.race([wait(Math.max(0, HANDOFF_AT_MS - elapsed)), skipSignal]);

      if (!skipped) {
        flights = handOff(intro, brand);
        await Promise.race([allFinished(flights), skipSignal]);
      }
    }
  } catch (error) {
    console.warn("Logo intro handoff failed; showing the page without it.", error);
  } finally {
    window.removeEventListener("keydown", skip);
    clearIntro(intro);

    if (!skipped) {
      unrollWord(brand);
    }
  }
}

/** After the mark lands, "SRZ" unrolls out of it, left to right. */
function unrollWord(brand) {
  brand.querySelector(".logo-word")?.animate(
    [
      { clipPath: "inset(0 100% 0 0)", transform: "translateX(-10px)" },
      { clipPath: "inset(0 0 0 0)", transform: "none" },
    ],
    { duration: WORD_UNROLL_MS, easing: EASE.out }
  );
}

function releaseArrows(link) {
  const animations = [...link.querySelectorAll(".logo-arrow-body")].map((body) =>
    body.animate(
      [{ transform: "none" }, { transform: `translateY(${-ARROW_FIRE_DISTANCE}px)`, offset: 0.35 }, { transform: "none" }],
      { duration: DURATION.long, easing: EASE.out }
    )
  );

  Object.entries(GLYPH_PUSH).forEach(([name, [x, y]], index) => {
    const glyph = link.querySelector(`.logo-glyph--${name}`);
    animations.push(
      glyph.animate(
        [{ transform: "none" }, { transform: `translate(${x}px, ${y}px)`, offset: 0.3 }, { transform: "none" }],
        { duration: DURATION.long, delay: 60 + index * 40, easing: EASE.out }
      )
    );
  });

  link.querySelectorAll(".logo-letter").forEach((letter, index) => {
    animations.push(
      letter.animate(
        [{ transform: "none" }, { transform: "translateY(-6px)", offset: 0.4 }, { transform: "none" }],
        { duration: DURATION.medium, delay: 80 + index * 50, easing: EASE.out }
      )
    );
  });

  return animations;
}

/**
 * Wires idle + hover motion onto a logo link containing `.logo-mark` (and optionally `.logo-word`).
 * @param {HTMLElement} link
 */
export function animateLogo(link) {
  const glyphs = Object.keys(GLYPH_PUSH)
    .map((name) => link.querySelector(`.logo-glyph--${name}`))
    .filter(Boolean);

  if (!glyphs.length || !link.querySelector(".logo-arrow-body")) {
    return;
  }

  let releasing = false;

  const release = async () => {
    if (prefersReducedMotion() || releasing) {
      return;
    }

    releasing = true;
    await allFinished(releaseArrows(link));
    releasing = false;
  };

  link.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") {
      release();
    }
  });
  link.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") {
      release();
    }
  });
  link.addEventListener("focus", () => {
    if (link.matches(":focus-visible")) {
      release();
    }
  });

  let nextGlyph = 0;

  const pulse = () => {
    const isBusy = releasing || link.matches(":hover, :focus-visible");

    if (!document.hidden && !isBusy && !prefersReducedMotion()) {
      glyphs[nextGlyph].animate(
        [{ transform: "none" }, { transform: "scale(1.22)", offset: 0.35 }, { transform: "none" }],
        { duration: 800, easing: EASE.out }
      );
      nextGlyph = (nextGlyph + 1) % glyphs.length;
    }

    window.setTimeout(pulse, IDLE_MIN_MS + Math.random() * IDLE_JITTER_MS);
  };

  window.setTimeout(pulse, IDLE_MIN_MS + Math.random() * IDLE_JITTER_MS);
}

export const introDone = runIntro();

const headerBrand = document.querySelector(".site-header .brand");

if (headerBrand) {
  introDone.then(() => animateLogo(headerBrand));
}
