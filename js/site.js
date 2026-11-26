// Shared behaviour for every page: nav, LINE button, reveal on scroll, video player.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// nav hides on the way down and comes back on the way up
const nav = $('#nav');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('solid', y > 30);
  if (!document.body.classList.contains('menu-open')) nav.classList.toggle('hide', y > lastY && y > 200);
  lastY = y;
  $('#pinLine')?.classList.toggle('show', y > innerHeight * 0.7);
}, { passive: true });
$('#burger')?.addEventListener('click', (e) => {
  const open = document.body.classList.toggle('menu-open');
  e.currentTarget.setAttribute('aria-expanded', open);
});
$$('.nav ul a').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));
const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

// sections no longer animate in on scroll; kept so page scripts can call it
export function reveal() {}

// YouTube thumbnails: fall back when the large one does not exist
export function thumbFix(img) {
  img.addEventListener('load', () => { if (img.naturalWidth <= 120 && !img.dataset.fb) { img.dataset.fb = 1; img.src = img.src.replace(/(maxresdefault|sddefault|oar2)/, 'hqdefault'); } });
  img.addEventListener('error', () => { if (!img.dataset.fb) { img.dataset.fb = 1; img.src = img.src.replace(/(maxresdefault|sddefault|oar2)/, 'hqdefault'); } });
}
$$('img[src*="i.ytimg.com"]').forEach(thumbFix);

// video player: a native <dialog> (Esc, back gesture and click outside close it)
const modal = $('#modal'), frame = $('#modalFrame'), txt = $('#modalTxt');
export function openVideo({ yt, tt, vertical, html }) {
  modal.classList.toggle('vert', !!vertical);
  frame.innerHTML = yt
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Video"></iframe>`
    : `<iframe src="https://www.tiktok.com/player/v1/${tt}?autoplay=1&rel=0" allow="autoplay; fullscreen; encrypted-media" allowfullscreen title="TikTok video"></iframe>`;
  txt.innerHTML = html || '';
  modal.showModal();
}
modal?.addEventListener('close', () => { frame.innerHTML = ''; });
// the dialog fills the screen, so a click on its empty area (not the video or the text) closes it
modal?.addEventListener('click', (e) => { if (e.target === modal || e.target.classList.contains('box')) modal.close(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-yt],[data-tt]');
  if (!b || b.closest('#modal')) return;
  e.preventDefault();
  openVideo({ yt: b.dataset.yt, tt: b.dataset.tt, vertical: b.dataset.vertical === '1' || !!b.dataset.tt });
});

// size: hqdefault (480 wide) for cards, maxresdefault for the one large card
export function vcard(v, extra = '', size = 'hqdefault') {
  const src = `https://i.ytimg.com/vi/${v.id}/${v.hq ? 'hqdefault' : size}.jpg`;
  return `<button class="vcard ${extra}" data-yt="${v.id}" type="button">
    <img src="${src}" alt="" loading="lazy" decoding="async" width="480" height="270">
    ${v.views ? `<span class="views">${v.views} views</span>` : ''}<span class="dur">${v.d}</span><span class="pl"></span>
    <span class="cap">${v.t}</span></button>`;
}
export function fixThumbs(root) { $$('img[src*="i.ytimg.com"]', root).forEach(thumbFix); }

const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 12h14M13 6l6 6-6 6"/></svg>';
export { $, $$, ARROW };
