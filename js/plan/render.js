// =============================================================
//  Piirustuksen SVG-piirto. Sama koodi editorissa, esikatselukuvissa ja tulosteessa.
//  u = montako millimetriä yksi "näyttöpikseli" on (viivojen ja tekstien koko).
// =============================================================
import { joints, wallPoly, wallDir, visLen, polyArea, polyCentroid, isRect, bboxPts, wallsBBox, planBBox, mm, m2, rot } from "./geom.js";
import { drawItem, KINDS } from "./catalog.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const f = v => Math.round(v * 100) / 100;
const pts = a => a.map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
export const readable = deg => { let a = ((deg % 360) + 360) % 360; if (a > 90 && a <= 270) a -= 180; return a; };

export const LAYERS = [["rooms", "Tilat"], ["walls", "Seinät, ovet ja ikkunat"], ["kaluste", "Kalusteet"], ["sahko", "Sähkö"], ["lvi", "LVI"], ["dims", "Mitat"], ["texts", "Tekstit"]];
export const DEFAULT_SETTINGS = {
  grid: 50, wallT: 150, wallH: 2400, newStatus: "new",
  showWallDims: true, showOverall: true, showRoomInfo: true, showOpeningLabels: true, showHeights: true,
  layers: Object.fromEntries(LAYERS.map(l => [l[0], true]))
};
export const settingsOf = p => ({ ...DEFAULT_SETTINGS, ...(p?.settings || {}), layers: { ...DEFAULT_SETTINGS.layers, ...(p?.settings?.layers || {}) } });
export const emptyData = () => ({ walls: [], openings: [], items: [], rooms: [], dims: [], texts: [] });
export const dataOf = p => ({ ...emptyData(), ...(p?.data || {}) });

// Piirustuksen värit. Editori asettaa muuttujat teeman mukaan, tuloste käyttää vaaleita oletuksia.
export const PLAN_CSS = `
.pl-room{fill:var(--p-room,#eef3f7)}
.wo{fill:var(--p-ink,#1d232a);stroke:var(--p-ink,#1d232a);stroke-linejoin:miter}
.wf-new{fill:var(--p-new,#2c333b)} .wf-existing{fill:var(--p-ex,#a7adb3)}
.wd{fill:var(--p-paper,#fff);stroke:var(--p-demo,#c0473f);stroke-dasharray:6 4;fill-opacity:.6}
.wo.sel,.wf-new.sel,.wf-existing.sel{fill:var(--p-sel,#2d7be0)}
.cut{fill:var(--p-paper,#fff)}
.ol{fill:none;stroke:var(--p-ink,#1d232a)} .ol.sel{stroke:var(--p-sel,#2d7be0)}
.ol.thin{stroke-width:inherit}
.it{--si:var(--p-ink,#1d232a)} .it.cat-sahko{--si:var(--p-elec,#c2410c)} .it.cat-lvi{--si:var(--p-lvi,#1d6fb8)}
.it .s{fill:var(--p-paper,#fff);stroke:var(--si)} .it .sl{fill:none;stroke:var(--si)} .it .sf{fill:var(--si);stroke:none}
.it .sh{fill:var(--p-ex,#a7adb3);stroke:var(--si)} .it .st{fill:var(--si);stroke:none;font-family:system-ui,sans-serif;font-weight:600}
.it.sel .s,.it.sel .sl,.it.sel .sh{stroke:var(--p-sel,#2d7be0)} .it.sel .sf,.it.sel .st{fill:var(--p-sel,#2d7be0)}
.safe{fill:var(--p-demo,#c0473f);fill-opacity:.07;stroke:var(--p-demo,#c0473f);stroke-dasharray:5 4}
.dm line,.dm path{stroke:var(--p-dim,#3a6b8f);fill:none} .dm text{fill:var(--p-dim,#3a6b8f)}
.dm.sel line,.dm.sel path{stroke:var(--p-sel,#2d7be0)} .dm.sel text{fill:var(--p-sel,#2d7be0)}
.pt{font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.wl{fill:var(--p-dim,#3a6b8f);font-weight:600}
.wl-bg{fill:var(--p-paper,#fff);fill-opacity:.85}
.rl .n{fill:var(--p-ink,#1d232a);font-weight:700} .rl .a{fill:var(--p-ink,#1d232a)} .rl .m{fill:var(--p-muted,#5f6b75)}
.rl.sel .n{fill:var(--p-sel,#2d7be0)}
.tx{fill:var(--p-ink,#1d232a)} .tx.sel{fill:var(--p-sel,#2d7be0)}
.ih{fill:var(--p-elec,#c2410c);font-weight:600}
.hit{fill:none;stroke:transparent;pointer-events:stroke}
`;

function textAt(x, y, deg, size, txt, cls, bg) {
  const a = readable(deg);
  const t = `<text class="pt ${cls}" x="0" y="0" font-size="${f(size)}" text-anchor="middle" dominant-baseline="central">${esc(txt)}</text>`;
  const b = bg ? `<rect class="wl-bg" x="${f(-size * .32 * String(txt).length - size * .3)}" y="${f(-size * .65)}" width="${f(size * .64 * String(txt).length + size * .6)}" height="${f(size * 1.3)}" rx="${f(size * .25)}"/>` : "";
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})">${b}${t}</g>`;
}

// Mittaviiva: apuviivat, vinoviivat päissä ja teksti viivan yläpuolella
export function dimLine(x1, y1, x2, y2, off, u, label, cls = "", attrs = "") {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return "";
  const dx = (x2 - x1) / L, dy = (y2 - y1) / L, nx = -dy, ny = dx, s = off >= 0 ? 1 : -1;
  const ax = x1 + nx * off, ay = y1 + ny * off, bx = x2 + nx * off, by = y2 + ny * off;
  const g = 2.5 * u, o = 3 * u, t = 3 * u;
  const ext = (px, py, qx, qy) => Math.abs(off) > g ? `<line x1="${f(px + nx * s * g)}" y1="${f(py + ny * s * g)}" x2="${f(qx + nx * s * o)}" y2="${f(qy + ny * s * o)}"/>` : "";
  const tick = (px, py) => `<line x1="${f(px - (dx + nx) * t)}" y1="${f(py - (dy + ny) * t)}" x2="${f(px + (dx + nx) * t)}" y2="${f(py + (dy + ny) * t)}" stroke-width="${f(u * 1.6)}"/>`;
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;
  const txt = label ?? mm(L);
  const fs = 10 * u;
  return `<g class="dm ${cls}" stroke-width="${f(u * .9)}" ${attrs}>${ext(x1, y1, ax, ay)}${ext(x2, y2, bx, by)}<line x1="${f(ax - dx * o)}" y1="${f(ay - dy * o)}" x2="${f(bx + dx * o)}" y2="${f(by + dy * o)}"/>${tick(ax, ay)}${tick(bx, by)}${textAt((ax + bx) / 2 + nx * s * fs * .75, (ay + by) / 2 + ny * s * fs * .75, deg, fs, txt, "")}</g>`;
}

// Oven/ikkunan sijainti seinällä
export function openingGeom(w, o) {
  const { dx, dy, nx, ny } = wallDir(w);
  const ax = w.x1 + dx * o.off, ay = w.y1 + dy * o.off;
  const bx = ax + dx * o.w, by = ay + dy * o.w;
  return { dx, dy, nx, ny, ax, ay, bx, by, h: w.t / 2 };
}

function drawOpening(w, o, u, S, sel) {
  const g = openingGeom(w, o);
  const { dx, dy, nx, ny, ax, ay, bx, by, h } = g;
  const c = sel ? " sel" : "";
  const e = u * 1.5;
  let s = `<g data-t="opening" data-id="${o.id}" class="op">`;
  s += `<polygon class="cut" points="${pts([[ax + nx * (h + e), ay + ny * (h + e)], [bx + nx * (h + e), by + ny * (h + e)], [bx - nx * (h + e), by - ny * (h + e)], [ax - nx * (h + e), ay - ny * (h + e)]])}"/>`;
  const sw = f(u * 1.3);
  const ln = (x1, y1, x2, y2, extra = "") => `<line class="ol${c}" stroke-width="${sw}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" ${extra}/>`;
  // karmit
  s += ln(ax + nx * h, ay + ny * h, ax - nx * h, ay - ny * h) + ln(bx + nx * h, by + ny * h, bx - nx * h, by - ny * h);
  const side = o.side === -1 ? -1 : 1;
  const leaf = (hx, hy, ox, oy, len) => {
    const lx = hx + nx * side * len, ly = hy + ny * side * len;
    const cross = (lx - hx) * (oy - hy) - (ly - hy) * (ox - hx);
    return `<path class="ol${c}" stroke-width="${sw}" d="M ${f(hx)} ${f(hy)} L ${f(lx)} ${f(ly)} A ${f(len)} ${f(len)} 0 0 ${cross > 0 ? 1 : 0} ${f(ox)} ${f(oy)}"/>`;
  };
  const fa = [ax + nx * side * h, ay + ny * side * h], fb = [bx + nx * side * h, by + ny * side * h];
  if (o.kind === "ovi") {
    s += o.hinge === "b" ? leaf(fb[0], fb[1], fa[0], fa[1], o.w) : leaf(fa[0], fa[1], fb[0], fb[1], o.w);
  } else if (o.kind === "pariovi") {
    const mx = (fa[0] + fb[0]) / 2, my = (fa[1] + fb[1]) / 2;
    s += leaf(fa[0], fa[1], mx, my, o.w / 2) + leaf(fb[0], fb[1], mx, my, o.w / 2);
  } else if (o.kind === "liukuovi") {
    const q = h * .45, mx = (ax + bx) / 2, my = (ay + by) / 2;
    s += ln(ax + nx * q, ay + ny * q, mx + dx * 60 + nx * q, my + dy * 60 + ny * q, `stroke-width="${f(u * 2.6)}"`);
    s += ln(mx - dx * 60 - nx * q, my - dy * 60 - ny * q, bx - nx * q, by - ny * q, `stroke-width="${f(u * 2.6)}"`);
  } else if (o.kind === "ikkuna") {
    s += ln(ax + nx * h, ay + ny * h, bx + nx * h, by + ny * h) + ln(ax - nx * h, ay - ny * h, bx - nx * h, by - ny * h);
    const q = Math.min(h * .3, 20);
    s += ln(ax + nx * q, ay + ny * q, bx + nx * q, by + ny * q) + ln(ax - nx * q, ay - ny * q, bx - nx * q, by - ny * q);
  } else {
    s += ln(ax + nx * h, ay + ny * h, bx + nx * h, by + ny * h, `stroke-dasharray="${f(u * 4)} ${f(u * 3)}"`) + ln(ax - nx * h, ay - ny * h, bx - nx * h, by - ny * h, `stroke-dasharray="${f(u * 4)} ${f(u * 3)}"`);
  }
  // valintaa varten näkymätön alue (myös oven lehden kohta)
  const reach = o.kind === "ovi" || o.kind === "pariovi" ? (o.kind === "ovi" ? o.w : o.w / 2) : 0;
  const p1 = side > 0 ? h + reach : h, p2 = side > 0 ? h : h + reach;
  s += `<polygon fill="transparent" points="${pts([[ax + nx * p1, ay + ny * p1], [bx + nx * p1, by + ny * p1], [bx - nx * p2, by - ny * p2], [ax - nx * p2, ay - ny * p2]])}"/>`;
  if (S.showOpeningLabels && o.kind !== "aukko") {
    const deg = Math.atan2(dy, dx) * 180 / Math.PI, fs = 8.5 * u;
    const k = -side * (h + fs * 1.1);
    const lab = o.label || `${fmtDm(o.w)}×${fmtDm(o.h)}`;
    s += textAt((ax + bx) / 2 + nx * k, (ay + by) / 2 + ny * k, deg, fs, lab, "wl");
  }
  return s + "</g>";
}
const fmtDm = v => { const d = v / 100; return Number.isInteger(d) ? String(d) : d.toFixed(1).replace(".", ","); };

export function renderPlan(data, S, opts = {}) {
  const u = opts.u || 1, sel = opts.sel || new Set(), Lr = S.layers;
  const walls = data.walls || [], J = joints(walls);
  const wById = Object.fromEntries(walls.map(w => [w.id, w]));
  const wb = wallsBBox(data);
  const cx = wb ? (wb.x1 + wb.x2) / 2 : 0, cy = wb ? (wb.y1 + wb.y2) / 2 : 0;
  let out = `<style>${PLAN_CSS}</style>`;

  // Tilat (taustaväri)
  if (Lr.rooms) for (const r of data.rooms || []) if (r.pts?.length > 2) out += `<polygon class="pl-room" points="${pts(r.pts.map(p => [p.x, p.y]))}" pointer-events="none"/>`;

  // Seinät: ensin ääriviivat, sitten täytöt päälle → liitoksissa ei näy sisäviivoja
  if (Lr.walls) {
    const solid = walls.filter(w => w.status !== "demolish");
    out += `<g stroke-width="${f(u * 2.6)}">`;
    for (const w of solid) out += `<polygon class="wo" points="${pts(wallPoly(w, J[w.id]))}"/>`;
    out += `</g>`;
    for (const w of solid) out += `<polygon data-t="wall" data-id="${w.id}" class="wf-${w.status === "existing" ? "existing" : "new"}${sel.has(w.id) ? " sel" : ""}" points="${pts(wallPoly(w, J[w.id]))}"/>`;
    for (const w of walls.filter(w => w.status === "demolish")) out += `<polygon data-t="wall" data-id="${w.id}" class="wd${sel.has(w.id) ? " sel" : ""}" stroke-width="${f(u * 1.4)}" points="${pts(wallPoly(w, J[w.id]))}"/>`;
    if (opts.hit) for (const w of walls) out += `<line class="hit" data-t="wall" data-id="${w.id}" stroke-width="${f(Math.max(w.t, 12 * u))}" x1="${f(w.x1)}" y1="${f(w.y1)}" x2="${f(w.x2)}" y2="${f(w.y2)}"/>`;
    for (const o of data.openings || []) { const w = wById[o.wallId]; if (w) out += drawOpening(w, o, u, S, sel.has(o.id)); }
  }

  // Kalusteet ja symbolit
  for (const it of data.items || []) {
    const K = KINDS[it.kind], cat = K?.cat || "kaluste";
    if (!Lr[cat]) continue;
    if (it.safe && (it.safe.f || it.safe.s || it.safe.b)) {
      const sf = it.safe, x = -it.w / 2 - (sf.s || 0), y = -it.d / 2 - (sf.b || 0);
      out += `<g transform="translate(${f(it.x)} ${f(it.y)}) rotate(${f(it.rot || 0)})" pointer-events="none"><rect class="safe" stroke-width="${f(u)}" x="${f(x)}" y="${f(y)}" width="${f(it.w + 2 * (sf.s || 0))}" height="${f(it.d + (sf.b || 0) + (sf.f || 0))}"/></g>`;
    }
    out += `<g data-t="item" data-id="${it.id}" class="it cat-${cat}${sel.has(it.id) ? " sel" : ""}" transform="translate(${f(it.x)} ${f(it.y)}) rotate(${f(it.rot || 0)})" stroke-width="${f(u * 1.15)}">${drawItem(it)}<rect fill="transparent" x="${f(-it.w / 2)}" y="${f(-it.d / 2)}" width="${f(it.w)}" height="${f(it.d)}"/></g>`;
    if (cat === "sahko" && S.showHeights && it.h != null && it.h !== "") {
      const [ox, oy] = rot(0, it.d / 2 + 8 * u, it.rot || 0);
      out += `<text class="pt ih" pointer-events="none" x="${f(it.x + ox)}" y="${f(it.y + oy)}" font-size="${f(7.5 * u)}" text-anchor="middle" dominant-baseline="central">+${esc(it.h)}</text>`;
    }
  }

  // Seinien pituudet
  if (Lr.walls && S.showWallDims) for (const w of walls) {
    const { dx, dy, nx, ny } = wallDir(w), j = J[w.id];
    const vl = visLen(w, j); if (vl < 30 * u) continue;
    const mxw = (w.x1 + w.x2) / 2 + dx * ((j.e2 - j.e1) / 2), myw = (w.y1 + w.y2) / 2 + dy * ((j.e2 - j.e1) / 2);
    const out_ = (mxw - cx) * nx + (myw - cy) * ny >= 0 ? 1 : -1;
    const k = out_ * (w.t / 2 + 8 * u);
    out += `<g pointer-events="none">${textAt(mxw + nx * k, myw + ny * k, Math.atan2(dy, dx) * 180 / Math.PI, 9.5 * u, mm(vl), "wl", false)}</g>`;
  }

  // Tilojen nimet ja pinta-alat
  if (Lr.rooms && !opts.noLabels) for (const r of data.rooms || []) {
    if (!(r.pts?.length > 2)) continue;
    const c = polyCentroid(r.pts), a = polyArea(r.pts), b = bboxPts(r.pts);
    const fs = 12 * u;
    let lines = [[r.name || "Tila", "n", fs]];
    if (S.showRoomInfo) {
      lines.push([`${m2(a)} m²`, "a", fs * .85]);
      if (isRect(r.pts)) lines.push([`${mm(b.x2 - b.x1)} × ${mm(b.y2 - b.y1)}`, "m", fs * .72]);
    }
    const tot = lines.reduce((s, l) => s + l[2] * 1.25, 0);
    let y = c.y - tot / 2;
    out += `<g data-t="room" data-id="${r.id}" class="rl${sel.has(r.id) ? " sel" : ""}">`;
    const wmax = Math.max(...lines.map(l => l[0].length * l[2] * .58));
    out += `<rect fill="transparent" x="${f(c.x - wmax / 2)}" y="${f(y)}" width="${f(wmax)}" height="${f(tot)}"/>`;
    for (const [t, k, s] of lines) { y += s * 1.25 / 2; out += `<text class="pt ${k}" x="${f(c.x)}" y="${f(y)}" font-size="${f(s)}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`; y += s * 1.25 / 2; }
    out += `</g>`;
  }

  // Kokonaismitat
  if (Lr.dims && S.showOverall && wb && walls.length) {
    const off = 34 * u;
    out += `<g pointer-events="none">${dimLine(wb.x1, wb.y1, wb.x2, wb.y1, -off, u)}${dimLine(wb.x1, wb.y2, wb.x1, wb.y1, -off, u)}</g>`;
  }
  // Omat mitat
  if (Lr.dims) for (const d of data.dims || []) out += dimLine(d.x1, d.y1, d.x2, d.y2, d.off || 0, u, d.label || null, sel.has(d.id) ? "sel" : "", `data-t="dim" data-id="${d.id}"`);
  // Tekstit
  if (Lr.texts) for (const t of data.texts || []) {
    const lines = String(t.text || "").split("\n"), fs = (t.size || 12) * u;
    out += `<text data-t="text" data-id="${t.id}" class="pt tx${sel.has(t.id) ? " sel" : ""}" x="${f(t.x)}" y="${f(t.y)}" font-size="${f(fs)}" ${t.bold ? 'font-weight="700"' : ""}>${lines.map((l, i) => `<tspan x="${f(t.x)}" dy="${i ? f(fs * 1.25) : 0}">${esc(l) || " "}</tspan>`).join("")}</text>`;
  }
  return out;
}

// Pieni esikatselukuva projektilistaan
export function thumbSvg(plan, w = 320, h = 200) {
  const data = dataOf(plan), S = settingsOf(plan);
  const b = planBBox(data);
  if (!b) return `<svg class="thumb-svg" viewBox="0 0 ${w} ${h}"><text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="currentColor" opacity=".45" font-size="13">Tyhjä piirustus</text></svg>`;
  const pad = Math.max(b.x2 - b.x1, b.y2 - b.y1) * .1 + 200;
  const vb = [b.x1 - pad, b.y1 - pad, b.x2 - b.x1 + 2 * pad, b.y2 - b.y1 + 2 * pad];
  const u = Math.max(vb[2] / w, vb[3] / h);
  return `<svg class="thumb-svg plan-svg" viewBox="${vb.map(f).join(" ")}" preserveAspectRatio="xMidYMid meet">${renderPlan(data, { ...S, showWallDims: false, showOverall: false, showRoomInfo: false, showOpeningLabels: false, showHeights: false, layers: { ...S.layers, dims: false, texts: false } }, { u: u * 1.2, noLabels: true })}</svg>`;
}
