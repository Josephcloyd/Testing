/**
 * Page motion + navigation.
 *
 * - Hero entrance right after the logo intro hands off.
 * - Scroll reveals ([data-reveal]) and word-by-word headings ([data-split]).
 * - Reading progress line in the header and the experience route line.
 * - Active section in the nav, and the mobile menu.
 *
 * Every hidden state is gated on html.js-motion (set in <head> unless reduced motion
 * is requested), so content is always readable if this script fails to run.
 */
import { introDone } from "./brand/logo.js";
import { prefersReducedMotion, onReducedMotionChange } from "./design/motion.js";

const root = document.documentElement;
const REVEAL_ROOT_MARGIN = "0px 0px -12% 0px";
const STAGGER_MS = 90;
const HERO_BACKSTOP_MS = 3500;

window.__siteMotionReady = true;

const motionEnabled = () => root.classList.contains("js-motion");

/* ---------- Split headings into words ---------- */

/**
 * Wraps each word of a heading in a mask so it can rise into view.
 * Text content (and therefore the accessible name) is unchanged.
 * @param {HTMLElement} heading
 */
function splitWords(heading) {
  const words = heading.textContent.trim().split(/\s+/);
  const fragment = document.createDocumentFragment();

  words.forEach((word, index) => {
    const mask = document.createElement("span");
    const inner = document.createElement("span");
    mask.className = "split-word";
    mask.style.setProperty("--w", String(index));
    inner.textContent = word;
    mask.append(inner);
    fragment.append(mask);

    if (index < words.length - 1) {
      fragment.append(document.createTextNode(" "));
    }
  });

  heading.replaceChildren(fragment);
}

/* ---------- Scroll reveals ---------- */

function staggerSiblings(elements) {
  const groups = new Map();

  elements.forEach((element) => {
    const siblings = groups.get(element.parentElement) ?? [];
    siblings.push(element);
    groups.set(element.parentElement, siblings);
  });

  groups.forEach((siblings) => {
    siblings.forEach((element, index) => {
      element.style.setProperty("--delay", `${index * STAGGER_MS}ms`);
    });
  });
}

function observeReveals() {
  const targets = [...document.querySelectorAll("[data-reveal], [data-split]")];
  staggerSiblings(targets.filter((element) => element.matches("[data-reveal]")));

  if (!("IntersectionObserver" in window)) {
    targets.forEach((element) => element.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: REVEAL_ROOT_MARGIN, threshold: 0.12 }
  );

  targets.forEach((element) => observer.observe(element));
}

/* ---------- Scroll-linked lines (progress + route) ---------- */

function createScrollLines() {
  const header = document.querySelector("[data-header]");
  const route = document.querySelector("[data-route]");
  let ticking = false;

  const update = () => {
    ticking = false;
    const scrollable = root.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    header?.style.setProperty("--progress", progress.toFixed(4));
    header?.classList.toggle("is-scrolled", window.scrollY > 8);

    if (route) {
      const rect = route.getBoundingClientRect();
      const anchor = window.innerHeight * 0.6;
      const routeProgress = Math.min(1, Math.max(0, (anchor - rect.top) / rect.height));
      route.style.setProperty("--route", routeProgress.toFixed(4));
    }
  };

  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();
}

/* ---------- Active nav link ---------- */

function trackActiveSection() {
  const links = new Map(
    [...document.querySelectorAll('.nav-list a[href^="#"]')].map((link) => [link.hash.slice(1), link])
  );
  // The hero has no nav link: reaching it clears the current marker.
  const sections = [document.querySelector(".hero"), ...[...links.keys()].map((id) => document.getElementById(id))].filter(
    Boolean
  );

  if (!sections.length || !("IntersectionObserver" in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((link) => link.removeAttribute("aria-current"));
          links.get(entry.target.id)?.setAttribute("aria-current", "true");
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

/* ---------- Mobile menu ---------- */

function setupMenu() {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (!header || !toggle || !nav) {
    return;
  }

  nav.querySelectorAll("li").forEach((item, index) => item.style.setProperty("--i", String(index)));

  // While the full-screen menu is open, content behind it can't take focus.
  const background = [document.querySelector("main"), document.querySelector(".chat-widget")].filter(Boolean);

  const setOpen = (open) => {
    header.classList.toggle("is-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    root.style.overflow = open ? "hidden" : "";
    background.forEach((element) => {
      element.inert = open;
    });

    if (open) {
      nav.querySelector("a")?.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("is-menu-open")));

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("is-menu-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Leaving the mobile layout with the menu open must not leave the page scroll-locked.
  window.matchMedia("(min-width: 861px)").addEventListener("change", (event) => {
    if (event.matches) {
      setOpen(false);
    }
  });
}

/* ---------- Hero entrance ---------- */

function revealHero() {
  document.querySelector(".hero")?.classList.add("is-in");
}

/* ---------- Boot ---------- */

function showEverything() {
  document.querySelectorAll("[data-reveal], [data-split], .hero").forEach((element) => element.classList.add("is-in"));
}

setupMenu();
trackActiveSection();
createScrollLines();

if (motionEnabled() && !prefersReducedMotion()) {
  document.querySelectorAll("[data-split]").forEach(splitWords);
  observeReveals();
  introDone.finally(() => window.requestAnimationFrame(revealHero));
  // Backstop: the hero must never stay hidden, whatever happens to the intro.
  window.setTimeout(revealHero, HERO_BACKSTOP_MS);
} else {
  showEverything();
}

onReducedMotionChange((reduced) => {
  if (reduced) {
    root.classList.remove("js-motion");
    showEverything();
  }
});
