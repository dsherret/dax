// install tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const r = tab.dataset.runtime;
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    document.querySelectorAll('[data-pane]').forEach(p => {
      p.hidden = p.dataset.pane !== r;
    });
  });
});

// sidebar active link tracking — observes both bare h2[id] and the hero <section id>
const sectionIds = [...document.querySelectorAll('main h2[id], main section[id]')].map(s => s.id);
const sideLinks = new Map(
  [...document.querySelectorAll('.sidebar a[href^="#"]')].map(a => [a.getAttribute('href').slice(1), a])
);
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      sideLinks.forEach(a => a.classList.remove('active'));
      const a = sideLinks.get(e.target.id);
      if (a) a.classList.add('active');
    }
  });
}, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
sectionIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) obs.observe(el);
});

// build right-side TOC from H2s in main
const tocList = document.getElementById('toc-list');
document.querySelectorAll('main h2[id]').forEach(h => {
  const li = document.createElement('li');
  const a  = document.createElement('a');
  a.href = '#' + h.id;
  a.textContent = h.textContent.replace('#', '').trim();
  a.dataset.target = h.id;
  li.appendChild(a);
  tocList.appendChild(li);
});
const tocLinks = new Map(
  [...tocList.querySelectorAll('a')].map(a => [a.dataset.target, a])
);
const obs2 = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      tocLinks.forEach(a => a.classList.remove('active'));
      const a = tocLinks.get(e.target.id);
      if (a) a.classList.add('active');
    }
  });
}, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
sectionIds.forEach(id => {
  const el = document.getElementById(id);
  if (el) obs2.observe(el);
});
