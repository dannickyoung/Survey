/* Hand-drawn ink & watercolour engine.
   Everything is generated as SVG from a seed, so it looks sketched but stays identical on every redraw. */
const Draw = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#8F2A27";
  const WASH = "#E8A197";
  const STRIPE = "#F0BDB3";
  const RIBBON_FRONT = "#FFF4EE";
  const RIBBON_BACK = "#F6D0C7";

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // smooth 1-D noise: a few sines with random phase
  function wave(r, amp, scale) {
    const c = [1, 2.3, 5.1].map((k, i) => ({ f: k / scale, p: r() * 6.283, a: amp / (i + 1) }));
    return (s) => c.reduce((v, q) => v + q.a * Math.sin(s * q.f * 6.283 + q.p), 0);
  }
  const P = (p) => p[0].toFixed(1) + "," + p[1].toFixed(1);
  function smooth(pts, closed = false) {
    if (pts.length < 2) return "";
    const Q = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = "M" + P(Q[1]);
    for (let i = 1; i < Q.length - 2; i++) {
      const [p0, p1, p2, p3] = [Q[i - 1], Q[i], Q[i + 1], Q[i + 2]];
      d += "C" + P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) + " " +
        P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) + " " + P(p2);
    }
    return closed ? d + "Z" : d;
  }
  const poly = (pts, close = true) => "M" + pts.map(P).join("L") + (close ? "Z" : "");
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // shared SVG filters, injected once
  function defs(svg) {
    const d = el("defs", {}, svg);
    d.innerHTML = `
      <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="8" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="wc" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="3" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" result="g"/>
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.35" result="ga"/>
        <feComposite in="d" in2="ga" operator="in"/>
      </filter>`;
  }

  // a straight stroke drawn by hand: wobbles, and overshoots its ends a little
  function handLine(a, b, r, amp = 1.1) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const s0 = -(2 + r() * 6), s1 = L + 2 + r() * 6;
    const w = wave(r, amp, 160), n = Math.max(3, Math.round((s1 - s0) / 16)), pts = [];
    for (let i = 0; i <= n; i++) {
      const s = s0 + ((s1 - s0) * i) / n, o = w(s);
      pts.push([a[0] + ux * s + nx * o, a[1] + uy * s + ny * o]);
    }
    return pts;
  }

  function rectPts(x0, y0, x1, y1, r, amp) {
    const w = wave(r, amp, 220), pts = [];
    const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    let s = 0;
    for (let k = 0; k < 4; k++) {
      const a = corners[k], b = corners[(k + 1) % 4], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(2, Math.round(L / 24)), nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      for (let i = 0; i < n; i++) {
        const t = i / n, o = w(s + t * L);
        pts.push([a[0] + (b[0] - a[0]) * t + nx * o, a[1] + (b[1] - a[1]) * t + ny * o]);
      }
      s += L;
    }
    return pts;
  }

  // watercolour band + double ink rule, like a hand-painted card border
  function border(g, x0, y0, x1, y1, seed, { band = 16, ink = true, wash = true, weight = 1 } = {}) {
    const r = rng(seed);
    if (wash) {
      const wg = el("g", { filter: "url(#wc)", opacity: 0.62 }, g);
      el("path", { d: smooth(rectPts(x0, y0, x1, y1, r, 1.6), true), fill: "none", stroke: WASH, "stroke-width": band, "stroke-linejoin": "round" }, wg);
      el("path", { d: smooth(rectPts(x0 + 1, y0 + 1, x1 - 1, y1 - 1, r, 2.2), true), fill: "none", stroke: WASH, "stroke-width": band * 0.6, opacity: 0.5 }, wg);
    }
    if (ink) {
      const ig = el("g", { filter: "url(#ink)", fill: "none", stroke: INK, "stroke-linecap": "round" }, g);
      const i1 = band / 2, i2 = band / 2 + 5;
      [[i1, 1.5 * weight, 1], [i2, 0.75 * weight, 0.7]].forEach(([i, sw, op]) => {
        const a = [x0 + i, y0 + i], b = [x1 - i, y0 + i], c = [x1 - i, y1 - i], d = [x0 + i, y1 - i];
        [[a, b], [b, c], [c, d], [d, a]].forEach(([p, q]) =>
          el("path", { d: smooth(handLine(p, q, r)), "stroke-width": sw, opacity: op }, ig));
      });
    }
  }

  // wobbly watercolour stripes; optional mask cut-out
  function stripes(g, w, h, seed, { width = 26, gap = 26, maskId, color = STRIPE, opacity = 0.7 } = {}) {
    const r = rng(seed);
    const sg = el("g", { filter: "url(#wc)", opacity, fill: color }, g);
    if (maskId) sg.setAttribute("mask", `url(#${maskId})`);
    for (let x = -width / 2; x < w + width; x += width + gap) {
      const wl = wave(r, 1.6, 300), wr = wave(r, 1.6, 300), L = [], R = [];
      for (let y = -10; y <= h + 10; y += 30) { L.push([x + wl(y), y]); R.unshift([x + width + wr(y), y]); }
      el("path", { d: smooth([...L, ...R], true) }, sg);
    }
  }

  /* ---------- Ribbons ---------- */
  function sampleBeziers(segs, scale = 1, ox = 0, oy = 0, step = 3) {
    const pts = [];
    segs.forEach(([p0, c1, c2, p3], si) => {
      const est = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]) * scale * 1.4 + 10;
      const n = Math.max(6, Math.ceil(est / step));
      for (let i = si ? 1 : 0; i <= n; i++) {
        const t = i / n, u = 1 - t;
        const x = u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0];
        const y = u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1];
        pts.push([ox + x * scale, oy + y * scale]);
      }
    });
    return pts;
  }
  function normals(pts) {
    return pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    });
  }
  function arc(pts) {
    const s = [0];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return s.map((v) => v / s[s.length - 1]);
  }

  // A flat satin ribbon that twists: width follows |cos|, back side shown where it flips.
  function ribbon(g, pts, W, { twists = 1.5, phase = 0, taperIn = 0.2, vcut = true, closed = false, widthFn } = {}) {
    const N = normals(pts), T = arc(pts);
    const raw = T.map((t) => Math.cos(Math.PI * twists * t + phase));
    const wid = T.map((t, i) => {
      let w = W * (0.12 + 0.88 * Math.abs(raw[i]));
      if (widthFn) w *= widthFn(t);
      else if (taperIn) w *= Math.min(1, 0.35 + t / taperIn * 0.65);
      return w;
    });
    const L = pts.map((p, i) => [p[0] + N[i][0] * wid[i] / 2, p[1] + N[i][1] * wid[i] / 2]);
    const R = pts.map((p, i) => [p[0] - N[i][0] * wid[i] / 2, p[1] - N[i][1] * wid[i] / 2]);
    const rg = el("g", {}, g);
    if (closed) {
      el("path", { d: poly(L) + poly(R), "fill-rule": "evenodd", fill: RIBBON_FRONT }, rg);
    } else {
      const end = pts[pts.length - 1], en = N[N.length - 1];
      const tx = en[1], ty = -en[0];
      const notch = vcut ? [[end[0] - tx * W * 0.5, end[1] - ty * W * 0.5]] : [];
      el("path", { d: poly([...L, ...notch, ...R.slice().reverse()]), fill: RIBBON_FRONT }, rg);
      if (vcut) el("path", { d: poly([L[L.length - 1], notch[0], R[R.length - 1]], false), fill: "none", stroke: INK, "stroke-width": 1.2, "stroke-linejoin": "round" }, rg);
    }
    // shade the reverse side of the satin
    let start = -1;
    for (let i = 0; i <= raw.length; i++) {
      const back = i < raw.length && raw[i] < 0;
      if (back && start < 0) start = i;
      if (!back && start >= 0) {
        const a = Math.max(0, start - 1), b = Math.min(raw.length - 1, i);
        el("path", { d: poly([...L.slice(a, b + 1), ...R.slice(a, b + 1).reverse()]), fill: RIBBON_BACK }, rg);
        // a few hatch lines on the shadowed side
        for (let k = a + 3; k < b - 2; k += 5) {
          const m = 0.25;
          el("path", { d: poly([[L[k][0] * (1 - m) + R[k][0] * m, L[k][1] * (1 - m) + R[k][1] * m], [L[k][0] * m + R[k][0] * (1 - m), L[k][1] * m + R[k][1] * (1 - m)]], false), stroke: INK, "stroke-width": 0.5, opacity: 0.55 }, rg);
        }
        start = -1;
      }
    }
    const sw = { fill: "none", stroke: INK, "stroke-width": 1.35, "stroke-linecap": "round", "stroke-linejoin": "round" };
    el("path", { d: smooth(L, closed), ...sw }, rg);
    el("path", { d: smooth(R, closed), ...sw }, rg);
    if (!closed && !vcut) el("path", { d: poly([L[L.length - 1], R[R.length - 1]], false), ...sw }, rg);
  }

  const BOW = {
    loopL: [[[0, 0], [-22, -40], [-82, -36], [-74, -2]], [[-74, -2], [-68, 26], [-24, 16], [0, 0]]],
    tailL: [[[-2, 4], [-8, 30], [-36, 48], [-28, 80]], [[-28, 80], [-22, 100], [-42, 114], [-50, 130]]],
    tailR: [[[2, 4], [12, 34], [34, 54], [26, 86]], [[26, 86], [20, 106], [42, 120], [54, 134]]],
  };
  const mirror = (segs) => segs.map((s) => s.map(([x, y]) => [-x, y]));

  function bow(g, cx, cy, s, seed = 1) {
    const r = rng(seed);
    const bg = el("g", { filter: "url(#ink)" }, g);
    ribbon(bg, sampleBeziers(BOW.tailL, s, cx, cy), 15 * s, { twists: 1.3, phase: 0.3 + r() * 0.4 });
    ribbon(bg, sampleBeziers(BOW.tailR, s, cx, cy), 15 * s, { twists: 1.1, phase: -0.2 + r() * 0.4 });
    const loopW = (t) => 0.35 + 0.65 * Math.sin(Math.PI * t);
    ribbon(bg, sampleBeziers(BOW.loopL, s, cx, cy), 17 * s, { twists: 0, closed: true, widthFn: loopW });
    ribbon(bg, sampleBeziers(mirror(BOW.loopL), s, cx, cy), 17 * s, { twists: 0, closed: true, widthFn: loopW });
    // fold creases inside the loops
    const crease = { fill: "none", stroke: INK, "stroke-width": 0.8, "stroke-linecap": "round", opacity: 0.8 };
    el("path", { d: smooth(sampleBeziers([[[-8, -2], [-22, -14], [-40, -16], [-52, -10]]], s, cx, cy)), ...crease }, bg);
    el("path", { d: smooth(sampleBeziers([[[8, -2], [22, -14], [40, -16], [52, -10]]], s, cx, cy)), ...crease }, bg);
    // knot
    const k = [];
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.push([cx + Math.cos(a) * 9 * s * (1 + (r() - 0.5) * 0.12), cy + 1 * s + Math.sin(a) * 8 * s]); }
    el("path", { d: smooth(k, true), fill: RIBBON_FRONT, stroke: INK, "stroke-width": 1.35 }, bg);
    el("path", { d: smooth([[cx - 4 * s, cy - 5 * s], [cx - 2 * s, cy + 1 * s], [cx - 4 * s, cy + 7 * s]]), ...crease }, bg);
    el("path", { d: smooth([[cx + 4 * s, cy - 5 * s], [cx + 2 * s, cy + 1 * s], [cx + 4 * s, cy + 7 * s]]), ...crease }, bg);
  }

  // ribbon swags draped from the corners into a bow (cover & brunch)
  function garland(g, w, h, seed, { bottom = true } = {}) {
    const s = Math.min(1.1, w / 380);
    const top = 64 * s + 6;
    const rg = el("g", { filter: "url(#ink)" }, g);
    const swagL = [[[-30, 40], [w * 0.12, 175 * s], [w * 0.34, 40 * s], [w / 2 - 6, top]]];
    const swagR = [[[w + 30, 40], [w * 0.88, 175 * s], [w * 0.66, 40 * s], [w / 2 + 6, top]]];
    ribbon(rg, sampleBeziers(swagL), 14 * s, { twists: 2.4, phase: 0.5, taperIn: 0 });
    ribbon(rg, sampleBeziers(swagR), 14 * s, { twists: 2.4, phase: 1.1, taperIn: 0 });
    bow(g, w / 2, top, 0.95 * s, seed);
    if (bottom) {
      const by = h - 150 * s;
      const lowL = [[[w / 2 - 4, by], [w * 0.3, h - 20], [w * 0.1, h - 170 * s], [-30, h - 60 * s]]];
      const lowR = [[[w / 2 + 4, by], [w * 0.7, h - 20], [w * 0.9, h - 170 * s], [w + 30, h - 60 * s]]];
      ribbon(rg, sampleBeziers(lowL), 12 * s, { twists: 2.2, phase: 0.2, taperIn: 0 });
      ribbon(rg, sampleBeziers(lowR), 12 * s, { twists: 2.2, phase: 0.9, taperIn: 0 });
      bow(g, w / 2, by, 0.62 * s, seed + 9);
    }
    return { top: top + 120 * s, bottom: bottom ? 175 * s : 40, decoTop: bottom ? h - 150 * s - 40 * s : h };
  }

  // scalloped cartouche panel (like a menu card), returns its path
  function cartouche(x0, y0, x1, y1, seed, rad = 26) {
    const r = rng(seed), w = wave(r, 1.3, 200), pts = [];
    const mx = (x0 + x1) / 2, bump = 14;
    const edge = (ax, ay, bx, by, bulge) => {
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(4, Math.round(L / 14));
      for (let i = 0; i < n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const b = bulge ? bulge * Math.exp(-Math.pow((t - 0.5) / 0.13, 2)) : 0;
        pts.push([x + (by === ay ? 0 : b) + w(pts.length * 9), y + (by === ay ? b : 0) + w(pts.length * 9 + 50)]);
      }
    };
    const corner = (cx, cy, a0, a1) => { for (let i = 0; i < 6; i++) { const a = a0 + (a1 - a0) * (i / 6); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } };
    edge(x0 + rad, y0, x1 - rad, y0, -bump);
    corner(x1, y0, Math.PI, Math.PI / 2);
    edge(x1, y0 + rad, x1, y1 - rad, 0);
    corner(x1, y1, -Math.PI / 2, -Math.PI);
    edge(x1 - rad, y1, x0 + rad, y1, bump);
    corner(x0, y1, 0, -Math.PI / 2);
    edge(x0, y1 - rad, x0, y0 + rad, 0);
    corner(x0, y0, Math.PI / 2, 0);
    return smooth(pts, true);
  }

  // hand-painted gingham tablecloth: overlapping watercolour bands make the darker checks
  function gingham(g, w, h, seed, { size = 30, color = "#D7675D", maskId } = {}) {
    const r = rng(seed);
    const gg = el("g", { filter: "url(#wc)", fill: color }, g);
    if (maskId) gg.setAttribute("mask", `url(#${maskId})`);
    for (let x = -size / 2; x < w + size; x += size * 2) {
      const a = wave(r, 1.4, 260), b = wave(r, 1.4, 260), L = [], R = [];
      for (let y = -10; y <= h + 10; y += 30) { L.push([x + a(y), y]); R.unshift([x + size + b(y), y]); }
      el("path", { d: smooth([...L, ...R], true), opacity: 0.3 }, gg);
    }
    for (let y = -size / 2; y < h + size; y += size * 2) {
      const a = wave(r, 1.4, 260), b = wave(r, 1.4, 260), T = [], B = [];
      for (let x = -10; x <= w + 10; x += 30) { T.push([x, y + a(x)]); B.unshift([x, y + size + b(x)]); }
      el("path", { d: smooth([...T, ...B], true), opacity: 0.3 }, gg);
    }
  }

  // bistro menu card with an arched top
  function archCard(x0, y0, x1, y1, seed) {
    const r = rng(seed), w = wave(r, 1.2, 180), pts = [];
    const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ry = rx * 0.62, top = y0 + ry;
    for (let i = 0; i <= 28; i++) { const a = Math.PI + (Math.PI * i) / 28; pts.push([cx + Math.cos(a) * rx, top + Math.sin(a) * ry]); }
    const side = (ax, ay, bx, by) => { const n = Math.max(3, Math.round(Math.hypot(bx - ax, by - ay) / 18)); for (let i = 1; i <= n; i++) pts.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]); };
    side(x1, top, x1, y1); side(x1, y1, x0, y1); side(x0, y1, x0, top);
    return smooth(pts.map((p, i) => [p[0] + w(i * 11), p[1] + w(i * 11 + 70)]), true);
  }

  /* ---------- Page compositions ---------- */
  function page(svg, kind, w, h) {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    defs(svg);
    const g = el("g", {}, svg);
    const navH = 92;
    if (kind === "cover") {
      border(g, 10, 10, w - 10, h - 10, 21, { band: 12, wash: true });
      const m = garland(g, w, h, 5);
      return { top: m.top, bottom: Math.max(navH, m.bottom), side: 40, decoTop: m.decoTop };
    }
    if (kind === "letter") {
      const x0 = Math.max(22, w * 0.07), x1 = w - x0, y0 = 46, y1 = h - 66;
      const mask = el("mask", { id: "panelMask", maskUnits: "userSpaceOnUse" }, svg.querySelector("defs"));
      el("rect", { x: 0, y: 0, width: w, height: h, fill: "#fff" }, mask);
      el("path", { d: cartouche(x0, y0, x1, y1, 7), fill: "#000" }, mask);
      stripes(g, w, h, 12, { maskId: "panelMask" });
      const ig = el("g", { filter: "url(#ink)", fill: "none", stroke: INK, "stroke-linecap": "round" }, g);
      el("path", { d: cartouche(x0, y0, x1, y1, 7), "stroke-width": 1.6 }, ig);
      el("path", { d: cartouche(x0 + 7, y0 + 7, x1 - 7, y1 - 7, 8, 22), "stroke-width": 0.7, opacity: 0.6 }, ig);
      bow(g, w / 2, y0 - 6, Math.min(0.62, w / 600), 31);
      return { top: y0 + 54, bottom: h - y1 + 30, side: x0 + 26, decoTop: y1 - 12, back: [x0 + 30, y0 + 34] };
    }
    if (kind === "wishes") {
      border(g, 12, 12, w - 12, h - 12, 41, { band: 18 });
      bow(g, w / 2, 30, Math.min(0.75, w / 500), 44);
      return { top: 120, bottom: navH + 16, side: 40, decoTop: h - 40, back: [52, 52] };
    }
    if (kind === "brunch") {
      const x0 = Math.max(18, w * 0.06), x1 = w - x0, y0 = 30, y1 = h - 66;
      const mask = el("mask", { id: "menuMask", maskUnits: "userSpaceOnUse" }, svg.querySelector("defs"));
      el("rect", { x: 0, y: 0, width: w, height: h, fill: "#fff" }, mask);
      el("path", { d: archCard(x0, y0, x1, y1, 52), fill: "#000" }, mask);
      gingham(g, w, h, 51, { maskId: "menuMask" });
      const ig = el("g", { filter: "url(#ink)", fill: "none", stroke: INK, "stroke-linecap": "round" }, g);
      el("path", { d: archCard(x0, y0, x1, y1, 52), "stroke-width": 1.6 }, ig);
      el("path", { d: archCard(x0 + 8, y0 + 8, x1 - 8, y1 - 8, 53), "stroke-width": 0.7, opacity: 0.6 }, ig);
      bow(g, w / 2, y0 + 2, Math.min(0.7, w / 540), 55);
      const ry = (x1 - x0) / 2 * 0.62;
      return { top: y0 + ry * 0.55 + 40, bottom: h - y1 + 34, side: x0 + 24, decoTop: y1 - 14, back: [x0 + 16, 44] };
    }
    if (kind === "mystery") {
      stripes(g, w, h, 61);
      border(g, 12, 12, w - 12, h - 12, 62, { band: 18, wash: false });
      bow(g, w / 2, 34, Math.min(0.62, w / 600), 63);
      return { top: 100, bottom: navH + 10, side: 40, decoTop: h - 40, back: [52, 52] };
    }
    return { top: 60, bottom: navH, side: 32 };
  }

  // small hand-drawn frame for tiles & the scratch card
  function frame(svg, w, h, seed, washOn = true) {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    defs(svg);
    border(el("g", {}, svg), 3, 3, w - 3, h - 3, seed, { band: 9, wash: washOn, weight: 0.7 });
  }

  // perforated postage stamp with a hand-drawn bow
  function stamp(svg) {
    const w = 120, h = 148, r = 4.2, step = 12;
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    defs(svg);
    const pts = [];
    const bite = (x, y, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + Math.PI * (i / 6); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } };
    for (let x = step / 2; x < w; x += step) bite(x, 0, 0);
    for (let y = step / 2; y < h; y += step) bite(w, y, Math.PI / 2);
    for (let x = w - step / 2; x > 0; x -= step) bite(x, h, Math.PI);
    for (let y = h - step / 2; y > 0; y -= step) bite(0, y, -Math.PI / 2);
    el("path", { d: poly(pts), fill: "#FBF5EC" }, svg);
    el("rect", { x: 11, y: 11, width: w - 22, height: h - 22, fill: "#F3C9BF" }, svg);
    stripes(el("g", { opacity: 0.6 }, svg), w, h, 81, { width: 7, gap: 7 });
    el("rect", { x: 0, y: 0, width: 11, height: h, fill: "#FBF5EC" }, svg);
    el("rect", { x: w - 11, y: 0, width: 11, height: h, fill: "#FBF5EC" }, svg);
    el("rect", { x: 11, y: 11, width: w - 22, height: h - 22, fill: "none", stroke: INK, "stroke-width": 1.4 }, svg);
    bow(el("g", {}, svg), w / 2, 58, 0.62, 83);
    const t = el("g", { fill: INK, "font-family": "EB Garamond, serif", "text-anchor": "middle" }, svg);
    el("text", { x: w / 2, y: h - 34, "font-size": 11, "letter-spacing": 2 }, t).textContent = "ANNIVERSAIRE";
    el("text", { x: w / 2, y: h - 19, "font-size": 15, "font-style": "italic" }, t).textContent = "15 · X · 26";
    el("text", { x: 20, y: 28, "font-size": 13, "text-anchor": "start" }, t).textContent = "1,26 €";
  }

  // round ink postmark with wavy cancellation lines
  function postmark(svg, label) {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 260 120");
    defs(svg);
    const NAVY = "#2E3F6E";
    const g = el("g", { filter: "url(#ink)", fill: "none", stroke: NAVY, opacity: 0.78 }, svg);
    for (let k = 0; k < 4; k++) {
      const y = 34 + k * 14, pts = [];
      for (let x = 0; x <= 150; x += 6) pts.push([x, y + Math.sin(x / 11) * 4]);
      el("path", { d: smooth(pts), "stroke-width": 1.6 }, g);
    }
    el("circle", { cx: 200, cy: 60, r: 50, "stroke-width": 2 }, g);
    el("circle", { cx: 200, cy: 60, r: 33, "stroke-width": 1.2 }, g);
    el("path", { id: "pmArc", d: "M158 60 A42 42 0 1 1 242 60 A42 42 0 1 1 158 60", fill: "none", stroke: "none" }, svg);
    const t = el("text", { fill: NAVY, "font-family": "EB Garamond, serif", "font-size": 11.5, "letter-spacing": 2.2, opacity: 0.8, filter: "url(#ink)" }, svg);
    const tp = el("textPath", { href: "#pmArc", startOffset: "2%" }, t);
    tp.textContent = label;
    const c = el("text", { x: 200, y: 66, fill: NAVY, "font-family": "EB Garamond, serif", "font-size": 17, "font-style": "italic", "text-anchor": "middle", opacity: 0.85, filter: "url(#ink)" }, svg);
    c.textContent = "15·10·26";
  }

  // cottagecore backdrop for the envelope: painted stripes + tiny hand-drawn florets
  function backdrop(svg, w, h) {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    defs(svg);
    const g = el("g", {}, svg);
    const sw = 30, gap = 30;
    stripes(g, w, h, 91, { width: sw, gap, color: "#C9766D", opacity: 0.55 });
    const r = rng(92);
    const fg = el("g", { filter: "url(#ink)" }, g);
    const floret = (x, y, s, rot) => {
      const f = el("g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})` }, fg);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        el("ellipse", { cx: (Math.cos(a) * 4.2).toFixed(2), cy: (Math.sin(a) * 4.2).toFixed(2), rx: 3.4, ry: 2.6, transform: `rotate(${(a * 180 / Math.PI).toFixed(0)} ${(Math.cos(a) * 4.2).toFixed(2)} ${(Math.sin(a) * 4.2).toFixed(2)})`, fill: "#FBF3EA", stroke: INK, "stroke-width": 0.7 }, f);
      }
      el("circle", { r: 1.8, fill: "#E8C07A", stroke: INK, "stroke-width": 0.6 }, f);
      el("path", { d: "M5 6 Q9 9 8 13", fill: "none", stroke: "#7C8F5E", "stroke-width": 0.9 }, f);
      el("ellipse", { cx: 9, cy: 10, rx: 2.4, ry: 1.2, transform: "rotate(50 9 10)", fill: "#9DB07E", stroke: "#5F7246", "stroke-width": 0.5 }, f);
    };
    // florets sit in the pale gaps, in a staggered ditsy repeat
    let row = 0;
    for (let y = 18; y < h + 20; y += 46, row++) {
      for (let x = -sw / 2 + sw + gap / 2; x < w + gap; x += (sw + gap) * 2) {
        const ox = row % 2 ? sw + gap : 0;
        floret(x + ox + (r() - 0.5) * 6, y + (r() - 0.5) * 8, 0.9 + r() * 0.35, r() * 72);
      }
    }
  }

  // hand-drawn French food: croissant, café crème, macarons (watercolour wash slightly off-register under ink)
  function food(svg) {
    svg.innerHTML = "";
    svg.setAttribute("viewBox", "0 0 330 120");
    defs(svg);
    const wash = el("g", { filter: "url(#wc)", transform: "translate(1.6 1.2)", opacity: 0.8 }, svg);
    const ink = el("g", { filter: "url(#ink)", fill: "none", stroke: INK, "stroke-width": 1.4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    const both = (tag, a, fill) => { el(tag, { ...a, fill }, wash); el(tag, a, ink); };

    // croissant: overlapping lobes along an arc, smallest at the tips
    const N = 7, C = [55, 104], R = 40;
    const order = [0, 6, 1, 5, 2, 4, 3];
    order.forEach((i) => {
      const t = i / (N - 1), a = Math.PI * (0.86 - 0.72 * t);
      const x = C[0] + R * Math.cos(a), y = C[1] - R * Math.sin(a);
      const k = Math.sin(Math.PI * t), rot = 90 - a * 180 / Math.PI;
      const rx = 5 + 11 * k, ry = 6 + 10 * k;
      // solid fill + outline per lobe, so each one covers the lobe behind it
      el("ellipse", { cx: x.toFixed(1), cy: y.toFixed(1), rx: rx.toFixed(1), ry: ry.toFixed(1), transform: `rotate(${rot.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})`, fill: k > 0.6 ? "#EDC48E" : "#E3AD6C" }, ink);
      if (k > 0.4) el("path", { d: `M${(x - rx * 0.4).toFixed(1)} ${(y - ry * 0.35).toFixed(1)} q ${(rx * 0.3).toFixed(1)} -3 ${(rx * 0.7).toFixed(1)} -1`, "stroke-width": 0.8, opacity: 0.7 }, ink);
    });
    [[30, 92, 26, 88], [80, 92, 84, 88]].forEach(([x1, y1, x2, y2]) => el("path", { d: `M${x1} ${y1} L${x2} ${y2}`, "stroke-width": 0.8 }, ink));

    // café crème on a saucer, steam and a latte heart
    both("ellipse", { cx: 165, cy: 98, rx: 42, ry: 9 }, "#FBF3EA");
    el("ellipse", { cx: 165, cy: 97, rx: 20, ry: 4, "stroke-width": 0.8, opacity: 0.6 }, ink);
    both("path", { d: "M137 56 C 138 78, 146 94, 165 95 C 184 94, 192 78, 193 56 Z" }, "#F6D9D2");
    both("path", { d: "M193 62 C 208 60, 210 80, 189 82" }, "none");
    both("ellipse", { cx: 165, cy: 56, rx: 28, ry: 7 }, "#FBF3EA");
    both("ellipse", { cx: 165, cy: 57, rx: 23, ry: 5 }, "#B98258");
    el("path", { d: "M165 60 C 160 57, 160 53, 163.5 53.5 C 164.5 53.6, 165 54.5, 165 55 C 165 54.5, 165.5 53.6, 166.5 53.5 C 170 53, 170 57, 165 60 Z", fill: "#FBF3EA", stroke: "none" }, svg);
    [[154, 44], [165, 40], [176, 44]].forEach(([x, y]) => el("path", { d: `M${x} ${y} c -5 -5 5 -9 0 -14 c -4 -4 4 -8 1 -12`, "stroke-width": 1.1, opacity: 0.75 }, ink));

    // macaron stack
    const mac = (x, y, col) => {
      both("path", { d: `M${x - 22} ${y} C ${x - 22} ${y - 13}, ${x + 22} ${y - 13}, ${x + 22} ${y} Z` }, col);
      both("path", { d: `M${x - 22} ${y + 7} C ${x - 22} ${y + 15}, ${x + 22} ${y + 15}, ${x + 22} ${y + 7} Z` }, col);
      both("rect", { x: x - 20, y: y, width: 40, height: 7, rx: 2 }, "#FBF3EA");
      el("path", { d: `M${x - 21} ${y - 1} q 3 2 6 0 q 3 2 6 0 q 3 2 6 0 q 3 2 6 0 q 3 2 6 0 q 3 2 6 0 q 3 2 6 0`, "stroke-width": 0.8, opacity: 0.8 }, ink);
      el("path", { d: `M${x - 13} ${y - 6} q 6 -4 14 -4`, "stroke-width": 0.8, opacity: 0.6 }, ink);
    };
    mac(276, 92, "#F0B6AE");
    mac(273, 66, "#C9D6A6");
    mac(278, 40, "#F3DFB2");
    el("path", { d: "M300 18 L300 30 M294 24 L306 24", "stroke-width": 1 }, ink);
    el("path", { d: "M110 30 L110 38 M106 34 L114 34", "stroke-width": 0.9 }, ink);
  }

  return { page, frame, stamp, postmark, backdrop, food };
})();
