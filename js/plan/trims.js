// =============================================================
//  Pielilaudat ja nurkkalaudat
//  Ulkopuoli päätellään rakennuksen keskipisteestä: seinän ulkopinta on se, joka osoittaa keskipisteestä poispäin.
// =============================================================
import { wallDir, wlen, same } from "./geom.js";

export const TRIM_T = 22; // laudan paksuus
export const TRIM_SIDES = [["", "Ei pielilautoja"], ["ulko", "Ulkopuolelle"], ["sisa", "Sisäpuolelle"], ["molemmat", "Molemmille puolille"]];

export function centroid(data) {
  const ws = data.walls.filter(w => w.status !== "demolish");
  if (!ws.length) return { x: 0, y: 0 };
  let sx = 0, sy = 0, sl = 0;
  for (const w of ws) { const L = wlen(w); sx += (w.x1 + w.x2) / 2 * L; sy += (w.y1 + w.y2) / 2 * L; sl += L; }
  return { x: sx / (sl || 1), y: sy / (sl || 1) };
}
// +1 = seinän normaalin puoli (A) on ulkona, -1 = puoli B on ulkona
export function outSide(w, c) {
  const { nx, ny } = wallDir(w), mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
  return (mx - c.x) * nx + (my - c.y) * ny >= 0 ? 1 : -1;
}
// Puolet (seinän normaalin suunnassa), joille aukon pielilaudat tulevat
export function trimSides(o, w, c) {
  const so = outSide(w, c);
  return o.trim === "ulko" ? [so] : o.trim === "sisa" ? [-so] : o.trim === "molemmat" ? [1, -1] : [];
}

// Nurkkalaudat rakennuksen ulkonurkkiin: palauttaa pohjan nelikulmiot (mm) ja korkeuden
export function cornerTrims(data, S) {
  if (!S.cornerOn) return [];
  const ws = data.walls.filter(w => w.status !== "demolish"), c = centroid(data), out = [], tw = S.cornerW || 120, H = S.wallH || 2400;
  const done = new Set();
  for (const a of ws) for (const ea of [1, 2]) for (const b of ws) {
    if (a === b) continue;
    for (const eb of [1, 2]) {
      const ax = a["x" + ea], ay = a["y" + ea];
      if (!same(ax, ay, b["x" + eb], b["y" + eb])) continue;
      const key = [a.id, b.id].sort().join("|"); if (done.has(key)) continue; done.add(key);
      const da = wallDir(a), db = wallDir(b);
      if (Math.abs(da.dx * db.dy - da.dy * db.dx) < .1) continue; // jatkuva suora seinä
      const sa = outSide(a, c), sb = outSide(b, c);
      const na = { x: da.nx * sa, y: da.ny * sa }, nb = { x: db.nx * sb, y: db.ny * sb };
      const O = { x: ax + na.x * a.t / 2 + nb.x * b.t / 2, y: ay + na.y * a.t / 2 + nb.y * b.t / 2 };
      if (Math.hypot(O.x - c.x, O.y - c.y) < Math.hypot(ax - c.x, ay - c.y)) continue; // sisänurkka
      const ua = ea === 1 ? { x: da.dx, y: da.dy } : { x: -da.dx, y: -da.dy }; // nurkasta seinää pitkin
      const ub = eb === 1 ? { x: db.dx, y: db.dy } : { x: -db.dx, y: -db.dy };
      const h = Math.min(a.h || H, b.h || H);
      const quad = (P, u, n, back) => { const s = { x: P.x - u.x * back, y: P.y - u.y * back }, e = { x: P.x + u.x * tw, y: P.y + u.y * tw }; return [[s.x, s.y], [e.x, e.y], [e.x + n.x * TRIM_T, e.y + n.y * TRIM_T], [s.x + n.x * TRIM_T, s.y + n.y * TRIM_T]]; };
      out.push({ pts: quad(O, ua, na, 0), h }, { pts: quad(O, ub, nb, TRIM_T), h });
    }
  }
  return out;
}
