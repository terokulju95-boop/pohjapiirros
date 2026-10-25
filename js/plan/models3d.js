// =============================================================
//  Kalusteiden ja varusteiden 3D-mallit.
//  Paikalliset koordinaatit (mm): x = leveys (w), y = korkeus, z = syvyys (d).
//  Takareuna (seinää vasten) on z = -d/2, etureuna z = +d/2.
//  c = työkalut: B (laatikko), C (sylinteri), CX/CZ (vaakasylinterit), S (pallo), sub (alaryhmä), M (materiaalit), ov (oma materiaali)
// =============================================================

// Yksinkertainen toistettava satunnaisluku (kivet, kirjat, puut)
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;

const legs4 = (c, g, x, z, s, y0, y1, m) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.B(g, sx * x - s / 2, sx * x + s / 2, y0, y1, sz * z - s / 2, sz * z + s / 2, m); };
// Rimat: n rimaa x-suunnassa välille [a, b] z-akselilla, rako gap
function slatsZ(c, g, x0, x1, y0, y1, a, b, board, gap, m) {
  const n = Math.max(1, Math.round((b - a + gap) / (board + gap))), bw = (b - a - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) { const z = a + i * (bw + gap); c.B(g, x0, x1, y0, y1, z, z + bw, m); }
}
function slatsX(c, g, z0, z1, y0, y1, a, b, board, gap, m) {
  const n = Math.max(1, Math.round((b - a + gap) / (board + gap))), bw = (b - a - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) { const x = a + i * (bw + gap); c.B(g, x, x + bw, y0, y1, z0, z1, m); }
}
const handleV = (c, g, x, y0, y1, z, m) => c.B(g, x - 8, x + 8, y0, y1, z, z + 25, m);
const handleH = (c, g, x0, x1, y, z, m) => c.B(g, x0, x1, y - 8, y + 8, z, z + 25, m);

function chair(c, g, x, z, ry, m) {
  const s = c.sub(g, x, 0, z, ry), hw = 210, hd = 210;
  c.B(s, -hw, hw, 430, 460, -hd, hd, m);
  legs4(c, s, hw - 20, hd - 20, 32, 0, 430, m);
  for (const sx of [-1, 1]) c.B(s, sx * (hw - 20) - 16, sx * (hw - 20) + 16, 460, 880, -hd + 4, -hd + 36, m);
  c.B(s, -hw + 4, hw - 4, 760, 860, -hd + 8, -hd + 30, m);
  c.B(s, -hw + 4, hw - 4, 600, 660, -hd + 8, -hd + 30, m);
}
function bed(c, g, W, D, y, m, M, pillows = true) {
  const hw = W / 2, hd = D / 2;
  c.B(g, -hw, hw, y, y + 180, -hd, hd, m);
  c.B(g, -hw + 15, hw - 15, y + 180, y + 380, -hd + 15, hd - 15, M.mattress);
  if (pillows) {
    const n = W > 1200 ? 2 : 1, pw = (W - 120 - (n - 1) * 30) / n;
    for (let i = 0; i < n; i++) { const x0 = -hw + 60 + i * (pw + 30); c.B(g, x0, x0 + pw, y + 380, y + 470, -hd + 70, -hd + 450, M.pillow); }
    c.B(g, -hw + 5, hw - 5, y + 380, y + 410, -hd + D * .34, hd - 5, M.blanket);
    c.B(g, -hw, -hw + 5, y + 230, y + 410, -hd + D * .34, hd - 5, M.blanket); c.B(g, hw - 5, hw, y + 230, y + 410, -hd + D * .34, hd - 5, M.blanket);
  }
}
function cabinets(c, g, W, D, M, body, top = true) {
  const hw = W / 2, hd = D / 2;
  c.B(g, -hw, hw, 0, 100, -hd, hd - 60, M.black);
  c.B(g, -hw, hw, 100, 870, -hd, hd - 20, body);
  const n = Math.max(1, Math.round(W / 600));
  for (let i = 1; i < n; i++) { const x = -hw + i * W / n; c.B(g, x - 2, x + 2, 110, 860, hd - 20, hd - 18, M.black); }
  for (let i = 0; i < n; i++) { const x0 = -hw + i * W / n; handleH(c, g, x0 + 60, x0 + W / n - 60, 800, hd - 20, M.steel); }
  if (top) c.B(g, -hw, hw, 870, 900, -hd, hd + 15, M.counter);
}
function faucet(c, g, x, z, y, M) {
  c.C(g, x, z, 18, y, y + 230, M.chrome);
  c.CZ(g, z, z + 180, x, y + 230, 13, M.chrome);
  c.C(g, x, z + 175, 12, y + 190, y + 230, M.chrome);
  c.CX(g, x, x + 90, y + 245, z + 10, 8, M.chrome);
}
function stones(c, g, x0, x1, z0, z1, y0, y1, M, seed = 3) {
  const r = seeded(seed), n = Math.max(8, Math.round((x1 - x0) * (z1 - z0) / 9000));
  for (let i = 0; i < n; i++) c.S(g, x0 + 40 + r() * (x1 - x0 - 80), y0 + r() * (y1 - y0), z0 + 40 + r() * (z1 - z0 - 80), 38 + r() * 22, r() > .5 ? M.stone : M.stone2, .75 + r() * .3);
}
function pipe(c, g, x, z, y0, y1, M) { if (y1 > y0) c.C(g, x, z, 65, y0, y1, M.black); }

export const MODELS = {
  // ---------- Makuuhuone ----------
  sanky: (it, c, g, M) => { const m = c.ov || M.wood; bed(c, g, it.w, it.d, 120, m, M); legs4(c, g, it.w / 2 - 40, it.d / 2 - 40, 50, 0, 120, m); c.B(g, -it.w / 2, it.w / 2, 120, 950, -it.d / 2, -it.d / 2 + 40, m); },
  sanky2: (it, c, g, M) => MODELS.sanky(it, c, g, M),
  vauvansanky: (it, c, g, M) => {
    const m = c.ov || M.white, hw = it.w / 2, hd = it.d / 2;
    legs4(c, g, hw - 20, hd - 20, 40, 0, 900, m);
    for (const sx of [-1, 1]) { c.B(g, sx * hw - (sx > 0 ? 40 : 0), sx * hw + (sx < 0 ? 40 : 0), 860, 900, -hd, hd, m); c.B(g, sx * hw - (sx > 0 ? 40 : 0), sx * hw + (sx < 0 ? 40 : 0), 250, 290, -hd, hd, m); for (let z = -hd + 70; z < hd - 40; z += 75) c.B(g, sx * (hw - 20) - 10, sx * (hw - 20) + 10, 290, 860, z - 10, z + 10, m); }
    for (const sz of [-1, 1]) c.B(g, -hw, hw, 250, 900, sz * hd - (sz > 0 ? 25 : 0), sz * hd + (sz < 0 ? 25 : 0), m);
    c.B(g, -hw + 30, hw - 30, 290, 390, -hd + 30, hd - 30, M.mattress);
  },
  kerrossanky: (it, c, g, M) => {
    const m = c.ov || M.wood, hw = it.w / 2, hd = it.d / 2;
    legs4(c, g, hw - 30, hd - 30, 60, 0, 1650, m);
    bed(c, g, it.w - 20, it.d - 20, 200, m, M); bed(c, g, it.w - 20, it.d - 20, 1250, m, M);
    c.B(g, -hw, hw - 500, 1650, 1720, hd - 30, hd, m); c.B(g, -hw, hw, 1650, 1720, -hd, -hd + 30, m);
    for (const x of [hw - 470, hw - 90]) c.B(g, x - 20, x + 20, 0, 1720, hd + 10, hd + 50, m);
    for (let y = 320; y < 1650; y += 280) c.B(g, hw - 470, hw - 90, y - 15, y + 15, hd + 15, hd + 45, m);
  },
  yopoyta: (it, c, g, M) => { const m = c.ov || M.wood, hw = it.w / 2, hd = it.d / 2; legs4(c, g, hw - 25, hd - 25, 30, 0, 150, m); c.B(g, -hw, hw, 150, 550, -hd, hd, m); c.B(g, -hw + 10, hw - 10, 400, 402, hd, hd + 2, M.black); c.B(g, -30, 30, 460, 480, hd, hd + 20, M.steel); },
  lipasto: (it, c, g, M) => { const m = c.ov || M.white, hw = it.w / 2, hd = it.d / 2; c.B(g, -hw, hw, 60, 900, -hd, hd, m); legs4(c, g, hw - 30, hd - 30, 35, 0, 60, M.wood); for (const y of [330, 600]) c.B(g, -hw + 10, hw - 10, y - 2, y + 2, hd, hd + 2, M.black); for (const y of [200, 465, 740]) c.B(g, -60, 60, y - 8, y + 8, hd, hd + 22, M.steel); },
  kaappi: (it, c, g, M) => {
    const m = c.ov || M.white, hw = it.w / 2, hd = it.d / 2, h = c.h;
    c.B(g, -hw, hw, 0, 80, -hd, hd - 40, M.black); c.B(g, -hw, hw, 80, h, -hd, hd, m);
    if (it.w >= 500) { c.B(g, -2, 2, 100, h - 20, hd, hd + 2, M.black); handleV(c, g, -40, 900, 1250, hd, M.steel); handleV(c, g, 40, 900, 1250, hd, M.steel); }
    else handleV(c, g, hw - 50, 900, 1250, hd, M.steel);
  },
  hylly: (it, c, g, M) => {
    const m = c.ov || M.wood, hw = it.w / 2, hd = it.d / 2, h = c.h, r = seeded(11);
    c.B(g, -hw, -hw + 20, 0, h, -hd, hd, m); c.B(g, hw - 20, hw, 0, h, -hd, hd, m); c.B(g, -hw, hw, 0, h, -hd, -hd + 8, m);
    const cols = [M.book1, M.book2, M.book3, M.book4];
    for (let y = 0; y <= h - 20; y += 350) {
      c.B(g, -hw + 20, hw - 20, y, y + 20, -hd + 8, hd, m);
      if (y + 300 < h) for (let x = -hw + 30; x < hw - 60;) { const bw = 25 + r() * 25, bh = 180 + r() * 100; if (r() > .15) c.B(g, x, x + bw, y + 20, y + 20 + bh, -hd + 30, -hd + 30 + 180 + r() * 40, cols[Math.floor(r() * 4)]); x += bw + 2; if (r() > .9) x += 80; }
    }
    c.B(g, -hw, hw, h - 20, h, -hd, hd, m);
  },
  // ---------- Olohuone ----------
  sohva: (it, c, g, M) => {
    const f = c.ov || M.fabric, hw = it.w / 2, hd = it.d / 2, aw = it.kind === "nojatuoli" ? 140 : 180, h = c.h;
    legs4(c, g, hw - 50, hd - 50, 40, 0, 80, M.black);
    c.B(g, -hw, hw, 80, 400, -hd, hd, f);
    c.B(g, -hw, hw, 80, h, -hd, -hd + 180, f);
    for (const sx of [-1, 1]) c.B(g, sx > 0 ? hw - aw : -hw, sx > 0 ? hw : -hw + aw, 80, 620, -hd, hd, f);
    const iw = it.w - 2 * aw, n = Math.max(1, Math.round(iw / 700)), cw = iw / n;
    for (let i = 0; i < n; i++) { const x0 = -hw + aw + i * cw; c.B(g, x0 + 5, x0 + cw - 5, 400, 500, -hd + 180, hd - 10, M.cushion); c.B(g, x0 + 10, x0 + cw - 10, 500, h - 30, -hd + 180, -hd + 330, M.cushion); }
  },
  nojatuoli: (it, c, g, M) => MODELS.sohva(it, c, g, M),
  kulmasohva: (it, c, g, M) => {
    const f = c.ov || M.fabric, hw = it.w / 2, hd = it.d / 2, h = c.h, dd = 900, aw = 160;
    c.B(g, -hw, hw, 0, 400, -hd, -hd + dd, f); c.B(g, hw - dd, hw, 0, 400, -hd + dd, hd, f);
    c.B(g, -hw, hw, 0, h, -hd, -hd + 200, f); c.B(g, hw - 200, hw, 0, h, -hd + 200, hd, f);
    c.B(g, -hw, -hw + aw, 0, 600, -hd + 200, -hd + dd, f); c.B(g, hw - dd, hw - 200, 0, 600, hd - aw, hd, f);
    c.B(g, -hw + aw, hw - 200, 400, 500, -hd + 200, -hd + dd - 10, M.cushion); c.B(g, hw - dd + 10, hw - 200, 400, 500, -hd + dd - 10, hd - aw, M.cushion);
    for (let x = -hw + aw; x < hw - 200 - 100; x += 650) c.B(g, x + 10, Math.min(x + 640, hw - 210), 500, h - 30, -hd + 200, -hd + 340, M.cushion);
  },
  sohvapoyta: (it, c, g, M) => { const m = c.ov || M.wood, hw = it.w / 2, hd = it.d / 2, h = c.h; c.B(g, -hw, hw, h - 30, h, -hd, hd, m); c.B(g, -hw + 60, hw - 60, 120, 140, -hd + 60, hd - 60, m); legs4(c, g, hw - 40, hd - 40, 40, 0, h - 30, m); },
  tvtaso: (it, c, g, M) => {
    const m = c.ov || M.white, hw = it.w / 2, hd = it.d / 2, h = c.h;
    c.B(g, -hw, hw, 60, h, -hd, hd, m); legs4(c, g, hw - 40, hd - 40, 30, 0, 60, M.black); c.B(g, -2, 2, 70, h - 10, hd, hd + 2, M.black);
    const tw = Math.min(it.w * .8, 1450), th = tw * .58;
    c.B(g, -60, 60, h, h + 60, -50, 50, M.black); c.B(g, -20, 20, h + 60, h + 140, -20, 20, M.black);
    c.B(g, -tw / 2, tw / 2, h + 120, h + 120 + th, -25, 15, M.black); c.B(g, -tw / 2 + 12, tw / 2 - 12, h + 132, h + 108 + th, 15, 17, M.screen);
  },
  matto: (it, c, g, M) => c.B(g, -it.w / 2, it.w / 2, 0, 9, -it.d / 2, it.d / 2, c.ov || M.rug),
  // ---------- Pöydät ja tuolit ----------
  poyta: (it, c, g, M) => { const m = c.ov || M.wood, hw = it.w / 2, hd = it.d / 2, h = c.h; c.B(g, -hw, hw, h - 30, h, -hd, hd, m); c.B(g, -hw + 50, hw - 50, h - 110, h - 30, -hd + 50, hd - 50, m); legs4(c, g, hw - 55, hd - 55, 50, 0, h - 30, m); },
  pyoreapoyta: (it, c, g, M) => { const m = c.ov || M.wood, h = c.h; c.C(g, 0, 0, it.w / 2, h - 30, h, m, { seg: 48, sz: it.d / it.w }); c.C(g, 0, 0, 45, 50, h - 30, m); c.C(g, 0, 0, Math.min(it.w, it.d) * .28, 0, 50, m, { seg: 40 }); },
  tuoli: (it, c, g, M) => chair(c, g, 0, 0, 0, c.ov || M.wood),
  ruokaryhma4: (it, c, g, M) => {
    const m = c.ov || M.wood, hw = it.w / 2, td = it.d * .47, h = c.h;
    c.B(g, -hw, hw, h - 30, h, -td / 2, td / 2, m); legs4(c, g, hw - 55, td / 2 - 55, 50, 0, h - 30, m);
    const xs = it.kind === "ruokaryhma4" ? [-.22, .22] : [-.3, 0, .3];
    for (const x of xs) { chair(c, g, x * it.w, -td / 2 - 140, 0, m); chair(c, g, x * it.w, td / 2 + 140, 180, m); }
  },
  ruokaryhma6: (it, c, g, M) => MODELS.ruokaryhma4(it, c, g, M),
  // ---------- Keittiö ----------
  keittiotaso: (it, c, g, M) => cabinets(c, g, it.w, it.d, M, c.ov || M.white),
  saareke: (it, c, g, M) => { cabinets(c, g, it.w, it.d - 250, M, c.ov || M.white, false); c.B(g, -it.w / 2 - 20, it.w / 2 + 20, 870, 900, -it.d / 2, it.d / 2, M.counter); },
  tiskiallas: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2; cabinets(c, g, it.w, it.d, M, c.ov || M.white);
    c.B(g, -hw * .8, hw * .8, 900, 903, -hd + 80, hd - 60, M.steel); c.B(g, -hw * .7, hw * .7, 902, 905, -hd + 120, hd - 100, M.sinkIn);
    faucet(c, g, 0, -hd + 50, 903, M);
  },
  liesi: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2;
    c.B(g, -hw, hw, 0, 100, -hd, hd - 60, M.black); c.B(g, -hw, hw, 100, 900, -hd, hd, c.ov || M.white);
    c.B(g, -hw + 5, hw - 5, 900, 906, -hd + 5, hd - 5, M.screen);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.C(g, a * it.w * .22, b * it.d * .2, Math.min(it.w, it.d) * (a === b ? .13 : .1), 906, 908, M.burner, { seg: 32 });
    c.B(g, -hw + 40, hw - 40, 160, 700, hd, hd + 4, M.screen); c.B(g, -hw + 60, hw - 60, 730, 745, hd + 4, hd + 30, M.steel);
    for (let i = 0; i < 4; i++) c.CZ(g, hd, hd + 25, -hw + 90 + i * (it.w - 180) / 3, 830, 18, M.black);
  },
  jaakaappi: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, h = c.h, gy = h * .36; c.B(g, -hw, hw, 0, h, -hd, hd, c.ov || M.white); c.B(g, -hw + 5, hw - 5, gy - 2, gy + 2, hd, hd + 2, M.black); handleV(c, g, hw - 50, gy + 50, gy + 450, hd, M.steel); handleV(c, g, hw - 50, gy - 350, gy - 60, hd, M.steel); },
  pakastin: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2; c.B(g, -hw, hw, 0, c.h, -hd, hd, c.ov || M.white); handleV(c, g, hw - 50, c.h - 300, c.h - 80, hd, M.steel); },
  astianpesukone: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2; c.B(g, -hw, hw, 0, c.h, -hd, hd, c.ov || M.white); c.B(g, -hw, hw, c.h - 90, c.h - 5, hd, hd + 3, M.steel); handleH(c, g, -hw + 80, hw - 80, c.h - 130, hd, M.steel); },
  pesukone: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h; c.B(g, -hw, hw, 0, h, -hd, hd, c.ov || M.white); c.B(g, -hw, hw, h - 100, h - 5, hd, hd + 3, M.steel);
    const dz = c.CZ(g, hd, hd + 30, 0, 430, 210, M.chrome); const gl = c.CZ(g, hd + 25, hd + 34, 0, 430, 170, M.screen);
    c.C(g, hw - 90, hd + 2, 20, h - 60, h - 40, M.black);
  },
  mikro: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, y0 = c.z0, h = c.h; c.B(g, -hw, hw, y0, y0 + h, -hd, hd, c.ov || M.steel); c.B(g, -hw + 25, hw * .4, y0 + 30, y0 + h - 30, hd, hd + 3, M.screen); c.B(g, hw * .5, hw - 25, y0 + 40, y0 + h - 40, hd, hd + 3, M.black); },
  ylakaappi: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, y0 = c.z0, h = c.h, m = c.ov || M.white; c.B(g, -hw, hw, y0, y0 + h, -hd, hd, m); if (it.w >= 600) c.B(g, -2, 2, y0 + 10, y0 + h - 10, hd, hd + 2, M.black); handleH(c, g, -hw + 40, -40, y0 + 40, hd, M.steel); if (it.w >= 600) handleH(c, g, 40, hw - 40, y0 + 40, hd, M.steel); },
  // ---------- Pesuhuone ----------
  wc: (it, c, g, M) => {
    const hd = it.d / 2, bz = (-hd + 170 + hd) / 2, rz = (hd - (-hd + 170)) / 2;
    c.B(g, -175, 175, 380, 780, -hd, -hd + 170, M.ceramic); c.B(g, -180, 180, 780, 800, -hd, -hd + 175, M.ceramic);
    c.C(g, 0, bz, 120, 0, 200, M.ceramic, { r2: 170, sz: rz / 170, seg: 40 }); c.C(g, 0, bz, 170, 200, 390, M.ceramic, { sz: rz / 170, seg: 40 });
    c.C(g, 0, bz, 175, 390, 410, M.white, { sz: rz / 175, seg: 40 }); c.C(g, 0, bz, 120, 395, 412, M.sinkIn, { sz: rz / 175, seg: 40 });
    c.B(g, -30, 30, 790, 800, -hd + 60, -hd + 110, M.chrome);
  },
  kuivakaymala: (it, c, g, M) => { const m = c.ov || M.wood, hw = it.w / 2, hd = it.d / 2; c.B(g, -hw, hw, 0, 450, -hd, hd, m); c.C(g, 0, hd * .1, 170, 450, 465, M.black, { seg: 32 }); c.B(g, -hw + 30, hw - 30, 450, 900, -hd, -hd + 30, m); },
  pesuallas: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, y = c.z0 || 800;
    c.B(g, -hw, hw, y, y + 150, -hd, hd, M.ceramic); c.B(g, -hw + 40, hw - 40, y + 148, y + 151, -hd + 90, hd - 40, M.sinkIn);
    faucet(c, g, 0, -hd + 40, y + 150, M); c.C(g, 0, -hd + 120, 22, y - 280, y, M.chrome);
  },
  pesuallaskaappi: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, m = c.ov || M.white;
    c.B(g, -hw, hw, 150, 830, -hd, hd - 10, m); c.B(g, -2, 2, 160, 820, hd - 10, hd - 8, M.black);
    handleV(c, g, -40, 650, 780, hd - 10, M.steel); handleV(c, g, 40, 650, 780, hd - 10, M.steel);
    c.B(g, -hw, hw, 830, 870, -hd, hd, M.ceramic); c.B(g, -hw + 60, hw - 60, 868, 871, -hd + 100, hd - 50, M.sinkIn);
    faucet(c, g, 0, -hd + 45, 870, M);
  },
  peilikaappi: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, y = c.z0, h = c.h; c.B(g, -hw, hw, y, y + h, -hd, hd - 5, c.ov || M.white); c.B(g, -hw + 5, hw - 5, y + 5, y + h - 5, hd - 5, hd, M.mirror); c.B(g, -hw, hw, y - 40, y, -hd, -hd + 60, M.white); },
  suihku: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2;
    c.B(g, -hw, hw, 0, 30, -hd, hd, M.ceramic); c.C(g, 0, 0, 50, 30, 32, M.steel);
    c.B(g, -hw, hw, 30, 2000, hd - 10, hd, M.glass); c.B(g, hw - 10, hw, 30, 2000, -hd, hd, M.glass);
    c.B(g, -hw, hw, 2000, 2015, hd - 15, hd + 5, M.chrome); c.B(g, hw - 15, hw + 5, 2000, 2015, -hd, hd, M.chrome);
    c.C(g, -hw + 150, -hd + 35, 12, 900, 2050, M.chrome); c.CZ(g, -hd + 35, -hd + 300, -hw + 150, 2050, 12, M.chrome);
    c.C(g, -hw + 150, -hd + 300, 110, 2015, 2035, M.chrome, { seg: 32 }); c.B(g, -hw + 110, -hw + 190, 1000, 1060, -hd, -hd + 70, M.chrome);
  },
  suihkuseina: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, h = c.h; c.B(g, -hw, hw, 0, h, -hd, hd, M.glass); c.B(g, -hw, -hw + 20, 0, h, -hd - 5, hd + 5, M.chrome); c.B(g, -hw, hw, h - 15, h, -hd - 5, hd + 5, M.chrome); },
  amme: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h;
    c.B(g, -hw, hw, 0, h, -hd, hd, M.ceramic); c.B(g, -hw + 70, hw - 70, h - 120, h - 2, -hd + 70, hd - 70, M.sinkIn);
    c.B(g, -hw + 72, hw - 72, h - 80, h - 70, -hd + 72, hd - 72, M.water);
    faucet(c, g, -hw + 40, 0, h, M);
  },
  kuivauskaappi: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, h = c.h; c.B(g, -hw, hw, 0, h, -hd, hd, c.ov || M.white); c.B(g, -hw + 30, hw - 30, 200, h - 100, hd, hd + 3, M.glass); handleV(c, g, hw - 50, 900, 1300, hd, M.steel); },
  pyyhekuivain: (it, c, g, M) => {
    const hw = it.w / 2, y0 = c.z0, h = c.h, z = -it.d / 2 + 50;
    for (const sx of [-1, 1]) c.C(g, sx * (hw - 15), z, 15, y0, y0 + h, M.chrome);
    for (let y = y0 + 60; y < y0 + h - 20; y += 90) c.CX(g, -hw + 15, hw - 15, y, z, 10, M.chrome);
    for (const sx of [-1, 1]) c.CZ(g, -it.d / 2, z, sx * (hw - 15), y0 + h / 2, 10, M.chrome);
  },
  varaaja: (it, c, g, M) => { const r = Math.min(it.w, it.d) / 2, h = c.h; c.C(g, 0, 0, r, 50, h - r * .4, M.white, { seg: 40 }); c.S(g, 0, h - r * .4, 0, r, M.white, .4, true); for (const sx of [-1, 1]) c.C(g, sx * r * .45, 0, 12, h - 100, h + 200, M.copper); legs4(c, g, r * .5, r * .5, 30, 0, 50, M.steel); },
  // ---------- Sauna ----------
  kiuas: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, y0 = c.z0, h = c.h, m = c.ov || M.kiuas;
    c.B(g, -hw, hw, y0, y0 + h - 160, -hd, hd, m);
    for (let x = -hw + 60; x < hw - 40; x += 45) c.B(g, x, x + 12, y0 + 150, y0 + h - 260, hd, hd + 2, M.black);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.B(g, sx * (hw - 15) - 8, sx * (hw - 15) + 8, y0 + h - 160, y0 + h - 20, sz * (hd - 15) - 8, sz * (hd - 15) + 8, m);
    c.B(g, -hw + 10, hw - 10, y0 + h - 160, y0 + h - 140, -hd + 10, hd - 10, m);
    stones(c, g, -hw + 10, hw - 10, -hd + 10, hd - 10, y0 + h - 140, y0 + h - 40, M, 5);
    c.CZ(g, hd, hd + 25, hw - 70, y0 + 80, 22, M.black);
  },
  puukiuas: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h, m = c.ov || M.black;
    c.B(g, -hw, hw, 0, 60, -hd, hd, m); c.B(g, -hw, hw, 60, h - 180, -hd, hd, m);
    c.B(g, -hw * .55, hw * .55, 140, 380, hd, hd + 6, M.fire); c.B(g, -hw * .6, hw * .6, 120, 400, hd + 6, hd + 20, M.black); c.B(g, -hw * .5, hw * .5, 150, 370, hd + 20, hd + 22, M.glassDark);
    c.B(g, -hw, hw, h - 180, h - 160, -hd, hd, m); stones(c, g, -hw + 15, hw - 15, -hd + 15, hd - 15, h - 160, h - 40, M, 9);
    pipe(c, g, 0, -hd + 110, h - 160, c.H + 20, M);
  },
  kivilevy: (it, c, g, M) => c.B(g, -it.w / 2, it.w / 2, c.z0, c.z0 + c.h, -it.d / 2, it.d / 2, c.ov || M.stoneWall),
  kiuaskaide: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h, m = c.ov || M.wood;
    for (const sx of [-1, 1]) c.B(g, sx * hw - (sx > 0 ? 45 : 0), sx * hw + (sx < 0 ? 45 : 0), 0, h, -hd, hd, m);
    for (const y of [h * .45, h - 45]) c.B(g, -hw, hw, y, y + 45, -hd, hd, m);
    for (let x = -hw + 100; x < hw - 60; x += 110) c.B(g, x - 20, x + 20, h * .45 + 45, h - 45, -hd + 5, hd - 5, m);
  },
  lauteet: (it, c, g, M) => {
    const m = c.ov || M.laude, d = it.d, w = it.w, hw = w / 2, lu = Math.min(d - 100, it.lu ?? 600), hu = it.hu ?? 1050, ha = Math.min(hu - 100, it.ha ?? 600), y0 = -d / 2, yb = y0 + lu;
    slatsZ(c, g, -hw, hw, hu - 28, hu, y0 + 20, yb, 90, 10, m);
    c.B(g, -hw, hw, ha, hu - 28, yb - 22, yb, m);
    slatsZ(c, g, -hw, hw, ha - 28, ha, yb + 10, d / 2, 90, 10, m);
    c.B(g, -hw, hw, 60, ha - 28, d / 2 - 22, d / 2, m);
    for (const x of [-hw + 30, 0, hw - 30]) { c.B(g, x - 22, x + 22, hu - 90, hu - 28, y0, yb - 22, m); c.B(g, x - 22, x + 22, ha - 90, ha - 28, yb - 22, d / 2 - 22, m); c.B(g, x - 22, x + 22, 0, hu - 90, yb - 70, yb - 22, m); }
  },
  laude: (it, c, g, M) => {
    const m = c.ov || M.laude, hw = it.w / 2, hd = it.d / 2, h = c.h;
    slatsZ(c, g, -hw, hw, h - 28, h, -hd, hd, 90, 10, m);
    c.B(g, -hw, hw, 60, h - 28, hd - 22, hd, m);
    for (const x of [-hw + 30, hw - 30]) c.B(g, x - 22, x + 22, 0, h - 28, -hd, hd - 22, m);
  },
  laudejakkara: (it, c, g, M) => { const m = c.ov || M.laude, hw = it.w / 2, hd = it.d / 2, h = c.h; slatsZ(c, g, -hw, hw, h - 25, h, -hd, hd, 80, 10, m); for (const sx of [-1, 1]) c.B(g, sx * (hw - 30) - 20, sx * (hw - 30) + 20, 0, h - 25, -hd + 10, hd - 10, m); },
  selkanoja: (it, c, g, M) => { const m = c.ov || M.laude, hw = it.w / 2, hd = it.d / 2, y = c.z0, h = c.h; for (const x of [-hw + 60, 0, hw - 60]) c.B(g, x - 20, x + 20, y, y + h, -hd, -hd + 25, m); for (const yy of [y + 20, y + h - 100]) c.B(g, -hw, hw, yy, yy + 80, -hd + 25, hd, m); },
  lattiaritila: (it, c, g, M) => { const m = c.ov || M.laude, hw = it.w / 2, hd = it.d / 2; for (const z of [-hd + 80, hd - 80]) c.B(g, -hw + 30, hw - 30, 0, 18, z - 25, z + 25, m); slatsX(c, g, -hd, hd, 18, 40, -hw, hw, 70, 12, m); },
  kiulu: (it, c, g, M) => {
    const r = Math.min(it.w, it.d) * .33, m = c.ov || M.wood;
    c.C(g, 0, 0, r * .85, 0, 220, m, { r2: r, seg: 24 }); c.C(g, 0, 0, r * .9, 40, 55, M.copper, { r2: r * .92, seg: 24, open: true }); c.C(g, 0, 0, r + 2, 175, 190, M.copper, { seg: 24, open: true });
    c.C(g, 0, 0, r * .9, 180, 200, M.water, { seg: 24 });
    const s = c.sub(g, r * .4, 0, -r * .2, -35); c.C(s, 0, 0, 30, 150, 200, m); c.B(s, -8, 8, 195, 210, 0, r * 1.8, m);
  },
  pesupata: (it, c, g, M) => { const r = Math.min(it.w, it.d) / 2, h = c.h; c.C(g, 0, 0, r, 0, h * .55, M.black, { seg: 32 }); c.C(g, 0, 0, r * .85, h * .55, h - 30, M.steel, { seg: 32 }); c.C(g, 0, 0, r * .88, h - 30, h, M.steel, { seg: 32 }); c.CZ(g, 0, r + 60, 0, h * .65, 15, M.chrome); pipe(c, g, 0, -r * .6, h * .5, c.H + 20, M); },
  hormi: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, h = Math.max(c.h, c.H + 300); c.B(g, -hw, hw, 0, h, -hd, hd, c.ov || M.plaster, true); c.B(g, -hw - 40, hw + 40, h, h + 60, -hd - 40, hd + 40, M.black); },
  kamiina: (it, c, g, M) => { const r = Math.min(it.w, it.d) / 2, h = c.h; for (let i = 0; i < 3; i++) { const a = i * 2.094; c.C(g, Math.cos(a) * r * .7, Math.sin(a) * r * .7, 18, 0, 150, M.black); } c.C(g, 0, 0, r, 150, h, M.black, { seg: 32 }); c.C(g, 0, 0, r + 15, h, h + 15, M.black, { seg: 32 }); c.CZ(g, r - 10, r + 6, 0, 350, 110, M.fire); pipe(c, g, 0, 0, h + 15, c.H + 20, M); },
  takka: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h, m = c.ov || M.plaster;
    c.B(g, -hw - 100, hw + 100, 0, 50, -hd, hd + 250, M.stoneWall); c.B(g, -hw, hw, 50, h, -hd, hd, m, true);
    c.B(g, -hw * .6, hw * .6, 300, 800, hd, hd + 3, M.firebox); c.B(g, -hw * .45, hw * .45, 330, 520, hd + 3, hd + 5, M.fire);
    c.B(g, -hw * .5, hw * .5, h, c.H + 20, -hd, -hd + it.d * .7, m, true);
  },
  puuliesi: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, m = c.ov || M.white;
    c.B(g, -hw, hw, 0, 820, -hd, hd, m); c.B(g, -hw - 10, hw + 10, 820, 850, -hd - 10, hd + 10, M.black);
    for (const sx of [-1, 1]) c.C(g, sx * hw * .45, -hd * .1, Math.min(it.w, it.d) * .16, 850, 853, M.burner, { seg: 32 });
    c.B(g, -hw + 50, -hw + 280, 450, 700, hd, hd + 15, M.black); c.B(g, -hw + 80, -hw + 250, 500, 650, hd + 15, hd + 17, M.fire);
    c.B(g, -hw + 330, hw - 50, 200, 700, hd, hd + 15, M.black); c.B(g, -hw + 340, hw - 60, 740, 760, hd + 10, hd + 30, M.chrome);
    pipe(c, g, hw - 120, -hd + 100, 850, c.H + 20, M);
  },
  puulaatikko: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h, m = c.ov || M.wood, r = seeded(17);
    c.B(g, -hw, hw, 0, 20, -hd, hd, m); for (const sx of [-1, 1]) c.B(g, sx * hw - (sx > 0 ? 20 : 0), sx * hw + (sx < 0 ? 20 : 0), 0, h, -hd, hd, m);
    for (const sz of [-1, 1]) c.B(g, -hw, hw, 0, h, sz * hd - (sz > 0 ? 20 : 0), sz * hd + (sz < 0 ? 20 : 0), m);
    for (let y = 70; y < h + 40; y += 95) for (let z = -hd + 70; z < hd - 40; z += 100 + r() * 20) c.CX(g, -hw + 25 + r() * 20, hw - 25 - r() * 20, y, z, 42 + r() * 10, r() > .5 ? M.birch : M.log);
  },
  ilpulko: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2; for (const sx of [-1, 1]) c.B(g, sx * hw * .7 - 25, sx * hw * .7 + 25, 0, 100, -hd, hd, M.black); c.B(g, -hw, hw, 100, 650, -hd, hd, M.white); c.CZ(g, hd, hd + 5, -hw * .2, 375, 200, M.black); c.CZ(g, hd + 5, hd + 8, -hw * .2, 375, 190, M.grille); },
  portaat: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h, n = Math.max(2, Math.floor(it.d / 250)), sh = h / n, m = c.ov || M.wood;
    for (let i = 0; i < n; i++) { const z1 = hd - i * it.d / n; c.B(g, -hw + 40, hw - 40, sh * (i + 1) - 35, sh * (i + 1), z1 - it.d / n - 20, z1, m); }
    for (const sx of [-1, 1]) { const s = c.sub(g, sx * (hw - 20), 0, 0); const len = Math.hypot(it.d, h), ang = Math.atan2(h, it.d); const b = c.sub(s, 0, h / 2, 0, 0, ang * 180 / Math.PI); c.B(b, -20, 20, -120, 120, -len / 2, len / 2, m); }
    for (let i = 0; i <= n; i += Math.max(1, Math.floor(n / 3))) { const z = hd - i * it.d / n - 40; c.B(g, hw - 40, hw - 10, sh * i, sh * i + 900, z - 15, z + 15, m); }
    const rl = c.sub(g, hw - 25, h / 2 + 900, 0, 0, Math.atan2(h, it.d) * 180 / Math.PI); c.B(rl, -25, 25, -20, 20, -Math.hypot(it.d, h) / 2, Math.hypot(it.d, h) / 2, m);
  },
  // ---------- Eteinen ----------
  naulakko: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, y = c.z0, m = c.ov || M.wood;
    c.B(g, -hw, hw, y, y + 110, -hd, -hd + 20, m);
    const n = Math.max(2, Math.floor(it.w / 250)); for (let i = 0; i < n; i++) { const x = -hw + (i + .5) * it.w / n; c.CZ(g, -hd + 20, -hd + 90, x, y + 55, 9, M.black); c.S(g, x, y + 55, -hd + 92, 14, M.black); }
    c.B(g, -hw, hw, y + 330, y + 350, -hd, hd, m); for (const sx of [-1, 1]) c.B(g, sx * (hw - 60) - 12, sx * (hw - 60) + 12, y + 160, y + 330, -hd, -hd + 200, m);
  },
  kenkahylly: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h, m = c.ov || M.wood, r = seeded(23);
    for (const sx of [-1, 1]) c.B(g, sx * hw - (sx > 0 ? 18 : 0), sx * hw + (sx < 0 ? 18 : 0), 0, h, -hd, hd, m);
    for (const y of [40, h / 2, h - 18]) c.B(g, -hw + 18, hw - 18, y, y + 18, -hd, hd, m);
    for (const y of [58, h / 2 + 18]) for (let x = -hw + 40; x < hw - 120; x += 130) c.B(g, x, x + 100, y, y + 90 + r() * 40, -hd + 20, hd - 10, r() > .5 ? M.black : M.fabric);
  },
  penkki: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2, h = c.h, m = c.ov || M.wood; c.B(g, -hw, hw, h - 40, h, -hd, hd, m); for (const sx of [-1, 1]) c.B(g, sx * (hw - 60) - 20, sx * (hw - 60) + 20, 0, h - 40, -hd + 20, hd - 20, m); c.B(g, -hw + 60, hw - 60, 120, 150, -20, 20, m); },
  // ---------- Ulko ja terassi ----------
  ulkopoyta: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, m = c.ov || M.wood, tdp = it.d * .48, bd = it.d * .16;
    slatsZ(c, g, -hw, hw, 690, 720, -tdp / 2, tdp / 2, 110, 8, m);
    for (const sz of [-1, 1]) slatsZ(c, g, -hw, hw, 420, 450, sz > 0 ? hd - bd : -hd, sz > 0 ? hd : -hd + bd, 110, 8, m);
    for (const sx of [-1, 1]) { const x = sx * (hw - 180); c.B(g, x - 22, x + 22, 380, 420, -hd, hd, m); c.B(g, x - 22, x + 22, 650, 690, -tdp / 2, tdp / 2, m); for (const sz of [-1, 1]) { const s = c.sub(g, x, 360, sz * tdp * .3, 0, -sz * 28); c.B(s, -22, 22, -360, 360, -45, 45, m); } }
  },
  grilli: (it, c, g, M) => {
    const r = Math.min(it.w, it.d) / 2 * .9;
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + .5; c.C(g, Math.cos(a) * r * .55, Math.sin(a) * r * .55, 14, 0, 640, M.steel); }
    c.S(g, 0, 680, 0, r, M.black, .75, false, true); c.S(g, 0, 690, 0, r, M.black, .75, true); c.C(g, 0, 0, 25, 690 + r * .75, 690 + r * .75 + 40, M.black);
    c.B(g, -r * .5, r * .5, 300, 315, -r * .4, r * .4, M.steel);
  },
  aurinkotuoli: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, m = c.ov || M.wood;
    for (const sx of [-1, 1]) c.B(g, sx * hw - (sx > 0 ? 40 : 0), sx * hw + (sx < 0 ? 40 : 0), 160, 260, -hd + 500, hd, m);
    legs4(c, g, hw - 25, hd - 120, 45, 0, 200, m);
    slatsX(c, g, -hd + 520, hd, 260, 285, -hw + 40, hw - 40, 70, 15, m);
    const s = c.sub(g, 0, 270, -hd + 520, 0, 45); slatsX(c, s, -620, 0, 0, 25, -hw + 40, hw - 40, 70, 15, m);
    c.B(g, -hw + 50, hw - 50, 285, 330, -hd + 560, hd - 30, M.cushion);
  },
  kaide: (it, c, g, M) => {
    const hw = it.w / 2, hd = it.d / 2, h = c.h, m = c.ov || M.wood, n = Math.max(1, Math.ceil(it.w / 1200));
    for (let i = 0; i <= n; i++) { const x = -hw + 35 + i * (it.w - 70) / n; c.B(g, x - 35, x + 35, 0, h, -35, 35, m); }
    c.B(g, -hw, hw, h - 40, h, -45, 45, m); c.B(g, -hw, hw, 80, 125, -25, 25, m); c.B(g, -hw, hw, h - 110, h - 70, -25, 25, m);
    for (let x = -hw + 110; x < hw - 70; x += 115) c.B(g, x - 11, x + 11, 125, h - 110, -11, 11, m);
  },
  palju: (it, c, g, M) => {
    const r = Math.min(it.w, it.d) / 2, h = c.h, m = c.ov || M.woodV;
    c.C(g, 0, 0, r, 0, h, m, { seg: 48 }); c.C(g, 0, 0, r - 45, h - 1, h + 1, M.woodTop, { seg: 48 });
    for (const y of [h * .2, h * .8]) c.C(g, 0, 0, r + 6, y - 25, y + 25, M.steel, { seg: 48, open: true });
    c.C(g, 0, 0, r - 50, h - 170, h - 160, M.water, { seg: 48 });
    for (const sx of [-1, 1]) c.B(g, sx * r * .5 - 40, sx * r * .5 + 40, h - 420, h - 380, -r * .55, r * .55, m);
    // kamiina sivulla
    c.C(g, r + 230, 0, 170, 0, h - 150, M.black, { seg: 32 }); c.C(g, r + 230, 0, 60, h - 150, h + 1100, M.steel); c.CX(g, r, r + 70, h * .3, 0, 40, M.steel); c.CX(g, r, r + 70, h * .7, 0, 40, M.steel);
    c.B(g, -300, 300, 0, h * .45, r + 30, r + 330, m);
  },
  ulkosuihku: (it, c, g, M) => { const hw = it.w / 2, hd = it.d / 2; slatsX(c, g, -hd, hd, 0, 40, -hw, hw, 90, 12, c.ov || M.wood); c.B(g, -hw, -hw + 90, 0, 2300, -hd, -hd + 90, M.wood); c.CZ(g, -hd + 90, -hd + 400, -hw + 45, 2250, 12, M.chrome); c.C(g, -hw + 45, -hd + 400, 100, 2220, 2240, M.chrome, { seg: 32 }); },
  laatikko: (it, c, g, M) => c.B(g, -it.w / 2, it.w / 2, c.z0, c.z0 + c.h, -it.d / 2, it.d / 2, c.ov || M.furn, true),

  // ---------- Sähkö ----------
  pistorasia: (it, c, g, M) => plate(c, g, it, M, 1),
  pistorasia2: (it, c, g, M) => plate(c, g, it, M, 2),
  pistorasiaU: (it, c, g, M) => plate(c, g, it, M, 1, true),
  katkaisija: (it, c, g, M) => sw(c, g, it, M), vaihtokytkin: (it, c, g, M) => sw(c, g, it, M, 2), himmennin: (it, c, g, M) => { sw(c, g, it, M); },
  termostaatti: (it, c, g, M) => { const y = it.h ?? 1000, z = -it.d / 2; c.B(g, -45, 45, y - 60, y + 60, z, z + 18, M.white); c.B(g, -30, 30, y + 5, y + 40, z + 18, z + 20, M.screen); },
  kiuasohjain: (it, c, g, M) => { const y = it.h ?? 1500, z = -it.d / 2; c.B(g, -60, 60, y - 90, y + 90, z, z + 25, M.black); c.B(g, -40, 40, y + 20, y + 60, z + 25, z + 27, M.fire); },
  antenni: (it, c, g, M) => plate(c, g, it, M, 1, false, true), data: (it, c, g, M) => plate(c, g, it, M, 1, false, true),
  rasia: (it, c, g, M) => { const y = it.h ?? 2000, z = -it.d / 2; c.B(g, -45, 45, y - 45, y + 45, z, z + 40, M.grey); },
  keskus: (it, c, g, M) => { const y = (it.h ?? 1500), z = -it.d / 2, hw = it.w / 2; c.B(g, -hw, hw, y - 350, y + 350, z, z + 130, M.grey); c.B(g, -hw + 20, hw - 20, y - 330, y + 330, z + 130, z + 133, M.white); c.B(g, hw - 60, hw - 40, y - 40, y + 40, z + 133, z + 150, M.black); },
  patteri: (it, c, g, M) => { const hw = it.w / 2, z = -it.d / 2; c.B(g, -hw, hw, 200, 700, z + 30, z + 30 + 60, M.white); for (let x = -hw + 40; x < hw; x += 50) c.B(g, x - 6, x + 6, 210, 690, z + 90, z + 95, M.white); for (const sx of [-1, 1]) c.B(g, sx * (hw - 80) - 10, sx * (hw - 80) + 10, 450, 480, z, z + 30, M.white); },
  ilp: (it, c, g, M) => { const hw = it.w / 2, z = -it.d / 2, y = Math.max(1800, (it.h ?? 2100) - 300); c.B(g, -hw, hw, y, y + 300, z, z + 230, M.white); c.B(g, -hw + 30, hw - 30, y + 20, y + 60, z + 150, z + 232, M.grey); },
  kattovalo: (it, c, g, M) => { if (c.cut) return; c.C(g, 0, 0, 160, c.H - 70, c.H, M.lamp, { seg: 32 }); c.C(g, 0, 0, 40, c.H - 5, c.H, M.white); },
  spotti: (it, c, g, M) => { if (c.cut) return; c.C(g, 0, 0, 45, c.H - 8, c.H, M.white, { seg: 24 }); c.C(g, 0, 0, 30, c.H - 10, c.H - 7, M.lamp, { seg: 24 }); },
  palovaroitin: (it, c, g, M) => { if (c.cut) return; c.C(g, 0, 0, 55, c.H - 40, c.H, M.white, { seg: 24 }); c.C(g, 0, 0, 6, c.H - 42, c.H - 40, M.red); },
  seinavalo: (it, c, g, M) => { const y = it.h ?? 1800, z = -it.d / 2; c.B(g, -40, 40, y - 60, y + 60, z, z + 25, M.black); c.B(g, -110, 110, y - 60, y + 60, z + 25, z + 120, M.lamp); },
  ulkovalo: (it, c, g, M) => { const y = it.h ?? 2000, z = -it.d / 2; c.B(g, -40, 40, y - 40, y + 40, z, z + 30, M.black); c.B(g, -80, 80, y - 140, y + 100, z + 30, z + 190, M.black); c.B(g, -65, 65, y - 120, y + 80, z + 45, z + 175, M.lamp); },
  lattialammitys: () => { },
  // ---------- LVI ----------
  lattiakaivo: (it, c, g, M) => { c.B(g, -100, 100, 0, 4, -100, 100, M.steel); for (let x = -80; x <= 80; x += 20) c.B(g, x - 3, x + 3, 4, 6, -85, 85, M.black); },
  viemari: (it, c, g, M) => c.C(g, 0, 0, 55, 0, 60, M.grey),
  vesipiste: (it, c, g, M) => { const y = it.h ?? 900, z = -it.d / 2; c.C(g, 0, z + 30, 35, y - 20, y + 20, M.chrome); c.CZ(g, z, z + 120, 0, y, 14, M.chrome); c.B(g, -10, 10, y + 20, y + 60, z + 20, z + 40, M.red); },
  tulo: (it, c, g, M) => vent(c, g, M), poisto: (it, c, g, M) => vent(c, g, M), korvausilma: (it, c, g, M) => { const y = it.h ?? 2000, z = -it.d / 2; c.B(g, -90, 90, y - 90, y + 90, z, z + 30, M.white); for (let yy = y - 70; yy < y + 80; yy += 25) c.B(g, -75, 75, yy, yy + 8, z + 30, z + 33, M.grey); }
};
function plate(c, g, it, M, n, ip = false, data = false) {
  const y = it.h ?? 300, z = -it.d / 2, w = n === 2 ? 155 : 82;
  c.B(g, -w / 2, w / 2, y - 41, y + 41, z, z + 12, ip ? M.grey : M.white);
  for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 72; if (data) c.B(g, x - 12, x + 12, y - 8, y + 8, z + 12, z + 14, M.black); else { c.CZ(g, z + 12, z + 15, x, y, 26, M.socket); for (const sx of [-1, 1]) c.CZ(g, z + 14, z + 16, x + sx * 10, y, 3, M.black); } }
}
function sw(c, g, it, M, n = 1) { const y = it.h ?? 1000, z = -it.d / 2; c.B(g, -41, 41, y - 41, y + 41, z, z + 12, M.white); if (n === 2) { c.B(g, -32, -2, y - 32, y + 32, z + 12, z + 20, M.white); c.B(g, 2, 32, y - 32, y + 32, z + 12, z + 20, M.white); } else c.B(g, -32, 32, y - 32, y + 32, z + 12, z + 20, M.white); }
function vent(c, g, M) { if (c.cut) return; c.C(g, 0, 0, 100, c.H - 25, c.H, M.white, { seg: 32 }); c.C(g, 0, 0, 55, c.H - 45, c.H - 25, M.white, { seg: 32 }); c.C(g, 0, 0, 40, c.H - 26, c.H - 24, M.grey, { seg: 24 }); }
