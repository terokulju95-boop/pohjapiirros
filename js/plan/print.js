// =============================================================
//  Tulostus mittakaavassa (PDF:n saa tulostusikkunasta "Tallenna PDF:ksi")
// =============================================================
import { planBBox } from "./geom.js";
import { renderPlan } from "./render.js";
import { openSheet, esc, toast } from "../core.js";

const PAPER = { A4: [297, 210], A3: [420, 297] };
const SCALES = [10, 20, 25, 50, 100, 200];
const MARGIN = 10, TITLE = 16;

function area(paper, orient) { const [a, b] = PAPER[paper]; const [w, h] = orient === "pysty" ? [b, a] : [a, b]; return { pw: w, ph: h, w: w - 2 * MARGIN, h: h - 2 * MARGIN - TITLE }; }
// Tulostettava lähde: ext(scale) = piirustuksen rajat (mm), body(u) = SVG-sisältö
export const planSource = (data, S) => ({ ext: scale => extent(data, scale), body: u => renderPlan(data, S, { u }) });
function extent(data, scale) {
  const b = planBBox(data); if (!b) return null;
  // tekstien leveys paperilla (fontti 0,25 mm × koko)
  const u = .25 * scale;
  for (const t of data.texts || []) {
    const lines = String(t.text || "").split("\n"), fs = (t.size || 12) * u;
    b.x2 = Math.max(b.x2, t.x + Math.max(...lines.map(l => l.length)) * fs * .58);
    b.y2 = Math.max(b.y2, t.y + lines.length * fs * 1.25);
    b.y1 = Math.min(b.y1, t.y - fs);
  }
  const pad = 14 * scale; // tilaa kokonaismitoille paperilla
  return { x: b.x1 - pad, y: b.y1 - pad, w: b.x2 - b.x1 + 2 * pad, h: b.y2 - b.y1 + 2 * pad };
}
function fits(src, scale, paper, orient) { const e = src.ext(scale), A = area(paper, orient); return e && e.w / scale <= A.w && e.h / scale <= A.h; }
export function bestFit(data) {
  // Ensisijaisesti A4 (kotitulostin) mittakaavassa 1:20…1:100, sitten A3
  for (const p of ["A4", "A3"]) for (const s of SCALES.filter(s => s >= 20 && s <= 100)) for (const o of ["vaaka", "pysty"]) if (fits(data, s, p, o)) return { scale: s, paper: p, orient: o };
  for (const s of SCALES) for (const p of ["A4", "A3"]) for (const o of ["vaaka", "pysty"]) if (fits(data, s, p, o)) return { scale: s, paper: p, orient: o };
  return { scale: 200, paper: "A3", orient: "vaaka" };
}

// SVG millimetreinä paperilla
export function planSvg(src, scale) {
  const e = src.ext(scale); if (!e) return null;
  const u = .25 * scale;
  const body = src.body(u);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" class="plan-svg" width="${(e.w / scale).toFixed(2)}mm" height="${(e.h / scale).toFixed(2)}mm" viewBox="${e.x} ${e.y} ${e.w} ${e.h}">${body}</svg>`, wmm: e.w / scale, hmm: e.h / scale };
}
function scaleBar(scale) {
  const perM = 1000 / scale; let n = [10, 5, 2, 1, .5].find(n => n * perM <= 70) || .5;
  const L = n * perM, seg = n >= 2 ? n : 1, k = n / seg;
  let s = `<svg width="${L + 12}mm" height="7mm" viewBox="0 0 ${L + 12} 7">`;
  for (let i = 0; i < seg; i++) s += `<rect x="${i * L / seg}" y="1" width="${L / seg}" height="1.6" fill="${i % 2 ? "#fff" : "#222"}" stroke="#222" stroke-width=".2"/>`;
  s += `<text x="0" y="6" font-size="2.6">0</text><text x="${L}" y="6" font-size="2.6" text-anchor="middle">${String(n).replace(".", ",")} m</text></svg>`;
  return s;
}
function printDoc(src, scale, paper, orient, proj, plan) {
  const r = planSvg(src, scale), A = area(paper, orient);
  const d = new Date();
  return `<!doctype html><html lang="fi"><head><meta charset="utf-8"><title>${esc(proj)} – ${esc(plan)}</title><style>
    @page { size: ${paper} ${orient === "pysty" ? "portrait" : "landscape"}; margin: ${MARGIN}mm; }
    html,body { margin:0; background:#fff; color:#1d232a; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width:${A.w}mm; height:${A.h + TITLE}mm; display:flex; flex-direction:column; overflow:hidden; }
    .draw { flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .tb { height:${TITLE - 2}mm; border-top:.35mm solid #1d232a; display:flex; align-items:center; gap:8mm; font-size:3mm; padding-top:1mm; }
    .tb b { font-size:3.6mm; } .tb .sp { flex:1; } .tb small { color:#555; font-size:2.6mm; display:block; }
    @media screen { body { background:#888; padding:10mm; } .sheet { background:#fff; padding:${MARGIN}mm; box-shadow:0 2px 12px rgba(0,0,0,.3); } }
  </style></head><body><div class="sheet"><div class="draw">${r ? r.svg : "<p>Tyhjä piirustus</p>"}</div>
  <div class="tb"><div><b>${esc(proj)}</b><small>${esc(plan)}</small></div><div class="sp"></div><div>${scaleBar(scale)}</div><div><b>1:${scale}</b><small>${paper} ${orient}</small></div><div><small>Mitat millimetreinä</small><small>${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}</small></div></div></div></body></html>`;
}

export function openPrint(src, proj, plan) {
  const data = src;
  if (!src.ext(50)) { toast("Piirustus on tyhjä", true); return; }
  const st = bestFit(data);
  const html = `<div class="print-opts">
      <label class="fld"><span>Mittakaava</span><select id="p-scale">${SCALES.map(s => `<option value="${s}" ${s === st.scale ? "selected" : ""}>1:${s}</option>`).join("")}</select></label>
      <label class="fld"><span>Paperi</span><select id="p-paper">${Object.keys(PAPER).map(p => `<option ${p === st.paper ? "selected" : ""}>${p}</option>`).join("")}</select></label>
      <label class="fld"><span>Suunta</span><select id="p-orient"><option value="vaaka" ${st.orient === "vaaka" ? "selected" : ""}>Vaaka</option><option value="pysty" ${st.orient === "pysty" ? "selected" : ""}>Pysty</option></select></label>
    </div>
    <div id="p-msg" class="form-note"></div>
    <div class="print-prev" id="p-prev"></div>
    <p class="form-note">Tulosta asetuksella <b>Todellinen koko / 100 %</b> (ei "Sovita sivulle"), jotta mittakaava pitää. PDF syntyy valitsemalla tulostimeksi "Tallenna PDF-muodossa".</p>
    <div class="row-btns"><button class="btn primary" id="p-print">Tulosta / PDF</button><button class="btn" id="p-svg">Lataa SVG</button><button class="btn" id="p-png">Lataa PNG</button></div>`;
  const { el } = openSheet("Tulosta", html, { wide: true });
  const v = () => ({ scale: Number(el.querySelector("#p-scale").value), paper: el.querySelector("#p-paper").value, orient: el.querySelector("#p-orient").value });
  const upd = () => {
    const { scale, paper, orient } = v(), A = area(paper, orient), r = planSvg(src, scale), ok = fits(src, scale, paper, orient);
    el.querySelector("#p-msg").innerHTML = ok ? `Piirustus ${Math.round(r.wmm)} × ${Math.round(r.hmm)} mm, mahtuu paperille.` : `<span class="bad">⚠ Ei mahdu: piirustus ${Math.round(r.wmm)} × ${Math.round(r.hmm)} mm, tilaa ${A.w} × ${A.h} mm. Valitse pienempi mittakaava (suurempi luku) tai isompi paperi.</span>`;
    const k = 300 / A.pw;
    el.querySelector("#p-prev").innerHTML = `<div class="pp-paper" style="width:${A.pw * k}px;height:${A.ph * k}px;padding:${MARGIN * k}px"><div class="pp-draw" style="height:${A.h * k}px">${r.svg.replace(/width="[^"]+mm" height="[^"]+mm"/, `width="${r.wmm * k}" height="${r.hmm * k}"`)}</div><div class="pp-tb" style="height:${TITLE * k}px"></div></div>`;
  };
  el.querySelectorAll("select").forEach(s => s.addEventListener("change", upd));
  upd();
  el.querySelector("#p-print").onclick = () => {
    const { scale, paper, orient } = v();
    let f = document.getElementById("print-frame");
    if (f) f.remove();
    f = document.createElement("iframe"); f.id = "print-frame"; f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(f);
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { console.warn(e); } };
    f.srcdoc = printDoc(src, scale, paper, orient, proj, plan);
  };
  const fname = ext => `${(proj + " " + plan).trim().replace(/[^\wåäöÅÄÖ -]+/g, "").replace(/\s+/g, "_") || "piirustus"}_1-${v().scale}.${ext}`;
  const download = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); };
  el.querySelector("#p-svg").onclick = () => { const r = planSvg(src, v().scale); download(new Blob([r.svg], { type: "image/svg+xml" }), fname("svg")); };
  el.querySelector("#p-png").onclick = () => {
    const r = planSvg(src, v().scale), dpi = 200, W = Math.round(r.wmm / 25.4 * dpi), H = Math.round(r.hmm / 25.4 * dpi);
    const img = new Image();
    img.onload = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(img, 0, 0, W, H); c.toBlob(b => download(b, fname("png")), "image/png"); };
    img.onerror = () => toast("PNG-vienti epäonnistui", true);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(r.svg.replace(/width="[^"]+mm" height="[^"]+mm"/, `width="${W}" height="${H}"`));
  };
}
