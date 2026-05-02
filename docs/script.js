// mobile sidebar drawer
const navToggle = document.querySelector(".nav-toggle");
const sidebar = document.querySelector(".sidebar");
const backdrop = document.querySelector(".nav-backdrop");
function setNavOpen(open) {
  sidebar.classList.toggle("open", open);
  backdrop.hidden = !open;
  navToggle.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
}
navToggle?.addEventListener("click", () => setNavOpen(!sidebar.classList.contains("open")));
backdrop?.addEventListener("click", () => setNavOpen(false));
sidebar?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setNavOpen(false)));

// install tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const r = tab.dataset.runtime;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll("[data-pane]").forEach((p) => {
      p.hidden = p.dataset.pane !== r;
    });
  });
});

// sidebar active link tracking — observes both bare h2[id] and the hero <section id>
const sectionIds = [...document.querySelectorAll("main h2[id], main section[id]")].map((s) => s.id);
const sideLinks = new Map(
  [...document.querySelectorAll('.sidebar a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a]),
);
const obs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      sideLinks.forEach((a) => a.classList.remove("active"));
      const a = sideLinks.get(e.target.id);
      if (a) a.classList.add("active");
    }
  });
}, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
sectionIds.forEach((id) => {
  const el = document.getElementById(id);
  if (el) obs.observe(el);
});

// lazy-play demo videos: preload="none" keeps bytes off the wire until the
// user scrolls one into view, at which point we start playback and pause
// again on exit so background tabs don't keep downloading.
const videoObs = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const v = entry.target;
    if (entry.isIntersecting) {
      v.play().catch(() => {/* autoplay blocked — leave paused */});
    } else {
      v.pause();
    }
  }
}, { threshold: 0.25 });
document.querySelectorAll("video.demo-video").forEach((v) => videoObs.observe(v));
