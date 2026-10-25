// =============================================================
//  3D-näkymä (Three.js). Rakennetaan suoraan pohjapiirustuksen tiedoista:
//  seinät aukkoineen, ovet, ikkunat, lattiat, terassit, kalusteet, sähkö ja LVI.
//  Koordinaatit: piirustuksen x → X, y → Z, korkeus → Y. Yksikkö metri.
//  Mitat tulevat suoraan piirustuksesta, joten 3D on millilleen sama kuin 2D.
// =============================================================
import { joints, wlen, visLen, polyArea, planBBox, mm, m2 } from "./geom.js";
import { KINDS, OPENINGS } from "./catalog.js";
import { WALL_MATS, FLOOR_MATS, DOOR_MATS, FRAME_MATS, ITEM_MATS } from "./materials.js";

const M = .001;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Kalusteiden oletuskorkeudet 3D:ssä: [korkeus, alareuna lattiasta, muoto]
export const H3D = {
  sanky: [450], sanky2: [450], kerrossanky: [1600], vauvansanky: [900], sohva: [800], kulmasohva: [800], nojatuoli: [800],
  poyta: [720], pyoreapoyta: [720, 0, "cyl"], tuoli: [450], kaappi: [2000], hylly: [1800], lipasto: [900], yopoyta: [550],
  keittiotaso: [900], tiskiallas: [900], liesi: [900], jaakaappi: [1800], pakastin: [850], astianpesukone: [850], pesukone: [850],
  mikro: [300, 900], saareke: [900], ylakaappi: [700, 1450], ruokaryhma4: [720], ruokaryhma6: [720],
  wc: [400], kuivakaymala: [450], pesuallas: [150, 800], pesuallaskaappi: [850], peilikaappi: [700, 1300], suihku: [20], amme: [550],
  kuivauskaappi: [1800], pyyhekuivain: [800, 600], suihkuseina: [2000, 0, "glass"],
  kiuas: [800], puukiuas: [900], kivilevy: [1500], kiuaskaide: [900], laude: [450], laudejakkara: [300], selkanoja: [250, 1300],
  lattiaritila: [30], kiulu: [250, 0, "cyl"], pesupata: [900, 0, "cyl"], hormi: [3200], varaaja: [1500, 0, "cyl"], kamiina: [700, 0, "cyl"],
  takka: [1200], puuliesi: [850], puulaatikko: [500], ilpulko: [600], portaat: [2600, 0, "stairs"],
  sohvapoyta: [450], tvtaso: [450], matto: [10], naulakko: [100, 1600], kenkahylly: [500], penkki: [450],
  ulkopoyta: [720], grilli: [900], aurinkotuoli: [350], kaide: [1000], palju: [1000, 0, "cyl"], ulkosuihku: [20], laatikko: [600],
  lauteet: [1050]
};
export const heightOf = it => it.kind === "lauteet" ? (it.hu ?? 1050) : it.zh ?? H3D[it.kind]?.[0] ?? 600;
export const baseOf = it => it.ze ?? H3D[it.kind]?.[1] ?? 0;

const WOOD = new Set(["laude", "lauteet", "laudejakkara", "selkanoja", "lattiaritila", "kiulu", "sanky", "sanky2", "kerrossanky", "vauvansanky", "poyta", "pyoreapoyta", "tuoli", "penkki", "ulkopoyta", "aurinkotuoli", "kaide", "puulaatikko", "palju", "portaat", "naulakko", "kenkahylly", "hylly", "ruokaryhma4", "ruokaryhma6", "saareke"]);
const WHITE = new Set(["jaakaappi", "pakastin", "astianpesukone", "pesukone", "mikro", "wc", "pesuallas", "amme", "suihku", "kuivauskaappi", "liesi", "keittiotaso", "tiskiallas", "pesuallaskaappi", "peilikaappi", "ylakaappi", "kaappi", "lipasto", "yopoyta", "tvtaso", "kuivakaymala", "varaaja", "ilpulko", "ulkosuihku"]);
const DARK = new Set(["kiuas", "puukiuas", "kamiina", "takka", "puuliesi", "pesupata", "grilli", "kiuaskaide"]);

// ---------- Kuviot (piirretään kerran, harmaasävy, sävytetään materiaalin värillä) ----------
function patternCanvas(kind) {
  const N = 256, c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d");
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const grain = (x, y, w, h, n = 120, a = .06) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${a * rnd()})`; g.fillRect(x + rnd() * w, y + rnd() * h, w * .6 * rnd(), 1); } };
  g.fillStyle = "#fff"; g.fillRect(0, 0, N, N);
  const gray = (a, b) => { const v = Math.round(a + rnd() * b); return `rgb(${v},${v},${v})`; };
  const line = (x1, y1, x2, y2, w = 2, col = "rgba(0,0,0,.35)") => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  switch (kind) {
    case "panelH": for (let i = 0; i < 4; i++) { g.fillStyle = gray(235, 20); g.fillRect(0, i * 64, N, 64); grain(0, i * 64, N, 64); line(0, i * 64 + 1, N, i * 64 + 1, 3); } break;
    case "panelV": for (let i = 0; i < 4; i++) { g.fillStyle = gray(235, 20); g.fillRect(i * 64, 0, 64, N); line(i * 64 + 1, 0, i * 64 + 1, N, 3); } break;
    case "boardV": g.fillStyle = "#f0f0f0"; g.fillRect(0, 0, N, N); for (const x of [0, 128]) { g.fillStyle = "#dcdcdc"; g.fillRect(x + 96, 0, 32, N); line(x + 96, 0, x + 96, N, 3, "rgba(0,0,0,.45)"); line(x + 128, 0, x + 128, N, 2, "rgba(0,0,0,.2)"); } break;
    case "clapH": for (let i = 0; i < 4; i++) { const gr = g.createLinearGradient(0, i * 64, 0, i * 64 + 64); gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#d6d6d6"); g.fillStyle = gr; g.fillRect(0, i * 64, N, 64); line(0, i * 64 + 63, N, i * 64 + 63, 3, "rgba(0,0,0,.4)"); } break;
    case "log": for (let i = 0; i < 2; i++) { const gr = g.createLinearGradient(0, i * 128, 0, i * 128 + 128); gr.addColorStop(0, "#9a9a9a"); gr.addColorStop(.25, "#f4f4f4"); gr.addColorStop(.6, "#e6e6e6"); gr.addColorStop(1, "#8a8a8a"); g.fillStyle = gr; g.fillRect(0, i * 128, N, 128); grain(0, i * 128, N, 128, 160, .05); } break;
    case "tile": g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, N, N); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = gray(245, 10); g.fillRect(x * 128 + 2, y * 128 + 2, 124, 124); } break;
    case "tileL": g.fillStyle = "#b0b0b0"; g.fillRect(0, 0, N, N); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const o = y % 2 ? 64 : 0; g.fillStyle = gray(236, 16); g.fillRect(((x * 128 + o) % N) + 2, y * 128 + 2, 124, 124); if (o) g.fillRect(0, y * 128 + 2, 62, 124); } break;
    case "brick": g.fillStyle = "#d8d8d8"; g.fillRect(0, 0, N, N); for (let r = 0; r < 8; r++) for (let k = -1; k < 3; k++) { const o = r % 2 ? 61 : 0; g.fillStyle = gray(200, 50); g.fillRect(k * 122 + o + 2, r * 32 + 2, 118, 28); } break;
    case "stone": g.fillStyle = "#e2e2e2"; g.fillRect(0, 0, N, N); for (let i = 0; i < 46; i++) { const v = 185 + rnd() * 70; g.fillStyle = `rgb(${v},${v},${v})`; const x = rnd() * N, y = rnd() * N, w = 30 + rnd() * 60, h = 20 + rnd() * 40; for (const dx of [0, -N, N]) for (const dy of [0, -N, N]) { g.beginPath(); g.ellipse(x + dx, y + dy, w / 2, h / 2, rnd(), 0, 7); g.fill(); } } break;
    case "noise": for (let i = 0; i < 3000; i++) { const v = 200 + rnd() * 55; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd() * N, rnd() * N, 2, 2); } break;
    case "corr": for (let x = 0; x < N; x++) { const v = 170 + 85 * (.5 + .5 * Math.sin(x / N * Math.PI * 4)); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, N); } break;
    case "planks": for (let i = 0; i < 8; i++) { const o = (i * 97) % N; g.fillStyle = gray(225, 30); g.fillRect(0, i * 32, N, 32); grain(0, i * 32, N, 32, 60); line(0, i * 32, N, i * 32, 2); line(o, i * 32, o, i * 32 + 32, 2); } break;
    case "planksWide": for (let i = 0; i < 2; i++) { g.fillStyle = gray(225, 30); g.fillRect(i * 128, 0, 128, N); grain(i * 128, 0, 128, N, 200); line(i * 128 + 1, 0, i * 128 + 1, N, 3); } break;
  }
  return c;
}

export async function open3D(host, data, S, { title = "", onClose } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "ed-3d";
  wrap.innerHTML = `<div class="v3-load">Ladataan 3D-näkymää…</div>`;
  host.appendChild(wrap);
  let THREE, OrbitControls;
  try {
    THREE = await import("three");
    ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
  } catch (e) {
    console.warn(e);
    wrap.innerHTML = `<div class="v3-load">3D-kirjaston lataus epäonnistui. 3D tarvitsee ensimmäisellä kerralla verkkoyhteyden.<br><button class="btn small" data-v="close">Takaisin 2D:hen</button></div>`;
    wrap.querySelector("[data-v=close]").onclick = () => { wrap.remove(); onClose?.(); };
    return { close: () => wrap.remove() };
  }

  const st = { cut: false, furn: true, tech: true, person: true, mode: "orbit", keys: new Set(), yaw: 0, pitch: 0 };
  wrap.innerHTML = `<canvas class="v3-cv"></canvas>
    <div class="v3-bar">
      <button class="btn small primary" data-v="close" title="Takaisin piirustukseen (Esc)">‹ 2D</button>
      <div class="seg-mini v3-mode"><button data-v="orbit" class="on">Kierrä</button><button data-v="walk">Kävele</button></div>
      <label class="pc"><input type="checkbox" data-v="cut"><span>Leikkaa seinät</span></label>
      <label class="pc"><input type="checkbox" data-v="furn" checked><span>Kalusteet</span></label>
      <label class="pc"><input type="checkbox" data-v="tech" checked><span>Sähkö ja LVI</span></label>
      <label class="pc"><input type="checkbox" data-v="person" checked><span>Ihminen 175 cm</span></label>
      <button class="btn small ghost" data-v="shot" title="Tallenna kuva">📷 Kuva</button>
    </div>
    <div class="v3-info" hidden></div>
    <div class="v3-walk" hidden><button data-mv="f" aria-label="Eteen">▲</button><button data-mv="b" aria-label="Taakse">▼</button></div>
    <div class="v3-hint"></div>`;
  const cv = wrap.querySelector(".v3-cv"), hint = wrap.querySelector(".v3-hint"), infoEl = wrap.querySelector(".v3-info");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? 0x1b232b : 0xdfe8ef);
  const camera = new THREE.PerspectiveCamera(55, 1, .05, 500);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8170, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.45);
  scene.add(sun, sun.target);

  // ---------- Materiaalit ----------
  const texCache = {}, matCache = {};
  const tex = kind => {
    if (!texCache[kind]) { const t = new THREE.CanvasTexture(patternCanvas(kind)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[kind] = t; }
    return texCache[kind];
  };
  const glass = new THREE.MeshStandardMaterial({ color: 0x9cc6e6, transparent: true, opacity: .3, roughness: .05, metalness: .1, depthWrite: false });
  const frost = new THREE.MeshStandardMaterial({ color: 0xeef3f6, transparent: true, opacity: .82, roughness: .9 });
  // [nimi, väri, kuvio, kuvion koko] + oma väri → materiaali. userData.tile = kuvion koko metreinä (UV-skaalausta varten)
  function matOf(def, color, extra = {}) {
    if (!def) def = ["", "#cccccc", null, 0];
    if (def[2] === "glass") return glass;
    if (def[2] === "frost") return frost;
    const col = color || def[1] || "#cccccc", key = def[2] + col + JSON.stringify(extra);
    if (!matCache[key]) {
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: def[2] === "corr" ? .55 : .85, metalness: def[2] === "corr" ? .35 : 0, map: def[2] ? tex(def[2]) : null, ...extra });
      m.userData.tile = def[3] ? def[3] * M : 0;
      matCache[key] = m;
    }
    return matCache[key];
  }
  const plain = (col, extra) => matOf(["", col, null, 0], col, extra);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x4a4540, transparent: true, opacity: .35 });
  const endMat = plain("#d6d0c4");

  // UV:t kuvion kokoon: jokainen tahko saa todelliset mitat, joten kuviot ovat oikean kokoisia (esim. 120 mm paneeli)
  function scaleUV(geo, W, H, D, mats, u0 = 0) {
    const uv = geo.attributes.uv, size = [[D, H], [D, H], [W, D], [W, D], [W, H], [W, H]];
    for (let f = 0; f < 6; f++) {
      const m = Array.isArray(mats) ? mats[f] : mats, t = m?.userData?.tile; if (!t) continue;
      for (let v = f * 4; v < f * 4 + 4; v++) uv.setXY(v, (uv.getX(v) * size[f][0] + (f >= 4 ? u0 : 0)) / t, uv.getY(v) * size[f][1] / t);
    }
    uv.needsUpdate = true;
  }
  // Laatikko paikallisissa koordinaateissa (mm)
  function box(g, x0, x1, y0, y1, z0, z1, material, edges = true, u0 = 0) {
    const w = (x1 - x0) * M, h = (y1 - y0) * M, d = (z1 - z0) * M;
    if (w <= 0 || h <= 0 || d <= 0) return null;
    const geo = new THREE.BoxGeometry(w, h, d);
    scaleUV(geo, w, h, d, material, u0 * M);
    const m = new THREE.Mesh(geo, material);
    m.position.set((x0 + x1) / 2 * M, (y0 + y1) / 2 * M, (z0 + z1) / 2 * M);
    const transparent = [glass, frost].includes(Array.isArray(material) ? material[4] : material);
    m.castShadow = m.receiveShadow = !transparent;
    g.add(m);
    if (edges && !transparent) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); e.position.copy(m.position); g.add(e); }
    return m;
  }
  function cyl(g, x, z, r, y0, y1, material) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * M, r * M, (y1 - y0) * M, 32), material);
    m.position.set(x * M, (y0 + y1) / 2 * M, z * M); m.castShadow = m.receiveShadow = true; g.add(m);
    return m;
  }

  let root = null;
  function build() {
    if (root) { scene.remove(root); root.traverse(o => o.geometry?.dispose?.()); }
    root = new THREE.Group(); scene.add(root);
    const J = joints(data.walls);
    const H = S.wallH || 2400, CUT = 1200;

    // ---------- Seinät aukkoineen ----------
    for (const w of data.walls) {
      const L = wlen(w); if (L < 1) continue;
      const j = J[w.id], h = w.h || H, top = st.cut ? Math.min(h, CUT) : h, t = w.t;
      const g = new THREE.Group();
      g.position.set(w.x1 * M, 0, w.y1 * M);
      g.rotation.y = -Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      g.userData.info = [`Seinä${w.status === "existing" ? " (olemassa oleva)" : w.status === "demolish" ? " (purettava)" : ""}`, [["Pituus", mm(visLen(w, j)) + " mm"], ["Paksuus", t + " mm"], ["Korkeus", h + " mm"]]];
      let mats;
      if (w.status === "demolish") mats = plain("#d0584c", { transparent: true, opacity: .45 });
      else {
        const dA = WALL_MATS[w.matA] || (w.status === "existing" ? ["", "#a9afb5", null, 0] : WALL_MATS.maali);
        const dB = WALL_MATS[w.matB] || (w.status === "existing" ? ["", "#a9afb5", null, 0] : WALL_MATS.maali);
        mats = [endMat, endMat, endMat, endMat, matOf(dA, w.colA), matOf(dB, w.colB)];
      }
      const ops = data.openings.filter(o => o.wallId === w.id).sort((a, b) => a.off - b.off);
      let cur = -j.e1;
      const seg = (x0, x1, y0, y1) => box(g, x0, x1, y0, y1, -t / 2, t / 2, mats, true, x0);
      for (const o of ops) {
        const a = Math.max(cur, o.off), b = Math.min(L + j.e2, o.off + o.w);
        if (a > cur) seg(cur, a, 0, top);
        const sill = o.kind === "ikkuna" ? (o.sill || 0) : 0, oh = Math.min(o.h, h - sill);
        if (sill > 0) seg(a, b, 0, Math.min(sill, top));
        if (sill + oh < top) seg(a, b, sill + oh, top);
        const og = new THREE.Group(); g.add(og);
        og.userData.info = [OPENINGS[o.kind]?.name || "Aukko", [["Leveys", o.w + " mm"], ["Korkeus", o.h + " mm"], ...(o.kind === "ikkuna" ? [["Alareuna lattiasta", sill + " mm"], ["Yläreuna lattiasta", sill + o.h + " mm"]] : [])]];
        if (o.kind === "ikkuna" && sill < top) {
          // karmit ja lasi
          const fm = plain((FRAME_MATS[o.frame] || FRAME_MATS.valkoinen)[1]), fw = 60, fd = Math.min(t, 100) / 2, y1 = Math.min(sill + oh, top);
          box(og, a, b, sill, sill + fw, -fd, fd, fm); if (sill + oh <= top) box(og, a, b, y1 - fw, y1, -fd, fd, fm);
          box(og, a, a + fw, sill, y1, -fd, fd, fm); box(og, b - fw, b, sill, y1, -fd, fd, fm);
          box(og, a + fw, b - fw, sill + fw, y1 - (sill + oh <= top ? fw : 0), -8, 8, glass, false);
        }
        const side = o.side === -1 ? -1 : 1, open = 70 * Math.PI / 180;
        const dm = DOOR_MATS[o.mat] || DOOR_MATS.puu;
        const leaf = (hx, len, dirSign) => {
          const dx = dirSign * Math.cos(open), dz = side * Math.sin(open);
          const lg = new THREE.Group();
          lg.position.set(hx * M, 0, side * t / 2 * M);
          lg.rotation.y = -Math.atan2(dz, dx);
          const lh = Math.min(o.h, top);
          if (o.mat === "puulasi") {
            const wm = matOf(dm), r = 110;
            box(lg, 0, len, 0, Math.min(lh, o.h * .45), -20, 20, wm);
            if (lh > o.h * .45) { box(lg, 0, r, o.h * .45, lh, -20, 20, wm); box(lg, len - r, len, o.h * .45, lh, -20, 20, wm); if (lh >= o.h) box(lg, r, len - r, o.h - r, o.h, -20, 20, wm); box(lg, r, len - r, o.h * .45, Math.min(lh, o.h - r), -6, 6, glass, false); }
          } else box(lg, 0, len, 0, lh, dm[2] === "glass" ? -5 : -20, dm[2] === "glass" ? 5 : 20, matOf(dm), dm[2] !== "glass");
          if (dm[2] === "glass" || dm[2] === "frost") box(lg, len - 90, len - 60, 950, 1250, -30, 30, plain("#c9a36f")); // kahva
          og.add(lg);
        };
        if (o.kind === "ovi") { if (o.hinge === "b") leaf(b, o.w, -1); else leaf(a, o.w, 1); }
        if (o.kind === "pariovi") { leaf(a, o.w / 2, 1); leaf(b, o.w / 2, -1); }
        if (o.kind === "liukuovi") box(og, a, (a + b) / 2 + 50, 0, Math.min(o.h, top), t * .1, t * .1 + 40, matOf(dm));
        cur = Math.max(cur, b);
      }
      if (cur < L + j.e2) seg(cur, L + j.e2, 0, top);
      root.add(g);
    }

    // ---------- Lattiat ja terassit ----------
    for (const r of data.rooms) {
      if (!(r.pts?.length > 2)) continue;
      const terrace = r.kind === "terrace";
      const shape = new THREE.Shape(r.pts.map(p => new THREE.Vector2(p.x * M, -p.y * M)));
      const depth = (terrace ? 45 : 25) * M;
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      let fm;
      if (terrace) {
        fm = matOf(["", "#b48a58", (r.dir || "x") === "x" ? "planksWide" : "planksWide", 2 * ((r.bw || 117) + (r.gap ?? 6))], r.fcol);
        if ((r.dir || "x") === "x") { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i)); }
      } else fm = matOf(FLOOR_MATS[r.fmat] || FLOOR_MATS.puu, r.fcol);
      if (fm.userData.tile) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / fm.userData.tile, uv.getY(i) / fm.userData.tile); }
      const mesh = new THREE.Mesh(geo, fm);
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = -depth + .001;
      mesh.receiveShadow = true;
      const xs = r.pts.map(p => p.x), ys = r.pts.map(p => p.y);
      mesh.userData.info = [r.name || (terrace ? "Terassi" : "Tila"), [["Pinta-ala", m2(polyArea(r.pts)) + " m²"], ["Mitat", `${mm(Math.max(...xs) - Math.min(...xs))} × ${mm(Math.max(...ys) - Math.min(...ys))} mm`], ...(!terrace ? [["Huonekorkeus", (r.ch || H) + " mm"]] : [])]];
      root.add(mesh);
    }

    // ---------- Kalusteet, sähkö ja LVI ----------
    for (const it of data.items) {
      const K = KINDS[it.kind]; if (!K) continue;
      if (K.cat === "kaluste" && !st.furn) continue;
      if (K.cat !== "kaluste" && !st.tech) continue;
      const g = new THREE.Group();
      g.position.set(it.x * M, 0, it.y * M);
      g.rotation.y = -(it.rot || 0) * Math.PI / 180;
      const w = it.w, d = it.d;
      if (K.cat === "kaluste") {
        const h = heightOf(it), z0 = baseOf(it), shape = H3D[it.kind]?.[2];
        g.userData.info = [it.label || K.name, it.kind === "lauteet"
          ? [["Pituus", mm(w) + " mm"], ["Ylälaude", `syvyys ${it.lu ?? 600}, korkeus ${it.hu ?? 1050} mm`], ["Alalaude", `syvyys ${mm(d - (it.lu ?? 600))}, korkeus ${it.ha ?? 600} mm`], ["Ylälaude–katto", `${H - (it.hu ?? 1050)} mm`]]
          : [["Leveys × syvyys", `${mm(w)} × ${mm(d)} mm`], ["Korkeus", `${h} mm`], ...(z0 ? [["Alareuna lattiasta", `${z0} mm`]] : [])]];
        const im = ITEM_MATS[it.mat];
        const m = im && im[1] ? matOf(im, it.col) : it.col ? plain(it.col)
          : WOOD.has(it.kind) ? matOf(["", "#d8b98a", "panelH", 480]) : WHITE.has(it.kind) ? plain("#f4f4f2") : DARK.has(it.kind) ? plain("#3a3a3a") : it.kind === "kivilevy" ? matOf(WALL_MATS.kivi) : plain("#cfc6b8");
        if (shape === "cyl") cyl(g, 0, 0, Math.min(w, d) / 2, z0, z0 + h, m);
        else if (shape === "glass") box(g, -w / 2, w / 2, z0, z0 + h, -d / 2, d / 2, glass, false);
        else if (shape === "stairs") {
          const n = Math.max(2, Math.floor(d / 250)), sh = h / n;
          for (let i = 0; i < n; i++) box(g, -w / 2, w / 2, 0, sh * (i + 1), d / 2 - (i + 1) * d / n, d / 2 - i * d / n, m);
        } else if (it.kind === "lauteet") {
          // ylälaude takana, alalaude edessä; otsalaudat ja päätytuet
          const lu = Math.min(d - 100, it.lu ?? 600), hu = it.hu ?? 1050, ha = Math.min(hu - 100, it.ha ?? 600), y0 = -d / 2, yb = y0 + lu;
          box(g, -w / 2, w / 2, hu - 40, hu, y0, yb, m);
          box(g, -w / 2, w / 2, ha, hu - 40, yb - 22, yb, m);
          box(g, -w / 2, w / 2, ha - 40, ha, yb, d / 2, m);
          box(g, -w / 2, w / 2, 0, ha - 40, d / 2 - 22, d / 2, m);
          for (const sx of [-1, 1]) box(g, sx * (w / 2 - 25) - 25, sx * (w / 2 - 25) + 25, 0, hu - 40, y0, yb - 22, m, false);
        } else if (it.kind === "laude") {
          box(g, -w / 2, w / 2, h - 40, h, -d / 2, d / 2, m); box(g, -w / 2, w / 2, 0, h - 40, d / 2 - 22, d / 2, m);
        } else if (it.kind === "ruokaryhma4" || it.kind === "ruokaryhma6") {
          const td = d * .47, cols = it.kind === "ruokaryhma4" ? [-1, 1] : [-1, 0, 1], k = it.kind === "ruokaryhma4" ? .22 : .3;
          box(g, -w / 2, w / 2, h - 40, h, -td / 2, td / 2, m);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * (w / 2 - 60) - 30, sx * (w / 2 - 60) + 30, 0, h - 40, sz * (td / 2 - 60) - 30, sz * (td / 2 - 60) + 30, m, false);
          for (const sy of [-1, 1]) for (const sx of cols) { const cx = sx * w * k, cz = sy * (td / 2 + 40 + 225); box(g, cx - 225, cx + 225, 420, 460, cz - 225, cz + 225, m); box(g, cx - 225, cx + 225, 460, 900, cz + sy * 205, cz + sy * 225, m); }
        } else if (it.kind === "ulkopoyta") {
          box(g, -w / 2, w / 2, h - 40, h, -d * .25, d * .25, m);
          box(g, -w / 2, w / 2, 0, 450, -d / 2, -d / 2 + d * .17, m); box(g, -w / 2, w / 2, 0, 450, d / 2 - d * .17, d / 2, m);
        } else if (it.kind === "kulmasohva") {
          box(g, -w / 2, w / 2, 0, h * .55, -d / 2, -d / 2 + 900, m); box(g, w / 2 - 900, w / 2, 0, h * .55, -d / 2 + 900, d / 2, m);
          box(g, -w / 2, w / 2, 0, h, -d / 2, -d / 2 + 220, m); box(g, w / 2 - 220, w / 2, 0, h, -d / 2 + 220, d / 2, m);
        } else if (it.kind === "sohva" || it.kind === "nojatuoli") {
          box(g, -w / 2, w / 2, 0, h * .55, -d / 2, d / 2, m); box(g, -w / 2, w / 2, h * .55, h, -d / 2, -d / 2 + d * .25, m);
          const aw = it.kind === "sohva" ? w * .09 : w * .16;
          box(g, -w / 2, -w / 2 + aw, h * .55, h * .78, -d / 2 + d * .25, d / 2, m); box(g, w / 2 - aw, w / 2, h * .55, h * .78, -d / 2 + d * .25, d / 2, m);
        } else if (it.kind === "sanky" || it.kind === "sanky2" || it.kind === "vauvansanky") {
          box(g, -w / 2, w / 2, 0, h - 200, -d / 2, d / 2, m); box(g, -w / 2 + 20, w / 2 - 20, h - 200, h, -d / 2 + 20, d / 2 - 20, plain("#f4f4f2")); box(g, -w / 2, w / 2, 0, 900, -d / 2, -d / 2 + 50, m);
        } else if (it.kind === "kerrossanky") {
          for (const y of [250, 1300]) { box(g, -w / 2, w / 2, y, y + 100, -d / 2, d / 2, m); box(g, -w / 2 + 20, w / 2 - 20, y + 100, y + 250, -d / 2 + 20, d / 2 - 20, plain("#f4f4f2")); }
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * w / 2 - (sx > 0 ? 60 : 0), sx * w / 2 + (sx < 0 ? 60 : 0), 0, h, sz * d / 2 - (sz > 0 ? 60 : 0), sz * d / 2 + (sz < 0 ? 60 : 0), m, false);
        } else if (it.kind === "tuoli") {
          box(g, -w / 2, w / 2, 420, 460, -d / 2, d / 2, m); box(g, -w / 2, w / 2, 460, 900, -d / 2, -d / 2 + 30, m);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * (w / 2 - 25) - 15, sx * (w / 2 - 25) + 15, 0, 420, sz * (d / 2 - 25) - 15, sz * (d / 2 - 25) + 15, m, false);
        } else if (it.kind === "poyta" || it.kind === "sohvapoyta") {
          box(g, -w / 2, w / 2, h - 40, h, -d / 2, d / 2, m);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * (w / 2 - 60) - 30, sx * (w / 2 - 60) + 30, 0, h - 40, sz * (d / 2 - 60) - 30, sz * (d / 2 - 60) + 30, m, false);
        } else if (it.kind === "kiuas" || it.kind === "puukiuas") {
          box(g, -w / 2, w / 2, z0, z0 + h - 120, -d / 2, d / 2, m);
          box(g, -w / 2 + 30, w / 2 - 30, z0 + h - 120, z0 + h, -d / 2 + 30, d / 2 - 30, matOf(WALL_MATS.kivi)); // kivet: kokonaiskorkeus = 3D-korkeus
        } else box(g, -w / 2, w / 2, z0, z0 + h, -d / 2, d / 2, m);
      } else {
        // sähkö- ja LVI-merkinnät: seinällä annetulla korkeudella, muut kattoon tai lattiaan
        const m = plain(K.cat === "sahko" ? "#e0662a" : "#2f80c8", { emissive: K.cat === "sahko" ? 0x401000 : 0x001030 });
        const ceiling = ["kattovalo", "spotti", "palovaroitin", "tulo", "poisto", "korvausilma"].includes(it.kind);
        const floor = ["lattiakaivo", "viemari", "lattialammitys"].includes(it.kind);
        g.userData.info = [it.label || K.name, [[ceiling ? "Sijainti" : floor ? "Sijainti" : "Asennuskorkeus", ceiling ? "katossa" : floor ? "lattiassa" : `${it.h ?? 1000} mm (keskikohta)`]]];
        if (ceiling && st.cut) continue;
        if (ceiling) cyl(g, 0, 0, it.kind === "spotti" ? 45 : 110, H - 30, H - 5, m);
        else if (floor) box(g, -w * .4, w * .4, 0, 8, -d * .4, d * .4, m, false);
        else if (it.kind === "patteri" || it.kind === "ilp" || it.kind === "keskus") {
          const y0 = it.kind === "patteri" ? 200 : it.kind === "ilp" ? Math.max(1800, (it.h ?? 2100) - 300) : (it.h ?? 1500) - 350;
          const hh = it.kind === "patteri" ? 500 : it.kind === "ilp" ? 300 : 700;
          box(g, -w / 2, w / 2, y0, y0 + hh, -d / 2, d / 2, it.kind === "ilp" ? plain("#f4f4f2") : m);
        } else {
          const y = it.h ?? 1000;
          box(g, -45, 45, y - 45, y + 45, -d / 2, -d / 2 + 25, m, false);
        }
      }
      root.add(g);
    }

    // ---------- Mittakaavaihminen 175 cm ----------
    if (st.person) {
      const p = new THREE.Group(), pm = plain("#5d7590"), sk = plain("#e2b896");
      p.position.set((b.x1 + 700) * M, 0, (b.y2 + 900) * M);
      for (const sx of [-1, 1]) box(p, sx * 95 - 60, sx * 95 + 60, 0, 850, -60, 60, pm, false);
      box(p, -190, 190, 850, 1450, -110, 110, pm, false);
      for (const sx of [-1, 1]) box(p, sx * 240 - 50, sx * 240 + 50, 800, 1430, -50, 50, pm, false);
      box(p, -45, 45, 1450, 1530, -45, 45, sk, false);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 16), sk); head.position.y = 1.64; head.castShadow = true; p.add(head);
      p.userData.info = ["Mittakaavahahmo", [["Pituus", "1750 mm"]]];
      root.add(p);
    }
  }

  // Maa, kamera ja valon suunta piirustuksen rajojen mukaan
  const b = planBBox(data) || { x1: 0, y1: 0, x2: 5000, y2: 4000 };
  const cx = (b.x1 + b.x2) / 2 * M, cz = (b.y1 + b.y2) / 2 * M, size = Math.max(b.x2 - b.x1, b.y2 - b.y1, 3000) * M;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size * 4, size * 4), plain(dark ? "#2b3530" : "#c9d3c0"));
  ground.rotation.x = -Math.PI / 2; ground.position.set(cx, -.05, cz); ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(Math.ceil(size * 3), Math.ceil(size * 3), 0x8a9a8a, 0xaab5aa);
  grid.position.set(Math.round(cx), -.045, Math.round(cz)); grid.material.transparent = true; grid.material.opacity = .25; scene.add(grid);
  sun.position.set(cx - size, size * 1.6, cz + size * .8); sun.target.position.set(cx, 0, cz);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: .1, far: size * 6 });
  sun.shadow.bias = -.0005;

  const controls = new OrbitControls(camera, cv);
  controls.enableDamping = true; controls.dampingFactor = .12; controls.maxPolarAngle = Math.PI * .495;
  function orbitView() {
    st.mode = "orbit"; controls.enabled = true;
    camera.fov = 45; camera.updateProjectionMatrix();
    controls.target.set(cx, .8, cz);
    const k = Math.max(1, .85 / Math.max(.3, camera.aspect)); // pystynäytöllä kauemmas
    camera.position.set(cx + size * .9 * k, size * .85 * k, cz + size * 1.1 * k);
    controls.update();
  }
  function walkView() {
    st.mode = "walk"; controls.enabled = false;
    camera.fov = 65; camera.updateProjectionMatrix(); // silmän korkeudella laajempi näkökenttä, ei vääristymää
    const rooms = data.rooms.filter(r => r.kind !== "terrace" && r.pts?.length > 2).sort((a, b) => polyArea(b.pts) - polyArea(a.pts));
    let from, to;
    if (rooms[0]) {
      const xs = rooms[0].pts.map(q => q.x), ys = rooms[0].pts.map(q => q.y), x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
      from = { x: x1 + Math.min(450, (x2 - x1) * .2), y: y2 - Math.min(450, (y2 - y1) * .2) }; to = { x: x2, y: y1 };
    } else { from = { x: (b.x1 + b.x2) / 2, y: b.y2 + 3000 }; to = { x: (b.x1 + b.x2) / 2, y: (b.y1 + b.y2) / 2 }; }
    camera.position.set(from.x * M, 1.6, from.y * M);
    st.yaw = Math.atan2(to.x - from.x, to.y - from.y); st.pitch = -.08; applyLook();
  }
  function applyLook() {
    st.pitch = Math.max(-1.2, Math.min(1.2, st.pitch));
    const dir = new THREE.Vector3(Math.sin(st.yaw) * Math.cos(st.pitch), Math.sin(st.pitch), Math.cos(st.yaw) * Math.cos(st.pitch));
    camera.lookAt(camera.position.clone().add(dir));
  }
  function setMode(mode) {
    wrap.querySelectorAll(".v3-mode button").forEach(x => x.classList.toggle("on", x.dataset.v === mode));
    wrap.querySelector(".v3-walk").hidden = mode !== "walk";
    mode === "walk" ? walkView() : orbitView();
    hint.textContent = mode === "walk" ? "Vedä katsoaksesi ympärille · W/A/S/D tai nuolet liikkuvat · Shift = nopeammin · napauta kohdetta nähdäksesi mitat"
      : "Vedä kiertääksesi · rulla tai nipistys zoomaa · oikea painike siirtää · napauta kohdetta nähdäksesi mitat · maan ruudut 1 × 1 m";
  }

  // Kohteen mitat napauttamalla
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(e) {
    const r = cv.getBoundingClientRect();
    ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(root.children, true).find(h => h.object.isMesh);
    let o = hit?.object; while (o && !o.userData.info) o = o.parent;
    if (!o) { infoEl.hidden = true; return; }
    const [name, rows] = o.userData.info;
    infoEl.innerHTML = `<div class="info-h"><b>${esc(name)}</b><button class="icon-btn" data-v="infox" aria-label="Sulje">✕</button></div>${rows.map(([a, v]) => `<div class="info-r"><span>${esc(a)}</span><b>${esc(v)}</b></div>`).join("")}`;
    infoEl.hidden = false;
  }

  // Kävelytila: katse vetämällä, liike näppäimillä tai nuolinapeilla
  let drag = null, down = null;
  cv.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; if (st.mode !== "walk") return; drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (!drag) return; st.yaw -= (e.clientX - drag.x) * .005; st.pitch -= (e.clientY - drag.y) * .005; drag = { x: e.clientX, y: e.clientY }; applyLook(); });
  cv.addEventListener("pointerup", e => { drag = null; if (down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 5) pick(e); down = null; });
  const held = new Set();
  wrap.querySelectorAll("[data-mv]").forEach(btn => {
    btn.addEventListener("pointerdown", e => { e.preventDefault(); held.add(btn.dataset.mv); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, () => held.delete(btn.dataset.mv)));
  });
  const onKey = e => {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) { e.type === "keydown" ? st.keys.add(k) : st.keys.delete(k); if (st.mode === "walk") e.preventDefault(); }
  };
  document.addEventListener("keydown", onKey, true); document.addEventListener("keyup", onKey, true);

  wrap.addEventListener("change", e => { const v = e.target.dataset.v; if (v && v in st) { st[v] = e.target.checked; build(); } });
  wrap.addEventListener("click", e => {
    const v = e.target.closest("[data-v]")?.dataset.v; if (!v) return;
    if (v === "close") close();
    if (v === "infox") infoEl.hidden = true;
    if (v === "orbit" || v === "walk") setMode(v);
    if (v === "shot") {
      renderer.render(scene, camera);
      const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = `${(title || "3d").replace(/[^\wåäöÅÄÖ -]+/g, "").trim().replace(/\s+/g, "_")}_3d.png`;
      document.body.appendChild(a); a.click(); a.remove();
    }
  });

  function resize() {
    const r = wrap.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(wrap);

  let last = performance.now(), raf = 0, alive = true;
  function loop(now) {
    if (!alive) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (st.mode === "walk") {
      const K = st.keys, sp = (K.has("shift") ? 3 : 1.3) * dt;
      const f = (K.has("w") || K.has("arrowup") || held.has("f") ? 1 : 0) - (K.has("s") || K.has("arrowdown") || held.has("b") ? 1 : 0);
      const sdir = (K.has("d") ? 1 : 0) - (K.has("a") ? 1 : 0);
      if (K.has("arrowleft")) { st.yaw += 1.6 * dt; applyLook(); }
      if (K.has("arrowright")) { st.yaw -= 1.6 * dt; applyLook(); }
      if (f || sdir) {
        camera.position.x += (Math.sin(st.yaw) * f - Math.cos(st.yaw) * sdir) * sp;
        camera.position.z += (Math.cos(st.yaw) * f + Math.sin(st.yaw) * sdir) * sp;
        applyLook();
      }
    } else controls.update();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  function close() {
    alive = false; cancelAnimationFrame(raf); ro.disconnect();
    document.removeEventListener("keydown", onKey, true); document.removeEventListener("keyup", onKey, true);
    controls.dispose(); renderer.dispose();
    scene.traverse(o => o.geometry?.dispose?.());
    Object.values(texCache).forEach(t => t.dispose());
    wrap.remove(); onClose?.();
  }

  build(); resize(); setMode("orbit");
  raf = requestAnimationFrame(loop);
  wrap.__three = { scene, camera, renderer, root: () => root, st }; // testejä varten
  return { close };
}
