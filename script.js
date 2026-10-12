/* ============================================================
   EDIT EVERYTHING HERE ✏️  — all the words on the invitation
   ============================================================ */
const CONFIG = {
  name: "Claire",
  from: "Rong Da BBB",                // your signature
  dateLong: "Jeudi · 15 Octobre · 2026",
  dateShort: "Jeudi 15 octobre",
  tagline: "Lunch, bubbles & a little mystery.",

  letterGreeting: "Hey BB,",
  letter: [
    "All these years watching you grow and being a part of your life, I have learned so much from you and our friendship. I truly admire your strength and your grace, and how you always make space for the people that you love.",
    "I also want to give you lots of courage and encouragement for your new journey into motherhood. I know that being a mom is something you have always been looking forward to, and I hope that it is the most beautiful and fulfilling journey for you.",
    "I love you, and I will always be a part of your life."
  ],
  letterClose: "Love,",

  wishes: [
    { word: "Bonheur",      wish: "Happiness that shows up on ordinary days, not just the big ones." },
    { word: "Toi",          wish: "To love yourself as gently as you love everyone else." },
    { word: "Famille",      wish: "A home full of love, laughter, and your little one's giggles." },
    { word: "Petits riens", wish: "Tiny hands, warm tea, sleepy mornings. Notice every little thing." }
  ],

  brunch: {
    time: "13h00",
    venue: "Chez Suzette",
    address: "5 Teck Lim Rd, #01-01, Singapore 088383",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Chez+Suzette+5+Teck+Lim+Rd+Singapore+088383"
  },

  mystery: {
    headline: "Surprise !",
    clue: "Wear comfy clothes, and trust me.",
    farewell: "À jeudi, ma belle ♡"
  }
};

/* ============================================================ */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const get = (path) => path.split(".").reduce((o, k) => (o ? o[k] : ""), CONFIG);
const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

/* ---------- Fill content ---------- */
$$("[data-c]").forEach((el) => { el.textContent = get(el.dataset.c); });

let wordIndex = 0;
const letterEl = $("#letter");
CONFIG.letter.forEach((para) => {
  const p = document.createElement("p");
  para.split(" ").forEach((word, i, arr) => {
    const span = document.createElement("span");
    span.className = "w";
    span.style.setProperty("--i", wordIndex++);
    span.textContent = word;
    p.append(span, i < arr.length - 1 ? " " : "");
  });
  letterEl.append(p);
});
$("#signoff").style.setProperty("--base", `${wordIndex * 18 + 1000}ms`);
$("#from").style.setProperty("--base", `${wordIndex * 18 + 1700}ms`);

let suppressClick = false;
const tiles = $("#tiles");
CONFIG.wishes.forEach((w, i) => {
  const b = document.createElement("button");
  b.className = "tile";
  b.style.setProperty("--i", i);
  b.setAttribute("aria-pressed", "false");
  b.setAttribute("aria-label", `${w.word}: tap to reveal the wish`);
  b.innerHTML = `<span class="tile-in"><span class="tile-face tile-front"><svg></svg><span></span></span><span class="tile-face tile-back"><svg></svg><span></span></span></span>`;
  $(".tile-front > span", b).textContent = w.word;
  $(".tile-back > span", b).textContent = w.wish;
  b.addEventListener("click", () => {
    if (suppressClick) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on));
    if (on) {
      const r = b.getBoundingClientRect();
      FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 18, r.width * 0.45);
      Sfx.tap();
    }
  });
  tiles.append(b);
});

if (CONFIG.brunch.mapUrl) { const a = $("#maplink"); a.href = CONFIG.brunch.mapUrl; a.hidden = false; }

/* ---------- Hand-drawn decoration (redrawn to fit the screen) ---------- */
const pages = $$(".page");
const backSpots = [];
function drawAll() {
  pages.forEach((p, i) => {
    const w = p.clientWidth, h = p.clientHeight;
    const m = Draw.page($(".deco", p), p.dataset.deco, w, h);
    backSpots[i] = m.back || [40, 40];
    const c = $(".content", p);
    c.style.setProperty("--ps", `${Math.round(m.side)}px`);   // set width first so the height measure is right
    const hint = p.querySelector(".swipe-hint") ? 118 : 0;
    const pb = Math.max(m.bottom, hint);
    // centre the content in the viewport: equal top/bottom space whenever it still fits
    const sym = Math.max(m.top, pb), stackH = $(".stack", p).offsetHeight;
    const fits = stackH + sym * 2 <= h;
    c.style.setProperty("--pt", `${Math.round(fits ? sym : m.top)}px`);
    c.style.setProperty("--pb", `${Math.round(fits ? sym : pb)}px`);
    // sit the swipe hint in the middle of the empty paper below the content
    const hintEl = $(".swipe-hint", p);
    if (hintEl) {
      // clear of the content above and of the bottom artwork / nav below
      const st = $(".stack", p), below = st.offsetTop + st.offsetHeight;
      const limit = Math.min(h - 96, (m.decoTop || h) - 8);
      hintEl.style.top = `${Math.round(Math.max(below + 6, Math.min(limit - 22, (below + limit) / 2 - 11)))}px`;
    }
  });
  $$(".tile-face svg").forEach((svg, i) => {
    const f = svg.parentElement;
    Draw.frame(svg, f.offsetWidth, f.offsetHeight, 100 + i, i % 2 === 1);
  });
  const sc = $(".scratch");
  Draw.frame($(".scratch-frame"), sc.offsetWidth, sc.offsetHeight, 300, true);
}

/* ---------- Pages & navigation ---------- */
const dots = $("#dots"), prev = $("#prev");
let current = 0;

pages.forEach((p, i) => {
  const d = document.createElement("button");
  d.className = "dot";
  d.setAttribute("aria-label", `Page ${i + 1}`);
  d.addEventListener("click", () => go(i));
  dots.append(d);
});

function play(page) {
  page.classList.remove("play");
  void page.offsetWidth;
  page.classList.add("play");
}

function go(i, { animate = true } = {}) {
  const target = Math.max(0, Math.min(pages.length - 1, i));
  const changed = target !== current;
  current = target;
  pages.forEach((p, k) => {
    p.dataset.pos = k < current ? "prev" : k > current ? "next" : "cur";
    p.inert = k !== current;
    p.setAttribute("aria-hidden", String(k !== current));
    p.style.zIndex = k;
  });
  $$(".dot", dots).forEach((d, k) => d.setAttribute("aria-current", String(k === current)));
  prev.hidden = current === 0;   // back arrow on every page after the cover
  const bp = backSpots[current];
  if (bp) { prev.style.setProperty("--bx", `${bp[0]}px`); prev.style.setProperty("--by", `${bp[1]}px`); }
  if (animate && (changed || !pages[current].classList.contains("play"))) play(pages[current]);
}

prev.addEventListener("click", () => go(current - 1));
document.addEventListener("keydown", (e) => {
  if (!opened) return;
  if (e.key === "ArrowRight") go(current + 1);
  if (e.key === "ArrowLeft") go(current - 1);
});

// swipe left = forward, swipe right = back — touch, mouse drag and trackpad
let sx = 0, sy = 0, tracking = false;
const book = $("#book");
const ignoreSwipe = (t) => t.closest && t.closest("#scratch");
function endSwipe(x, y) {
  if (!tracking) return;
  tracking = false;
  const dx = x - sx, dy = y - sy;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 80);
    go(current + (dx < 0 ? 1 : -1));
  }
}
// touch events are not cancelled by the browser's scroll detection the way pointer events are
book.addEventListener("touchstart", (e) => {
  if (ignoreSwipe(e.target) || e.touches.length > 1) return;
  tracking = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
}, { passive: true });
book.addEventListener("touchend", (e) => { const t = e.changedTouches[0]; endSwipe(t.clientX, t.clientY); }, { passive: true });
book.addEventListener("touchcancel", (e) => { const t = e.changedTouches[0]; endSwipe(t.clientX, t.clientY); }, { passive: true });
// mouse drag on desktop
book.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" || ignoreSwipe(e.target)) return;
  tracking = true; sx = e.clientX; sy = e.clientY;
});
book.addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") endSwipe(e.clientX, e.clientY); });
// two-finger trackpad swipe on a Mac
let wheelX = 0, wheelLock = 0;
book.addEventListener("wheel", (e) => {
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
  e.preventDefault();
  if (Date.now() < wheelLock) return;
  wheelX += e.deltaX;
  if (Math.abs(wheelX) > 60) { go(current + (wheelX > 0 ? 1 : -1)); wheelX = 0; wheelLock = Date.now() + 700; }
}, { passive: false });

/* ---------- Particles: sparkles, glitter & confetti ---------- */
const FX = (() => {
  const cv = $("#fx"), cx = cv.getContext("2d");
  const GOLD = ["#FFF6DD", "#FFE2A3", "#F7C873", "#FFFFFF", "#FFD1C8"];
  const CONF = ["#C9483F", "#E8A197", "#FBF3EA", "#E8C07A", "#F5D5CC"];
  let parts = [], running = false, W = 0, H = 0;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", size);

  function star(x, y, s, a) {
    cx.globalAlpha = a;
    const g = cx.createRadialGradient(x, y, 0, x, y, s * 2.2);
    g.addColorStop(0, "rgba(255,240,200,.9)"); g.addColorStop(1, "rgba(255,210,150,0)");
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, s * 2.2, 0, 7); cx.fill();
    cx.fillStyle = "#fff";
    cx.beginPath();
    cx.moveTo(x, y - s); cx.quadraticCurveTo(x, y, x + s, y); cx.quadraticCurveTo(x, y, x, y + s);
    cx.quadraticCurveTo(x, y, x - s, y); cx.quadraticCurveTo(x, y, x, y - s);
    cx.fill();
  }
  function heart(x, y, s) {
    cx.beginPath(); cx.moveTo(x, y - s * 0.2);
    cx.bezierCurveTo(x, y - s * 0.5, x - s / 2, y - s * 0.5, x - s / 2, y - s * 0.2);
    cx.bezierCurveTo(x - s / 2, y + s * 0.1, x, y + s * 0.25, x, y + s * 0.5);
    cx.bezierCurveTo(x, y + s * 0.25, x + s / 2, y + s * 0.1, x + s / 2, y - s * 0.2);
    cx.bezierCurveTo(x + s / 2, y - s * 0.5, x, y - s * 0.5, x, y - s * 0.2);
    cx.fill();
  }

  function add(p) { parts.push(Object.assign({ age: 0, life: 60, g: 0, drag: 0.98, r: 0, vr: 0, a: 1 }, p)); if (!running) { running = true; requestAnimationFrame(tick); } }

  function tick() {
    cx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => p.age < p.life && p.y < H + 60);
    for (const p of parts) {
      p.age++;
      if (p.orbit) {                       // swirling around a point, slowly spiralling out
        p.ang += p.av; p.rad += p.rv;
        p.x = p.ox + Math.cos(p.ang) * p.rad; p.y = p.oy + Math.sin(p.ang) * p.rad * 0.8;
      } else {
        p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      }
      const t = p.age / p.life, fade = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.6) / 0.4);
      if (p.kind === "star") {
        cx.globalCompositeOperation = "lighter";
        star(p.x, p.y, p.s * (0.75 + 0.25 * Math.sin(p.age * 0.5 + p.ph)), fade * p.a);
        cx.globalCompositeOperation = "source-over";
      } else if (p.kind === "glitter") {
        cx.globalAlpha = fade * (0.5 + 0.5 * Math.sin(p.age * 0.7 + p.ph));
        cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s);
      } else {
        cx.globalAlpha = Math.min(1, (p.life - p.age) / 30);
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
        if (p.kind === "heart") heart(0, 0, p.s);
        else if (p.kind === "dot") { cx.beginPath(); cx.arc(0, 0, p.s / 3, 0, 7); cx.fill(); }
        else cx.fillRect(-p.s / 2, -p.s / 6, p.s, p.s / 3);
        cx.restore();
      }
    }
    cx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; cx.clearRect(0, 0, W, H); }
  }

  const R = Math.random;
  return {
    orbit(x, y, n, r0) {
      if (reduceMotion) return;
      for (let i = 0; i < n; i++) add({ kind: "star", orbit: true, ox: x, oy: y, ang: R() * 6.28, rad: r0 * (0.6 + R() * 0.6), av: 0.05 + R() * 0.05, rv: 0.25 + R() * 0.5, s: 3 + R() * 5, ph: R() * 6, life: 50 + R() * 40, x, y });
    },
    sparkle(x, y, n, spread = 30) {
      if (reduceMotion) return;
      for (let i = 0; i < n; i++) {
        const a = R() * 6.28, v = 1 + R() * 5;
        add({ kind: "star", x: x + Math.cos(a) * spread * R(), y: y + Math.sin(a) * spread * R(), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.03, drag: 0.95, s: 2.5 + R() * 6, ph: R() * 6, life: 45 + R() * 45 });
      }
    },
    glitter(x, y, w, n) {
      if (reduceMotion) return;
      for (let i = 0; i < n; i++) add({ kind: "glitter", x: x + (R() - 0.5) * w, y, vx: (R() - 0.5) * 2, vy: -2 - R() * 6, g: 0.05, drag: 0.985, s: 1 + R() * 2.4, c: GOLD[(R() * GOLD.length) | 0], ph: R() * 6, life: 70 + R() * 60 });
    },
    confetti(x, y, n, power = 1) {
      if (reduceMotion) return;
      for (let i = 0; i < n; i++) {
        const a = R() * 6.28, v = (2 + R() * 8) * power, k = R();
        add({ kind: k < 0.45 ? "heart" : k < 0.75 ? "dot" : "strip", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5 * power, g: 0.22, drag: 0.985, r: R() * 6, vr: (R() - 0.5) * 0.3, s: 7 + R() * 8, c: CONF[(R() * CONF.length) | 0], life: 400 });
      }
    }
  };
})();

/* ---------- The magical seal opening ---------- */
const intro = $("#intro"), seal = $("#seal");
let opened = false;
document.body.classList.add("intro-on");

const anim = (el, frames, opts) => (reduceMotion || !el.animate ? null : el.animate(frames, Object.assign({ fill: "forwards", easing: "cubic-bezier(.3,.7,.2,1)" }, opts)));

async function openSeal() {
  if (opened) return;
  opened = true;
  Sfx.magic();
  intro.classList.add("opening-start");
  const sr = seal.getBoundingClientRect(), scx = sr.left + sr.width / 2, scy = sr.top + sr.height / 2;

  // 1 · the seal awakens: pulse, warm glow, sparkles swirl in
  anim(seal, [{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1.08)" }], { duration: 420 });
  anim($("#glow"), [{ opacity: 0, transform: "scale(.2)" }, { opacity: 0.9, transform: "scale(.6)" }], { duration: 500 });
  FX.orbit(scx, scy, 36, sr.width * 0.5);
  await wait(380);

  // 2 · a golden crack runs through the wax
  anim($(".seal-crack"), [{ opacity: 0, strokeDashoffset: 1 }, { opacity: 1, strokeDashoffset: 0 }], { duration: 260, easing: "ease-in" });
  await wait(280);

  // 3 · the seal breaks, light bursts out
  const flyL = anim($(".seal-half--l"), [{ transform: "none", opacity: 1 }, { transform: "translate(-70%, 30%) rotate(-38deg)", opacity: 1, offset: 0.55 }, { transform: "translate(-120%, 160%) rotate(-70deg)", opacity: 0 }], { duration: 1100, easing: "cubic-bezier(.2,.6,.4,1)" });
  anim($(".seal-half--r"), [{ transform: "none", opacity: 1 }, { transform: "translate(70%, 26%) rotate(42deg)", opacity: 1, offset: 0.55 }, { transform: "translate(120%, 150%) rotate(80deg)", opacity: 0 }], { duration: 1100, easing: "cubic-bezier(.2,.6,.4,1)" });
  anim($(".seal-crack"), [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
  anim($("#rays"), [{ opacity: 0, transform: "scale(.3) rotate(0deg)" }, { opacity: 1, transform: "scale(1) rotate(40deg)", offset: 0.3 }, { opacity: 0, transform: "scale(1.4) rotate(120deg)" }], { duration: 2200, easing: "ease-out" });
  anim($("#glow"), [{ opacity: 0.9, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1.1)", offset: 0.25 }, { opacity: 0, transform: "scale(1.5)" }], { duration: 1800, easing: "ease-out" });
  FX.sparkle(scx, scy, 70, 20);
  if (!flyL) seal.style.opacity = 0;
  await wait(220);

  // 4 · the flap lifts, glitter spills out of the envelope
  intro.classList.add("opening");
  await wait(520);
  const er = $("#env").getBoundingClientRect();
  FX.glitter(er.left + er.width / 2, er.top + er.height * 0.15, er.width * 0.7, 110);

  // 5 · the card rises out in a glow
  intro.classList.add("rising");
  await wait(500);
  const cr = $("#envCard").getBoundingClientRect();
  FX.sparkle(cr.left + cr.width / 2, cr.top + cr.height * 0.4, 40, cr.width * 0.5);
  await wait(800);

  // 6 · bloom of light, and we're inside
  const flash = $("#flash");
  anim(flash, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: "ease-in" });
  intro.classList.add("zoom");
  await wait(430);
  intro.classList.add("gone");
  document.body.classList.remove("intro-on");
  go(0);
  anim(flash, [{ opacity: 1 }, { opacity: 0 }], { duration: 900, easing: "ease-out" });
  FX.confetti(innerWidth / 2, innerHeight * 0.35, 80, 1);
  FX.sparkle(innerWidth / 2, innerHeight * 0.4, 40, innerWidth * 0.4);
}
seal.addEventListener("click", openSeal);

/* ---------- Scratch card ---------- */
const sc = $("#scratch");
const sctx = sc.getContext("2d", { willReadFrequently: true });
const paperImg = new Image();
paperImg.src = "assets/paper.jpg?v=2";
let revealed = false, scratching = false, last = null, moves = 0;

function paintScratch() {
  if (revealed) return;
  const w = sc.offsetWidth, h = sc.offsetHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  sc.width = w * dpr; sc.height = h * dpr;
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.globalCompositeOperation = "source-over";
  sctx.fillStyle = "#EDB2A8"; sctx.fillRect(0, 0, w, h);
  if (paperImg.complete && paperImg.naturalWidth) {
    sctx.globalCompositeOperation = "multiply";
    sctx.fillStyle = sctx.createPattern(paperImg, "repeat");
    sctx.fillRect(0, 0, w, h);
    sctx.globalCompositeOperation = "source-over";
  }
  const g = sctx.createLinearGradient(0, 0, w, h);   // foil-like sheen
  g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.45, "rgba(255,240,230,.35)"); g.addColorStop(0.55, "rgba(255,255,255,0)");
  sctx.fillStyle = g; sctx.fillRect(0, 0, w, h);
  sctx.fillStyle = "#B9443D";
  sctx.textAlign = "center"; sctx.textBaseline = "middle";
  sctx.font = `400 ${Math.round(h * 0.24)}px Playball, cursive`;
  sctx.fillText("gratte ici", w / 2, h * 0.44);
  sctx.font = `500 ${Math.round(h * 0.085)}px "EB Garamond", serif`;
  sctx.fillText("S C R A T C H   M E", w / 2, h * 0.74);
  sctx.globalCompositeOperation = "destination-out";
  sctx.lineCap = "round"; sctx.lineJoin = "round";
  sctx.lineWidth = Math.max(28, w * 0.13);
}
function scratchPos(e) {
  const r = sc.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (sc.offsetWidth / r.width), y: (e.clientY - r.top) * (sc.offsetHeight / r.height), cx: e.clientX, cy: e.clientY };
}
function scratchTo(p) {
  sctx.beginPath(); sctx.moveTo(last.x, last.y); sctx.lineTo(p.x + 0.01, p.y); sctx.stroke();
  last = p;
  if (++moves % 4 === 0) FX.sparkle(p.cx, p.cy, 1, 4);
  if (moves % 8 === 0) checkCleared();
}
function checkCleared() {
  let data;
  try { data = sctx.getImageData(0, 0, sc.width, sc.height).data; }
  catch (e) { if (moves > 120) reveal(); return; }   // opened from a file:// path: count strokes instead
  let clear = 0, total = 0;
  for (let i = 3; i < data.length; i += 4 * 24) { total++; if (data[i] < 20) clear++; }
  if (clear / total > 0.45) reveal();
}
function reveal() {
  if (revealed) return;
  revealed = true;
  sc.classList.add("gone");
  const r = sc.getBoundingClientRect();
  FX.confetti(r.left + r.width / 2, r.top + r.height / 2, 110);
  FX.sparkle(r.left + r.width / 2, r.top + r.height / 2, 40, r.width / 2);
  Sfx.twinkle();
}
sc.addEventListener("pointerdown", (e) => {
  if (revealed) return;
  scratching = true; sc.setPointerCapture(e.pointerId);
  last = scratchPos(e); scratchTo(last);
});
sc.addEventListener("pointermove", (e) => { if (scratching) scratchTo(scratchPos(e)); });
["pointerup", "pointercancel"].forEach((t) => sc.addEventListener(t, () => { scratching = false; if (!revealed) checkCleared(); }));
sc.tabIndex = 0;
sc.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") reveal(); });

/* ---------- Boot ---------- */
Draw.stamp($("#stamp"));
Draw.food($("#food"));
const ec = $("#envCard");
const drawEnvCard = () => Draw.frame($("#envCardFrame"), ec.offsetWidth, ec.offsetHeight, 77, false);
drawEnvCard();
addEventListener("resize", drawEnvCard);
const drawBackdrop = () => Draw.backdrop($("#introDeco"), innerWidth, innerHeight);
drawBackdrop();
addEventListener("resize", drawBackdrop);
Draw.postmark($("#postmark"), "JOYEUX ANNIVERSAIRE · BISOUS · ");
go(0, { animate: false });
drawAll();
paintScratch();
paperImg.onload = paintScratch;
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { drawAll(); paintScratch(); go(current, { animate: false }); });
let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { drawAll(); paintScratch(); go(current, { animate: false }); }, 200); });
