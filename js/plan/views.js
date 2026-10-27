// =============================================================
//  Julkisivut ja leikkaus A–A. Piirretään 2D-SVG:nä suoraan piirustuksen
//  3D-tiedoista (seinät, aukot, katto), mittakaavassa tulostettavaksi.
//  SVG-koordinaatit: vaaka = katselusuunnan oikea puoli (mm), pysty = -korkeus (mm).
// =============================================================
import { joints, wallPoly, wallDir, wlen, polyArea, bboxPts, mm } from "./geom.js";
import { dimLine } from "./render.js";
import { roofGeom } from "./roof.js";
import { WALL_MATS, DOOR_MATS, ROOF_MATS } from "./materials.js";
import { LAYER_KINDS, wallLayers } from "./walltypes.js";
import { KINDS } from "./catalog.js";
import { centroid, outSide, trimSides, cornerTrims } from "./trims.js";
import { heightOf, baseOf } from "./view3d.js";
import { openSheet, toast } from "../core.js";
import { openPrint } from "./print.js";

const f = v => Math.round(v * 100) / 100;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const VIEWS = [["S", "Julkisivu alhaalta"], ["E", "Julkisivu oikealta"], ["N", "Julkisivu ylhäältä"], ["W", "Julkisivu vasemmalta"]];
const DIRS = { S: [0, -1], N: [0, 1], E: [-1, 0], W: [1, 0] };
const light = (hex, k = .38) => { const n = parseInt(String(hex || "#cccccc").slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; const m = c => Math.round(c + (255 - c) * k); return `rgb(${m(r)},${m(g)},${m(b)})`; };

export const VIEW_CSS = `
.vw-l{stroke:#1d232a;stroke-linejoin:round} .vw-g{stroke:#1d232a} .vw-ground{fill:url(#vwground);stroke:none}
.vw-cut{stroke:#1d232a} .vw-bey{fill:#fff;stroke:#7c858d} .vw-txt{fill:#1d232a;font-family:system-ui,sans-serif}
.vw-lv{fill:#3a6b8f;font-family:system-ui,sans-serif} .vw-lvl{stroke:#3a6b8f} .vw-ceil{stroke:#3a6b8f;stroke-dasharray:8 5}
.dm line,.dm path{stroke:#3a6b8f;fill:none} .dm text{fill:#3a6b8f;font-family:system-ui,sans-serif}`;

// --------- Yhteinen: seinien, katon ja terassin monitahokkaat 3D:nä ---------
// Jokainen tahko: { pts: [[x,y,z]...], fill, cls, kind, w?, o? }  (ulospäin suunnatut)
function solids(data, S) {
  const J = joints(data.walls), H = S.wallH || 2400, out = [];
  const prism = (base, z0, z1, fill, info = {}) => {
    // pystysuora prisma pohjamonikulmiosta
    const n = base.length, faces = [];
    faces.push({ pts: base.map(p => [p[0], p[1], z1]), ...info, fill, top: true });
    faces.push({ pts: [...base].reverse().map(p => [p[0], p[1], z0]), ...info, fill });
    for (let i = 0; i < n; i++) { const a = base[i], b = base[(i + 1) % n]; faces.push({ pts: [[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], ...info, fill }); }
    return outward(faces);
  };
  for (const w of data.walls) {
    if (w.status === "demolish") continue;
    const poly = wallPoly(w, J[w.id]), h = w.h || H;
    const { nx, ny } = wallDir(w);
    const cA = WALL_MATS[w.matA]?.[1] || "#ece7de", cB = WALL_MATS[w.matB]?.[1] || "#ece7de";
    for (const fc of prism(poly, 0, h, null, { wall: w })) {
      // pinnan väri sen mukaan, kummalle puolelle tahko osoittaa
      const nrm = faceNormal(fc.pts), side = nrm[0] * nx + nrm[1] * ny;
      fc.fill = side > .5 ? light(w.colA || cA) : side < -.5 ? light(w.colB || cB) : "#e9e4d8";
      fc.side = side > .5 ? 1 : side < -.5 ? -1 : 0;
      out.push(fc);
    }
  }
  for (const q of cornerTrims(data, S)) out.push(...prism(q.pts, 0, q.h, S.cornerCol || "#f3f3f1", { trim: true }));
  const cen = centroid(data);
  for (const r of data.roofs || []) {
    const G = roofGeom(r), t = (r.t ?? 250) / Math.cos(Math.atan(G.k)), fill = light(r.col || (ROOF_MATS[r.mat] || ROOF_MATS.pelti)[1], .25);
    for (const f0 of G.faces) {
      const top = f0.map(p => [p[0], p[1], p[2] + t]), n = f0.length, slab = [{ pts: top, fill, roof: true, rank: 2 }, { pts: [...f0], fill: "#e9e4d8", roof: true, rank: 0 }];
      for (let i = 0; i < n; i++) { const a = f0[i], b = f0[(i + 1) % n]; slab.push({ pts: [a, b, [b[0], b[1], b[2] + t], [a[0], a[1], a[2] + t]], fill: "#d9d3c6", roof: true, rank: 1 }); }
      out.push(...outward(slab));
    }
    for (const g of G.gables) {
      // päätykolmion pinta: katon asetus tai saman suuntaisen seinän ulkopinta
      let fill = "#ece7de";
      if (r.gmat && WALL_MATS[r.gmat]) fill = light(r.gcol || WALL_MATS[r.gmat][1]);
      else {
        const p = g.pts, hx = p[1][0] - p[0][0], hy = p[1][1] - p[0][1], hl = Math.hypot(hx, hy) || 1, c = p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
        let best = null, bd = Infinity;
        for (const w of data.walls) { const L2 = wlen(w) || 1, wx = (w.x2 - w.x1) / L2, wy = (w.y2 - w.y1) / L2; if (Math.abs(wx * hy / hl - wy * hx / hl) > .15) continue; const d = Math.abs((c[0] - w.x1) * -wy + (c[1] - w.y1) * wx); if (d < bd) { bd = d; best = w; } }
        if (best) { const so = outSide(best, cen); fill = light(so > 0 ? (best.colA || WALL_MATS[best.matA]?.[1] || "#ece7de") : (best.colB || WALL_MATS[best.matB]?.[1] || "#ece7de")); }
      }
      out.push({ pts: g.pts, fill, gable: true, twoSided: true });
    }
  }
  for (const r of data.rooms) if (r.kind === "terrace" && r.pts?.length > 2) out.push(...prism(r.pts.map(p => [p.x, p.y]), -45, 0, "#d8bf98", { terrace: true }));
  // tahkot ulospäin: käännetään, jos normaali osoittaa kappaleen sisään
  return out;
}
// Käännetään tahkot osoittamaan kappaleen keskipisteestä poispäin
function outward(faces) {
  const all = faces.flatMap(fc => fc.pts), c = all.reduce((a, p) => [a[0] + p[0] / all.length, a[1] + p[1] / all.length, a[2] + p[2] / all.length], [0, 0, 0]);
  for (const fc of faces) {
    const n = faceNormal(fc.pts), m = fc.pts.reduce((a, p) => [a[0] + p[0] / fc.pts.length, a[1] + p[1] / fc.pts.length, a[2] + p[2] / fc.pts.length], [0, 0, 0]);
    if (n[0] * (m[0] - c[0]) + n[1] * (m[1] - c[1]) + n[2] * (m[2] - c[2]) < 0) fc.pts.reverse();
  }
  return faces;
}
function faceNormal(p) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]); }
  const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l];
}

// --------- Julkisivu ---------
export function elevation(data, S, dir) {
  const v = DIRS[dir], r = [-v[1], v[0]];
  const sOf = p => p[0] * r[0] + p[1] * r[1], dOf = p => -(p[0] * v[0] + p[1] * v[1]);
  const faces = solids(data, S);
  // suunnataan roof-prismojen tahkot ulos: verrataan kappaleen keskipisteeseen
  const vis = [];
  for (const fc of faces) {
    let n = faceNormal(fc.pts);
    const facing = -(n[0] * v[0] + n[1] * v[1]);
    if (!fc.twoSided && facing <= 1e-4) continue;
    if (fc.twoSided && Math.abs(facing) < 1e-4) continue;
    const c = fc.pts.reduce((a, p) => [a[0] + p[0] / fc.pts.length, a[1] + p[1] / fc.pts.length, a[2] + p[2] / fc.pts.length], [0, 0, 0]);
    vis.push({ ...fc, depth: dOf(c) + (fc.roof ? 1e5 * 0 : 0), zc: c[2] });
  }
  // kaukaisimmat ensin; katto seinien jälkeen
  vis.sort((a, b) => (a.roof === b.roof ? (a.roof ? (a.rank - b.rank) || (a.depth - b.depth) : a.depth - b.depth) : a.roof ? 1 : -1));
  const J = joints(data.walls);
  return {
    ext: () => extentOf(vis.flatMap(fc => fc.pts.map(p => [sOf(p), p[2]]))),
    body: u => {
      let s = defs(u);
      const all = vis.flatMap(fc => fc.pts.map(p => sOf(p))), x1 = Math.min(...all), x2 = Math.max(...all);
      s += `<rect class="vw-ground" x="${f(x1 - 1500)}" y="0" width="${f(x2 - x1 + 3000)}" height="${f(300)}"/><line class="vw-g" x1="${f(x1 - 1500)}" y1="0" x2="${f(x2 + 1500)}" y2="0" stroke-width="${f(u * 2)}"/>`;
      for (const fc of vis) {
        s += `<polygon class="vw-l" fill="${fc.fill}" stroke-width="${f(u * (fc.roof ? 1 : 1.2))}" points="${fc.pts.map(p => `${f(sOf(p))},${f(-p[2])}`).join(" ")}"/>`;
        // aukot katsojaan päin olevalle seinäpinnalle
        if (fc.wall && fc.side) s += openingsOn(data, fc, J, sOf, u);
      }
      // korkeustasot ja mitat
      const levels = levelsOf(data, S);
      for (const [z, lab] of levels) s += `<line class="vw-lvl" stroke-width="${f(u * .8)}" x1="${f(x2 + 300)}" y1="${f(-z)}" x2="${f(x2 + 900)}" y2="${f(-z)}"/><path class="vw-lvl" fill="none" stroke-width="${f(u * .8)}" d="M ${f(x2 + 420)} ${f(-z - 6 * u)} L ${f(x2 + 420 + 6 * u)} ${f(-z)} L ${f(x2 + 420 + 12 * u)} ${f(-z - 6 * u)}"/><text class="vw-lv" x="${f(x2 + 950)}" y="${f(-z)}" font-size="${f(9 * u)}" dominant-baseline="central">${lab}</text>`;
      const wx = data.walls.flatMap(w => wallPoly(w, J[w.id]).map(p => sOf([p[0], p[1]])));
      if (wx.length) s += dimLine(Math.min(...wx), 600, Math.max(...wx), 600, 0, u, null);
      return s;
    }
  };
}
function openingsOn(data, fc, J, sOf, u) {
  const w = fc.wall, { dx, dy, nx, ny } = wallDir(w), side = fc.side, h = w.t / 2 * side, cen = centroid(data);
  let s = "";
  for (const o of data.openings.filter(o => o.wallId === w.id)) {
    const ax = w.x1 + dx * o.off + nx * h, ay = w.y1 + dy * o.off + ny * h, bx = ax + dx * o.w, by = ay + dy * o.w;
    const s1 = sOf([ax, ay]), s2 = sOf([bx, by]), lo = Math.min(s1, s2), hi = Math.max(s1, s2);
    if (hi - lo < 1) continue;
    const z0 = o.kind === "ikkuna" ? o.sill || 0 : 0, z1 = z0 + o.h;
    if (trimSides(o, w, cen).includes(side)) { const tw = o.tw || 95, zb = o.kind === "ikkuna" ? Math.max(0, z0 - tw) : 0; s += `<rect class="vw-l" fill="${o.tcol || "#f3f3f1"}" stroke-width="${f(u * .8)}" x="${f(lo - tw)}" y="${f(-(z1 + tw))}" width="${f(hi - lo + 2 * tw)}" height="${f(z1 + tw - zb)}"/>`; }
    if (o.kind === "ikkuna") {
      s += `<rect class="vw-l" fill="#f4f4f2" stroke-width="${f(u)}" x="${f(lo)}" y="${f(-z1)}" width="${f(hi - lo)}" height="${f(o.h)}"/>`;
      s += `<rect class="vw-l" fill="#cfe2ef" stroke-width="${f(u * .7)}" x="${f(lo + 60)}" y="${f(-z1 + 60)}" width="${f(Math.max(0, hi - lo - 120))}" height="${f(Math.max(0, o.h - 120))}"/>`;
      if (hi - lo > 900) s += `<line class="vw-l" stroke-width="${f(u * .7)}" x1="${f((lo + hi) / 2)}" y1="${f(-z1 + 60)}" x2="${f((lo + hi) / 2)}" y2="${f(-z0 - 60)}"/>`;
    } else if (o.kind !== "aukko") {
      const dm = DOOR_MATS[o.mat] || DOOR_MATS.puu, glass = dm[2] === "glass" || dm[2] === "frost";
      s += `<rect class="vw-l" fill="${glass ? "#dbe9f2" : light(dm[1], .35)}" stroke-width="${f(u)}" x="${f(lo)}" y="${f(-z1)}" width="${f(hi - lo)}" height="${f(o.h)}"/>`;
      if (o.kind === "pariovi") s += `<line class="vw-l" stroke-width="${f(u * .8)}" x1="${f((lo + hi) / 2)}" y1="${f(-z1)}" x2="${f((lo + hi) / 2)}" y2="0"/>`;
      if (o.mat === "puulasi") s += `<rect class="vw-l" fill="#cfe2ef" stroke-width="${f(u * .7)}" x="${f(lo + 110)}" y="${f(-z1 + 110)}" width="${f(Math.max(0, hi - lo - 220))}" height="${f(o.h * .45)}"/>`;
      const hx = o.hinge === "b" ? lo + 90 : hi - 90;
      s += `<circle fill="#1d232a" cx="${f(hx)}" cy="${f(-1050)}" r="${f(Math.max(18, 2 * u))}"/>`;
    } else s += `<rect fill="#fff" class="vw-l" stroke-dasharray="${f(u * 4)} ${f(u * 3)}" stroke-width="${f(u * .7)}" x="${f(lo)}" y="${f(-z1)}" width="${f(hi - lo)}" height="${f(o.h)}"/>`;
  }
  return s;
}
function levelsOf(data, S) {
  const L = new Map([[0, "±0"]]), H = S.wallH || 2400;
  for (const w of data.walls) L.set(w.h || H, `+${w.h || H}`);
  for (const r of data.roofs || []) { const G = roofGeom(r); L.set(Math.round(G.top), `+${Math.round(G.top)}`); }
  const arr = [...L.entries()].sort((a, b) => a[0] - b[0]);
  // ei päällekkäisiä tekstejä
  return arr.filter(([z], i) => i === 0 || z - arr[i - 1][0] > 150);
}
function defs(u) {
  return `<style>${VIEW_CSS}</style><defs><pattern id="vwground" width="${f(120)}" height="${f(120)}" patternUnits="userSpaceOnUse"><path d="M 0 120 L 120 0" stroke="#9aa39a" stroke-width="${f(u * .6)}"/></pattern>
    <pattern id="vwins" width="${f(60)}" height="${f(60)}" patternUnits="userSpaceOnUse"><path d="M 0 30 Q 15 0 30 30 T 60 30" fill="none" stroke="#b49a4a" stroke-width="${f(u * .5)}"/></pattern>
    <pattern id="vwcut" width="${f(40)}" height="${f(40)}" patternUnits="userSpaceOnUse"><path d="M 0 40 L 40 0" stroke="#1d232a" stroke-width="${f(u * .5)}"/></pattern></defs>`;
}
function extentOf(pts2) {
  if (!pts2.length) return null;
  const xs = pts2.map(p => p[0]), zs = pts2.map(p => p[1]);
  const x1 = Math.min(...xs), x2 = Math.max(...xs), z1 = Math.min(...zs, 0), z2 = Math.max(...zs);
  return { x: x1 - 1800, y: -z2 - 900, w: x2 - x1 + 3600 + 1400, h: z2 - z1 + 900 + 1400 };
}

// --------- Leikkaus A–A ---------
// sec = { axis: "x" (leikkausviiva vaakasuora piirustuksessa, y = at) | "y" (pystysuora, x = at), at, flip }
export function section(data, S, sec) {
  const H = S.wallH || 2400, J = joints(data.walls);
  const ax = sec.axis || "x", at = sec.at, flip = !!sec.flip;
  // katsotaan leikkaustasolta: x-akselin leikkauksessa katse -y (tai +y), y-akselin leikkauksessa katse -x (tai +x)
  const v = ax === "x" ? (flip ? [0, 1] : [0, -1]) : (flip ? [1, 0] : [-1, 0]);
  const r = [-v[1], v[0]], sOf = p => p[0] * r[0] + p[1] * r[1], dOf = p => -(p[0] * v[0] + p[1] * v[1]);
  const c0 = ax === "x" ? at : at; // leikkaustason koordinaatti
  const coord = p => ax === "x" ? p[1] : p[0]; // tason normaalin suuntainen koordinaatti
  const behind = p => (coord(p) - c0) * (ax === "x" ? v[1] : v[0]) > 0; // katselusuunnassa tason takana
  const prims = [], cuts = [], items = [];
  // Taustalla näkyvät pinnat (tason takana) julkisivun tapaan
  for (const fc of solids(data, S)) {
    if (!fc.pts.every(p => behind(p) || Math.abs(coord(p) - c0) < .5)) continue;
    const n = faceNormal(fc.pts), facing = -(n[0] * v[0] + n[1] * v[1]);
    if (!fc.twoSided && facing <= 1e-4) continue;
    const c = fc.pts.reduce((a, p) => [a[0] + p[0] / fc.pts.length, a[1] + p[1] / fc.pts.length], [0, 0]);
    prims.push({ ...fc, depth: dOf(c) });
  }
  prims.sort((a, b) => a.depth - b.depth);
  // Leikatut seinät
  for (const w of data.walls) {
    if (w.status === "demolish") continue;
    const P = wallPoly(w, J[w.id]), xs = [];
    for (let i = 0; i < 4; i++) {
      const a = P[i], b = P[(i + 1) % 4], ca = coord(a), cb = coord(b);
      if ((ca - c0) * (cb - c0) <= 0 && ca !== cb) { const t = (c0 - ca) / (cb - ca); xs.push(sOf([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])); }
    }
    if (xs.length < 2) continue;
    const s1 = Math.min(...xs), s2 = Math.max(...xs), h = w.h || H;
    // kohta seinää pitkin: onko leikkaus aukon kohdalla?
    const { dx, dy, nx, ny } = wallDir(w), L = wlen(w);
    let along = null;
    if (Math.abs(ax === "x" ? dy : dx) > .01) along = (c0 - (ax === "x" ? w.y1 : w.x1)) / (ax === "x" ? dy : dx);
    const op = along != null ? data.openings.find(o => o.wallId === w.id && along > o.off && along < o.off + o.w) : null;
    const spans = op ? [[0, op.kind === "ikkuna" ? op.sill || 0 : 0], [(op.kind === "ikkuna" ? op.sill || 0 : 0) + op.h, h]].filter(([a, b]) => b - a > 1) : [[0, h]];
    const ls = w.type && wallLayers(w, S);
    // kerrosten järjestys leikkauksessa: puoli B → A normaalin suunnassa; normaalin s-komponentti määrää suunnan
    const ns = nx * r[0] + ny * r[1];
    cuts.push({ s1, s2, spans, ls, ns, t: w.t, op, w });
  }
  // Leikattu katto
  const roofCuts = [];
  for (const rf of data.roofs || []) {
    const G = roofGeom(rf), t = (rf.t ?? 250) / Math.cos(Math.atan(G.k));
    for (const f0 of G.faces) {
      const seg = [];
      for (let i = 0; i < f0.length; i++) {
        const a = f0[i], b = f0[(i + 1) % f0.length], ca = coord(a), cb = coord(b);
        if ((ca - c0) * (cb - c0) <= 0 && ca !== cb) { const k = (c0 - ca) / (cb - ca); seg.push([sOf([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]), a[2] + (b[2] - a[2]) * k]); }
      }
      if (seg.length >= 2) roofCuts.push({ a: seg[0], b: seg[1], t, fill: light((ROOF_MATS[rf.mat] || ROOF_MATS.pelti)[1], .25) });
    }
    for (const g of G.gables) {
      const seg = [];
      for (let i = 0; i < g.pts.length; i++) {
        const a = g.pts[i], b = g.pts[(i + 1) % g.pts.length], ca = coord(a), cb = coord(b);
        if ((ca - c0) * (cb - c0) <= 0 && ca !== cb) { const k = (c0 - ca) / (cb - ca); seg.push([sOf([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]), a[2] + (b[2] - a[2]) * k]); }
      }
      if (seg.length >= 2) roofCuts.push({ gable: true, a: seg[0], b: seg[1] });
    }
  }
  // Tilat leikkauksessa: sisäkatto ja huonekorkeus
  const rooms = [];
  for (const rm of data.rooms) {
    if (!(rm.pts?.length > 2)) continue;
    const xs = [];
    for (let i = 0; i < rm.pts.length; i++) {
      const a = rm.pts[i], b = rm.pts[(i + 1) % rm.pts.length], ca = coord([a.x, a.y]), cb = coord([b.x, b.y]);
      if ((ca - c0) * (cb - c0) <= 0 && ca !== cb) { const k = (c0 - ca) / (cb - ca); xs.push(sOf([a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k])); }
    }
    if (xs.length >= 2) rooms.push({ s1: Math.min(...xs), s2: Math.max(...xs), ch: rm.ch || H, name: rm.name, terrace: rm.kind === "terrace", ceil: rm.ceil || "tasainen" });
  }
  // Leikatut kalusteet (esim. lauteet portaittain)
  for (const it of data.items) {
    const K = KINDS[it.kind]; if (!K || K.cat !== "kaluste") continue;
    const a = (it.rot || 0) * Math.PI / 180, ux = [Math.cos(a), Math.sin(a)], uy = [-Math.sin(a), Math.cos(a)];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [it.x + ux[0] * i * it.w / 2 + uy[0] * j * it.d / 2, it.y + ux[1] * i * it.w / 2 + uy[1] * j * it.d / 2]);
    const cs = corners.map(coord); if (Math.min(...cs) > c0 || Math.max(...cs) < c0) continue;
    const ss = corners.map(sOf), lo = Math.min(...ss), hi = Math.max(...ss);
    const yAlong = Math.abs(uy[0] * r[0] + uy[1] * r[1]) > .7, ysign = Math.sign(uy[0] * r[0] + uy[1] * r[1]);
    if (it.kind === "lauteet" && yAlong) {
      const lu = it.lu ?? 600, hu = it.hu ?? 1050, ha = it.ha ?? 600, sc = sOf([it.x, it.y]), y0 = sc - ysign * it.d / 2, yb = sc + ysign * (-it.d / 2 + lu), y1 = sc + ysign * it.d / 2;
      items.push({ poly: [[y0, 0], [y0, hu], [yb, hu], [yb, ha], [y1, ha], [y1, 0]], name: `ylälaude +${hu}, alalaude +${ha}` });
    } else items.push({ poly: [[lo, baseOf(it)], [hi, baseOf(it)], [hi, baseOf(it) + heightOf(it)], [lo, baseOf(it) + heightOf(it)]] });
  }
  const pts2 = [...prims.flatMap(fc => fc.pts.map(p => [sOf(p), p[2]])), ...cuts.flatMap(c => [[c.s1, 0], [c.s2, H]]), ...roofCuts.flatMap(c => [c.a, c.b, ...(c.t ? [[c.a[0], c.a[1] + c.t]] : [])])];
  return {
    ext: () => extentOf(pts2),
    body: u => {
      let s = defs(u);
      const all = pts2.map(p => p[0]), x1 = Math.min(...all), x2 = Math.max(...all);
      s += `<rect class="vw-ground" x="${f(x1 - 1500)}" y="0" width="${f(x2 - x1 + 3000)}" height="${f(300)}"/>`;
      for (const fc of prims) s += `<polygon class="vw-bey" stroke-width="${f(u * .7)}" points="${fc.pts.map(p => `${f(sOf(p))},${f(-p[2])}`).join(" ")}"/>`;
      // lattia
      for (const rm of rooms) s += `<rect class="vw-cut" fill="${rm.terrace ? "#d8bf98" : "url(#vwcut)"}" stroke-width="${f(u)}" x="${f(rm.s1)}" y="0" width="${f(rm.s2 - rm.s1)}" height="${rm.terrace ? 45 : 25}"/>`;
      s += `<line class="vw-g" x1="${f(x1 - 1500)}" y1="0" x2="${f(x2 + 1500)}" y2="0" stroke-width="${f(u * 1.6)}"/>`;
      // kalusteet
      for (const it of items) s += `<polygon fill="#f3ead9" stroke="#6b5a3a" stroke-width="${f(u * .9)}" points="${it.poly.map(([a, z]) => `${f(a)},${f(-z)}`).join(" ")}"/>`;
      // leikatut seinät kerroksittain
      for (const c of cuts) for (const [z0, z1] of c.spans) {
        if (c.ls && c.ls.length) {
          const k = (c.s2 - c.s1) / c.t, dir = c.ns >= 0 ? 1 : -1;
          let pos = dir > 0 ? c.s1 : c.s2;
          for (const l of c.ls) {
            const tw = (Number(l.t) || 0) * k; const a = pos, b = pos + dir * tw; pos = b;
            const col = (LAYER_KINDS[l.kind] || LAYER_KINDS.muu)[1];
            if (tw <= 0) { s += `<line stroke="${col}" stroke-width="${f(u * 1.4)}" stroke-dasharray="${f(u * 4)} ${f(u * 2)}" x1="${f(a)}" y1="${f(-z0)}" x2="${f(a)}" y2="${f(-z1)}"/>`; continue; }
            s += `<rect fill="${col}" stroke="#1d232a" stroke-width="${f(u * .5)}" x="${f(Math.min(a, b))}" y="${f(-z1)}" width="${f(Math.abs(b - a))}" height="${f(z1 - z0)}"/>`;
            if (l.kind === "runko" || l.kind === "eriste") s += `<rect fill="url(#vwins)" x="${f(Math.min(a, b))}" y="${f(-z1)}" width="${f(Math.abs(b - a))}" height="${f(z1 - z0)}"/>`;
          }
          s += `<rect fill="none" class="vw-cut" stroke-width="${f(u * 1.6)}" x="${f(c.s1)}" y="${f(-z1)}" width="${f(c.s2 - c.s1)}" height="${f(z1 - z0)}"/>`;
        } else s += `<rect fill="#2c333b" class="vw-cut" stroke-width="${f(u * 1.6)}" x="${f(c.s1)}" y="${f(-z1)}" width="${f(c.s2 - c.s1)}" height="${f(z1 - z0)}"/>`;
      }
      for (const c of cuts) if (c.op?.kind === "ikkuna") { const z0 = c.op.sill || 0, mx = (c.s1 + c.s2) / 2; s += `<rect fill="#f4f4f2" stroke="#1d232a" stroke-width="${f(u * .8)}" x="${f(mx - 30)}" y="${f(-(z0 + c.op.h))}" width="60" height="${f(c.op.h)}"/><line stroke="#5f9cc8" stroke-width="${f(u * 1.6)}" x1="${f(mx)}" y1="${f(-z0)}" x2="${f(mx)}" y2="${f(-(z0 + c.op.h))}"/>`; }
      // leikattu katto ja päätykolmiot
      for (const c of roofCuts) {
        if (c.gable) { const lo = Math.min(c.a[0], c.b[0]) - 75, hi = Math.max(c.a[0], c.b[0]) + 75; if (Math.abs(c.a[0] - c.b[0]) < 5) s += `<rect fill="#2c333b" x="${f(lo)}" y="${f(-Math.max(c.a[1], c.b[1]))}" width="${f(hi - lo)}" height="${f(Math.abs(c.a[1] - c.b[1]))}"/>`; continue; }
        s += `<polygon fill="${c.fill}" stroke="#1d232a" stroke-width="${f(u * 1.4)}" points="${[c.a, c.b, [c.b[0], c.b[1] + c.t], [c.a[0], c.a[1] + c.t]].map(([a, z]) => `${f(a)},${f(-z)}`).join(" ")}"/>`;
        s += `<polygon fill="url(#vwins)" points="${[c.a, c.b, [c.b[0], c.b[1] + c.t * .8], [c.a[0], c.a[1] + c.t * .8]].map(([a, z]) => `${f(a)},${f(-z)}`).join(" ")}"/>`;
      }
      // sisäkatot, huonekorkeudet ja nimet
      for (const rm of rooms) {
        if (rm.terrace) continue;
        if (rm.ceil === "tasainen") s += `<line class="vw-ceil" stroke-width="${f(u)}" x1="${f(rm.s1)}" y1="${f(-rm.ch)}" x2="${f(rm.s2)}" y2="${f(-rm.ch)}"/>`;
        const mx = (rm.s1 + rm.s2) / 2;
        const dx0 = rm.s1 + Math.min(350, (rm.s2 - rm.s1) * .2);
        s += dimLine(dx0, 0, dx0, -rm.ch, 0, u, String(rm.ch));
        s += `<text class="vw-txt" x="${f(mx)}" y="${f(-rm.ch + 16 * u)}" font-size="${f(9 * u)}" font-weight="700" text-anchor="middle">${esc(rm.name || "")}</text>`;
      }
      for (const it of items) if (it.name) { const top = Math.max(...it.poly.map(p => p[1])), xs2 = it.poly.map(p => p[0]); s += `<text class="vw-txt" x="${f((Math.min(...xs2) + Math.max(...xs2)) / 2)}" y="${f(-top - 8 * u)}" font-size="${f(7.5 * u)}" text-anchor="middle">${esc(it.name)}</text>`; }
      for (const [z, lab] of levelsOf(data, S)) s += `<line class="vw-lvl" stroke-width="${f(u * .8)}" x1="${f(x2 + 300)}" y1="${f(-z)}" x2="${f(x2 + 900)}" y2="${f(-z)}"/><text class="vw-lv" x="${f(x2 + 950)}" y="${f(-z)}" font-size="${f(9 * u)}" dominant-baseline="central">${lab}</text>`;
      if (cuts.length) s += dimLine(Math.min(...cuts.map(c => c.s1)), 600, Math.max(...cuts.map(c => c.s2)), 600, 0, u, null);
      return s;
    }
  };
}
export const defaultSection = data => {
  const xs = data.walls.flatMap(w => [w.x1, w.x2]), ys = data.walls.flatMap(w => [w.y1, w.y2]);
  if (!xs.length) return { axis: "x", at: 0 };
  return { axis: "x", at: Math.round((Math.min(...ys) + Math.max(...ys)) / 2 / 10) * 10, flip: false };
};

// --------- Näkymäikkuna: julkisivut ja leikkaus, esikatselu ja tulostus ---------
export function openViewsSheet(data, S, proj, planName, onSection) {
  if (!data.walls.length) { toast("Piirrä ensin seiniä", true); return; }
  let tab = "S", sec = { ...defaultSection(data), ...(S.section || {}) };
  const tabs = [...VIEWS.map(([k, l]) => [k, l.replace("Julkisivu ", "")]), ["A", "Leikkaus A–A"]];
  const html = `<div class="seg-mini vw-tabs">${tabs.map(([k, l]) => `<button data-vt="${k}" class="${k === tab ? "on" : ""}">${k === "A" ? l : "Julkisivu " + l}</button>`).join("")}</div>
    <div class="vw-sec" hidden>
      <label class="fld"><span>Leikkausviiva</span><select id="vs-axis"><option value="x">Vaakasuora (piirustuksessa)</option><option value="y">Pystysuora</option></select></label>
      <label class="fld"><span>Kohta (mm)</span><input id="vs-at" inputmode="decimal"></label>
      <label class="fld-check"><input type="checkbox" id="vs-flip"><span>Katso vastakkaiseen suuntaan</span></label>
      <label class="fld-check"><input type="checkbox" id="vs-show"><span>Näytä viiva pohjapiirustuksessa</span></label>
    </div>
    <div class="vw-prev" id="vw-prev"></div>
    <p class="form-note" id="vw-note"></p>
    <div class="row-btns"><button class="btn primary" id="vw-print">Tulosta / PDF</button><button class="btn" id="vw-svg">Lataa SVG</button></div>`;
  const { el } = openSheet("Julkisivut ja leikkaus", html, { wide: true });
  const src = () => tab === "A" ? section(data, S, sec) : elevation(data, S, tab);
  const title = () => tab === "A" ? "Leikkaus A–A" : VIEWS.find(v => v[0] === tab)[1];
  const draw = () => {
    el.querySelectorAll("[data-vt]").forEach(b => b.classList.toggle("on", b.dataset.vt === tab));
    el.querySelector(".vw-sec").hidden = tab !== "A";
    el.querySelector("#vs-axis").value = sec.axis; el.querySelector("#vs-at").value = Math.round(sec.at); el.querySelector("#vs-flip").checked = !!sec.flip; el.querySelector("#vs-show").checked = sec.show !== false;
    const s = src(), e = s.ext();
    if (!e) { el.querySelector("#vw-prev").innerHTML = `<p class="muted">Ei näytettävää.</p>`; return; }
    const u = e.w / 720;
    el.querySelector("#vw-prev").innerHTML = `<svg class="vw-svg" viewBox="${e.x} ${e.y} ${e.w} ${e.h}" preserveAspectRatio="xMidYMid meet">${s.body(u)}</svg>`;
    el.querySelector("#vw-note").textContent = tab === "A" ? "Leikkaus näyttää leikkausviivan kohdalta leikatut seinät rakennekerroksineen (jos seinätyyppi on valittu), katon, huonekorkeudet ja leikatut kalusteet, kuten lauteet. Taustalla näkyvät seinät ovat ohuella viivalla."
      : "Julkisivu piirretään seinistä, aukoista ja katosta. Värit tulevat 3D-materiaaleista. Korkeustasot ovat oikeassa reunassa.";
  };
  el.addEventListener("click", e => { const b = e.target.closest("[data-vt]"); if (b) { tab = b.dataset.vt; draw(); } });
  el.addEventListener("change", e => {
    if (!e.target.id?.startsWith("vs-")) return;
    sec = { axis: el.querySelector("#vs-axis").value, at: Number(String(el.querySelector("#vs-at").value).replace(",", ".")) || 0, flip: el.querySelector("#vs-flip").checked, show: el.querySelector("#vs-show").checked };
    if (e.target.id === "vs-axis") { const d = defaultSection(data); const xs = data.walls.flatMap(w => [w.x1, w.x2]); sec.at = sec.axis === "x" ? d.at : Math.round((Math.min(...xs) + Math.max(...xs)) / 2 / 10) * 10; }
    onSection?.(sec); draw();
  });
  el.querySelector("#vw-print").onclick = () => openPrint(src(), proj, `${planName} – ${title()}`);
  el.querySelector("#vw-svg").onclick = () => {
    const s = src(), e = s.ext(), u = .25 * 50;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${(e.w / 50).toFixed(1)}mm" height="${(e.h / 50).toFixed(1)}mm" viewBox="${e.x} ${e.y} ${e.w} ${e.h}">${s.body(u)}</svg>`;
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); a.download = `${(planName + " " + title()).replace(/[^\wåäöÅÄÖ -]+/g, "").replace(/\s+/g, "_")}_1-50.svg`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  draw();
}
