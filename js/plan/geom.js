// =============================================================
//  Geometria. Kaikki mitat millimetreinä, x oikealle, y alas.
// =============================================================
export const uid = () => Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7);
export const r1 = v => Math.round(v * 10) / 10;
export const wlen = w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
export const same = (ax, ay, bx, by, tol = 1) => Math.abs(ax - bx) <= tol && Math.abs(ay - by) <= tol;

export function wallDir(w) {
  const L = wlen(w) || 1;
  const dx = (w.x2 - w.x1) / L, dy = (w.y2 - w.y1) / L;
  return { L, dx, dy, nx: -dy, ny: dx };
}

// Pisteen projektio janalle: t = etäisyys alusta janaa pitkin, d = etumerkillinen etäisyys janasta (normaalin suuntaan)
export function project(px, py, x1, y1, x2, y2) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const dx = (x2 - x1) / L, dy = (y2 - y1) / L;
  const t = (px - x1) * dx + (py - y1) * dy;
  const d = (px - x1) * -dy + (py - y1) * dx;
  const tc = Math.max(0, Math.min(L, t));
  return { t, tc, d, L, x: x1 + dx * tc, y: y1 + dy * tc };
}

// Seinien liitokset. Jokaiselle seinälle:
//  e1/e2 = kuinka paljon seinää jatketaan päistä, jotta nurkat täyttyvät (>= 0)
//  l1/l2 = näkyvän pituuden korjaus (T-liitoksessa negatiivinen: mitta toisen seinän pintaan)
export function joints(walls) {
  const r = {};
  for (const w of walls) {
    const j = { e1: 0, e2: 0, l1: 0, l2: 0 };
    const wd = wallDir(w);
    for (const o of walls) {
      if (o === w) continue;
      const od = wallDir(o);
      const parallel = Math.abs(wd.dx * od.dy - wd.dy * od.dx) < 0.02;
      for (const end of [1, 2]) {
        const px = end === 1 ? w.x1 : w.x2, py = end === 1 ? w.y1 : w.y2;
        const k = "e" + end, l = "l" + end;
        if (same(px, py, o.x1, o.y1) || same(px, py, o.x2, o.y2)) {
          if (!parallel) { j[k] = Math.max(j[k], o.t / 2); j[l] = Math.max(j[l], o.t / 2); }
          continue;
        }
        if (parallel) continue;
        const p = project(px, py, o.x1, o.y1, o.x2, o.y2);
        if (p.t > 1 && p.t < p.L - 1 && Math.abs(p.d) < o.t / 2 + 1) {
          j[l] = Math.min(j[l], -(o.t / 2 - Math.abs(p.d)));
        }
      }
    }
    r[w.id] = j;
  }
  return r;
}

export function wallPoly(w, j = { e1: 0, e2: 0 }) {
  const { dx, dy, nx, ny } = wallDir(w);
  const h = w.t / 2;
  const ax = w.x1 - dx * j.e1, ay = w.y1 - dy * j.e1;
  const bx = w.x2 + dx * j.e2, by = w.y2 + dy * j.e2;
  return [[ax + nx * h, ay + ny * h], [bx + nx * h, by + ny * h], [bx - nx * h, by - ny * h], [ax - nx * h, ay - ny * h]];
}
export const visLen = (w, j) => wlen(w) + (j?.l1 || 0) + (j?.l2 || 0);

export function polyArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
  return Math.abs(a / 2);
}
export function polyCentroid(pts) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length], f = p.x * q.y - q.x * p.y;
    a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f;
  }
  if (Math.abs(a) < 1e-6) { const b = bboxPts(pts); return { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 }; }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}
export function bboxPts(pts) {
  const b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (const p of pts) { b.x1 = Math.min(b.x1, p.x); b.y1 = Math.min(b.y1, p.y); b.x2 = Math.max(b.x2, p.x); b.y2 = Math.max(b.y2, p.y); }
  return b;
}
export function isRect(pts) {
  if (pts.length !== 4) return false;
  for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; if (Math.abs(p.x - q.x) > 0.5 && Math.abs(p.y - q.y) > 0.5) return false; }
  return true;
}
export function pointInPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

export const rot = (x, y, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
export function itemCorners(it) {
  const hw = it.w / 2, hd = it.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, y]) => { const [a, b] = rot(x, y, it.rot || 0); return { x: it.x + a, y: it.y + b }; });
}

// Koko piirustuksen rajat (seinät, tilat, esineet, mitat, tekstit)
export function planBBox(data) {
  const pts = [];
  const J = joints(data.walls || []);
  for (const w of data.walls || []) wallPoly(w, J[w.id]).forEach(([x, y]) => pts.push({ x, y }));
  for (const o of data.openings || []) {
    const w = (data.walls || []).find(x => x.id === o.wallId); if (!w) continue;
    const { dx, dy, nx, ny } = wallDir(w), r = w.t / 2 + (o.kind === "pariovi" ? o.w / 2 : o.kind === "ovi" ? o.w : 0);
    for (const t of [o.off, o.off + o.w]) for (const s of [-1, 1]) pts.push({ x: w.x1 + dx * t + nx * r * s, y: w.y1 + dy * t + ny * r * s });
  }
  for (const r of data.rooms || []) pts.push(...r.pts);
  for (const it of data.items || []) pts.push(...itemCorners(it));
  for (const d of data.dims || []) pts.push({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 });
  for (const t of data.texts || []) pts.push({ x: t.x, y: t.y });
  if (!pts.length) return null;
  return bboxPts(pts);
}
export function wallsBBox(data) {
  const J = joints(data.walls || []), pts = [];
  for (const w of data.walls || []) wallPoly(w, J[w.id]).forEach(([x, y]) => pts.push({ x, y }));
  return pts.length ? bboxPts(pts) : null;
}

// Muotoilu
export const mm = v => String(Math.round(v));
export const m2 = v => (v / 1e6).toLocaleString("fi-FI", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const m1 = v => (v / 1000).toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
