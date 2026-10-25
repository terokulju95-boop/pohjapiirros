// =============================================================
//  Piirtoeditori (tietokone) ja katselutila (puhelin)
// =============================================================
import { uid, wlen, wallDir, project, joints, wallPoly, visLen, polyArea, isRect, bboxPts, planBBox, itemCorners, rot, same, mm, m2 } from "./geom.js";
import { renderPlan, dimLine, openingGeom, settingsOf, dataOf, LAYERS, DEFAULT_SETTINGS, readable } from "./render.js";
import { KINDS, CATS, OPENINGS, ROOM_NAMES, STATUS, drawItem } from "./catalog.js";
import { openQuantities } from "./quantities.js";
import { openPrint } from "./print.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const num = v => { const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : NaN; };
const f2 = v => Math.round(v * 100) / 100;
const ARR = { wall: "walls", opening: "openings", item: "items", room: "rooms", dim: "dims", text: "texts" };

export const TOOLS = [
  ["select", "Valitse", "V", '<path d="M5 3l13 8-6 1.5L9 19z"/>'],
  ["wall", "Seinä", "S", '<path d="M3 17h18M3 13h18"/><path d="M3 13v4M21 13v4"/>'],
  ["room", "Huone", "H", '<rect x="4" y="5" width="16" height="14"/><path d="M4 9h3M17 9h3"/>'],
  ["opening", "Ovi / ikkuna", "O", '<path d="M3 20h4M17 20h4"/><path d="M7 20V8a10 10 0 0 1 10 12"/>'],
  ["kaluste", "Kalusteet", "K", '<rect x="3" y="9" width="18" height="8" rx="2"/><path d="M5 17v2M19 17v2M6 9V6h12v3"/>'],
  ["sahko", "Sähkö", "E", '<path d="M13 2 5 14h6l-1 8 8-12h-6z"/>'],
  ["lvi", "LVI", "L", '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'],
  ["dim", "Mitta", "M", '<path d="M3 12h18M3 8v8M21 8v8"/><path d="m6 10-3 2 3 2M18 10l3 2-3 2"/>'],
  ["text", "Teksti", "T", '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'],
  ["measure", "Mittaa", "Q", '<path d="M4 17 17 4l3 3L7 20z"/><path d="m8 13 2 2M11 10l2 2M14 7l2 2"/>']
];
const HINTS = {
  select: "Napsauta valitaksesi · vedä siirtääksesi · vedä tyhjästä valitaksesi alueen · Delete poistaa · R kääntää",
  wall: "Napsauta seinän alku ja seuraavat nurkat · kirjoita pituus ja paina Enter · Esc tai kaksoisnapsautus lopettaa · Shift = vapaa kulma",
  room: "Vedä suorakaide sisämitoin – tai napsauta kerran ja anna mitat",
  opening: "Napsauta seinää · osoittimen puoli määrää aukeamissuunnan",
  kaluste: "Valitse kaluste oikealta ja napsauta paikka · R kääntää 90°",
  sahko: "Valitse symboli ja napsauta · seinän lähellä symboli kiinnittyy seinään",
  lvi: "Valitse symboli ja napsauta paikka",
  dim: "Napsauta mitan alku ja loppu, sitten mittaviivan etäisyys",
  text: "Napsauta tekstin paikka",
  measure: "Napsauta kaksi pistettä – etäisyys näytetään"
};
const ICON = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  back: '<path d="m15 18-6-6 6-6"/>'
};
const svgI = p => `<svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export function mountEditor(root, { plan, project: proj, readOnly = false, onBack, onSave, onRename, plans = [], onSwitch }) {
  const E = {
    data: structuredClone(dataOf(plan)), S: settingsOf(plan), ro: readOnly,
    zoom: .1, px: 0, py: 0, tool: readOnly ? "pan" : "select", sel: [], hist: [], fut: [],
    cur: { x: 0, y: 0 }, snapPt: null, guides: [], chain: null, lenBuf: "", drag: null,
    kind: { kaluste: "sanky", sahko: "pistorasia", lvi: "lattiakaivo" }, placeRot: 0,
    op: { kind: "ovi", ...structuredClone(OPENINGS) }, roomWalls: true,
    dimDraft: null, measure: null, roomDraft: null, preview: null, pointers: new Map(), pinch: null,
    saveTimer: null, saveState: "saved", lastSaved: JSON.stringify([plan.data || {}, plan.settings || {}]), space: false, clip: null
  };
  const live = { destroyed: false };

  root.innerHTML = `<div class="ed ${readOnly ? "ro" : ""}">
    <header class="ed-top">
      <button class="ed-btn" data-a="back" title="Takaisin projektiin">${svgI(ICON.back)}</button>
      <div class="ed-title"><small>${esc(proj?.name || "")}</small><button class="ed-name" data-a="rename" title="${readOnly ? "" : "Nimeä uudelleen"}">${esc(plan.name || "Piirustus")}</button></div>
      ${plans.length > 1 ? `<select class="ed-switch" data-a="switch" title="Vaihda piirustusta">${plans.map(p => `<option value="${esc(p.id)}" ${p.id === plan.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>` : ""}
      <div class="ed-sp"></div>
      ${readOnly ? "" : `<button class="ed-btn" data-a="undo" title="Kumoa (Ctrl+Z)">${svgI(ICON.undo)}</button><button class="ed-btn" data-a="redo" title="Tee uudelleen (Ctrl+Y)">${svgI(ICON.redo)}</button><span class="ed-div"></span>`}
      ${readOnly ? `<button class="ed-btn ed-measure" data-a="measure" title="Mittaa kahden pisteen väli">${svgI(TOOLS.find(t => t[0] === "measure")[3])}<span>Mittaa</span></button><button class="ed-btn" data-a="layers" title="Tasot">${svgI(ICON.layers)}</button>` : ""}
      <button class="ed-btn" data-a="fit" title="Sovita näkymään (F)">${svgI(ICON.fit)}</button>
      <button class="ed-btn wide" data-a="qty" title="Määrät ja materiaalit">${svgI(ICON.list)}<span>Määrät</span></button>
      ${readOnly ? "" : `<button class="ed-btn wide" data-a="print" title="Tulosta mittakaavassa">${svgI(ICON.print)}<span>Tulosta</span></button>`}
      <span class="ed-save" id="ed-save"></span>
    </header>
    <div class="ed-body">
      ${readOnly ? "" : `<nav class="ed-tools">${TOOLS.map(([k, l, key, ic]) => `<button class="ed-tool" data-tool="${k}" title="${l} (${key})">${svgI(ic)}<span>${l}</span></button>`).join("")}</nav>`}
      <div class="ed-canvas" id="ed-canvas">
        <svg id="cv" class="plan-svg" tabindex="0"><g id="world"></g></svg>
        <div class="ed-hint" id="ed-hint"></div>
        <div class="ed-len" id="ed-len" hidden></div>
        <div class="ed-zoom"><button data-a="zout" aria-label="Loitonna">−</button><span id="ed-zl"></span><button data-a="zin" aria-label="Lähennä">+</button></div>
        <div class="ed-info" id="ed-info" hidden></div>
      </div>
      ${readOnly ? "" : `<aside class="ed-panel" id="ed-panel"></aside>`}
    </div>
  </div>`;
  const $ = s => root.querySelector(s);
  const svg = $("#cv"), world = $("#world"), panelEl = $("#ed-panel"), canvasEl = $("#ed-canvas");

  // ---------- Apurit ----------
  const all = () => Object.entries(ARR).flatMap(([t, a]) => (E.data[a] || []).map(o => [t, o]));
  const find = id => { for (const [t, a] of Object.entries(ARR)) { const o = (E.data[a] || []).find(x => x.id === id); if (o) return { t, o }; } return null; };
  const W = id => E.data.walls.find(w => w.id === id);
  const J = () => joints(E.data.walls);
  const grid = () => E.S.grid || 0;
  const tol = () => 10 / E.zoom;
  const toWorld = (cx, cy) => { const r = svg.getBoundingClientRect(); return { x: (cx - r.left - E.px) / E.zoom, y: (cy - r.top - E.py) / E.zoom }; };

  // ---------- Tallennus ja kumoaminen ----------
  const snapData = () => JSON.stringify(E.data);
  function setSave(s) {
    E.saveState = s;
    const el = $("#ed-save"); if (!el) return;
    el.className = "ed-save " + s;
    el.textContent = s === "saving" ? "Tallennetaan…" : s === "dirty" ? "Muutettu" : navigator.onLine ? "Tallennettu" : "Tallennettu laitteelle";
  }
  function scheduleSave() {
    if (E.ro) return;
    setSave("dirty");
    clearTimeout(E.saveTimer);
    E.saveTimer = setTimeout(flush, 700);
  }
  function flush() {
    clearTimeout(E.saveTimer); E.saveTimer = null;
    if (E.ro || E.saveState === "saved") return;
    setSave("saving");
    E.lastSaved = JSON.stringify([E.data, E.S]);
    onSave?.(structuredClone(E.data), structuredClone(E.S));
    setTimeout(() => !live.destroyed && E.saveState === "saving" && setSave("saved"), 250);
  }
  function begin() { E.hist.push(snapData()); if (E.hist.length > 200) E.hist.shift(); E.fut = []; }
  function changed(keepPanel) { scheduleSave(); draw(); if (!keepPanel) panel(); }
  function mutate(fn, keepPanel) { begin(); fn(); changed(keepPanel); }
  function undo() {
    if (!E.hist.length) return;
    E.fut.push(snapData()); E.data = JSON.parse(E.hist.pop()); cleanSel(); changed();
  }
  function redo() {
    if (!E.fut.length) return;
    E.hist.push(snapData()); E.data = JSON.parse(E.fut.pop()); cleanSel(); changed();
  }
  const cleanSel = () => { E.sel = E.sel.filter(id => find(id)); };

  // ---------- Kohdistus (snap) ----------
  function candidates(exclude) {
    const c = [], j = J();
    for (const w of E.data.walls) {
      if (exclude.has(w.id)) continue;
      c.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 });
      for (const [x, y] of wallPoly(w, j[w.id])) c.push({ x, y, face: true });
    }
    for (const r of E.data.rooms) if (!exclude.has(r.id)) c.push(...r.pts);
    for (const d of E.data.dims) if (!exclude.has(d.id)) c.push({ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 });
    for (const it of E.data.items) if (!exclude.has(it.id)) { c.push({ x: it.x, y: it.y }); c.push(...itemCorners(it)); }
    return c;
  }
  function snapPoint(p, { from = null, exclude = new Set(), free = false, noGrid = false } = {}) {
    E.guides = [];
    const T = tol(), cands = candidates(exclude);
    let best = null, bd = T;
    for (const c of cands) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
    if (best) return { x: best.x, y: best.y, snapped: true };
    if (free) return { x: p.x, y: p.y };
    let q = { x: p.x, y: p.y }, locked = null;
    if (from) {
      const a = Math.atan2(p.y - from.y, p.x - from.x), a45 = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
      if (Math.abs(a - a45) < .12) {
        let len = Math.hypot(p.x - from.x, p.y - from.y);
        if (grid() && !noGrid) len = Math.round(len / grid()) * grid();
        q = { x: from.x + Math.cos(a45) * len, y: from.y + Math.sin(a45) * len };
        locked = Math.abs(Math.cos(a45)) < .01 ? "v" : Math.abs(Math.sin(a45)) < .01 ? "h" : "d";
      }
    }
    if (!locked) {
      // seinän keskilinjalle (T-liitos)
      for (const w of E.data.walls) {
        if (exclude.has(w.id)) continue;
        const pr = project(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
        if (pr.t > 0 && pr.t < pr.L && Math.abs(pr.d) < Math.min(T, w.t / 2)) return { x: pr.x, y: pr.y, snapped: true, onWall: w.id };
      }
      if (grid() && !noGrid) q = { x: Math.round(p.x / grid()) * grid(), y: Math.round(p.y / grid()) * grid() };
    }
    // kohdistus muiden pisteiden kanssa samaan linjaan
    if (locked !== "d") {
      let gx = null, gy = null, bx = T * .7, by = T * .7;
      for (const c of cands) {
        const ex = Math.abs(c.x - q.x), ey = Math.abs(c.y - q.y);
        if (locked !== "h" && ex < bx) { bx = ex; gx = c; }
        if (locked !== "v" && ey < by) { by = ey; gy = c; }
      }
      if (gx && locked !== "h") { q.x = gx.x; E.guides.push([gx.x, gx.y, q.x, q.y]); }
      if (gy && locked !== "v") { q.y = gy.y; E.guides.push([gy.x, gy.y, q.x, q.y]); }
      if (locked === "v" && gy) { q.y = gy.y; E.guides.push([gy.x, gy.y, q.x, q.y]); }
      if (locked === "h" && gx) { q.x = gx.x; E.guides.push([gx.x, gx.y, q.x, q.y]); }
    }
    return q;
  }
  function nearestWall(p, maxD) {
    let best = null, bd = Infinity;
    for (const w of E.data.walls) {
      const pr = project(p.x, p.y, w.x1, w.y1, w.x2, w.y2);
      const d = Math.abs(pr.d) - w.t / 2;
      if (pr.t >= -10 && pr.t <= pr.L + 10 && d < maxD && d < bd) { bd = d; best = { w, pr }; }
    }
    return best;
  }

  // ---------- Näkymä ----------
  function fit() {
    const r = svg.getBoundingClientRect();
    const b = planBBox(E.data) || { x1: -1000, y1: -1000, x2: 5000, y2: 4000 };
    const pad = 70, bw = Math.max(1000, b.x2 - b.x1), bh = Math.max(1000, b.y2 - b.y1);
    E.zoom = Math.min((r.width - pad * 2) / bw, (r.height - pad * 2) / bh);
    E.zoom = Math.max(.005, Math.min(2, E.zoom));
    E.px = r.width / 2 - (b.x1 + bw / 2) * E.zoom; E.py = r.height / 2 - (b.y1 + bh / 2) * E.zoom;
    draw();
  }
  function zoomAt(k, sx, sy) {
    const r = svg.getBoundingClientRect();
    if (sx === undefined) { sx = r.width / 2; sy = r.height / 2; }
    const nz = Math.max(.005, Math.min(3, E.zoom * k));
    E.px = sx - (sx - E.px) * nz / E.zoom; E.py = sy - (sy - E.py) * nz / E.zoom; E.zoom = nz;
    draw();
  }

  // ---------- Piirto ----------
  let raf = 0;
  function draw() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (!live.destroyed) paint(); }); }
  function gridSvg(u) {
    const r = svg.getBoundingClientRect();
    const x0 = -E.px / E.zoom, y0 = -E.py / E.zoom, w = r.width / E.zoom, h = r.height / E.zoom;
    let g = grid() || 100; while (g * E.zoom < 9) g *= g < 100 ? 2 : 5;
    const major = 1000 * E.zoom >= 24 ? 1000 : 5000;
    return `<defs><pattern id="gmin" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M ${g} 0 L 0 0 0 ${g}" fill="none" class="g-min" stroke-width="${u * .7}"/></pattern>
      <pattern id="gmaj" width="${major}" height="${major}" patternUnits="userSpaceOnUse"><path d="M ${major} 0 L 0 0 0 ${major}" fill="none" class="g-maj" stroke-width="${u}"/></pattern></defs>
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#gmin)"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="url(#gmaj)"/>
      <path class="g-origin" stroke-width="${u}" d="M ${-200} 0 H 200 M 0 -200 V 200"/>`;
  }
  function paint() {
    const u = 1 / E.zoom;
    world.setAttribute("transform", `translate(${f2(E.px)} ${f2(E.py)}) scale(${E.zoom})`);
    let d = E.data;
    if (E.preview) {
      d = { ...d };
      if (E.preview.opening) d.openings = [...d.openings, E.preview.opening];
      if (E.preview.item) d.items = [...d.items, E.preview.item];
    }
    world.innerHTML = gridSvg(u) + `<g class="${E.preview ? "has-prev" : ""}">${renderPlan(d, E.S, { u, sel: new Set(E.sel), hit: true })}</g>` + overlays(u);
    $("#ed-zl").textContent = Math.round(E.zoom * 1000) / 10 + " %";
    const hint = E.ro ? (E.tool === "measure" ? HINTS.measure : "Vedä siirtääksesi · nipistä zoomataksesi · napauta kohdetta nähdäksesi mitat") : HINTS[E.tool] || "";
    $("#ed-hint").textContent = hint;
    const lb = $("#ed-len");
    if (E.chain && E.lenBuf) { lb.hidden = false; lb.textContent = `Pituus: ${E.lenBuf} mm ⏎`; } else lb.hidden = true;
    root.querySelectorAll(".ed-tool").forEach(b => b.classList.toggle("on", b.dataset.tool === E.tool));
    root.querySelector(".ed-measure")?.classList.toggle("on", E.tool === "measure");
    const ub = root.querySelector('[data-a="undo"]'), rb = root.querySelector('[data-a="redo"]');
    if (ub) ub.disabled = !E.hist.length; if (rb) rb.disabled = !E.fut.length;
    canvasEl.dataset.tool = E.tool;
  }

  function handle(x, y, h, u, cls = "") { return `<circle class="hdl ${cls}" data-h="${h}" cx="${f2(x)}" cy="${f2(y)}" r="${f2(5.5 * u)}" stroke-width="${f2(1.6 * u)}"/>`; }
  function overlays(u) {
    let s = "";
    const j = J();
    // valinnan kahvat
    if (!E.ro && E.tool === "select") for (const id of E.sel) {
      const F = find(id); if (!F) continue;
      const { t, o } = F;
      if (t === "wall") s += handle(o.x1, o.y1, `we:${o.id}:1`, u) + handle(o.x2, o.y2, `we:${o.id}:2`, u);
      if (t === "room") o.pts.forEach((p, i) => s += handle(p.x, p.y, `rv:${o.id}:${i}`, u, "sq"));
      if (t === "dim") s += handle(o.x1, o.y1, `de:${o.id}:1`, u) + handle(o.x2, o.y2, `de:${o.id}:2`, u);
      if (t === "item") {
        const c = itemCorners(o);
        s += `<polygon class="selbox" stroke-width="${f2(u)}" points="${c.map(p => `${f2(p.x)},${f2(p.y)}`).join(" ")}"/>`;
        const [hx, hy] = rot(0, -o.d / 2 - 22 * u, o.rot || 0), [lx, ly] = rot(0, -o.d / 2, o.rot || 0);
        s += `<line class="selbox" stroke-width="${f2(u)}" x1="${f2(o.x + lx)}" y1="${f2(o.y + ly)}" x2="${f2(o.x + hx)}" y2="${f2(o.y + hy)}"/>` + handle(o.x + hx, o.y + hy, `ir:${o.id}`, u, "rot");
      }
    }
    // valitun kohteen apumitat
    if (E.sel.length === 1 && (!E.drag || E.drag.type === "move" || E.drag.type === "we")) {
      const F = find(E.sel[0]);
      if (F?.t === "opening") s += openingDims(F.o, u, j);
      if (F?.t === "item") s += itemDims(F.o, u, j);
      if (F?.t === "wall") s += wallGaps(F.o, j).map(g => dimLine(g.ax, g.ay, g.bx, g.by, 0, u, null, "live")).join("");
    }
    for (const [x1, y1, x2, y2] of E.guides) s += `<line class="guide" stroke-width="${f2(u)}" x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}"/>`;
    if (E.snapPt?.snapped) s += `<rect class="snapmark" stroke-width="${f2(1.5 * u)}" x="${f2(E.snapPt.x - 5 * u)}" y="${f2(E.snapPt.y - 5 * u)}" width="${f2(10 * u)}" height="${f2(10 * u)}"/>`;
    // seinän piirto
    if (E.chain) {
      const a = E.chain[E.chain.length - 1], b = E.cur;
      const t = E.S.wallT, L = Math.hypot(b.x - a.x, b.y - a.y);
      if (L > 1) {
        const ghost = { id: "_g", x1: a.x, y1: a.y, x2: b.x, y2: b.y, t };
        s += `<polygon class="ov-ghost" stroke-width="${f2(u)}" points="${wallPoly(ghost).map(([x, y]) => `${f2(x)},${f2(y)}`).join(" ")}"/>`;
        s += dimLine(a.x, a.y, b.x, b.y, -(t / 2 + 16 * u), u, mm(L), "live");
        s += wallGaps(ghost, j).map(g => dimLine(g.ax, g.ay, g.bx, g.by, 0, u, null, "live")).join("");
      }
      s += `<circle class="snapmark" cx="${f2(a.x)}" cy="${f2(a.y)}" r="${f2(3 * u)}"/>`;
    }
    if (E.roomDraft?.b) {
      const { a, b } = E.roomDraft, x1 = Math.min(a.x, b.x), y1 = Math.min(a.y, b.y), x2 = Math.max(a.x, b.x), y2 = Math.max(a.y, b.y);
      const t = E.roomWalls ? E.S.wallT : 0;
      if (t) s += `<rect class="ov-ghost" stroke-width="${f2(u)}" x="${f2(x1 - t)}" y="${f2(y1 - t)}" width="${f2(x2 - x1 + 2 * t)}" height="${f2(y2 - y1 + 2 * t)}"/>`;
      s += `<rect class="ov-ghost-in" stroke-width="${f2(u)}" x="${f2(x1)}" y="${f2(y1)}" width="${f2(x2 - x1)}" height="${f2(y2 - y1)}"/>`;
      s += dimLine(x1, y1, x2, y1, -(t + 18 * u), u, null, "live") + dimLine(x1, y2, x1, y1, -(t + 18 * u), u, null, "live");
      s += `<text class="pt live-t" x="${f2((x1 + x2) / 2)}" y="${f2((y1 + y2) / 2)}" font-size="${f2(12 * u)}" text-anchor="middle">${m2((x2 - x1) * (y2 - y1))} m²</text>`;
    }
    if (E.dimDraft) {
      const { a, b, off } = E.dimDraft, bb = b || E.cur;
      s += dimLine(a.x, a.y, bb.x, bb.y, off || 0, u, null, "live");
    }
    if (E.measure?.a) {
      const a = E.measure.a, b = E.measure.b || E.cur;
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      s += `<line class="measure" stroke-width="${f2(2 * u)}" x1="${f2(a.x)}" y1="${f2(a.y)}" x2="${f2(b.x)}" y2="${f2(b.y)}"/>`;
      s += `<circle class="measure-pt" cx="${f2(a.x)}" cy="${f2(a.y)}" r="${f2(4 * u)}"/><circle class="measure-pt" cx="${f2(b.x)}" cy="${f2(b.y)}" r="${f2(4 * u)}"/>`;
      const deg = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const nx = -(b.y - a.y) / (L || 1), ny = (b.x - a.x) / (L || 1);
      s += `<g transform="translate(${f2(mx + nx * 16 * u)} ${f2(my + ny * 16 * u)}) rotate(${f2(readable(deg))})"><rect class="measure-bg" x="${f2(-38 * u)}" y="${f2(-11 * u)}" width="${f2(76 * u)}" height="${f2(22 * u)}" rx="${f2(6 * u)}"/><text class="pt measure-t" font-size="${f2(13 * u)}" text-anchor="middle" dominant-baseline="central">${mm(L)} mm</text></g>`;
    }
    if (E.drag?.type === "box" && E.drag.b) {
      const { a, b } = E.drag;
      s += `<rect class="boxsel" stroke-width="${f2(u)}" x="${f2(Math.min(a.x, b.x))}" y="${f2(Math.min(a.y, b.y))}" width="${f2(Math.abs(b.x - a.x))}" height="${f2(Math.abs(b.y - a.y))}"/>`;
    }
    return `<g class="ov">${s}</g>`;
  }
  // Oven/ikkunan etäisyydet seinän päihin
  function openingDims(o, u, j) {
    const w = W(o.wallId); if (!w) return "";
    const g = openingGeom(w, o), jj = j[w.id];
    const sx = w.x1 - g.dx * jj.l1, sy = w.y1 - g.dy * jj.l1, ex = w.x2 + g.dx * jj.l2, ey = w.y2 + g.dy * jj.l2;
    const side = o.side === -1 ? 1 : -1, off = side * (g.h + 14 * u);
    let s = "";
    if (Math.hypot(g.ax - sx, g.ay - sy) > 1) s += dimLine(sx, sy, g.ax, g.ay, off, u, null, "live");
    if (Math.hypot(ex - g.bx, ey - g.by) > 1) s += dimLine(g.bx, g.by, ex, ey, off, u, null, "live");
    return s;
  }
  // Kalusteen etäisyydet lähimpiin seinäpintoihin (kun kalusteen kulma on 0/90/180/270)
  // Säde kohti lähintä seinäpintaa: palauttaa etäisyyden tai Infinity
  function rayHit(px, py, dx, dy, polys, minT = 0) {
    let best = Infinity;
    for (const P of polys) for (let i = 0; i < P.length; i++) {
      const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
      const sx = x2 - x1, sy = y2 - y1, den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - px) * sy - (y1 - py) * sx) / den, k = ((x1 - px) * dy - (y1 - py) * dx) / den;
      if (t > minT && k >= 0 && k <= 1 && t < best) best = t;
    }
    return best;
  }
  // Seinän vapaa väli viereisiin seiniin molemmin puolin (pinnasta pintaan, seinän keskikohdalta)
  function wallGaps(w, j) {
    const L = wlen(w); if (L < 1) return [];
    const { nx, ny } = wallDir(w), mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
    const polys = E.data.walls.filter(o => o.id !== w.id).map(o => wallPoly(o, j[o.id]));
    const out = [];
    for (const side of [1, -1]) {
      const ax = mx + nx * side * w.t / 2, ay = my + ny * side * w.t / 2;
      const t = rayHit(ax, ay, nx * side, ny * side, polys, .5);
      if (t < 30000) out.push({ side, dist: t, ax, ay, bx: ax + nx * side * t, by: ay + ny * side * t, nx: nx * side, ny: ny * side });
    }
    return out;
  }
  const dirName = (x, y) => Math.abs(x) >= Math.abs(y) ? (x > 0 ? "oikealla" : "vasemmalla") : (y > 0 ? "alapuolella" : "yläpuolella");
  function itemDims(it, u, j) {
    const r = (((it.rot || 0) % 360) + 360) % 360;
    if (r % 90) return "";
    const swap = r === 90 || r === 270, ex = (swap ? it.d : it.w) / 2, ey = (swap ? it.w : it.d) / 2;
    const polys = E.data.walls.map(w => wallPoly(w, j[w.id]));
    let s = "";
    for (const [dx, dy, e] of [[1, 0, ex], [-1, 0, ex], [0, 1, ey], [0, -1, ey]]) {
      let best = Infinity;
      for (const P of polys) for (let i = 0; i < 4; i++) {
        const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 4];
        const sx = x2 - x1, sy = y2 - y1, den = dx * sy - dy * sx;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((x1 - it.x) * sy - (y1 - it.y) * sx) / den, k = ((x1 - it.x) * dy - (y1 - it.y) * dx) / den;
        if (t > e - 1 && k >= 0 && k <= 1 && t < best) best = t;
      }
      if (best < 8000 && best - e > 1) {
        const ax = it.x + dx * e, ay = it.y + dy * e, bx = it.x + dx * best, by = it.y + dy * best;
        s += dimLine(ax, ay, bx, by, 0, u, null, "live");
      }
    }
    return s;
  }

  // ---------- Paneeli ----------
  const inp = (k, label, v, extra = "") => `<label class="pf"><span>${label}</span><input data-k="${k}" value="${esc(v ?? "")}" inputmode="decimal" ${extra}></label>`;
  const txt = (k, label, v, list) => `<label class="pf"><span>${label}</span><input data-k="${k}" value="${esc(v ?? "")}" ${list ? `list="pl-${k}"` : ""}>${list ? `<datalist id="pl-${k}">${list.map(x => `<option value="${esc(x)}">`).join("")}</datalist>` : ""}</label>`;
  const sel = (k, label, v, opts) => `<label class="pf"><span>${label}</span><select data-k="${k}">${opts.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === String(v) ? "selected" : ""}>${esc(b)}</option>`).join("")}</select></label>`;
  const chk = (k, label, v) => `<label class="pc"><input type="checkbox" data-k="${k}" ${v ? "checked" : ""}><span>${label}</span></label>`;
  const ro_ = (label, v) => `<div class="pf ro"><span>${label}</span><b>${v}</b></div>`;
  const btn = (a, label, cls = "") => `<button class="btn small ${cls}" data-pa="${a}">${label}</button>`;
  const H = t => `<h3 class="ph">${t}</h3>`;
  const itemIcon = (k, size = 44) => {
    const K = KINDS[k], it = { kind: k, w: K.w, d: K.d, label: "" }, m = Math.max(K.w, K.d) * 1.15, u = m / size;
    return `<svg class="plan-svg" viewBox="${-m / 2} ${-m / 2} ${m} ${m}"><g class="it cat-${K.cat}" stroke-width="${u * 1.4}">${drawItem(it)}</g></svg>`;
  };

  function panel() {
    if (!panelEl) return;
    const active = document.activeElement, focusK = panelEl.contains(active) ? active.dataset.k : null;
    panelEl.innerHTML = panelHtml();
    if (focusK) { const el = panelEl.querySelector(`[data-k="${focusK}"]`); if (el && el !== active) { el.focus(); el.select?.(); } }
  }
  function panelHtml() {
    const t = E.tool, S = E.S;
    if (t === "kaluste" || t === "sahko" || t === "lvi") {
      const cur = E.kind[t];
      return H(CATS.find(c => c[0] === t)[1]) + `<div class="cat-grid">${Object.values(KINDS).filter(K => K.cat === t).map(K => `<button class="cat-item ${K.k === cur ? "on" : ""}" data-kind="${K.k}" title="${esc(K.name)}">${itemIcon(K.k)}<span>${esc(K.name)}</span></button>`).join("")}</div>
        <p class="pn">R kääntää ennen sijoittamista (nyt ${E.placeRot}°). Mitat ja nimen voi muuttaa sijoittamisen jälkeen.</p>`;
    }
    if (t === "opening") {
      const o = E.op[E.op.kind];
      return H("Ovi tai ikkuna") + `<div class="seg-mini">${Object.entries(OPENINGS).map(([k, v]) => `<button data-opk="${k}" class="${E.op.kind === k ? "on" : ""}">${v.name}</button>`).join("")}</div>
        ${inp("op.w", "Leveys (mm)", o.w)}${inp("op.h", "Korkeus (mm)", o.h)}${E.op.kind === "ikkuna" ? inp("op.sill", "Alareunan korkeus lattiasta (mm)", o.sill) : ""}
        <p class="pn">Ovien yleiset karmimitat: 7×19 = 700×1900 (sauna), 8×21, 9×21 = 900×2100, 10×21 (ulko-ovi).</p>`;
    }
    if (t === "wall") return H("Uusi seinä") + inp("s.wallT", "Paksuus (mm)", S.wallT) + inp("s.wallH", "Korkeus (mm)", S.wallH) + sel("s.newStatus", "Tila", S.newStatus, STATUS) +
      `<p class="pn">Seinän pituus mitataan keskilinjasta. Nurkissa seinät liittyvät automaattisesti, ja seinän viereen näytetään sen ulkopinnan pituus.</p>`;
    if (t === "room") return H("Huone") + chk("roomWalls", "Luo seinät ympärille", E.roomWalls) + inp("s.wallT", "Seinän paksuus (mm)", S.wallT) + sel("s.newStatus", "Seinien tila", S.newStatus, STATUS) +
      `<p class="pn">Huone piirretään sisämitoin. Seinät tulevat sisämitan ulkopuolelle.</p>`;
    if (t === "dim" || t === "text" || t === "measure") return H(TOOLS.find(x => x[0] === t)[1]) + `<p class="pn">${HINTS[t]}</p>`;

    if (E.sel.length > 1) return H(`${E.sel.length} kohdetta valittu`) + `<div class="pbtns">${btn("dup", "Monista")}${btn("del", "Poista", "danger ghost")}</div><p class="pn">Siirrä vetämällä tai nuolinäppäimillä (Shift = 10× ruudukko).</p>`;
    if (E.sel.length === 1) {
      const F = find(E.sel[0]); if (!F) return "";
      const { t: ty, o } = F, j = J();
      if (ty === "wall") {
        const jj = j[o.id], L = wlen(o), ang = Math.round(((Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180 / Math.PI) + 360) % 360 * 10) / 10;
        const ops = E.data.openings.filter(x => x.wallId === o.id);
        const area = (L + jj.l1 + jj.l2) * (o.h || S.wallH) - ops.reduce((s, x) => s + x.w * x.h, 0);
        return H("Seinä") + inp("w.vis", "Pituus (näkyvä, mm)", mm(visLen(o, jj))) + inp("w.len", "Pituus keskilinjasta (mm)", mm(L)) + inp("w.t", "Paksuus (mm)", o.t) + inp("w.h", "Korkeus (mm)", o.h ?? S.wallH, `placeholder="${S.wallH}"`) +
          sel("w.status", "Tila", o.status || "new", STATUS) + inp("w.ang", "Suunta (°)", ang) +
          wallGaps(o, j).map(g => inp("w.gap" + g.side, `Väli seinään ${dirName(g.nx, g.ny)} (mm)`, mm(g.dist))).join("") +
          ro_("Seinäpinta, yksi puoli", `${m2(Math.max(0, area))} m²`) + (ops.length ? ro_("Aukkoja", ops.length) : "") +
          `<div class="pbtns">${btn("split", "Jaa kahtia")}${btn("flip", "Käännä suunta")}${btn("dup", "Monista")}${btn("del", "Poista", "danger ghost")}</div>`;
      }
      if (ty === "opening") {
        const w = W(o.wallId), jj = w ? j[w.id] : { l1: 0, l2: 0 }, vl = w ? visLen(w, jj) : 0, start = o.off + jj.l1;
        return H(OPENINGS[o.kind]?.name || "Aukko") + sel("o.kind", "Tyyppi", o.kind, Object.entries(OPENINGS).map(([k, v]) => [k, v.name])) +
          inp("o.w", "Leveys (mm)", o.w) + inp("o.h", "Korkeus (mm)", o.h) + (o.kind === "ikkuna" ? inp("o.sill", "Alareuna lattiasta (mm)", o.sill) : "") +
          inp("o.start", "Etäisyys seinän alusta (mm)", mm(start)) + ro_("Etäisyys seinän lopusta", `${mm(vl - start - o.w)} mm`) +
          txt("o.label", "Merkintä (tyhjä = mitat)", o.label || "") +
          `<div class="pbtns">${o.kind !== "ikkuna" && o.kind !== "aukko" ? btn("oside", "Aukeaa toiselle puolelle") : ""}${o.kind === "ovi" ? btn("ohinge", "Saranat toiseen reunaan") : ""}${btn("ocenter", "Keskitä seinälle")}${btn("del", "Poista", "danger ghost")}</div>`;
      }
      if (ty === "item") {
        const K = KINDS[o.kind] || { name: "?" };
        const wallTag = K.cat === "sahko" || K.cat === "lvi";
        return H(esc(K.name)) + txt("i.label", "Nimi / merkintä", o.label || "") +
          `<div class="pf2">${inp("i.w", "Leveys", o.w)}${inp("i.d", "Syvyys", o.d)}</div><div class="pf2">${inp("i.x", "X", mm(o.x))}${inp("i.y", "Y", mm(o.y))}</div>` +
          inp("i.rot", "Kulma (°)", o.rot || 0) + (wallTag ? inp("i.h", "Asennuskorkeus lattiasta (mm)", o.h ?? "") : "") +
          (K.hot ? H("Suojaetäisyydet") + `<p class="pn">Katso arvot kiukaan/tulisijan asennusohjeesta. Alue näkyy punaisena katkoviivana.</p><div class="pf2">${inp("i.sf", "Eteen", o.safe?.f || 0)}${inp("i.ss", "Sivuille", o.safe?.s || 0)}</div>${inp("i.sb", "Taakse", o.safe?.b || 0)}` : "") +
          txt("i.note", "Huomio", o.note || "") +
          `<div class="pbtns">${btn("rot90", "Käännä 90°")}${btn("dup", "Monista")}${btn("del", "Poista", "danger ghost")}</div>`;
      }
      if (ty === "room") {
        const b = bboxPts(o.pts), rect = isRect(o.pts);
        return H("Tila") + txt("r.name", "Nimi", o.name, ROOM_NAMES) + ro_("Pinta-ala", `${m2(polyArea(o.pts))} m²`) +
          (rect ? `<div class="pf2">${inp("r.w", "Leveys", mm(b.x2 - b.x1))}${inp("r.h", "Syvyys", mm(b.y2 - b.y1))}</div>` : ro_("Kulmia", o.pts.length)) +
          inp("r.ch", "Huonekorkeus (mm)", o.ch ?? "", `placeholder="${S.wallH}"`) + txt("r.floor", "Lattia / pintamateriaali", o.floor || "") +
          `<div class="pbtns">${btn("walls", "Luo seinät ympärille")}${btn("dup", "Monista")}${btn("del", "Poista", "danger ghost")}</div><p class="pn">Kulmia voi siirtää vetämällä neliökahvoista.</p>`;
      }
      if (ty === "dim") return H("Mitta") + ro_("Pituus", `${mm(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))} mm`) + inp("d.off", "Etäisyys mitattavasta", mm(o.off || 0)) + txt("d.label", "Oma teksti (tyhjä = pituus)", o.label || "") + `<div class="pbtns">${btn("del", "Poista", "danger ghost")}</div>`;
      if (ty === "text") return H("Teksti") + `<label class="pf"><span>Teksti</span><textarea data-k="t.text" rows="3">${esc(o.text)}</textarea></label>` + inp("t.size", "Koko", o.size || 12) + chk("t.bold", "Lihavoitu", o.bold) + `<div class="pbtns">${btn("dup", "Monista")}${btn("del", "Poista", "danger ghost")}</div>`;
    }
    // Ei valintaa: piirustuksen asetukset
    return H("Piirustus") + sel("s.grid", "Ruudukko ja kohdistus", S.grid, [[0, "Ei kohdistusta"], [10, "10 mm"], [50, "50 mm"], [100, "100 mm"], [500, "500 mm"]]) +
      inp("s.wallH", "Seinien oletuskorkeus (mm)", S.wallH) + inp("s.wallT", "Seinän oletuspaksuus (mm)", S.wallT) +
      H("Näytä") + chk("s.showWallDims", "Seinien pituudet", S.showWallDims) + chk("s.showOverall", "Kokonaismitat", S.showOverall) + chk("s.showRoomInfo", "Tilojen pinta-alat ja mitat", S.showRoomInfo) + chk("s.showOpeningLabels", "Ovien ja ikkunoiden koot", S.showOpeningLabels) + chk("s.showHeights", "Sähkörasioiden korkeudet", S.showHeights) +
      H("Tasot") + LAYERS.map(([k, l]) => chk("L." + k, l, S.layers[k])).join("") +
      `<details class="keys"><summary>Pikanäppäimet</summary><dl>
        <dt>V S H O K E L M T Q</dt><dd>Työkalut</dd><dt>Esc</dt><dd>Lopeta / poista valinta</dd><dt>Delete</dt><dd>Poista valitut</dd>
        <dt>Ctrl+Z / Ctrl+Y</dt><dd>Kumoa / tee uudelleen</dd><dt>Ctrl+C / Ctrl+V / Ctrl+D</dt><dd>Kopioi / liitä / monista</dd>
        <dt>R</dt><dd>Käännä 90°</dd><dt>Nuolet</dt><dd>Siirrä (Shift = 10×)</dd><dt>F</dt><dd>Sovita näkymään</dd>
        <dt>Välilyönti + veto, hiiren rulla-painike</dt><dd>Siirrä näkymää</dd><dt>Rulla</dt><dd>Zoomaa</dd><dt>Shift seinää piirtäessä</dt><dd>Vapaa kulma</dd></dl></details>`;
  }

  function moveWallEnd(w, end, x, y, links) {
    for (const [ow, oe] of links) { ow["x" + oe] = x; ow["y" + oe] = y; }
    w["x" + end] = x; w["y" + end] = y;
  }
  const linksOf = (w, end, skip = new Set()) => {
    const px = w["x" + end], py = w["y" + end], r = [];
    for (const o of E.data.walls) { if (o === w || skip.has(o.id)) continue; for (const e of [1, 2]) if (same(o["x" + e], o["y" + e], px, py)) r.push([o, e]); }
    return r;
  };

  function onPanelChange(e) {
    const el = e.target, k = el.dataset.k; if (!k) return;
    const v = el.type === "checkbox" ? el.checked : el.value, n = num(v);
    const [g, key] = k.split(".");
    if (k === "roomWalls") { E.roomWalls = v; return; }
    if (g === "s") {
      E.S[key] = typeof v === "boolean" ? v : key === "newStatus" ? v : (isFinite(n) ? n : E.S[key]);
      scheduleSave(); draw(); return;
    }
    if (g === "L") { E.S.layers[key] = v; scheduleSave(); draw(); return; }
    if (g === "op") { if (isFinite(n) && n > 0 || key === "sill") E.op[E.op.kind][key] = isFinite(n) ? n : 0; return; }
    const F = find(E.sel[0]); if (!F) return;
    const o = F.o;
    mutate(() => {
      if (g === "w") {
        const { dx, dy } = wallDir(o), jj = J()[o.id];
        if ((key === "vis" || key === "len") && n > 0) {
          const L = key === "vis" ? n - jj.l1 - jj.l2 : n;
          if (L > 1) moveWallEnd(o, 2, o.x1 + dx * L, o.y1 + dy * L, linksOf(o, 2));
        }
        if (key === "t" && n > 0) o.t = n;
        if (key.startsWith("gap") && n >= 0) {
          const g = wallGaps(o, J()).find(x => String(x.side) === key.slice(3));
          if (g) { const d = g.dist - n; applyMove(captureMove([o.id]), g.nx * d, g.ny * d); }
        }
        if (key === "h") { if (v === "") delete o.h; else if (n > 0) o.h = n; }
        if (key === "status") o.status = v;
        if (key === "ang" && isFinite(n)) { const L = wlen(o), a = n * Math.PI / 180; moveWallEnd(o, 2, o.x1 + Math.cos(a) * L, o.y1 + Math.sin(a) * L, linksOf(o, 2)); }
      }
      if (g === "o") {
        const w = W(o.wallId), jj = w ? J()[w.id] : { l1: 0 };
        if (key === "kind") { o.kind = v; if (v === "ikkuna" && !o.sill) o.sill = OPENINGS.ikkuna.sill; }
        if (["w", "h"].includes(key) && n > 0) o[key] = n;
        if (key === "sill" && isFinite(n)) o.sill = n;
        if (key === "start" && isFinite(n)) o.off = n - jj.l1;
        if (key === "label") o.label = v;
        if (w) o.off = Math.max(0, Math.min(wlen(w) - o.w, o.off));
      }
      if (g === "i") {
        if (["w", "d"].includes(key) && n > 0) o[key] = n;
        if (["x", "y"].includes(key) && isFinite(n)) o[key] = n;
        if (key === "rot" && isFinite(n)) o.rot = ((n % 360) + 360) % 360;
        if (key === "h") o.h = v === "" ? null : isFinite(n) ? n : o.h;
        if (key === "label") o.label = v;
        if (key === "note") o.note = v;
        if (["sf", "ss", "sb"].includes(key)) { o.safe = { f: 0, s: 0, b: 0, ...(o.safe || {}) }; o.safe[key[1]] = isFinite(n) ? Math.max(0, n) : 0; }
      }
      if (g === "r") {
        if (key === "name") o.name = v;
        if (key === "floor") o.floor = v;
        if (key === "ch") { if (v === "") delete o.ch; else if (n > 0) o.ch = n; }
        if ((key === "w" || key === "h") && n > 0) {
          const b = bboxPts(o.pts), x2 = key === "w" ? b.x1 + n : b.x2, y2 = key === "h" ? b.y1 + n : b.y2;
          o.pts = [{ x: b.x1, y: b.y1 }, { x: x2, y: b.y1 }, { x: x2, y: y2 }, { x: b.x1, y: y2 }];
        }
      }
      if (g === "d") { if (key === "off" && isFinite(n)) o.off = n; if (key === "label") o.label = v; }
      if (g === "t") { if (key === "text") o.text = v; if (key === "size" && n > 0) o.size = n; if (key === "bold") o.bold = v; }
    });
  }

  function onPanelClick(e) {
    const kb = e.target.closest("[data-kind]");
    if (kb) { E.kind[E.tool] = kb.dataset.kind; panel(); return; }
    const ok = e.target.closest("[data-opk]");
    if (ok) { E.op.kind = ok.dataset.opk; panel(); return; }
    const a = e.target.closest("[data-pa]")?.dataset.pa; if (!a) return;
    const F = find(E.sel[0]);
    if (a === "del") return del();
    if (a === "dup") return duplicate();
    if (a === "rot90") return rotateSel(90);
    if (!F) return;
    const o = F.o;
    mutate(() => {
      if (a === "split") {
        const mx = (o.x1 + o.x2) / 2, my = (o.y1 + o.y2) / 2, L = wlen(o);
        const nw = { ...structuredClone(o), id: uid(), x1: mx, y1: my };
        o.x2 = mx; o.y2 = my; E.data.walls.push(nw);
        for (const op of E.data.openings.filter(x => x.wallId === o.id)) if (op.off + op.w / 2 > L / 2) { op.wallId = nw.id; op.off = Math.max(0, op.off - L / 2); }
      }
      if (a === "flip") {
        const L = wlen(o);
        [o.x1, o.y1, o.x2, o.y2] = [o.x2, o.y2, o.x1, o.y1];
        for (const op of E.data.openings.filter(x => x.wallId === o.id)) { op.off = L - op.off - op.w; op.side = -(op.side || 1); op.hinge = op.hinge === "b" ? "a" : "b"; }
      }
      if (a === "oside") o.side = o.side === -1 ? 1 : -1;
      if (a === "ohinge") o.hinge = o.hinge === "b" ? "a" : "b";
      if (a === "ocenter") { const w = W(o.wallId); if (w) { const jj = J()[w.id]; o.off = (visLen(w, jj) - o.w) / 2 - jj.l1; } }
      if (a === "walls" && F.t === "room") {
        const b = bboxPts(o.pts), t = E.S.wallT;
        for (const w of rectWallsAround(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1, t)) E.data.walls.push(w);
      }
    });
  }
  function rectWallsAround(x, y, w, h, t) {
    const a = x - t / 2, b = y - t / 2, c = x + w + t / 2, d = y + h + t / 2, st = E.S.newStatus || "new";
    const mk = (x1, y1, x2, y2) => ({ id: uid(), x1, y1, x2, y2, t, status: st });
    return [mk(a, b, c, b), mk(c, b, c, d), mk(c, d, a, d), mk(a, d, a, b)];
  }

  // ---------- Toiminnot ----------
  function del() {
    if (!E.sel.length) return;
    mutate(() => {
      const s = new Set(E.sel);
      for (const [t, arr] of Object.entries(ARR)) E.data[arr] = E.data[arr].filter(o => !s.has(o.id));
      const wids = new Set(E.data.walls.map(w => w.id));
      E.data.openings = E.data.openings.filter(o => wids.has(o.wallId));
      E.sel = [];
    });
  }
  function copySel() {
    if (!E.sel.length) return;
    const s = new Set(E.sel), out = {};
    for (const [t, arr] of Object.entries(ARR)) out[arr] = E.data[arr].filter(o => s.has(o.id) || (t === "opening" && s.has(o.wallId)));
    E.clip = JSON.stringify(out);
  }
  function paste(dx = 500, dy = 500) {
    if (!E.clip) return;
    const c = JSON.parse(E.clip), idMap = {};
    mutate(() => {
      E.sel = [];
      for (const w of c.walls) { const n = { ...w, id: uid(), x1: w.x1 + dx, y1: w.y1 + dy, x2: w.x2 + dx, y2: w.y2 + dy }; idMap[w.id] = n.id; E.data.walls.push(n); E.sel.push(n.id); }
      for (const o of c.openings) { const wid = idMap[o.wallId] || (W(o.wallId) ? o.wallId : null); if (!wid) continue; const n = { ...o, id: uid(), wallId: wid, off: idMap[o.wallId] ? o.off : Math.min(o.off + 200, wlen(W(wid)) - o.w) }; E.data.openings.push(n); if (!idMap[o.wallId]) E.sel.push(n.id); }
      for (const it of c.items) { const n = { ...it, id: uid(), x: it.x + dx, y: it.y + dy }; E.data.items.push(n); E.sel.push(n.id); }
      for (const r of c.rooms) { const n = { ...r, id: uid(), pts: r.pts.map(p => ({ x: p.x + dx, y: p.y + dy })) }; E.data.rooms.push(n); E.sel.push(n.id); }
      for (const d of c.dims) { const n = { ...d, id: uid(), x1: d.x1 + dx, y1: d.y1 + dy, x2: d.x2 + dx, y2: d.y2 + dy }; E.data.dims.push(n); E.sel.push(n.id); }
      for (const t of c.texts) { const n = { ...t, id: uid(), x: t.x + dx, y: t.y + dy }; E.data.texts.push(n); E.sel.push(n.id); }
    });
  }
  function duplicate() { copySel(); paste(); }
  function rotateSel(deg) {
    const items = E.sel.map(find).filter(F => F?.t === "item");
    if (!items.length) return;
    mutate(() => items.forEach(({ o }) => o.rot = (((o.rot || 0) + deg) % 360 + 360) % 360));
  }
  function nudge(dx, dy) {
    if (!E.sel.length) return;
    mutate(() => applyMove(captureMove(E.sel), dx, dy));
  }

  // Siirto: alkuperäiset sijainnit talteen ja liitetyt seinänpäät mukaan
  function captureMove(ids) {
    const s = new Set(ids), orig = new Map(), links = [];
    for (const id of ids) { const F = find(id); if (F) orig.set(id, structuredClone(F.o)); }
    for (const w of E.data.walls) if (s.has(w.id)) for (const e of [1, 2]) for (const [ow, oe] of linksOf(w, e, s)) links.push({ w: ow, e: oe, x: ow["x" + oe], y: ow["y" + oe] });
    return { s, orig, links };
  }
  function applyMove(M, dx, dy) {
    for (const [id, o0] of M.orig) {
      const F = find(id); if (!F) continue; const o = F.o;
      if (F.t === "wall" || F.t === "dim") { o.x1 = o0.x1 + dx; o.y1 = o0.y1 + dy; o.x2 = o0.x2 + dx; o.y2 = o0.y2 + dy; }
      if (F.t === "item" || F.t === "text") { o.x = o0.x + dx; o.y = o0.y + dy; }
      if (F.t === "room") o.pts = o0.pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
      if (F.t === "opening" && !M.s.has(o.wallId)) {
        const w = W(o.wallId); if (!w) continue;
        const { dx: ux, dy: uy } = wallDir(w);
        o.off = Math.max(0, Math.min(wlen(w) - o.w, o0.off + dx * ux + dy * uy));
      }
    }
    for (const l of M.links) { l.w["x" + l.e] = l.x + dx; l.w["y" + l.e] = l.y + dy; }
  }
  function refPoint(F, p) {
    const o = F.o;
    if (F.t === "wall" || F.t === "dim") return Math.hypot(o.x1 - p.x, o.y1 - p.y) < Math.hypot(o.x2 - p.x, o.y2 - p.y) ? { x: o.x1, y: o.y1 } : { x: o.x2, y: o.y2 };
    if (F.t === "item" || F.t === "text") return { x: o.x, y: o.y };
    if (F.t === "room") return o.pts.reduce((b, q) => Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(b.x - p.x, b.y - p.y) ? q : b, o.pts[0]);
    return { x: p.x, y: p.y };
  }

  function openingAt(p) {
    const nw = nearestWall(p, Math.max(250, 30 / E.zoom)); if (!nw) return null;
    const { w, pr } = nw, def = E.op[E.op.kind], L = wlen(w);
    if (def.w > L) return null;
    let off = pr.t - def.w / 2;
    if (grid()) off = Math.round(off / grid()) * grid();
    off = Math.max(0, Math.min(L - def.w, off));
    return { id: "_prev", kind: E.op.kind, wallId: w.id, off, w: def.w, h: def.h, sill: E.op.kind === "ikkuna" ? def.sill : 0, side: pr.d >= 0 ? 1 : -1, hinge: "a" };
  }
  function itemAt(p) {
    const K = KINDS[E.kind[E.tool]]; if (!K) return null;
    const it = { id: "_prev", kind: K.k, x: p.x, y: p.y, w: K.w, d: K.d, rot: E.placeRot, ...(K.h != null ? { h: K.h } : {}) };
    if (K.wall) {
      const nw = nearestWall(p, 500);
      if (nw) {
        const { w, pr } = nw, { nx, ny } = wallDir(w), s = pr.d >= 0 ? 1 : -1;
        const k = s * (w.t / 2 + K.d / 2);
        it.x = pr.x + nx * k; it.y = pr.y + ny * k;
        it.rot = Math.round(Math.atan2(-s * nx, s * ny) * 180 / Math.PI * 10) / 10;
        it.rot = ((it.rot % 360) + 360) % 360;
        return it;
      }
    }
    const q = snapPoint(p); it.x = q.x; it.y = q.y;
    return it;
  }

  function addWall(a, b) {
    if (Math.hypot(b.x - a.x, b.y - a.y) < 5) return;
    mutate(() => E.data.walls.push({ id: uid(), x1: a.x, y1: a.y, x2: b.x, y2: b.y, t: E.S.wallT, status: E.S.newStatus || "new" }), true);
  }
  function wallClick(p) {
    if (!E.chain) { E.chain = [p]; draw(); return; }
    const a = E.chain[E.chain.length - 1];
    if (Math.hypot(p.x - a.x, p.y - a.y) < 5) return;
    addWall(a, p);
    if (Math.hypot(p.x - E.chain[0].x, p.y - E.chain[0].y) < 1) { E.chain = null; panel(); }
    else E.chain.push(p);
    E.lenBuf = ""; draw();
  }
  function endChain() { E.chain = null; E.lenBuf = ""; panel(); draw(); }
  function wallByLength(len) {
    const a = E.chain[E.chain.length - 1];
    let ang = Math.atan2(E.cur.y - a.y, E.cur.x - a.x);
    if (!E.shift) ang = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    wallClick({ x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len });
  }

  function createRoom(x, y, w, h, name, walls) {
    mutate(() => {
      const r = { id: uid(), name: name || `Tila ${E.data.rooms.length + 1}`, pts: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }] };
      E.data.rooms.push(r);
      if (walls) for (const wl of rectWallsAround(x, y, w, h, E.S.wallT)) E.data.walls.push(wl);
      E.sel = [r.id];
    });
    setTool("select");
    setTimeout(() => { const el = panelEl?.querySelector('[data-k="r.name"]'); el?.focus(); el?.select(); }, 30);
  }
  function roomDialog(p) {
    formSheet("Uusi huone", [
      ["name", "Nimi", "", "text", ROOM_NAMES], ["w", "Leveys sisämitoin (mm)", 3000], ["h", "Syvyys sisämitoin (mm)", 3000],
      ["walls", "Luo seinät ympärille", E.roomWalls, "check"], ["t", "Seinän paksuus (mm)", E.S.wallT]
    ], v => { const w = num(v.w), h = num(v.h); if (!(w > 0 && h > 0)) return false; if (num(v.t) > 0) E.S.wallT = num(v.t); E.roomWalls = v.walls; createRoom(p.x, p.y, w, h, v.name, v.walls); });
  }
  function textDialog(p, o) {
    formSheet(o ? "Muokkaa tekstiä" : "Uusi teksti", [["text", "Teksti", o?.text || "", "area"], ["size", "Koko", o?.size || 12]], v => {
      if (!v.text.trim()) return false;
      if (o) mutate(() => { o.text = v.text; o.size = num(v.size) || 12; });
      else mutate(() => { const t = { id: uid(), x: p.x, y: p.y, text: v.text, size: num(v.size) || 12 }; E.data.texts.push(t); E.sel = [t.id]; });
    });
  }
  // Pieni lomake editorin päälle
  function formSheet(title, fields, onOk) {
    const m = document.createElement("div");
    m.className = "ed-dlg-wrap";
    m.innerHTML = `<form class="ed-dlg"><h3>${esc(title)}</h3>${fields.map(([k, l, v, type, list]) => type === "check" ? chk(k, l, v).replace("data-k", "name") :
      type === "area" ? `<label class="pf"><span>${l}</span><textarea name="${k}" rows="3">${esc(v)}</textarea></label>` :
        `<label class="pf"><span>${l}</span><input name="${k}" value="${esc(v)}" ${list ? `list="fl-${k}"` : ""} autocomplete="off">${list ? `<datalist id="fl-${k}">${list.map(x => `<option value="${esc(x)}">`).join("")}</datalist>` : ""}</label>`).join("")}
      <div class="pbtns"><button type="button" class="btn small ghost" data-x>Peruuta</button><button class="btn small primary">OK</button></div></form>`;
    root.querySelector(".ed").appendChild(m);
    const form = m.querySelector("form");
    const close = () => { m.remove(); svg.focus(); };
    m.querySelector("[data-x]").onclick = close;
    m.onclick = e => { if (e.target === m) close(); };
    form.onkeydown = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    form.onsubmit = e => {
      e.preventDefault();
      const v = {}; for (const [k, , , type] of fields) v[k] = type === "check" ? form.elements[k].checked : form.elements[k].value;
      if (onOk(v) !== false) close();
    };
    setTimeout(() => form.querySelector("input,textarea")?.focus(), 20);
  }

  function setTool(t) {
    if (E.ro && t !== "measure" && t !== "pan") return;
    E.tool = t; E.chain = null; E.lenBuf = ""; E.dimDraft = null; E.measure = null; E.roomDraft = null; E.preview = null; E.snapPt = null; E.guides = [];
    if (t !== "select") E.sel = [];
    panel(); draw();
  }

  // ---------- Osoitin ----------
  function hitAt(e) {
    const h = e.target.closest?.("[data-h]");
    if (h) return { h: h.dataset.h };
    const g = e.target.closest?.("[data-id]");
    if (g && g.dataset.id !== "_prev") return { id: g.dataset.id, t: g.dataset.t };
    return null;
  }
  function onDown(e) {
    svg.focus({ preventScroll: true });
    E.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (E.pointers.size === 2) {
      // nipistys: perutaan keskeneräinen veto
      if (E.drag?.before && E.drag.before !== snapData()) { E.data = JSON.parse(E.drag.before); }
      E.drag = null;
      const [a, b] = [...E.pointers.values()];
      E.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      draw(); return;
    }
    if (E.pointers.size > 2) return;
    svg.setPointerCapture?.(e.pointerId);
    const p = toWorld(e.clientX, e.clientY);
    E.cur = p;
    const touch = e.pointerType === "touch";
    // näkymän siirto
    if (e.button === 1 || (e.button === 0 && E.space) || e.button === 2 || (E.ro && E.tool !== "measure")) {
      E.drag = { type: "pan", sx: e.clientX, sy: e.clientY, px: E.px, py: E.py, moved: false, right: e.button === 2, tap: E.ro ? { e, p } : null };
      return;
    }
    if (e.button !== 0) return;
    const t = E.tool, sp = E.snapPt && !touch ? E.snapPt : snapPoint(p, { from: E.chain?.[E.chain.length - 1], free: e.shiftKey });
    if (t === "measure") {
      const q = snapPoint(p, { from: E.measure?.a && !E.measure.b ? E.measure.a : null, free: e.shiftKey, noGrid: true });
      if (!E.measure?.a || E.measure.b) E.measure = { a: q }; else E.measure.b = q;
      draw(); return;
    }
    if (t === "wall") { wallClick(sp); return; }
    if (t === "room") { E.roomDraft = { a: sp, sx: e.clientX, sy: e.clientY }; return; }
    if (t === "opening") {
      const o = openingAt(p); if (!o) { toastMsg("Napsauta seinää"); return; }
      mutate(() => { o.id = uid(); E.data.openings.push(o); });
      return;
    }
    if (t === "kaluste" || t === "sahko" || t === "lvi") {
      const it = itemAt(p); if (!it) return;
      mutate(() => { it.id = uid(); E.data.items.push(it); });
      return;
    }
    if (t === "dim") {
      const q = snapPoint(p, { from: E.dimDraft?.a, free: e.shiftKey, noGrid: true });
      if (!E.dimDraft) E.dimDraft = { a: q };
      else if (!E.dimDraft.b) { if (Math.hypot(q.x - E.dimDraft.a.x, q.y - E.dimDraft.a.y) > 5) E.dimDraft.b = q; }
      else {
        const { a, b, off } = E.dimDraft;
        mutate(() => { const d = { id: uid(), x1: a.x, y1: a.y, x2: b.x, y2: b.y, off: Math.round(off || 0) }; E.data.dims.push(d); });
        E.dimDraft = null;
      }
      draw(); return;
    }
    if (t === "text") { textDialog(sp); return; }
    // valinta
    const hit = hitAt(e);
    if (hit?.h) {
      const [k, id, i] = hit.h.split(":"); const F = find(id); if (!F) return;
      const drag = { type: k, id, i: Number(i), before: snapData() };
      if (k === "we") drag.links = linksOf(F.o, Number(i));
      E.drag = drag; return;
    }
    if (hit?.id) {
      if (e.shiftKey || e.ctrlKey) { E.sel = E.sel.includes(hit.id) ? E.sel.filter(x => x !== hit.id) : [...E.sel, hit.id]; panel(); draw(); return; }
      if (!E.sel.includes(hit.id)) { E.sel = [hit.id]; panel(); }
      const F = find(hit.id);
      E.drag = { type: "move", start: p, ref: refPoint(F, p), M: captureMove(E.sel), before: snapData(), single: F.t === "opening" && E.sel.length === 1 ? F.o : null, moved: false, sx: e.clientX, sy: e.clientY };
      draw(); return;
    }
    E.drag = { type: "box", a: p, add: e.shiftKey };
    if (!e.shiftKey && E.sel.length) { E.sel = []; panel(); }
    draw();
  }
  function onMove(e) {
    if (E.pointers.has(e.pointerId)) E.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (E.pinch && E.pointers.size === 2) {
      const [a, b] = [...E.pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const r = svg.getBoundingClientRect();
      E.px += cx - E.pinch.cx; E.py += cy - E.pinch.cy;
      zoomAt(d / E.pinch.d, cx - r.left, cy - r.top);
      E.pinch = { d, cx, cy }; return;
    }
    const p = toWorld(e.clientX, e.clientY);
    E.cur = p; E.shift = e.shiftKey;
    const D = E.drag, t = E.tool;
    if (D?.type === "pan") {
      if (Math.abs(e.clientX - D.sx) + Math.abs(e.clientY - D.sy) > 4) D.moved = true;
      E.px = D.px + e.clientX - D.sx; E.py = D.py + e.clientY - D.sy; draw(); return;
    }
    if (D?.type === "box") { D.b = p; draw(); return; }
    if (D?.type === "move") {
      if (!D.moved && Math.abs(e.clientX - D.sx) + Math.abs(e.clientY - D.sy) < 4) return;
      D.moved = true;
      if (D.single) {
        // ovi/ikkuna liukuu seinää pitkin ja voi siirtyä toiselle seinälle
        const o = D.single, nw = nearestWall(p, Math.max(250, 30 / E.zoom));
        if (nw && o.w <= wlen(nw.w)) {
          o.wallId = nw.w.id; let off = nw.pr.t - o.w / 2;
          if (grid() && !e.shiftKey) off = Math.round(off / grid()) * grid();
          o.off = Math.max(0, Math.min(wlen(nw.w) - o.w, off));
        }
        draw(); return;
      }
      const raw = { x: D.ref.x + p.x - D.start.x, y: D.ref.y + p.y - D.start.y };
      const q = snapPoint(raw, { exclude: D.M.s, free: e.shiftKey });
      E.snapPt = q;
      applyMove(D.M, q.x - D.ref.x, q.y - D.ref.y);
      draw(); return;
    }
    if (D && ["we", "rv", "de", "ir"].includes(D.type)) {
      const F = find(D.id); if (!F) return; const o = F.o;
      if (D.type === "we") {
        const other = D.i === 1 ? { x: o.x2, y: o.y2 } : { x: o.x1, y: o.y1 };
        const q = snapPoint(p, { from: other, exclude: new Set([o.id, ...D.links.map(l => l[0].id)]), free: e.shiftKey });
        E.snapPt = q; moveWallEnd(o, D.i, q.x, q.y, D.links);
      }
      if (D.type === "rv") { const q = snapPoint(p, { exclude: new Set([o.id]), free: e.shiftKey }); E.snapPt = q; o.pts[D.i] = { x: q.x, y: q.y }; }
      if (D.type === "de") { const q = snapPoint(p, { exclude: new Set([o.id]), free: e.shiftKey, noGrid: true }); E.snapPt = q; o["x" + D.i] = q.x; o["y" + D.i] = q.y; }
      if (D.type === "ir") {
        let a = Math.atan2(p.y - o.y, p.x - o.x) * 180 / Math.PI + 90;
        a = e.shiftKey ? Math.round(a) : Math.round(a / 15) * 15;
        o.rot = ((a % 360) + 360) % 360;
      }
      draw(); return;
    }
    if (E.roomDraft) { E.roomDraft.b = snapPoint(p, { free: e.shiftKey }); E.snapPt = E.roomDraft.b; draw(); return; }
    // työkalun esikatselu
    if (E.ro && t !== "measure") return;
    E.preview = null;
    if (t === "wall") E.snapPt = E.cur = snapPoint(p, { from: E.chain?.[E.chain.length - 1], free: e.shiftKey });
    else if (t === "room" || t === "text") E.snapPt = snapPoint(p, { free: e.shiftKey });
    else if (t === "dim") {
      if (E.dimDraft?.b) {
        const { a, b } = E.dimDraft, pr = project(p.x, p.y, a.x, a.y, b.x, b.y);
        E.dimDraft.off = grid() ? Math.round(pr.d / grid()) * grid() : pr.d; E.snapPt = null;
      } else { E.snapPt = E.cur = snapPoint(p, { from: E.dimDraft?.a, free: e.shiftKey, noGrid: true }); }
    } else if (t === "measure") { E.snapPt = E.cur = snapPoint(p, { from: E.measure?.a && !E.measure.b ? E.measure.a : null, free: e.shiftKey, noGrid: true }); }
    else if (t === "opening") { const o = openingAt(p); E.preview = o ? { opening: o } : null; E.snapPt = null; }
    else if (t === "kaluste" || t === "sahko" || t === "lvi") { const it = itemAt(p); E.preview = it ? { item: it } : null; E.snapPt = null; }
    else E.snapPt = null;
    draw();
  }
  function onUp(e) {
    E.pointers.delete(e.pointerId);
    if (E.pinch) { if (E.pointers.size < 2) E.pinch = null; return; }
    const D = E.drag; E.drag = null; E.snapPt = E.tool === "select" ? null : E.snapPt;
    if (E.roomDraft) {
      const { a, b, sx, sy } = E.roomDraft; E.roomDraft = null;
      if (!b || Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 6) { roomDialog(a); draw(); return; }
      const x1 = Math.min(a.x, b.x), y1 = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      if (w > 100 && h > 100) createRoom(x1, y1, w, h, "", E.roomWalls); else draw();
      return;
    }
    if (!D) return;
    if (D.type === "pan") {
      if (!D.moved && D.right) { if (E.chain) endChain(); else if (E.dimDraft) { E.dimDraft = null; draw(); } else if (E.tool !== "select") setTool("select"); }
      if (!D.moved && D.tap) showInfo(hitAt(D.tap.e));
      return;
    }
    if (D.type === "box") {
      if (D.b) {
        const x1 = Math.min(D.a.x, D.b.x), y1 = Math.min(D.a.y, D.b.y), x2 = Math.max(D.a.x, D.b.x), y2 = Math.max(D.a.y, D.b.y);
        const inside = p => p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
        const ids = [];
        for (const [t, o] of all()) {
          let ok = false;
          if (t === "wall" || t === "dim") ok = inside({ x: o.x1, y: o.y1 }) && inside({ x: o.x2, y: o.y2 });
          else if (t === "item" || t === "text") ok = inside(o);
          else if (t === "room") ok = o.pts.every(inside);
          else if (t === "opening") { const w = W(o.wallId); if (w) { const g = openingGeom(w, o); ok = inside({ x: g.ax, y: g.ay }) && inside({ x: g.bx, y: g.by }); } }
          if (ok) ids.push(o.id);
        }
        E.sel = D.add ? [...new Set([...E.sel, ...ids])] : ids;
      }
      panel(); draw(); return;
    }
    if (D.before !== undefined) {
      if (snapData() !== D.before) { E.hist.push(D.before); E.fut = []; changed(); }
      else draw();
    }
  }

  // Puhelimen katselutila: napautetun kohteen tiedot
  function showInfo(hit) {
    const box = $("#ed-info");
    const F = hit?.id ? find(hit.id) : null;
    if (!F) { box.hidden = true; E.sel = []; draw(); return; }
    E.sel = [F.o.id]; draw();
    const j = J(), o = F.o; let h = "", rows = [];
    if (F.t === "wall") { h = "Seinä"; rows = [["Pituus", mm(visLen(o, j[o.id])) + " mm"], ["Keskilinja", mm(wlen(o)) + " mm"], ["Paksuus", o.t + " mm"], ["Korkeus", (o.h || E.S.wallH) + " mm"], ["Tila", (STATUS.find(s => s[0] === (o.status || "new")) || [])[1]]]; }
    if (F.t === "opening") {
      const w = W(o.wallId), jj = j[w.id], st = o.off + jj.l1;
      h = OPENINGS[o.kind]?.name || "Aukko"; rows = [["Koko", `${o.w} × ${o.h} mm`], ...(o.kind === "ikkuna" ? [["Alareuna", o.sill + " mm"]] : []), ["Seinän alusta", mm(st) + " mm"], ["Seinän lopusta", mm(visLen(w, jj) - st - o.w) + " mm"]];
      if (o.label) rows.unshift(["Merkintä", esc(o.label)]);
    }
    if (F.t === "item") { const K = KINDS[o.kind]; h = esc(o.label || K?.name || ""); rows = [["Tyyppi", esc(K?.name || "")], ["Koko", `${mm(o.w)} × ${mm(o.d)} mm`], ...(o.h != null && o.h !== "" ? [["Asennuskorkeus", o.h + " mm"]] : []), ...(o.note ? [["Huomio", esc(o.note)]] : [])]; }
    if (F.t === "room") { const b = bboxPts(o.pts); h = esc(o.name); rows = [["Pinta-ala", m2(polyArea(o.pts)) + " m²"], ...(isRect(o.pts) ? [["Sisämitat", `${mm(b.x2 - b.x1)} × ${mm(b.y2 - b.y1)} mm`]] : []), ["Korkeus", (o.ch || E.S.wallH) + " mm"], ...(o.floor ? [["Lattia", esc(o.floor)]] : [])]; }
    if (F.t === "dim") { h = "Mitta"; rows = [["Pituus", mm(Math.hypot(o.x2 - o.x1, o.y2 - o.y1)) + " mm"]]; }
    if (F.t === "text") { h = "Teksti"; rows = [["", esc(o.text)]]; }
    box.innerHTML = `<div class="info-h"><b>${h}</b><button class="icon-btn" data-a="infoclose" aria-label="Sulje">✕</button></div>${rows.map(([a, b]) => `<div class="info-r"><span>${a}</span><b>${b}</b></div>`).join("")}`;
    box.hidden = false;
  }
  const toastMsg = t => { const h = $("#ed-hint"); h.textContent = t; h.classList.add("flash"); setTimeout(() => h.classList.remove("flash"), 900); };

  // ---------- Näppäimistö ----------
  function onKey(e) {
    if (live.destroyed) return;
    if (document.querySelector("#modal.open") || root.querySelector(".ed-dlg-wrap")) return;
    const tag = e.target.tagName, typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    if (typing) { if (e.key === "Enter" && tag === "INPUT") e.target.blur(); return; }
    const k = e.key, ctrl = e.ctrlKey || e.metaKey;
    if (k === " ") { E.space = true; canvasEl.classList.add("panning"); e.preventDefault(); return; }
    if (ctrl && k.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (ctrl && k.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
    if (E.ro) { if (k === "f" || k === "F") fit(); if (k === "Escape") { E.measure = null; draw(); } return; }
    if (ctrl && k.toLowerCase() === "c") { copySel(); return; }
    if (ctrl && k.toLowerCase() === "v") { e.preventDefault(); paste(); return; }
    if (ctrl && k.toLowerCase() === "d") { e.preventDefault(); duplicate(); return; }
    if (ctrl && k.toLowerCase() === "a") { e.preventDefault(); setTool("select"); E.sel = all().map(([, o]) => o.id); panel(); draw(); return; }
    if (ctrl) return;
    if (E.chain) {
      if (/^[0-9]$/.test(k) || (k === "," || k === ".") && !E.lenBuf.includes(",")) { E.lenBuf += k === "." ? "," : k; draw(); e.preventDefault(); return; }
      if (k === "Backspace" && E.lenBuf) { E.lenBuf = E.lenBuf.slice(0, -1); draw(); e.preventDefault(); return; }
      if (k === "Enter") { const n = num(E.lenBuf); if (n > 0) wallByLength(n); else endChain(); e.preventDefault(); return; }
    }
    if (k === "Escape") {
      if (E.chain) return endChain();
      if (E.dimDraft || E.measure) { E.dimDraft = null; E.measure = null; draw(); return; }
      if (E.tool !== "select") return setTool("select");
      E.sel = []; panel(); draw(); return;
    }
    if (k === "Delete" || k === "Backspace") { e.preventDefault(); del(); return; }
    if (k === "r" || k === "R") {
      if (["kaluste", "sahko", "lvi"].includes(E.tool)) { E.placeRot = (E.placeRot + 90) % 360; panel(); const it = itemAt(E.cur); E.preview = it ? { item: it } : null; draw(); }
      else rotateSel(e.shiftKey ? -90 : 90);
      return;
    }
    if (k === "f" || k === "F") { fit(); return; }
    if (k.startsWith("Arrow") && E.sel.length) {
      e.preventDefault();
      const s = (grid() || 10) * (e.shiftKey ? 10 : 1);
      nudge(k === "ArrowLeft" ? -s : k === "ArrowRight" ? s : 0, k === "ArrowUp" ? -s : k === "ArrowDown" ? s : 0); return;
    }
    const tl = TOOLS.find(t => t[2].toLowerCase() === k.toLowerCase());
    if (tl) setTool(tl[0]);
  }
  function onKeyUp(e) { if (e.key === " ") { E.space = false; canvasEl.classList.remove("panning"); } }

  // ---------- Kytkennät ----------
  svg.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", onUp);
  svg.addEventListener("pointercancel", onUp);
  svg.addEventListener("pointerleave", () => { if (!E.drag && E.preview) { E.preview = null; draw(); } });
  svg.addEventListener("contextmenu", e => e.preventDefault());
  svg.addEventListener("dblclick", e => {
    if (E.tool === "wall" && E.chain) { endChain(); return; }
    if (E.tool === "select") { const h = hitAt(e); const F = h?.id && find(h.id); if (F?.t === "text" && !E.ro) textDialog(null, F.o); }
  });
  svg.addEventListener("wheel", e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? .05 : .0015)), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  document.addEventListener("keydown", onKey);
  document.addEventListener("keyup", onKeyUp);
  const onResize = () => draw();
  window.addEventListener("resize", onResize);
  const onUnload = () => flush();
  window.addEventListener("beforeunload", onUnload);
  window.addEventListener("pagehide", onUnload);
  root.querySelector(".ed-tools")?.addEventListener("click", e => { const b = e.target.closest("[data-tool]"); if (b) setTool(b.dataset.tool); });
  panelEl?.addEventListener("change", onPanelChange);
  panelEl?.addEventListener("click", onPanelClick);
  root.querySelector(".ed-switch")?.addEventListener("change", e => { flush(); onSwitch?.(e.target.value); });
  root.addEventListener("click", e => {
    const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
    if (a === "back") { flush(); onBack?.(); }
    if (a === "rename" && !E.ro) { const n = prompt("Piirustuksen nimi", plan.name || ""); if (n && n.trim()) { plan.name = n.trim(); e.target.textContent = plan.name; onRename?.(plan.name); } }
    if (a === "undo") undo();
    if (a === "redo") redo();
    if (a === "fit") fit();
    if (a === "zin") zoomAt(1.25);
    if (a === "zout") zoomAt(.8);
    if (a === "qty") openQuantities(E.data, E.S, proj?.name, plan.name);
    if (a === "print") { flush(); openPrint(E.data, E.S, proj?.name || "", plan.name || ""); }
    if (a === "measure") { setTool(E.tool === "measure" ? "pan" : "measure"); $("#ed-info").hidden = true; }
    if (a === "infoclose") { $("#ed-info").hidden = true; E.sel = []; draw(); }
    if (a === "layers") layersSheet();
  });
  function layersSheet() {
    formSheet("Näytettävät tasot", [...LAYERS.map(([k, l]) => [k, l, E.S.layers[k], "check"]), ["_dims", "Seinien pituudet", E.S.showWallDims, "check"], ["_h", "Sähkörasioiden korkeudet", E.S.showHeights, "check"]], v => {
      for (const [k] of LAYERS) E.S.layers[k] = v[k];
      E.S.showWallDims = v._dims; E.S.showHeights = v._h; draw();
    });
  }

  setSave("saved");
  panel();
  requestAnimationFrame(() => { fit(); svg.focus({ preventScroll: true }); });

  return {
    E,
    flush,
    // Toisella laitteella tehty muutos: päivitetään, jos täällä ei ole tallentamattomia muutoksia
    applyRemote(p) {
      const key = JSON.stringify([p.data || {}, p.settings || {}]);
      if (key === E.lastSaved || E.saveState !== "saved" || E.drag) return;
      E.lastSaved = key; E.data = structuredClone(dataOf(p)); E.S = settingsOf(p); cleanSel(); panel(); draw();
    },
    destroy() {
      flush(); live.destroyed = true;
      document.removeEventListener("keydown", onKey); document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize); window.removeEventListener("beforeunload", onUnload); window.removeEventListener("pagehide", onUnload);
      cancelAnimationFrame(raf);
    }
  };
}
