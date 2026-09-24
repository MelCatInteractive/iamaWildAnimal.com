const N = window.SCREENS.n, COLORS = window.SCREENS.colors;
const $ = (s, r = document) => r.querySelector(s);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = n => Math.floor(Math.random() * n);
const pad = n => String(n).padStart(3, '0');
const src = { t400: i => `media/t400/${i}.webp`, t800: i => `media/t800/${i}.webp`, full: i => `images/jpg_image${i}.jpg` };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ease = { out: t => 1 - Math.pow(1 - t, 4), inout: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 };
const loadImg = s => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = s; });

/* ---------- global clock ---------- */
const subs = new Set();
let last = performance.now(), scrollV = 0, lastY = scrollY;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const y = scrollY; scrollV = lerp(scrollV, (y - lastY) / Math.max(dt, .001), .15); lastY = y;
  for (const f of subs) f(dt, now / 1000, y, scrollV);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- boot ---------- */
if (RM || sessionStorage.getItem('booted')) document.documentElement.classList.add('booted');
else setTimeout(() => document.documentElement.classList.add('booted'), 1000);
try { sessionStorage.setItem('booted', '1'); } catch {}

/* ---------- clock ---------- */
{
  const el = $('#clock');
  const tick = () => { const d = new Date(); el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => String(v).padStart(2, '0')).join(':'); };
  tick(); setInterval(tick, 1000);
}

/* ---------- cursor ---------- */
if (FINE) {
  const c = $('.cursor'), label = $('span', c); let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; c.classList.remove('hide'); }, { passive: true });
  document.addEventListener('mouseleave', () => c.classList.add('hide'));
  addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor],.card,.reel .item,.viewer .stage');
    if (t) { label.textContent = t.dataset.cursor || (t.classList.contains('stage') ? '' : 'Open'); c.classList.toggle('big', !!label.textContent); }
    else c.classList.remove('big');
  });
  subs.add(() => { x = lerp(x, mx, .35); y = lerp(y, my, .35); c.style.transform = `translate3d(${x}px,${y}px,0)`; });
}

/* ---------- hero signal ---------- */
class Signal {
  constructor(canvas) {
    this.c = canvas; this.gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!this.gl) throw 0;
    const gl = this.gl;
    const vs = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
    const fs = `precision highp float;varying vec2 v;uniform sampler2D uA,uB;uniform float uP,uT,uVel,uGl;uniform vec2 uM,uR;
float h(float n){return fract(sin(n)*43758.5453);}float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 cv(vec2 uv,float ca){float ia=16./9.;vec2 s=ca>ia?vec2(1.,ia/ca):vec2(ca/ia,1.);return (uv-.5)*s+.5;}
void main(){float ca=uR.x/uR.y;vec2 uv=v+(uM-.5)*vec2(.018,.012);
float sl=floor(uv.y*30.);float r=h(sl*7.13+1.);
float e=uGl>.5?smoothstep(r*.7,r*.7+.28,uP):uP;if(uP>=1.)e=1.;if(uP<=0.)e=0.;
float g=e*(1.-e)*4.*uGl;
float band=step(.988-uVel*.35,h2(vec2(sl,floor(uT*6.)))) *uGl;
float dx=(h2(vec2(sl,floor(uT*13.)))-.5)*(g*.14+band*(.012+uVel*.06)+uVel*.008);
vec2 ua=cv(uv+vec2(dx,0.),ca),ub=cv(uv-vec2(dx,0.),ca);
float ab=.0012+g*.022+uVel*.01+band*.006;
vec3 a=vec3(texture2D(uA,ua+vec2(ab,0.)).r,texture2D(uA,ua).g,texture2D(uA,ua-vec2(ab,0.)).b);
vec3 b=vec3(texture2D(uB,ub+vec2(ab,0.)).r,texture2D(uB,ub).g,texture2D(uB,ub-vec2(ab,0.)).b);
vec3 c=mix(a,b,e);c+=h2(v*uR*.5+uT)*g*.4;
c*=1.-.07*(.5+.5*sin(v.y*uR.y*1.6));
float vg=smoothstep(1.25,.3,length((v-.5)*vec2(1.,.85)));c*=.5+.5*vg;
gl_FragColor=vec4(c,1.);}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(o); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {}; for (const n of ['uA', 'uB', 'uP', 'uT', 'uVel', 'uGl', 'uM', 'uR']) this.u[n] = gl.getUniformLocation(pr, n);
    this.tex = [this.mk(), this.mk()];
    gl.uniform1i(this.u.uA, 0); gl.uniform1i(this.u.uB, 1); gl.uniform1f(this.u.uGl, RM ? 0 : 1);
    this.p = 0; this.m = [.5, .5]; this.mt = [.5, .5]; this.vel = 0; this.velT = 0;
    this.resize(); addEventListener('resize', () => this.resize());
  }
  mk() { const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([7, 7, 7])); return t; }
  upload(slot, img) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + slot); gl.bindTexture(gl.TEXTURE_2D, this.tex[slot]); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img); }
  resize() { const d = Math.min(devicePixelRatio || 1, 1.5); this.c.width = Math.round(this.c.clientWidth * d); this.c.height = Math.round(this.c.clientHeight * d); this.gl.viewport(0, 0, this.c.width, this.c.height); this.gl.uniform2f(this.u.uR, this.c.width, this.c.height); }
  swap() { this.tex.reverse(); const gl = this.gl; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex[0]); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.tex[1]); this.p = 0; }
  draw(t) {
    const gl = this.gl; this.m[0] = lerp(this.m[0], this.mt[0], .06); this.m[1] = lerp(this.m[1], this.mt[1], .06); this.vel = lerp(this.vel, this.velT, .12); this.velT *= .9;
    gl.uniform1f(this.u.uP, this.p); gl.uniform1f(this.u.uT, t); gl.uniform1f(this.u.uVel, this.vel); gl.uniform2f(this.u.uM, this.m[0], this.m[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
const hero = {
  el: $('#hero'), num: $('#hero-num'), bar: $('#hero-bar'), fb: $('#hero-fallback'), cur: -1, next: -1, interval: 7.5, t0: 0, busy: false, visible: true,
  pick() { let i; do i = rnd(N); while (i === this.cur); return i; },
  imgSrc(i) { return innerWidth > 900 ? src.full(i) : src.t800(i); },
  async init() {
    try { this.sig = new Signal($('#signal')); } catch { this.el.classList.add('nogl'); }
    this.cur = this.pick();
    const first = await loadImg(this.imgSrc(this.cur));
    if (this.sig) { this.sig.upload(0, first); this.sig.upload(1, first); } else this.fb.src = first.src;
    this.setNum(this.cur); this.t0 = performance.now() / 1000; this.pre = this.preload();
    new IntersectionObserver(([e]) => this.visible = e.isIntersecting, { threshold: 0 }).observe(this.el);
    if (this.sig) {
      this.el.addEventListener('pointermove', e => { const r = this.el.getBoundingClientRect(); this.sig.mt = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; this.sig.velT = clamp(this.sig.velT + Math.hypot(e.movementX, e.movementY) / 900, 0, 1); }, { passive: true });
    }
    subs.add((dt, t) => this.tick(dt, t));
    $('#hero-open').addEventListener('click', () => viewer.open(this.cur, $('#signal')));
  },
  async preload() { this.next = this.pick(); try { return await loadImg(this.imgSrc(this.next)); } catch { return null; } },
  setNum(i) { const el = this.num; let k = 0; const id = setInterval(() => { el.textContent = k++ < 6 ? pad(rnd(N)) : pad(i); if (k > 6) clearInterval(id); }, 45); },
  async tick(dt, t) {
    if (!this.visible || document.hidden) return;
    const el = (t - this.t0) / this.interval;
    if (!this.busy) this.bar.style.transform = `scaleX(${clamp(el, 0, 1)})`;
    if (el >= 1 && !this.busy) {
      this.busy = true; const img = await this.pre; if (!img) { this.busy = false; this.t0 = t; this.pre = this.preload(); return; }
      if (this.sig) { this.sig.upload(1, img); const d = RM ? .8 : 1.15, s = performance.now(); await new Promise(r => { const step = () => { const q = Math.min(1, (performance.now() - s) / 1000 / d); this.sig.p = ease.inout(q); if (q >= .5 && this.num.dataset.i !== String(this.next)) { this.num.dataset.i = this.next; this.setNum(this.next); } q < 1 ? requestAnimationFrame(step) : r(); }; step(); }); this.sig.swap(); }
      else { this.fb.src = img.src; this.setNum(this.next); }
      this.cur = this.next; this.t0 = performance.now() / 1000; this.busy = false; this.pre = this.preload();
    }
    if (this.sig) this.sig.draw(t);
  }
};
hero.init();

/* ---------- ticker ---------- */
{
  const tr = $('#ticker'); const unit = `<span>We'll be right back</span><b>·</b><span>iamaWildAnimal.tv</span><b>·</b>`;
  tr.innerHTML = unit.repeat(6); const w = tr.scrollWidth; tr.innerHTML = unit.repeat(12);
  if (!RM) {
    const anim = tr.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${-w}px)` }], { duration: w / 70 * 1000, iterations: Infinity });
    let sk = 0; subs.add((dt, t, y, v) => { anim.playbackRate = 1 + Math.min(Math.abs(v) / 500, 5); sk = lerp(sk, clamp(v / 60, -14, 14), .1); tr.style.transform = ''; tr.parentElement.style.transform = `skewX(${sk}deg)`; });
  }
}

/* ---------- reels ---------- */
class Reel {
  constructor(el, items, dir) {
    this.el = el; this.items = items; this.dir = dir; this.pos = 0; this.v = 0; this.drift = 26 * dir; this.driftK = 1; this.nodes = new Map(); this.pool = []; this.hover = false; this.gap = 12;
    this.measure(); addEventListener('resize', () => this.measure());
    if (FINE) { el.addEventListener('pointerenter', () => this.hover = true); el.addEventListener('pointerleave', () => this.hover = false); }
    let sx = 0, sp = 0, moved = 0, lastX = 0, lastT = 0, active = false;
    el.addEventListener('pointerdown', e => { if (e.button) return; active = true; sx = lastX = e.clientX; sp = this.pos; moved = 0; lastT = performance.now(); this.v = 0; el.classList.add('drag'); el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (!active) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); this.pos = sp + dx; const now = performance.now(); const dtm = Math.max(1, now - lastT); this.v = lerp(this.v, (e.clientX - lastX) / dtm * 1000, .5); lastX = e.clientX; lastT = now; });
    const up = e => { if (!active) return; active = false; el.classList.remove('drag'); if (moved < 6) { const it = e.target.closest('.item'); if (it) viewer.open(+it.dataset.i, it); this.v = 0; } };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  measure() { this.h = this.el.clientHeight; this.w = this.el.clientWidth; this.cw = Math.round(this.h * 16 / 9); this.slot = this.cw + this.gap; this.total = this.items.length * this.slot; for (const n of this.nodes.values()) { n.style.height = this.h + 'px'; n.style.width = this.cw + 'px'; } }
  node(k) {
    let n = this.pool.pop(); if (!n) { n = document.createElement('div'); n.className = 'item'; n.appendChild(new Image()); }
    const i = this.items[k], im = n.firstChild; n.dataset.i = i; n.dataset.k = k; n.style.setProperty('--c', COLORS[i]); n.style.width = this.cw + 'px'; n.style.height = this.h + 'px';
    im.classList.remove('on'); im.onload = () => im.classList.add('on'); im.sizes = this.cw + 'px'; im.srcset = `${src.t400(i)} 400w, ${src.t800(i)} 800w`; im.src = src.t400(i); im.alt = ''; if (im.complete && im.naturalWidth) im.classList.add('on');
    this.el.appendChild(n); return n;
  }
  update(dt, y) {
    if (!this.h) return;
    this.driftK = lerp(this.driftK, this.hover ? 0 : 1, .08);
    if (!RM) this.pos += this.drift * this.driftK * dt;
    this.pos += this.v * dt; this.v *= Math.pow(.02, dt);
    const par = RM ? 0 : y * .28 * this.dir; const base = this.pos + par;
    const vis = new Set();
    for (let k = 0; k < this.items.length; k++) {
      let x = (k * this.slot + base) % this.total; if (x < 0) x += this.total; x -= this.slot;
      if (x > -this.slot && x < this.w) { vis.add(k); const n = this.nodes.get(k) || (this.nodes.set(k, this.node(k)), this.nodes.get(k)); n.style.transform = `translate3d(${x}px,0,0)`; }
    }
    for (const [k, n] of this.nodes) if (!vis.has(k)) { this.nodes.delete(k); n.remove(); this.pool.push(n); }
  }
}
const reels = { el: $('#reels'), list: [], on: false,
  init() {
    const rows = [...this.el.querySelectorAll('.reel')], per = Math.ceil(N / rows.length), all = shuffle([...Array(N).keys()]);
    rows.forEach((r, i) => { r.setAttribute('aria-hidden', 'true'); this.list.push(new Reel(r, all.slice(i * per, (i + 1) * per), +r.dataset.dir)); });
    new IntersectionObserver(([e]) => this.on = e.isIntersecting, { rootMargin: '200px' }).observe(this.el);
    subs.add((dt, t, y) => { if (!this.on || document.hidden) return; for (const r of this.list) r.update(dt, y); });
  } };
reels.init();

/* ---------- archive ---------- */
const archive = { grid: $('#grid'), order: shuffle([...Array(N).keys()]), cards: [],
  init() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '80px' });
    const frag = document.createDocumentFragment();
    for (let i = 0; i < N; i++) {
      const b = document.createElement('button'); b.className = 'card'; b.dataset.i = i; b.style.setProperty('--c', COLORS[i]); b.setAttribute('aria-label', `Screen ${i + 1}`);
      const im = new Image(); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 800; im.height = 450;
      b.append(im, Object.assign(document.createElement('i'), { textContent: pad(i + 1) }));
      b.addEventListener('click', () => viewer.open(i, b));
      this.cards[i] = b; frag.appendChild(b);
    }
    this.grid.appendChild(frag);
    this.apply();
    this.cards.forEach(b => io.observe(b));
    const h = $('#archive-title'); new IntersectionObserver(([e]) => { if (e.isIntersecting) { h.classList.add('in'); } }, { threshold: .4 }).observe(h);
    $('#count').innerHTML = String(N).split('').map((d, k) => `<i style="--k:${k}">${d}</i>`).join('');
    const btns = { 't-shuffle': () => shuffle([...Array(N).keys()]), 't-first': () => [...Array(N).keys()], 't-last': () => [...Array(N).keys()].reverse() };
    for (const id in btns) $('#' + id).addEventListener('click', () => { this.order = btns[id](); this.apply(); for (const k in btns) $('#' + k).setAttribute('aria-pressed', k === id); });
    $('#t-random').addEventListener('click', () => viewer.open(rnd(N), null));
  },
  apply() {
    const frag = document.createDocumentFragment();
    this.order.forEach((i, k) => { const b = this.cards[i]; const big = k % 9 === 4; b.classList.toggle('big', big); b.style.setProperty('--d', `${(k % 5) * .06}s`);
      const im = b.firstChild; const w = big ? 800 : 400; if (im.dataset.w !== String(w)) { im.dataset.w = w; im.sizes = big ? '(max-width:640px) 100vw, 44vw' : '(max-width:640px) 50vw, 22vw'; im.srcset = `${src.t400(i)} 400w, ${src.t800(i)} 800w`; im.src = src.t400(i); im.onload = () => im.classList.add('on'); if (im.complete && im.naturalWidth) im.classList.add('on'); }
      frag.appendChild(b); });
    this.grid.appendChild(frag);
  } };
archive.init();

/* ---------- jail teaser ---------- */
{
  const win = $('#jail-win'); const names = ['jail0', 'jail1', 'jail2', 'jail3', 'jail4', 'free0', 'free3', 'free7', 'free12', 'free15'];
  const imgs = names.map(n => { const im = new Image(); im.alt = ''; im.src = `media/jail/${n}.webp`; win.appendChild(im); return im; });
  let k = 0, on = false; imgs[0].classList.add('on');
  new IntersectionObserver(([e]) => on = e.isIntersecting).observe(win);
  setInterval(() => { if (!on || RM) return; imgs[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); }, 700);
}

/* ---------- viewer ---------- */
const viewer = {
  d: $('#viewer'), img: $('#v-img'), stage: $('#v-stage'), amb: $('#v-amb'), ambImg: $('#v-amb-img'), num: $('#v-num'), dl: $('#v-dl'), toast: $('#v-toast'),
  i: -1, pushed: false, s: 1, tx: 0, ty: 0, pts: new Map(), lastTap: 0,
  init() {
    $('#v-close').addEventListener('click', () => this.close());
    $('#v-prev').addEventListener('click', () => this.step(-1)); $('#v-next').addEventListener('click', () => this.step(1));
    $('#v-rand').addEventListener('click', () => this.show(rnd(N), 1));
    $('#v-link').addEventListener('click', async () => { try { await navigator.clipboard.writeText(this.url()); this.say('Link copied'); } catch { this.say(this.url()); } });
    if (navigator.share) { const b = $('#v-share'); b.hidden = false; b.addEventListener('click', () => navigator.share({ title: 'iamaWildAnimal', url: this.url() }).catch(() => {})); }
    this.d.addEventListener('cancel', e => { e.preventDefault(); this.close(); });
    this.d.addEventListener('click', e => { if (e.target === this.d || e.target === this.stage) this.close(); });
    addEventListener('keydown', e => {
      if (e.target.matches('input,textarea')) return;
      if (!this.d.open) { if (e.key === 'r' || e.key === 'R') this.open(rnd(N), null); return; }
      if (e.key === 'ArrowRight') this.step(1); else if (e.key === 'ArrowLeft') this.step(-1); else if (e.key === 'r' || e.key === 'R') this.show(rnd(N), 1); else if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    });
    addEventListener('popstate', () => { if (!(history.state && history.state.v != null) && this.d.open) { this.pushed = false; this.hide(); } else if (history.state && history.state.v != null && !this.d.open) { this.pushed = true; this.open(history.state.v, null, true); } });
    const st = this.stage;
    st.addEventListener('pointerdown', e => { st.setPointerCapture(e.pointerId); this.pts.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() }); if (this.pts.size === 2) { const [a, b] = [...this.pts.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: this.s }; } });
    st.addEventListener('pointermove', e => {
      const p = this.pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.pts.size === 2 && this.pinch) { const [a, b] = [...this.pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoomTo(clamp(this.pinch.s * d / this.pinch.d, 1, 5), (a.x + b.x) / 2, (a.y + b.y) / 2); }
      else if (this.s > 1) { this.tx += dx; this.ty += dy; this.applyT(); st.classList.add('drag'); }
    });
    const up = e => {
      const p = this.pts.get(e.pointerId); this.pts.delete(e.pointerId); st.classList.remove('drag'); if (!p || this.pts.size) { this.pinch = null; return; }
      const dx = e.clientX - p.sx, dy = e.clientY - p.sy, dt = performance.now() - p.t;
      if (this.s === 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 600) { this.step(dx < 0 ? 1 : -1); return; }
      if (this.s === 1 && dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.3 && dt < 600) { this.close(); return; }
      if (Math.hypot(dx, dy) < 8 && e.target === this.img) { const now = performance.now(); if (now - this.lastTap < 320) { this.zoomTo(this.s > 1 ? 1 : 2.6, e.clientX, e.clientY, true); this.lastTap = 0; } else this.lastTap = now; }
    };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    st.addEventListener('wheel', e => { e.preventDefault(); this.zoomTo(clamp(this.s * (e.deltaY < 0 ? 1.12 : .89), 1, 5), e.clientX, e.clientY); }, { passive: false });
    this.stage.addEventListener('click', e => { if (e.target === this.img) e.stopPropagation(); });
    const h = location.hash.match(/^#(?:s\/|jpg_image)(\d+)$/); if (h && +h[1] < N) this.open(+h[1], null);
  },
  url() { return `${location.origin}${location.pathname}#s/${this.i}`; },
  say(t) { this.toast.textContent = t; this.toast.classList.add('on'); clearTimeout(this.tt); this.tt = setTimeout(() => this.toast.classList.remove('on'), 1600); },
  set(i) {
    this.i = i; this.num.textContent = pad(i + 1); this.dl.href = src.full(i); this.dl.download = `brb-${pad(i + 1)}.jpg`;
    this.amb.style.setProperty('--c', COLORS[i]); this.ambImg.src = src.t400(i); this.resetZoom();
    history.replaceState({ v: i }, '', `#s/${i}`);
    for (const j of [i + 1, i - 1]) { const k = (j + N) % N; new Image().src = src.t800(k); }
  },
  load(i) { const im = this.img; im.src = src.t800(i); const full = new Image(); full.onload = () => { if (this.i === i) im.src = full.src; }; full.src = src.full(i); },
  open(i, from, silent) {
    if (!this.d.open) { this.d.showModal(); document.documentElement.classList.add('lock'); }
    if (!silent) { if (!this.pushed) { history.pushState({ v: i }, '', `#s/${i}`); this.pushed = true; } }
    this.set(i); this.load(i);
    if (from && !RM) this.flip(from); else this.img.style.opacity = 1;
  },
  target() { const r = this.stage.getBoundingClientRect(), cs = getComputedStyle(this.stage), px = parseFloat(cs.paddingLeft), py = parseFloat(cs.paddingTop); const W = r.width - px * 2, H = r.height - py * 2; let w = W, h = w * 9 / 16; if (h > H) { h = H; w = h * 16 / 9; } return { x: r.left + px + (W - w) / 2, y: r.top + py + (H - h) / 2, w, h }; },
  flip(from) {
    const a = from.getBoundingClientRect(), b = this.target(); const c = new Image(); c.className = 'flip'; c.src = src.t400(this.i); c.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transform-origin:0 0;`;
    document.body.appendChild(c); this.img.style.opacity = 0;
    const an = c.animate([{ transform: `translate(${a.left - b.x}px,${a.top - b.y}px) scale(${a.width / b.w},${a.height / b.h})` }, { transform: 'none' }], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    an.onfinish = () => { const done = () => { this.img.style.opacity = 1; setTimeout(() => c.remove(), 120); }; this.img.complete && this.img.naturalWidth ? done() : (this.img.onload = done, setTimeout(done, 1200)); };
  },
  step(dir) {
    const i = (this.i + dir + N) % N; this.show(i, dir);
  },
  show(i, dir) {
    if (RM) { this.set(i); this.load(i); return; }
    const im = this.img; im.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-28 * dir}px)`, opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
      this.set(i); this.load(i); im.animate([{ transform: `translateX(${28 * dir}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }).onfinish = () => { im.getAnimations().forEach(a => a.cancel()); im.style.opacity = 1; };
    };
  },
  resetZoom() { this.s = 1; this.tx = 0; this.ty = 0; this.stage.classList.remove('zoom'); this.img.style.transform = ''; },
  zoomTo(s, cx, cy, anim) {
    const r = this.img.getBoundingClientRect(); const ox = r.left - this.tx, oy = r.top - this.ty; const u = (cx - r.left) / this.s, v = (cy - r.top) / this.s;
    this.s = s; this.tx = cx - ox - u * s; this.ty = cy - oy - v * s; this.stage.classList.toggle('zoom', s > 1);
    if (s === 1) { this.tx = 0; this.ty = 0; } this.applyT(anim);
  },
  applyT(anim) {
    const im = this.img, st = this.stage.getBoundingClientRect(); const w0 = im.offsetWidth, h0 = im.offsetHeight, L = im.offsetLeft, T = im.offsetTop; const w = w0 * this.s, h = h0 * this.s;
    const minX = w > st.width ? st.width - L - w : (st.width - w) / 2 - L, maxX = w > st.width ? -L : minX; this.tx = clamp(this.tx, Math.min(minX, maxX), Math.max(minX, maxX));
    const minY = h > st.height ? st.height - T - h : (st.height - h) / 2 - T, maxY = h > st.height ? -T : minY; this.ty = clamp(this.ty, Math.min(minY, maxY), Math.max(minY, maxY));
    im.style.transition = anim ? 'transform .45s cubic-bezier(.16,1,.3,1)' : 'none'; im.style.transform = `translate(${this.tx}px,${this.ty}px) scale(${this.s})`;
  },
  close() { if (this.pushed) { history.back(); } else this.hide(); },
  hide() {
    if (!this.d.open) return;
    const card = archive.cards[this.i]; const r = card && card.getBoundingClientRect(); const vis = r && r.bottom > 0 && r.top < innerHeight && !RM;
    const finish = () => { this.d.close(); document.documentElement.classList.remove('lock'); this.img.src = ''; this.resetZoom(); };
    if (vis) { const b = this.target(), c = new Image(); c.className = 'flip'; c.src = src.t400(this.i); c.style.cssText = `left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;transform-origin:0 0;`; document.body.appendChild(c); this.d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }); c.animate([{ transform: 'none' }, { transform: `translate(${r.left - b.x}px,${r.top - b.y}px) scale(${r.width / b.w},${r.height / b.h})`, opacity: .2 }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }).onfinish = () => { c.remove(); finish(); this.d.getAnimations().forEach(a => a.cancel()); }; }
    else finish();
    this.pushed = false; history.replaceState(null, '', location.pathname + location.search);
  }
};
viewer.init();
