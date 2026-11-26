import { $, $$, vcard, fixThumbs, openVideo, reveal } from './site.js';
import { QA, VIDEOS, LINKS } from './data.js';

const byId = (id) => VIDEOS.find((v) => v.id === id);
const put = (sel, ids) => { const el = $(sel); if (el) el.innerHTML = ids.map((id) => vcard(byId(id))).join(''); };

// Q&A grid (Skin and Videos pages)
const qa = $('#qaGrid');
if (qa) {
  qa.innerHTML = QA.map((q, i) => `<button class="qcard" data-q="${i}" type="button"><span class="q">${q.q}</span><span class="play"><i></i>Answer</span></button>`).join('')
    + `<a class="qcard ask one" href="${LINKS.line}" target="_blank" rel="noopener"><span class="q">Another question? Ask the doctor on LINE.</span><span class="play"><i></i>@valorclinic</span></a>`;
  qa.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const q = QA[+b.dataset.q];
    openVideo({ yt: q.id, vertical: true, html: `<div class="kicker">Psoriasis Q&amp;A</div><h3>${q.q}</h3><p>${q.a}</p><div class="by">Assoc. Prof. Premjit Juntongjin, board-certified dermatologist</div><a class="btn btn-line" href="${LINKS.line}" target="_blank" rel="noopener">Ask on LINE</a>` });
  });
}

// Skin page
put('#dermMedia', ['_o6Q7lav_sI', 'yuEoaf8AX5c']);
const dm = $('#dermMedia'); if (dm) dm.style.cssText = 'display:grid;gap:12px';
const race = $('#race');
if (race) {
  const rN = $('#rN'), rP = $('#rP'), iN = $('.n', race), iP = $('.p', race);
  let t0 = null, run = false;
  new IntersectionObserver(([e]) => { run = e.isIntersecting; if (run) requestAnimationFrame(tick); }).observe(race);
  function tick(now) {
    if (!run) return;
    if (t0 === null) t0 = now;
    const day = ((now - t0) / 1000 * 2.2) % 32; // 2.2 days a second, short pause after day 28
    const n = Math.min(28, day), p = Math.min(4, day % 4.6);
    iN.style.width = (n / 28 * 100) + '%'; iP.style.width = (Math.min(1, p / 4) * 100) + '%';
    rN.textContent = Math.floor(n); rP.textContent = Math.floor(p);
    requestAnimationFrame(tick);
  }
}

// Metabolic page
put('#heartVids', ['dkw2VtR6Zv8', '-zAnyBboLF8']);
put('#liverVid', ['eaRhtunzobY']);
put('#weightVids', ['JAYraGrfRSs', 'iVDL-q5HYrs']);
const ecg = $('#ecgPath');
if (ecg) {
  const beat = (x) => `L${x},100 L${x + 18},100 L${x + 24},92 L${x + 30},100 L${x + 40},100 L${x + 46},112 L${x + 54},30 L${x + 62},150 L${x + 70},100 L${x + 92},100 L${x + 104},84 L${x + 116},100`;
  let d = 'M0,100'; for (let x = 0; x < 1200; x += 150) d += beat(x);
  ecg.setAttribute('d', d);
  const len = ecg.getTotalLength();
  ecg.style.strokeDasharray = `${len / 2} ${len / 2}`;
  let off = 0; const bpm = $('#bpm');
  (function loop() { off = (off + 2.2) % len; ecg.style.strokeDashoffset = -off; requestAnimationFrame(loop); })();
  setInterval(() => { bpm.textContent = 70 + Math.round(Math.random() * 5); }, 1800);
}
const gs = $('#gStiff'), gf = $('#gFat');
if (gs) new IntersectionObserver(([e]) => { if (e.isIntersecting) { gs.style.width = '62%'; gf.style.width = '44%'; } }).observe(gs);

// About page
put('#aboutVids', ['x1lsB7FOFMo', 'SGEUS6QzZ20']);
put('#eventVids', ['SKEZ26F6Dy8', 'PfR_J_W5tHY', 'qIHhYvWqi2I']);

// Videos page
const grid = $('#vgrid');
if (grid) {
  const draw = (c) => { grid.innerHTML = VIDEOS.filter((v) => c === 'all' || v.cat === c).map((v) => vcard(v)).join(''); fixThumbs(grid); };
  draw('all');
  $$('#chips .chip').forEach((b) => b.addEventListener('click', () => {
    $$('#chips .chip').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(b.dataset.c);
  }));
}

// Contact page
put('#whereVid', ['U5foPyQ07go']);
const form = $('#mform');
if (form) form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(form);
  const body = `${f.get('message') || ''}\n\n${f.get('name')}\n${f.get('email')}`;
  location.href = `mailto:${LINKS.email}?subject=${encodeURIComponent(f.get('subject') || 'Message from the website')}&body=${encodeURIComponent(body)}`;
});

// headline entrance on inner pages
addEventListener('load', () => {
  const g = window.gsap; if (!g || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  g.from('.phero h1', { y: 60, opacity: 0, duration: 1, ease: 'power4.out' });
  g.from('.phero .lede', { y: 30, opacity: 0, duration: 1, delay: 0.15, ease: 'power3.out' });
  const sw = $('.phero .swoosh path');
  if (sw) { const L = sw.getTotalLength(); sw.style.strokeDasharray = L; g.fromTo(sw, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut' }); }
});

fixThumbs(document);
reveal();
