// =============================================================
//  3D-näkymä (Three.js). Rakennetaan suoraan pohjapiirustuksen tiedoista:
//  seinät aukkoineen, ovet, ikkunat, lattiat, terassit, kalusteet, sähkö ja LVI.
//  Koordinaatit: piirustuksen x → X, y → Z, korkeus → Y. Yksikkö metri.
// =============================================================
import { joints, wallDir, wlen, polyArea, planBBox } from "./geom.js";
import { KINDS } from "./catalog.js";

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
  ulkopoyta: [720], grilli: [900], aurinkotuoli: [350], kaide: [1000], palju: [1000, 0, "cyl"], ulkosuihku: [20], laatikko: [600]
};
export const heightOf = it => it.zh ?? H3D[it.kind]?.[0] ?? 600;
export const baseOf = it => it.ze ?? H3D[it.kind]?.[1] ?? 0;

const COL = {
  wallNew: 0xece7de, wallEx: 0xa9afb5, wallDemo: 0xd0584c, floor: 0xd9c4a0, deck: 0xb48a58, ground: 0xc9d3c0,
  wood: 0xd8b98a, furn: 0xcfc6b8, white: 0xf4f4f2, dark: 0x3a3a3a, glass: 0x9cc6e6, door: 0xb98a5c, elec: 0xe0662a, lvi: 0x2f80c8, stone: 0x8a8a86
};
const WOOD = new Set(["laude", "laudejakkara", "selkanoja", "lattiaritila", "kiulu", "sanky", "sanky2", "kerrossanky", "vauvansanky", "poyta", "pyoreapoyta", "tuoli", "penkki", "ulkopoyta", "aurinkotuoli", "kaide", "puulaatikko", "palju", "portaat", "naulakko", "kenkahylly", "hylly", "ruokaryhma4", "ruokaryhma6", "saareke"]);
const WHITE = new Set(["jaakaappi", "pakastin", "astianpesukone", "pesukone", "mikro", "wc", "pesuallas", "amme", "suihku", "kuivauskaappi", "liesi", "keittiotaso", "tiskiallas", "pesuallaskaappi", "peilikaappi", "ylakaappi", "kaappi", "lipasto", "yopoyta", "tvtaso", "kuivakaymala", "varaaja", "ilpulko", "ulkosuihku"]);
const DARK = new Set(["kiuas", "puukiuas", "kamiina", "takka", "puuliesi", "pesupata", "grilli", "kiuaskaide"]);

export async function open3D(host, data, S, { title = "", readOnly = false, onClose } = {}) {
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

  const st = { cut: false, furn: true, tech: true, mode: "orbit", keys: new Set(), yaw: 0, pitch: 0 };
  wrap.innerHTML = `<canvas class="v3-cv"></canvas>
    <div class="v3-bar">
      <button class="btn small primary" data-v="close" title="Takaisin piirustukseen (Esc)">‹ 2D</button>
      <div class="seg-mini v3-mode"><button data-v="orbit" class="on">Kierrä</button><button data-v="walk">Kävele</button></div>
      <label class="pc"><input type="checkbox" data-v="cut"><span>Leikkaa seinät</span></label>
      <label class="pc"><input type="checkbox" data-v="furn" checked><span>Kalusteet</span></label>
      <label class="pc"><input type="checkbox" data-v="tech" checked><span>Sähkö ja LVI</span></label>
      <button class="btn small ghost" data-v="shot" title="Tallenna kuva">📷 Kuva</button>
    </div>
    <div class="v3-walk" hidden><button data-mv="f" aria-label="Eteen">▲</button><button data-mv="b" aria-label="Taakse">▼</button></div>
    <div class="v3-hint"></div>`;
  const cv = wrap.querySelector(".v3-cv"), hint = wrap.querySelector(".v3-hint");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? 0x1b232b : 0xdfe8ef);
  const camera = new THREE.PerspectiveCamera(50, 1, .05, 500);

  // Valot
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8170, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  scene.add(sun, sun.target);

  const mats = {};
  const mat = (c, o = {}) => mats[c + JSON.stringify(o)] ||= new THREE.MeshStandardMaterial({ color: c, roughness: .85, ...o });
  const glass = new THREE.MeshStandardMaterial({ color: COL.glass, transparent: true, opacity: .35, roughness: .1, metalness: .1, depthWrite: false });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x55504a, transparent: true, opacity: .45 });

  // Laatikko paikallisissa koordinaateissa (mm): x-väli, y-väli, z-väli
  function box(g, x0, x1, y0, y1, z0, z1, material, edges = true) {
    const w = (x1 - x0) * M, h = (y1 - y0) * M, d = (z1 - z0) * M;
    if (w <= 0 || h <= 0 || d <= 0) return null;
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, material);
    m.position.set((x0 + x1) / 2 * M, (y0 + y1) / 2 * M, (z0 + z1) / 2 * M);
    m.castShadow = m.receiveShadow = material !== glass;
    g.add(m);
    if (edges && material !== glass) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat); e.position.copy(m.position); g.add(e); }
    return m;
  }
  function cyl(g, x, z, r, y0, y1, material) {
    const geo = new THREE.CylinderGeometry(r * M, r * M, (y1 - y0) * M, 32);
    const m = new THREE.Mesh(geo, material);
    m.position.set(x * M, (y0 + y1) / 2 * M, z * M); m.castShadow = m.receiveShadow = true; g.add(m);
    return m;
  }

  let root = null;
  function build() {
    if (root) { scene.remove(root); root.traverse(o => { o.geometry?.dispose?.(); }); }
    root = new THREE.Group(); scene.add(root);
    const J = joints(data.walls);
    const H = S.wallH || 2400, CUT = 1200;

    // Seinät aukkoineen
    for (const w of data.walls) {
      const L = wlen(w); if (L < 1) continue;
      const j = J[w.id], h = w.h || H, top = st.cut ? Math.min(h, CUT) : h, t = w.t;
      const g = new THREE.Group();
      g.position.set(w.x1 * M, 0, w.y1 * M);
      g.rotation.y = -Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      const m = w.status === "existing" ? mat(COL.wallEx) : w.status === "demolish" ? mat(COL.wallDemo, { transparent: true, opacity: .45 }) : mat(COL.wallNew);
      const ops = data.openings.filter(o => o.wallId === w.id).sort((a, b) => a.off - b.off);
      let cur = -j.e1;
      for (const o of ops) {
        const a = Math.max(cur, o.off), b = Math.min(L + j.e2, o.off + o.w);
        if (a > cur) box(g, cur, a, 0, top, -t / 2, t / 2, m);
        const sill = o.kind === "ikkuna" ? (o.sill || 0) : 0, oh = Math.min(o.h, h - sill);
        if (sill > 0) box(g, a, b, 0, Math.min(sill, top), -t / 2, t / 2, m);
        if (sill + oh < top) box(g, a, b, sill + oh, top, -t / 2, t / 2, m);
        // ikkunan lasi ja ovet
        if (o.kind === "ikkuna" && sill < top) box(g, a, b, sill, Math.min(sill + oh, top), -10, 10, glass, false);
        const side = o.side === -1 ? -1 : 1, open = 70 * Math.PI / 180;
        const leaf = (hx, len, dirSign) => {
          const dx = dirSign * Math.cos(open), dz = side * Math.sin(open);
          const lg = new THREE.Group();
          lg.position.set(hx * M, 0, side * t / 2 * M);
          lg.rotation.y = -Math.atan2(dz, dx);
          box(lg, 0, len, 0, Math.min(o.h, top), -20, 20, mat(COL.door));
          g.add(lg);
        };
        if (o.kind === "ovi") { if (o.hinge === "b") leaf(b, o.w, -1); else leaf(a, o.w, 1); }
        if (o.kind === "pariovi") { leaf(a, o.w / 2, 1); leaf(b, o.w / 2, -1); }
        if (o.kind === "liukuovi") box(g, a, (a + b) / 2 + 50, 0, Math.min(o.h, top), t * .1, t * .1 + 40, mat(COL.door));
        cur = Math.max(cur, b);
      }
      if (cur < L + j.e2) box(g, cur, L + j.e2, 0, top, -t / 2, t / 2, m);
      root.add(g);
    }

    // Lattiat ja terassit
    for (const r of data.rooms) {
      if (!(r.pts?.length > 2)) continue;
      const shape = new THREE.Shape(r.pts.map(p => new THREE.Vector2(p.x * M, -p.y * M)));
      const terrace = r.kind === "terrace";
      const geo = new THREE.ExtrudeGeometry(shape, { depth: (terrace ? 45 : 25) * M, bevelEnabled: false });
      const mesh = new THREE.Mesh(geo, mat(terrace ? COL.deck : COL.floor));
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = -(terrace ? 45 : 25) * M + .001;
      mesh.receiveShadow = true; root.add(mesh);
      if (terrace) {
        // lautarakojen viivat
        const xs = r.pts.map(p => p.x), ys = r.pts.map(p => p.y), sp = (r.bw || 117) + (r.gap ?? 6);
        const pos = [], alongX = (r.dir || "x") === "x";
        const [a0, a1, b0, b1] = alongX ? [Math.min(...ys), Math.max(...ys), Math.min(...xs), Math.max(...xs)] : [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        for (let v = a0 + sp; v < a1 && pos.length < 6000; v += sp) alongX ? pos.push(b0 * M, .003, v * M, b1 * M, .003, v * M) : pos.push(v * M, .003, b0 * M, v * M, .003, b1 * M);
        const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        root.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x6b4f2c, transparent: true, opacity: .5 })));
      }
    }

    // Kalusteet, sähkö ja LVI
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
        const m = WOOD.has(it.kind) ? mat(COL.wood) : WHITE.has(it.kind) ? mat(COL.white) : DARK.has(it.kind) ? mat(COL.dark) : it.kind === "kivilevy" ? mat(COL.stone) : mat(COL.furn);
        if (shape === "cyl") cyl(g, 0, 0, Math.min(w, d) / 2, z0, z0 + h, m);
        else if (shape === "glass") box(g, -w / 2, w / 2, z0, z0 + h, -d / 2, d / 2, glass, false);
        else if (shape === "stairs") {
          const n = Math.max(2, Math.floor(d / 250)), sh = h / n;
          for (let i = 0; i < n; i++) box(g, -w / 2, w / 2, 0, sh * (i + 1), d / 2 - (i + 1) * d / n, d / 2 - i * d / n, m);
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
          box(g, -w / 2, w / 2, 0, h - 200, -d / 2, d / 2, m); box(g, -w / 2 + 20, w / 2 - 20, h - 200, h, -d / 2 + 20, d / 2 - 20, mat(COL.white)); box(g, -w / 2, w / 2, 0, 900, -d / 2, -d / 2 + 50, m);
        } else if (it.kind === "kerrossanky") {
          for (const y of [250, 1300]) { box(g, -w / 2, w / 2, y, y + 100, -d / 2, d / 2, m); box(g, -w / 2 + 20, w / 2 - 20, y + 100, y + 250, -d / 2 + 20, d / 2 - 20, mat(COL.white)); }
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * w / 2 - (sx > 0 ? 60 : 0), sx * w / 2 + (sx < 0 ? 60 : 0), 0, h, sz * d / 2 - (sz > 0 ? 60 : 0), sz * d / 2 + (sz < 0 ? 60 : 0), m, false);
        } else if (it.kind === "tuoli") {
          box(g, -w / 2, w / 2, 420, 460, -d / 2, d / 2, m); box(g, -w / 2, w / 2, 460, 900, -d / 2, -d / 2 + 30, m);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * (w / 2 - 25) - 15, sx * (w / 2 - 25) + 15, 0, 420, sz * (d / 2 - 25) - 15, sz * (d / 2 - 25) + 15, m, false);
        } else if (it.kind === "poyta" || it.kind === "sohvapoyta") {
          box(g, -w / 2, w / 2, h - 40, h, -d / 2, d / 2, m);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, sx * (w / 2 - 60) - 30, sx * (w / 2 - 60) + 30, 0, h - 40, sz * (d / 2 - 60) - 30, sz * (d / 2 - 60) + 30, m, false);
        } else if (it.kind === "kiuas" || it.kind === "puukiuas") {
          box(g, -w / 2, w / 2, 0, h, -d / 2, d / 2, m);
          box(g, -w / 2 + 40, w / 2 - 40, h, h + 120, -d / 2 + 40, d / 2 - 40, mat(COL.stone)); // kivet
        } else box(g, -w / 2, w / 2, z0, z0 + h, -d / 2, d / 2, m);
      } else {
        // sähkö- ja LVI-merkinnät: seinällä annetulla korkeudella, muut kattoon tai lattiaan
        const m = mat(K.cat === "sahko" ? COL.elec : COL.lvi, { emissive: K.cat === "sahko" ? 0x401000 : 0x001030 });
        const ceiling = ["kattovalo", "spotti", "palovaroitin", "tulo", "poisto", "korvausilma"].includes(it.kind);
        const floor = ["lattiakaivo", "viemari", "lattialammitys"].includes(it.kind);
        if (ceiling && st.cut) continue;
        if (ceiling) cyl(g, 0, 0, it.kind === "spotti" ? 45 : 110, H - 30, H - 5, m);
        else if (floor) box(g, -w * .4, w * .4, 0, 8, -d * .4, d * .4, m, false);
        else if (it.kind === "patteri" || it.kind === "ilp" || it.kind === "keskus") {
          const y0 = it.kind === "patteri" ? 200 : it.kind === "ilp" ? Math.max(1800, (it.h ?? 2100) - 300) : (it.h ?? 1500) - 350;
          const hh = it.kind === "patteri" ? 500 : it.kind === "ilp" ? 300 : 700;
          box(g, -w / 2, w / 2, y0, y0 + hh, -d / 2, d / 2, it.kind === "ilp" ? mat(COL.white) : m);
        } else {
          const y = it.h ?? 1000;
          box(g, -45, 45, y - 45, y + 45, -d / 2, -d / 2 + 25, m, false);
        }
      }
      root.add(g);
    }
  }

  // Maa, kamera ja valon suunta piirustuksen rajojen mukaan
  const b = planBBox(data) || { x1: 0, y1: 0, x2: 5000, y2: 4000 };
  const cx = (b.x1 + b.x2) / 2 * M, cz = (b.y1 + b.y2) / 2 * M, size = Math.max(b.x2 - b.x1, b.y2 - b.y1, 3000) * M;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size * 4, size * 4), mat(dark ? 0x2b3530 : COL.ground));
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
    controls.target.set(cx, .8, cz);
    const k = Math.max(1, .85 / Math.max(.3, camera.aspect)); // pystynäytöllä kauemmas
    camera.position.set(cx + size * .9 * k, size * .85 * k, cz + size * 1.1 * k);
    controls.update();
  }
  function walkView() {
    st.mode = "walk"; controls.enabled = false;
    // sisälle suurimman tilan keskelle, muuten piirustuksen eteen
    const rooms = data.rooms.filter(r => r.kind !== "terrace" && r.pts?.length > 2).sort((a, b) => polyArea(b.pts) - polyArea(a.pts));
    // aloitus huoneen nurkasta, katse huoneen poikki
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
    hint.textContent = mode === "walk" ? "Vedä katsoaksesi ympärille · W/A/S/D tai nuolet liikkuvat · Shift = nopeammin" : "Vedä kiertääksesi · rulla tai nipistys zoomaa · oikea painike tai kaksi sormea siirtää";
  }

  // Kävelytila: katse vetämällä, liike näppäimillä tai nuolinapeilla
  let drag = null;
  cv.addEventListener("pointerdown", e => { if (st.mode !== "walk") return; drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => { if (!drag) return; st.yaw -= (e.clientX - drag.x) * .005; st.pitch -= (e.clientY - drag.y) * .005; drag = { x: e.clientX, y: e.clientY }; applyLook(); });
  cv.addEventListener("pointerup", () => drag = null);
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
    if (v === "orbit" || v === "walk") setMode(v);
    if (v === "shot") {
      renderer.render(scene, camera);
      const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = `${(title || "3d").replace(/[^\wåäöÅÄÖ -]+/g, "").replace(/\s+/g, "_")}_3d.png`;
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
    wrap.remove(); onClose?.();
  }

  build(); resize(); setMode("orbit");
  raf = requestAnimationFrame(loop);
  wrap.__three = { scene, camera, renderer, root: () => root, st }; // testejä varten
  return { close };
}
