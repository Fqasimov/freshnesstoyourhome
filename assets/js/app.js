/* ===========================================================================
   Freshness To Your Home — front end
   Vanilla JS, no build step. Cart lives in localStorage; nothing is charged.
   ======================================================================== */
(function () {
'use strict';

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state -------------------------------------------------------- */
let lang  = localStorage.getItem('fth.lang') || 'en';
let cart  = [];
try { cart = JSON.parse(localStorage.getItem('fth.cart') || '[]'); } catch (e) { cart = []; }

let filter = 'all', query = '', sortBy = 'default';
const cardEls = new Map();          // product id -> card element

const t   = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
const nm  = p => lang === 'az' ? p.az : p.en;
const alt = p => lang === 'az' ? p.en : p.az;
const dsc = p => lang === 'az' ? p.daz : p.den;
const catOf = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[0];
const catName = id => { const c = catOf(id); return lang === 'az' ? c.az : c.en; };
const unitOf = (p, v) => { const u = v || p.unit; return lang === 'az' ? u.az : u.en; };
const money = n => (Math.round(n * 100) / 100).toString();

/* per-kilo reference price, where it tells the customer something */
function perKg(p) {
  const u = p.unit;
  if (u.kind === 'g') return p.price / (u.qty / 1000);
  if (u.kind === 'kg' && u.qty !== 1) return p.price / u.qty;
  return null;
}

/* ---------- i18n --------------------------------------------------------- */
function applyLang() {
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('#lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  localStorage.setItem('fth.lang', lang);
  buildChips(); buildTicker(); renderAllCards(); renderSlider(); render(); drawCart();
  $('#wa-plain').href = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(t('ui.waPlain'));
}

$('#lang').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  lang = b.dataset.lang; applyLang();
});

/* ---------- ticker ------------------------------------------------------- */
function buildTicker() {
  const words = CATEGORIES.slice(1).map(c => lang === 'az' ? c.az : c.en)
    .concat([lang === 'az' ? 'Bakıya çatdırılma' : 'Delivered across Baku']);
  const half = words.map(w => '<span>' + w + '</span>').join('');
  $('#ticker').innerHTML = half + half;
}

/* ---------- chips -------------------------------------------------------- */
function buildChips() {
  $('#chips').innerHTML = CATEGORIES.map(c =>
    '<button class="chip' + (c.id === filter ? ' on' : '') + '" data-cat="' + c.id + '">' +
    (lang === 'az' ? c.az : c.en) + '<sup>' + c.kicker + '</sup></button>'
  ).join('');
}

$('#chips').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  filter = b.dataset.cat;
  $$('.chip').forEach(c => c.classList.toggle('on', c.dataset.cat === filter));
  render();
});

/* ---------- card markup -------------------------------------------------- */
function cardHTML(p) {
  const pk = perKg(p);
  const flags =
    (p.star ? '<span class="flag">' + t('ui.pick') + '</span>' : '') +
    (pk ? '<span class="flag flag--kg">' + money(pk) + ' AZN' + t('ui.perkg') + '</span>' : '');
  return '' +
  '<div class="card__media">' +
    '<img src="' + p.img + '" alt="' + nm(p) + '" loading="lazy" decoding="async">' +
    '<div class="card__flags">' + flags + '</div>' +
    '<div class="card__peek"><button data-peek="' + p.id + '">' + t('ui.quick') + '</button></div>' +
  '</div>' +
  '<div class="card__body">' +
    '<span class="card__cat">' + catName(p.cat) + '</span>' +
    '<h3 class="card__name">' + nm(p) + '</h3>' +
    '<p class="card__alt">' + alt(p) + '</p>' +
    '<div class="card__foot">' +
      '<span class="card__price"><b>' + p.price + '<i>AZN</i></b><span>' + unitOf(p) + '</span></span>' +
      '<button class="add" data-add="' + p.id + '" aria-label="' + t('ui.add') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
      '</button>' +
    '</div>' +
  '</div>';
}

function renderAllCards() {
  const grid = $('#grid');
  if (!cardEls.size) {
    PRODUCTS.forEach(p => {
      const el = document.createElement('article');
      el.className = 'card';
      el.dataset.id = p.id;
      grid.appendChild(el);
      cardEls.set(p.id, el);
    });
  }
  PRODUCTS.forEach(p => { cardEls.get(p.id).innerHTML = cardHTML(p); });
}

/* ---------- filter + sort, with FLIP ------------------------------------- */
function visibleList() {
  const q = query.trim().toLowerCase();
  let list = PRODUCTS.filter(p => {
    if (filter !== 'all' && p.cat !== filter) return false;
    if (!q) return true;
    return (p.en + ' ' + p.az + ' ' + p.den + ' ' + p.daz + ' ' + catName(p.cat)).toLowerCase().includes(q);
  });
  if (sortBy === 'asc')  list = list.slice().sort((a, b) => a.price - b.price);
  if (sortBy === 'desc') list = list.slice().sort((a, b) => b.price - a.price);
  if (sortBy === 'az')   list = list.slice().sort((a, b) => nm(a).localeCompare(nm(b), lang === 'az' ? 'az' : 'en'));
  return list;
}

function render() {
  const grid = $('#grid');
  const list = visibleList();
  const ids  = new Set(list.map(p => p.id));

  /* FIRST — where is everything now */
  const first = new Map();
  cardEls.forEach((el, id) => {
    if (el.style.display !== 'none') first.set(id, el.getBoundingClientRect());
  });

  /* mutate */
  $('.empty') && $('.empty').remove();
  cardEls.forEach((el, id) => { el.style.display = ids.has(id) ? '' : 'none'; });
  list.forEach(p => grid.appendChild(cardEls.get(p.id)));

  if (!list.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.innerHTML = '<h3>' + t('ui.empty.t') + '</h3><p>' + t('ui.empty.d') + '</p>';
    grid.appendChild(e);
  }

  /* LAST + INVERT + PLAY */
  if (!RM) {
    list.forEach((p, i) => {
      const el = cardEls.get(p.id);
      const b  = el.getBoundingClientRect();
      const a  = first.get(p.id);
      if (a) {
        const dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) {
          el.style.transition = 'none';
          el.style.transform  = 'translate(' + dx + 'px,' + dy + 'px)';
          requestAnimationFrame(() => {
            el.style.transition = 'transform .58s cubic-bezier(.16,1,.3,1)';
            el.style.transform  = '';
          });
        }
      } else {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px) scale(.97)';
        requestAnimationFrame(() => {
          el.style.transition = 'opacity .5s ease, transform .6s cubic-bezier(.16,1,.3,1)';
          el.style.transitionDelay = Math.min(i, 10) * 22 + 'ms';
          el.style.opacity = '1';
          el.style.transform = '';
          setTimeout(() => { el.style.transitionDelay = ''; }, 700);
        });
      }
    });
  }

  const n = list.length;
  $('#count').textContent = n + ' ' + (n === 1 ? t('ui.item') : t('ui.items'));
}

$('#search').addEventListener('input', e => { query = e.target.value; render(); });
$('#sort').addEventListener('change', e => { sortBy = e.target.value; render(); });

/* ---------- featured slider --------------------------------------------- */
function renderSlider() {
  const picks = PRODUCTS.filter(p => p.star);
  $('#track').innerHTML = picks.map(p =>
    '<article class="card" data-slide="' + p.id + '">' + cardHTML(p) + '</article>'
  ).join('');
  updateBar();
}

const track = $('#track');

/* keep the full-bleed slider's first card flush with the page gutter */
function setEdge() {
  const w = $('.wrap');
  if (!w) return;
  const r = w.getBoundingClientRect();
  const pad = parseFloat(getComputedStyle(w).paddingLeft) || 0;
  document.documentElement.style.setProperty('--edge', (r.left + pad) + 'px');
}
window.addEventListener('resize', setEdge);
setEdge();

function updateBar() {
  const max = track.scrollWidth - track.clientWidth;
  const pct = max > 0 ? track.scrollLeft / max : 0;
  const w = Math.max(12, (track.clientWidth / track.scrollWidth) * 100);
  $('#sbar').style.width = w + '%';
  $('#sbar').style.transform = 'translateX(' + (pct * (100 / w) * (100 - w)) + '%)';
  $('#prev').disabled = track.scrollLeft < 4;
  $('#next').disabled = track.scrollLeft > max - 4;
}
track.addEventListener('scroll', updateBar, { passive: true });
window.addEventListener('resize', updateBar);

const step = () => Math.min(track.clientWidth * .8, 360);
$('#next').addEventListener('click', () => track.scrollBy({ left: step(), behavior: RM ? 'auto' : 'smooth' }));
$('#prev').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: RM ? 'auto' : 'smooth' }));

/* drag to scroll */
let down = false, sx = 0, sl = 0, moved = 0;
track.addEventListener('pointerdown', e => {
  if (e.target.closest('button')) return;
  down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft;
  track.classList.add('drag'); track.setPointerCapture(e.pointerId);
});
track.addEventListener('pointermove', e => {
  if (!down) return;
  const d = e.clientX - sx; moved = Math.abs(d);
  track.scrollLeft = sl - d;
});
const endDrag = () => { down = false; track.classList.remove('drag'); };
track.addEventListener('pointerup', endDrag);
track.addEventListener('pointercancel', endDrag);
track.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);

/* ---------- cart --------------------------------------------------------- */
const save = () => localStorage.setItem('fth.cart', JSON.stringify(cart));
const keyOf = (id, v) => id + '::' + (v == null ? '-' : v);

function addToCart(id, v, qty) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  const k = keyOf(id, v);
  const hit = cart.find(c => c.key === k);
  if (hit) hit.qty += (qty || 1);
  else cart.push({ key: k, id: id, v: v == null ? null : v, qty: qty || 1 });
  save(); drawCart(); bump();
  toast(t('ui.added'));
}

function setQty(key, d) {
  const it = cart.find(c => c.key === key); if (!it) return;
  it.qty += d;
  if (it.qty <= 0) cart = cart.filter(c => c.key !== key);
  save(); drawCart();
}
function removeItem(key) { cart = cart.filter(c => c.key !== key); save(); drawCart(); }

function lineData(it) {
  const p = PRODUCTS.find(x => x.id === it.id);
  const v = (p.variants && it.v != null) ? p.variants[it.v] : null;
  return { p: p, v: v, price: v ? v.price : p.price, unit: v ? (lang === 'az' ? v.az : v.en) : unitOf(p) };
}

function drawCart() {
  const body = $('#cartbody'), foot = $('#cartfoot');
  const n = cart.reduce((s, c) => s + c.qty, 0);
  $('#cartn').textContent = n;
  $('#cartcount').textContent = n + ' ' + (n === 1 ? t('ui.item') : t('ui.items'));

  if (!cart.length) {
    foot.hidden = true;
    body.innerHTML =
      '<div class="drawer__empty">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
        '<h4>' + t('ui.cartempty') + '</h4><p>' + t('ui.cartempty.d') + '</p>' +
      '</div>';
    return;
  }

  let total = 0;
  body.innerHTML = cart.map(it => {
    const d = lineData(it);
    total += d.price * it.qty;
    return '' +
    '<div class="line">' +
      '<div class="line__img"><img src="' + d.p.img + '" alt=""></div>' +
      '<div class="line__t">' +
        '<b>' + nm(d.p) + '</b>' +
        '<span>' + d.unit + ' · ' + d.price + ' AZN</span>' +
        '<em>' + money(d.price * it.qty) + ' AZN</em>' +
      '</div>' +
      '<div class="line__r">' +
        '<div class="qty">' +
          '<button data-q="-1" data-k="' + it.key + '">−</button>' +
          '<span>' + it.qty + '</span>' +
          '<button data-q="1" data-k="' + it.key + '">+</button>' +
        '</div>' +
        '<button class="rm" data-rm="' + it.key + '">' + t('ui.remove') + '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  foot.hidden = false;
  $('#carttotal').innerHTML = money(total) + '<i>AZN</i>';

  /* compose the WhatsApp order */
  let msg = t('ui.waIntro') + '\n\n';
  cart.forEach(it => {
    const d = lineData(it);
    msg += '• ' + nm(d.p) + ' — ' + d.unit + ' × ' + it.qty + ' = ' + money(d.price * it.qty) + ' AZN\n';
  });
  msg += '\n' + t('ui.waTotal') + ': ' + money(total) + ' AZN\n\n' + t('ui.waOutro');
  $('#sendwa').href = 'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(msg);
}

$('#cartbody').addEventListener('click', e => {
  const q = e.target.closest('[data-q]'); if (q) return setQty(q.dataset.k, +q.dataset.q);
  const r = e.target.closest('[data-rm]'); if (r) return removeItem(r.dataset.rm);
});

function bump() {
  const n = $('#cartn');
  n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop');
}

/* ---------- add + fly ---------------------------------------------------- */
document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) {
    const id = add.dataset.add;
    const p = PRODUCTS.find(x => x.id === id);
    if (p.variants) { openModal(id); return; }         // let them pick the tin size
    fly(add.closest('.card'));
    addToCart(id, null, 1);
    add.classList.add('done');
    setTimeout(() => add.classList.remove('done'), 700);
    return;
  }
  const peek = e.target.closest('[data-peek]');
  if (peek) openModal(peek.dataset.peek);
});

function fly(card) {
  if (RM || !card) return;
  const img = $('img', card); if (!img) return;
  const a = img.getBoundingClientRect();
  const b = $('#cartbtn').getBoundingClientRect();
  const g = document.createElement('img');
  g.src = img.src; g.className = 'fly';
  g.style.left = a.left + a.width / 2 - 37 + 'px';
  g.style.top  = a.top  + a.height / 2 - 37 + 'px';
  document.body.appendChild(g);
  requestAnimationFrame(() => {
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top  + b.height / 2 - (a.top + a.height / 2);
    g.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.16) rotate(22deg)';
    g.style.opacity = '0';
  });
  setTimeout(() => g.remove(), 900);
}

/* ---------- toast -------------------------------------------------------- */
let toastT;
function toast(msg) {
  $('#toasttext').textContent = msg;
  $('#toast').classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => $('#toast').classList.remove('on'), 2300);
}

/* ---------- drawer ------------------------------------------------------- */
const openCart  = () => { $('#drawer').classList.add('on'); $('#scrim').classList.add('on'); document.body.classList.add('is-locked'); };
const closeCart = () => { $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on'); if (!$('#modal').classList.contains('on')) document.body.classList.remove('is-locked'); };
$('#cartbtn').addEventListener('click', openCart);
$('#closecart').addEventListener('click', closeCart);
$('#scrim').addEventListener('click', () => { closeCart(); closeModal(); });

/* ---------- quick view --------------------------------------------------- */
let mv = null, mq = 1;
function openModal(id) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  mv = p.variants ? 0 : null; mq = 1;
  paintModal(p);
  $('#modal').classList.add('on'); $('#scrim').classList.add('on');
  document.body.classList.add('is-locked');
}
function closeModal() {
  $('#modal').classList.remove('on');
  if (!$('#drawer').classList.contains('on')) { $('#scrim').classList.remove('on'); document.body.classList.remove('is-locked'); }
}

function paintModal(p) {
  const v  = p.variants ? p.variants[mv] : null;
  const pr = v ? v.price : p.price;
  const un = v ? (lang === 'az' ? v.az : v.en) : unitOf(p);
  const kg = v ? pr / (v.qty / 1000) : perKg(p);

  $('#modalbox').innerHTML = '' +
    '<div class="modal__img"><img src="' + p.img + '" alt="' + nm(p) + '">' +
      '<button class="x modal__x" data-close aria-label="Close"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
    '</div>' +
    '<div class="modal__body">' +
      '<span class="card__cat">' + catName(p.cat) + '</span>' +
      '<h3>' + nm(p) + '</h3>' +
      '<p class="modal__alt">' + alt(p) + '</p>' +
      '<p class="modal__desc">' + dsc(p) + '</p>' +
      (p.variants ? '<div class="variants">' + p.variants.map((x, i) =>
        '<button data-v="' + i + '"' + (i === mv ? ' class="on"' : '') + '>' + (lang === 'az' ? x.az : x.en) + ' · ' + x.price + ' AZN</button>'
      ).join('') + '</div>' : '') +
      '<dl class="modal__spec">' +
        '<div><dt>' + t('ui.category') + '</dt><dd>' + catName(p.cat) + '</dd></div>' +
        '<div><dt>' + t('ui.unit') + '</dt><dd>' + un + '</dd></div>' +
        '<div><dt>' + t('ui.price') + '</dt><dd>' + pr + ' AZN</dd></div>' +
        (kg ? '<div><dt>' + t('ui.perkgfull') + '</dt><dd>' + money(kg) + ' AZN</dd></div>' : '') +
      '</dl>' +
      '<div class="modal__buy">' +
        '<div class="qty">' +
          '<button data-mq="-1">−</button><span id="mqn">' + mq + '</span><button data-mq="1">+</button>' +
        '</div>' +
        '<button class="btn" data-buy="' + p.id + '"><span>' + t('ui.add') + ' · ' + money(pr * mq) + ' AZN</span></button>' +
      '</div>' +
    '</div>';
}

$('#modal').addEventListener('click', e => {
  if (e.target === $('#modal') || e.target.closest('[data-close]')) return closeModal();
  const box = $('#modalbox');
  const id  = $('[data-buy]', box) && $('[data-buy]', box).dataset.buy;
  const p   = PRODUCTS.find(x => x.id === id);

  const vb = e.target.closest('[data-v]');
  if (vb) { mv = +vb.dataset.v; paintModal(p); return; }

  const qb = e.target.closest('[data-mq]');
  if (qb) { mq = Math.max(1, mq + (+qb.dataset.mq)); paintModal(p); return; }

  const buy = e.target.closest('[data-buy]');
  if (buy) { fly($('.modal__img', box)); addToCart(p.id, mv, mq); closeModal(); }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeCart(); $('#navlinks').classList.remove('open'); $('#burger').classList.remove('x'); }
});

/* ---------- nav ---------------------------------------------------------- */
const nav = $('#nav');
const onScroll = () => {
  const y = window.scrollY;
  nav.classList.toggle('solid', y > window.innerHeight * .72);
  $('#totop').classList.toggle('on', y > 900);
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

$('#burger').addEventListener('click', () => {
  $('#navlinks').classList.toggle('open');
  $('#burger').classList.toggle('x');
});
$$('#navlinks a').forEach(a => a.addEventListener('click', () => {
  $('#navlinks').classList.remove('open'); $('#burger').classList.remove('x');
}));
$('#totop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' }));

/* ---------- reveal + section states -------------------------------------- */
const io = new IntersectionObserver(es => {
  es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { threshold: .16, rootMargin: '0px 0px -8% 0px' });
$$('[data-reveal]').forEach(el => io.observe(el));

/* hero underline + dashed step line draw once in view */
(function drawings() {
  const ul = $('.hero__ul path');
  if (ul) { const L = ul.getTotalLength(); ul.style.setProperty('--len', L); }
  const heroIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .2 });
  ['.hero', '.steps'].forEach(s => { const el = $(s); if (el) heroIO.observe(el); });
})();

/* count-up */
const numIO = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, to = +el.dataset.num;
  numIO.unobserve(el);
  if (RM) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 1100;
  (function tick(now) {
    const k = Math.min(1, (now - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(tick);
  })(t0);
}), { threshold: .6 });
$$('[data-num]').forEach(el => numIO.observe(el));

/* hero collage parallax */
(function parallax() {
  if (RM) return;
  const box = $('#collage'); if (!box) return;
  const figs = $$('figure', box);
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
  box.addEventListener('pointermove', e => {
    const r = box.getBoundingClientRect();
    tx = (e.clientX - r.left) / r.width - .5;
    ty = (e.clientY - r.top) / r.height - .5;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  box.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); });
  function loop() {
    cx += (tx - cx) * .08; cy += (ty - cy) * .08;
    figs.forEach(f => {
      const d = +f.dataset.depth || 10;
      f.style.transform = 'translate(' + (cx * d) + 'px,' + (cy * d) + 'px)';
    });
    raf = (Math.abs(tx - cx) > .001 || Math.abs(ty - cy) > .001) ? requestAnimationFrame(loop) : null;
  }
  /* gentle scroll parallax too */
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > window.innerHeight) return;
    figs.forEach(f => { f.style.marginTop = (y * (+f.dataset.depth || 10) * -0.012) + 'px'; });
  }, { passive: true });
})();

/* ---------- boot --------------------------------------------------------- */
$('#yr').textContent = new Date().getFullYear();
renderAllCards();
applyLang();
setEdge();
drawCart();
updateBar();

})();
