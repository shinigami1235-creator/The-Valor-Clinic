import { $, $$, vcard, fixThumbs, openVideo, reveal } from './site.js';
import { QA, TIKTOK_STORIES, TESTIMONIALS, REVIEWS, GOOGLE, VIDEOS, LINKS } from './data.js';
import { initSkin } from './skin3d.js';

const STAR = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l3 6.9 7.5.7-5.7 5 1.7 7.4L12 18.3 5.5 22l1.7-7.4L1.5 9.6 9 8.9z"/></svg>';

// ---------- hero ----------
const cycle = $('#cycle'), seg = $('#seg');
const dayNum = $('#dayNum'), dayOf = $('#dayOf'), dayBar = $('#dayBar'), dayLbl = $('#dayLbl');
let shown = -1;
const skin = initSkin($('#skin3d'), ({ day, days, progress, shed }) => {
  if (day !== shown) { dayNum.textContent = day; shown = day; }
  dayOf.textContent = days;
  dayBar.style.width = (progress * 100).toFixed(1) + '%';
  dayLbl.innerHTML = shed ? 'the cell reaches the surface<br>and sheds' : 'days for one skin cell<br>to reach the surface';
});
$$('button', seg).forEach((b) => b.addEventListener('click', () => {
  const m = b.dataset.mode;
  seg.dataset.mode = cycle.dataset.mode = m;
  $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', x === b));
  skin.setMode(m);
}));


// ---------- look beyond your skin ----------
const steps = $$('#steps .step');
const dots = $('#dots');
steps.forEach((s, i) => {
  const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', s.querySelector('h3').textContent);
  d.addEventListener('click', () => goStep(i)); dots.appendChild(d);
});
let cur = -1, st = null;
// the body model and its 198 KB mesh load only when the section comes near
let body = { setStep() {} };
new IntersectionObserver(async ([e], io) => {
  if (!e.isIntersecting) return;
  io.disconnect();
  const { initBody } = await import('./body3d.js');
  body = initBody($('#body3d'), $('#marks'), (i) => goStep(i));
  body.setStep(Math.max(0, cur));
}, { rootMargin: '900px 0px' }).observe($('#beyond'));
function showStep(i) {
  if (i === cur) return; cur = i;
  steps.forEach((s, k) => s.classList.toggle('on', k === i));
  $$('button', dots).forEach((d, k) => d.classList.toggle('on', k === i));
  body.setStep(i);
}
// a click jumps straight to its step; the steps the page scrolls past on the way are ignored
let lock = null, lockTimer = 0;
const unlock = () => { lock = null; clearTimeout(lockTimer); };
['wheel', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, unlock, { passive: true }));
function goStep(i) {
  showStep(i);
  if (!st) return;
  lock = i; clearTimeout(lockTimer); lockTimer = setTimeout(unlock, 1600);
  const y = st.start + (st.end - st.start) * ((i + 0.5) / steps.length);
  scrollTo({ top: y, behavior: 'smooth' });
}
showStep(0);
(() => {
  const g = window.gsap, ST = window.ScrollTrigger; if (!g || !ST) return;
  g.registerPlugin(ST);
  st = ST.create({
    trigger: '#beyond', start: 'top top', end: () => '+=' + innerHeight * steps.length * 0.8,
    pin: '#beyond .pin', pinSpacing: true, anticipatePin: 1,
    onUpdate: (self) => {
      const i = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
      if (lock !== null) { if (i === lock) unlock(); return; }
      showStep(i);
    },
  });
  addEventListener('load', () => ST.refresh());
})();

// ---------- services accordion ----------
const svcs = $$('#svcRow .svc');
svcs.forEach((s) => {
  const open = () => svcs.forEach((x) => x.classList.toggle('open', x === s));
  s.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) open(); });
  s.addEventListener('focus', open);
  s.addEventListener('click', (e) => { if (!s.classList.contains('open')) { e.preventDefault(); open(); } });
});

// ---------- Q&A ----------
const qa = $('#qaGrid');
qa.innerHTML = QA.map((q, i) => i === 0
  ? `<button class="qcard big" data-q="${i}" type="button"><img src="https://i.ytimg.com/vi/${q.id}/oar2.jpg" alt="" loading="lazy"><div class="pad"><span class="q">${q.q}</span><span class="play"><i></i>Watch the answer</span></div></button>`
  : `<button class="qcard" data-q="${i}" type="button"><span class="q">${q.q}</span><span class="play"><i></i>Answer</span></button>`).join('')
  + `<a class="qcard ask" href="${LINKS.line}" target="_blank" rel="noopener"><span class="q">Another question? Ask the doctor on LINE.</span><span class="play"><i></i>@valorclinic</span></a>`;
qa.addEventListener('click', (e) => {
  const b = e.target.closest('[data-q]'); if (!b) return;
  const q = QA[+b.dataset.q];
  openVideo({ yt: q.id, vertical: true, html: `<div class="kicker">Psoriasis Q&amp;A</div><h3>${q.q}</h3><p>${q.a}</p><div class="by">Assoc. Prof. Premjit Juntongjin, board-certified dermatologist</div><a class="btn btn-line" href="${LINKS.line}" target="_blank" rel="noopener">Ask on LINE</a>` });
});

// ---------- stories ----------
const rail = $('#storyRail');
const ytStories = VIDEOS.filter((v) => v.cat === 'story');
rail.innerHTML = TIKTOK_STORIES.map((s) => `<button class="tk rv-up" data-tt="${s.id}" type="button"><blockquote>${s.quote}</blockquote><span class="meta"><span><b>${s.views}</b>views on TikTok</span><span class="pbtn"></span></span></button>`).join('')
  + `<div class="yt-story rv-up">${ytStories.map((v) => vcard(v)).join('')}</div>`;
$('#quotes').innerHTML = TESTIMONIALS.map((t, i) => `<figure class="quote rv-up" style="margin:0"><p>“${t.text}”</p><figcaption class="who"><img class="av" src="https://thevalorclinic.com/wp-content/uploads/2023/01/customer-0${i + 1}.jpg" alt="" loading="lazy" width="44" height="44"><span><b>${t.name}</b><span>${t.role}</span></span></figcaption></figure>`).join('');

// ---------- Google reviews ----------
$('#gStars').innerHTML = STAR.repeat(5);
$('#gRate').textContent = GOOGLE.rating; $('#gCount').textContent = GOOGLE.count;
$('#gLink').href = LINKS.reviews; $('#gbLink').href = LINKS.reviews;
const rv = (r) => `<article class="rv"><div class="top"><span class="ini">${r.name.trim()[0].toUpperCase()}</span><div><b>${r.name}</b><small>${r.when}</small></div></div><span class="stars">${STAR.repeat(r.stars)}</span><p>${r.text}</p></article>`;
const row = $('#rvRow');
row.innerHTML = REVIEWS.map(rv).join('');
const step = () => row.firstElementChild.getBoundingClientRect().width + 16;
$('#rvPrev').addEventListener('click', () => row.scrollBy({ left: -step(), behavior: 'smooth' }));
$('#rvNext').addEventListener('click', () => row.scrollBy({ left: step(), behavior: 'smooth' }));

// ---------- videos ----------
const top = ['qIHhYvWqi2I', 'SKEZ26F6Dy8', '_o6Q7lav_sI', 'yuEoaf8AX5c', 'eaRhtunzobY'];
$('#vwall').innerHTML = top.map((id, i) => vcard(VIDEOS.find((v) => v.id === id), '', i ? 'hqdefault' : 'maxresdefault')).join('');

fixThumbs(document);
reveal();
