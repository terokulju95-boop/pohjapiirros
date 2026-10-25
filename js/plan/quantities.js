// =============================================================
//  Määrät: seinät, pinta-alat, aukot, symbolit, levylaskuri ja tarkistukset
// =============================================================
import { joints, visLen, wlen, polyArea, wallPoly, itemCorners, pointInPoly, bboxPts, isRect, mm, m2 } from "./geom.js";
import { KINDS, OPENINGS, STATUS, CATS } from "./catalog.js";
import { LAYER_KINDS, typeOf, wallLayers } from "./walltypes.js";
import { roofQty, ROOF_TYPES, ratio } from "./roof.js";
import { ROOF_MATS } from "./materials.js";
import { openSheet, esc, toast } from "../core.js";

const fi = (v, d = 1) => Number(v).toLocaleString("fi-FI", { minimumFractionDigits: d, maximumFractionDigits: d });

export function computeQty(data, S) {
  const J = joints(data.walls);
  const walls = {};
  for (const [k] of STATUS) walls[k] = { n: 0, len: 0, vis: 0, gross: 0, open: 0 };
  for (const w of data.walls) {
    const g = walls[w.status || "new"], h = w.h || S.wallH, vl = visLen(w, J[w.id]);
    g.n++; g.len += wlen(w); g.vis += vl; g.gross += vl * h;
    for (const o of data.openings.filter(o => o.wallId === w.id)) g.open += o.w * Math.min(o.h, h);
  }
  // Rakennekerrokset seinätyypeittäin (purettavat eivät mukana)
  const types = new Map();
  for (const w of data.walls) {
    if (!w.type || w.status === "demolish") continue;
    const ty = typeOf(S, w.type); if (!ty) continue;
    const h = w.h || S.wallH, vl = visLen(w, J[w.id]);
    const net = vl * h - data.openings.filter(o => o.wallId === w.id).reduce((a, o) => a + o.w * Math.min(o.h, h), 0);
    const g = types.get(ty.id) || { name: ty.name, t: 0, len: 0, net: 0, studs: 0, studJm: 0, layers: wallLayers({ type: ty.id }, S).map(l => ({ ...l })) };
    g.len += vl; g.net += Math.max(0, net); g.t = w.t;
    const n = Math.ceil(vl / 600) + 1; g.studs += n; g.studJm += n * h / 1000 + 2 * vl / 1000;
    types.set(ty.id, g);
  }
  const terraces = data.rooms.filter(r => r.kind === "terrace").map(r => {
    const b = bboxPts(r.pts), area = polyArea(r.pts), sp = (r.bw || 117) + (r.gap ?? 6);
    return { name: r.name || "Terassi", area, dims: isRect(r.pts) ? `${mm(b.x2 - b.x1)} × ${mm(b.y2 - b.y1)}` : "", board: r.bw || 117, jm: area / sp / 1000 * 1.1 };
  });
  const rooms = data.rooms.filter(r => r.kind !== "terrace").map(r => {
    const b = bboxPts(r.pts);
    let per = 0; for (let i = 0; i < r.pts.length; i++) { const p = r.pts[i], q = r.pts[(i + 1) % r.pts.length]; per += Math.hypot(q.x - p.x, q.y - p.y); }
    return { name: r.name || "Tila", area: polyArea(r.pts), per, dims: isRect(r.pts) ? `${mm(b.x2 - b.x1)} × ${mm(b.y2 - b.y1)}` : "", floor: r.floor || "", h: r.ch || S.wallH };
  });
  const group = (arr, key) => { const m = new Map(); for (const x of arr) { const k = key(x); m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "fi")); };
  const openings = group(data.openings, o => `${OPENINGS[o.kind]?.name || o.kind} ${o.w} × ${o.h}${o.kind === "ikkuna" ? ` (alareuna ${o.sill})` : ""}${o.label ? ` – ${o.label}` : ""}`);
  const items = {};
  for (const [c] of CATS) items[c] = group(data.items.filter(it => (KINDS[it.kind]?.cat || "kaluste") === c), it => {
    const K = KINDS[it.kind]; const nm = K?.name || it.kind;
    return c === "kaluste" ? `${it.label && it.label !== nm ? `${it.label} (${nm})` : nm} ${mm(it.w)} × ${mm(it.d)}` : `${nm}${it.h != null && it.h !== "" ? `, korkeus ${it.h}` : ""}`;
  });
  const roofs = (data.roofs || []).map(r => ({ r, q: roofQty(r), name: (ROOF_TYPES.find(t => t[0] === r.type) || [, "Katto"])[1], mat: (ROOF_MATS[r.mat] || ROOF_MATS.pelti)[0] }));
  return { walls, roofs, types: [...types.values()], rooms, terraces, openings, items, checks: checks(data, J) };
}

// Kiukaan ja tulisijojen suojaetäisyydet
function checks(data, J) {
  const out = [];
  for (const hot of data.items.filter(it => KINDS[it.kind]?.hot && it.safe && (it.safe.f || it.safe.s || it.safe.b))) {
    const sf = hot.safe;
    const zone = itemCorners({ x: 0, y: 0, w: hot.w + 2 * (sf.s || 0), d: hot.d + (sf.b || 0) + (sf.f || 0), rot: 0 }).map(p => {
      const y = p.y + ((sf.f || 0) - (sf.b || 0)) / 2, a = (hot.rot || 0) * Math.PI / 180;
      return { x: hot.x + p.x * Math.cos(a) - y * Math.sin(a), y: hot.y + p.x * Math.sin(a) + y * Math.cos(a) };
    });
    const name = KINDS[hot.kind].name;
    for (const it of data.items) {
      if (it === hot || KINDS[it.kind]?.cat !== "kaluste") continue;
      const c = itemCorners(it);
      const hit = c.some(p => pointInPoly(p.x, p.y, zone)) || zone.some(p => pointInPoly(p.x, p.y, c)) || sampleEdges(c).some(p => pointInPoly(p.x, p.y, zone));
      if (hit) out.push(`${it.label || KINDS[it.kind]?.name || "Kaluste"} on kohteen ${name} suojaetäisyyden sisällä.`);
    }
    for (const w of data.walls) {
      const P = wallPoly(w, J[w.id]).map(([x, y]) => ({ x, y }));
      if (sampleEdges(P).some(p => pointInPoly(p.x, p.y, zone))) { out.push(`Seinä on kohteen ${name} suojaetäisyyden sisällä.`); break; }
    }
  }
  return out;
}
function sampleEdges(P) {
  const r = [];
  for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 40)); for (let k = 0; k <= n; k++) r.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); }
  return r;
}

export function openQuantities(data, S, projName = "", planName = "") {
  const Q = computeQty(data, S);
  const st = Object.fromEntries(STATUS);
  const wallRows = STATUS.filter(([k]) => Q.walls[k].n).map(([k]) => { const g = Q.walls[k]; return `<tr><td>${st[k]}</td><td class="r">${g.n}</td><td class="r">${fi(g.len / 1000, 2)} m</td><td class="r">${fi(g.gross / 1e6)} m²</td><td class="r">${fi((g.gross - g.open) / 1e6)} m²</td></tr>`; }).join("");
  const totFloor = Q.rooms.reduce((s, r) => s + r.area, 0);
  const list = rows => rows.length ? `<table class="tbl"><tbody>${rows.map(([k, n]) => `<tr><td>${esc(k)}</td><td class="r">${n} kpl</td></tr>`).join("")}</tbody></table>` : `<p class="muted small">Ei merkintöjä.</p>`;
  const newNet = (Q.walls.new.gross - Q.walls.new.open) / 1e6;
  const html = `
    ${Q.checks.length ? `<div class="qty-warn">${Q.checks.map(c => `<div>⚠ ${esc(c)}</div>`).join("")}</div>` : ""}
    <h3 class="form-h">Seinät</h3>
    ${wallRows ? `<table class="tbl"><thead><tr><th>Tila</th><th class="r">kpl</th><th class="r">Pituus</th><th class="r">Pinta (1 puoli)</th><th class="r">Ilman aukkoja</th></tr></thead><tbody>${wallRows}</tbody></table>
      <p class="form-note">Pituus keskilinjasta. Pinta-ala = näkyvä pituus × seinän korkeus yhdeltä puolelta.</p>` : `<p class="muted small">Ei seiniä.</p>`}
    ${Q.types.length ? `<h3 class="form-h">Rakennekerrokset seinätyypeittäin</h3>${Q.types.map(g => `<div class="qt"><b>${esc(g.name)}</b> <span class="muted small">${g.t} mm · ${fi(g.len / 1000, 2)} m · ${fi(g.net / 1e6)} m² (aukot vähennetty)</span>
      <table class="tbl"><tbody>${g.layers.map(l => { const A = g.net / 1e6, k = l.kind; let extra = "";
        if (k === "runko") extra = `runko k600 n. ${g.studs} kpl, ${fi(g.studJm, 0)} jm · eriste ${fi(A * 1.05)} m² / ${fi(A * l.t / 1000, 2)} m³`;
        else if (k === "eriste") extra = `${fi(A * 1.05)} m² / ${fi(A * l.t / 1000, 2)} m³`;
        else if (k === "levy" || k === "kipsi") extra = `n. ${Math.ceil(A / 3.24 * 1.1)} levyä 1200 × 2700`;
        else if (k === "kalvo") extra = `${fi(A * 1.15)} m² (limitykset)`;
        else if (k === "paneeli" || k === "verhous") extra = `${fi(A * 1.1)} m² (+10 %)`;
        else if (k === "rako") extra = l.t ? `koolaus k600 n. ${fi(A / .6 * 1.1, 0)} jm` : "";
        else extra = `${fi(A)} m²`;
        return `<tr><td><i class="qi" style="background:${(LAYER_KINDS[k] || LAYER_KINDS.muu)[1]}"></i>${esc(l.name)}</td><td class="r">${l.t} mm</td><td class="r">${extra}</td></tr>`; }).join("")}</tbody></table></div>`).join("")}
      <p class="form-note">Arvio: runkotolpat k600 + ala- ja yläjuoksu, levyt 1200 × 2700 + 10 % hukka. Tarkista määrät ennen tilausta.</p>` : ""}
    ${Q.roofs.length ? `<h3 class="form-h">Katto</h3>${Q.roofs.map(({ r, q, name, mat }) => `<table class="tbl"><tbody>
      <tr><td><b>${esc(name)}</b>${r.type !== "tasa" ? ` ${r.pitch}° (${ratio(r.pitch)})` : ""}</td><td class="r">${esc(mat)}</td></tr>
      <tr><td>Katon pinta-ala (kalteva)</td><td class="r">${fi(q.area / 1e6)} m² · katetta + 10 % ${fi(q.area / 1e6 * 1.1)} m²</td></tr>
      <tr><td>Räystäät</td><td class="r">${fi(q.eave / 1000, 2)} m</td></tr>
      ${q.rake ? `<tr><td>Päätyräystäät (otsalaudat)</td><td class="r">${fi(q.rake / 1000, 2)} m</td></tr>` : ""}
      ${q.ridge ? `<tr><td>Harja</td><td class="r">${fi(q.ridge / 1000, 2)} m</td></tr>` : ""}
      ${q.hip ? `<tr><td>Aumataitteet</td><td class="r">${fi(q.hip / 1000, 2)} m</td></tr>` : ""}
      ${q.gable ? `<tr><td>Päätykolmiot / korotukset (seinäpinta)</td><td class="r">${fi(q.gable / 1e6)} m²</td></tr>` : ""}
      <tr><td>Korkein kohta maasta</td><td class="r">${mm(q.top)} mm</td></tr></tbody></table>`).join("")}` : ""}
    <h3 class="form-h">Tilat</h3>
    ${Q.rooms.length ? `<table class="tbl"><thead><tr><th>Tila</th><th class="r">Mitat</th><th class="r">Ala</th><th class="r">Seinäpinta</th></tr></thead><tbody>${Q.rooms.map(r => `<tr><td>${esc(r.name)}${r.floor ? `<br><small class="muted">${esc(r.floor)}</small>` : ""}</td><td class="r">${r.dims}</td><td class="r">${fi(r.area / 1e6)} m²</td><td class="r">${fi(r.per * r.h / 1e6)} m²</td></tr>`).join("")}<tr class="sum"><td>Yhteensä</td><td></td><td class="r">${fi(totFloor / 1e6)} m²</td><td></td></tr></tbody></table>
      <p class="form-note">Tilan seinäpinta = sisäpiiri × huonekorkeus (aukkoja ei vähennetty).</p>` : `<p class="muted small">Ei tiloja. Tilat lisätään Huone-työkalulla.</p>`}
    ${Q.terraces.length ? `<h3 class="form-h">Terassit</h3><table class="tbl"><thead><tr><th>Terassi</th><th class="r">Mitat</th><th class="r">Ala</th><th class="r">Lautaa</th></tr></thead><tbody>${Q.terraces.map(t => `<tr><td>${esc(t.name)}</td><td class="r">${t.dims}</td><td class="r">${fi(t.area / 1e6)} m²</td><td class="r">${Math.ceil(t.jm)} jm</td></tr>`).join("")}</tbody></table>
      <p class="form-note">Lautamäärä: laudan leveys + rako, sisältää 10 % hukan.</p>` : ""}
    <h3 class="form-h">Ovet ja ikkunat</h3>${list(Q.openings)}
    <h3 class="form-h">Sähkö</h3>${list(Q.items.sahko)}
    <h3 class="form-h">LVI</h3>${list(Q.items.lvi)}
    <h3 class="form-h">Kalusteet</h3>${list(Q.items.kaluste)}
    <h3 class="form-h">Levylaskuri</h3>
    <div class="calc">
      <label class="fld"><span>Pinta-ala (m²)</span><input id="q-area" inputmode="decimal" value="${fi(Math.max(0, newNet))}"></label>
      <label class="fld"><span>Levyn koko (mm)</span><select id="q-board"><option value="1200x2700">1200 × 2700</option><option value="1200x2600">1200 × 2600</option><option value="1200x2400">1200 × 2400</option><option value="900x2400">900 × 2400</option><option value="600x2400">600 × 2400</option><option value="1200x3000">1200 × 3000</option></select></label>
      <label class="fld"><span>Hukka (%)</span><input id="q-waste" inputmode="decimal" value="10"></label>
      <div class="calc-out" id="q-out"></div>
    </div>
    <p class="form-note">Oletuksena uusien seinien pinta yhdeltä puolelta ilman aukkoja. Muuta pinta-ala tarvittaessa (esim. molemmat puolet tai katto).</p>
    <div class="row-btns"><button class="btn small" id="q-copy">Kopioi tekstinä</button></div>`;
  const { el } = openSheet("Määrät" + (planName ? " – " + planName : ""), html, { wide: true });
  const calc = () => {
    const a = parseFloat(el.querySelector("#q-area").value.replace(",", ".")) || 0;
    const [bw, bh] = el.querySelector("#q-board").value.split("x").map(Number);
    const waste = parseFloat(el.querySelector("#q-waste").value.replace(",", ".")) || 0;
    const n = Math.ceil(a / (bw * bh / 1e6) * (1 + waste / 100));
    el.querySelector("#q-out").innerHTML = `<b>${isFinite(n) ? n : 0} levyä</b><span class="muted">(${fi(bw * bh / 1e6, 2)} m² / levy)</span>`;
  };
  el.querySelectorAll("#q-area,#q-board,#q-waste").forEach(i => i.addEventListener("input", calc));
  calc();
  el.querySelector("#q-copy").onclick = () => {
    const t = [`${projName} – ${planName}`, "",
      "SEINÄT", ...STATUS.filter(([k]) => Q.walls[k].n).map(([k]) => `${st[k]}: ${Q.walls[k].n} kpl, ${fi(Q.walls[k].len / 1000, 2)} m, ${fi((Q.walls[k].gross - Q.walls[k].open) / 1e6)} m² (1 puoli, ilman aukkoja)`), "",
      ...(Q.types.length ? ["RAKENNEKERROKSET", ...Q.types.flatMap(g => [`${g.name}: ${fi(g.net / 1e6)} m²`, ...g.layers.map(l => `  ${l.name} ${l.t} mm`)]), ""] : []),
      ...(Q.roofs.length ? ["KATTO", ...Q.roofs.flatMap(({ q, name, mat }) => [`${name}, ${mat}: ${fi(q.area / 1e6)} m² (+10 % ${fi(q.area / 1e6 * 1.1)} m²)`, `Räystäät ${fi(q.eave / 1000, 2)} m${q.ridge ? `, harja ${fi(q.ridge / 1000, 2)} m` : ""}`]), ""] : []),
      "TILAT", ...Q.rooms.map(r => `${r.name}: ${fi(r.area / 1e6)} m²${r.dims ? ` (${r.dims})` : ""}`), `Yhteensä ${fi(totFloor / 1e6)} m²`, "",
      ...(Q.terraces.length ? ["TERASSIT", ...Q.terraces.map(t => `${t.name}: ${fi(t.area / 1e6)} m², lautaa n. ${Math.ceil(t.jm)} jm`), ""] : []),
      "OVET JA IKKUNAT", ...Q.openings.map(([k, n]) => `${n} × ${k}`), "",
      "SÄHKÖ", ...Q.items.sahko.map(([k, n]) => `${n} × ${k}`), "",
      "LVI", ...Q.items.lvi.map(([k, n]) => `${n} × ${k}`), "",
      "KALUSTEET", ...Q.items.kaluste.map(([k, n]) => `${n} × ${k}`)].join("\n");
    navigator.clipboard?.writeText(t).then(() => toast("Kopioitu leikepöydälle"), () => toast("Kopiointi ei onnistunut", true));
  };
}
