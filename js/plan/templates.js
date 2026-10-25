// =============================================================
//  Valmiit pohjat uudelle piirustukselle
// =============================================================
import { uid } from "./geom.js";
import { emptyData } from "./render.js";

const W = (x1, y1, x2, y2, t, status = "new", h) => ({ id: uid(), x1, y1, x2, y2, t, status, ...(h ? { h } : {}) });

// Suorakaide sisämitoin: seinien keskilinja siirretään t/2 ulospäin. Seinät myötäpäivään → +normaali osoittaa sisään.
export function rectWalls(ix, iy, iw, ih, t, status = "new") {
  const a = ix - t / 2, b = iy - t / 2, c = ix + iw + t / 2, d = iy + ih + t / 2;
  return [W(a, b, c, b, t, status), W(c, b, c, d, t, status), W(c, d, a, d, t, status), W(a, d, a, b, t, status)];
}
const room = (name, x1, y1, x2, y2) => ({ id: uid(), name, pts: [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }] });
const item = (kind, x, y, w, d, rot = 0, extra = {}) => ({ id: uid(), kind, x, y, w, d, rot, ...extra });
const op = (kind, wall, off, w, h, sill = 0, extra = {}) => ({ id: uid(), kind, wallId: wall.id, off, w, h, sill, side: 1, hinge: "a", ...extra });

// Merikontti: ulkomitat tarkasti, sisämitat ISO-standardin mukaan
function container(len, inLen, inH, name) {
  const OW = 2438, IW = 2352, tS = (OW - IW) / 2, tE = (len - inLen) / 2;
  const top = W(tE / 2, tS / 2, len - tE / 2, tS / 2, tS);
  const right = W(len - tE / 2, tS / 2, len - tE / 2, OW - tS / 2, tE);
  const bottom = W(len - tE / 2, OW - tS / 2, tE / 2, OW - tS / 2, tS);
  const left = W(tE / 2, OW - tS / 2, tE / 2, tS / 2, tE);
  const data = emptyData();
  data.walls = [top, right, bottom, left];
  data.walls.forEach(w => { w.matA = "teras"; w.colA = "#8a9aa6"; w.matB = "teras"; });
  const L = OW - tS;
  data.openings = [op("pariovi", right, (L - 2340) / 2, 2340, 2280, 0, { side: -1, label: "Kontin ovet" })];
  data.rooms = [{ ...room(name, tE, tS, len - tE, OW - tS), fmat: "vinyyli" }];
  data.texts = [{ id: uid(), x: 0, y: OW + 700, text: `${name}: ulkomitat ${len} × ${OW}, sisämitat ${inLen} × ${IW}, sisäkorkeus ${inH}`, size: 10 }];
  return { data, settings: { wallH: inH, wallT: 100, grid: 10 } };
}

function sauna() {
  const data = emptyData();
  const outer = rectWalls(0, 0, 5800, 2200, 150);
  const p1 = W(2050, -75, 2050, 2275, 100), p2 = W(3750, -75, 3750, 2275, 100);
  data.walls = [...outer, p1, p2];
  outer.forEach(w => { w.matA = "paneeli"; w.matB = "peiterima"; });
  Object.assign(p1, { matA: "paneeli", matB: "laatta" }); // pukuhuone | pesuhuone
  Object.assign(p2, { matA: "laatta", matB: "paneeli" }); // pesuhuone | löylyhuone
  const [top, , bottom] = outer;
  data.openings = [
    op("ovi", bottom, 4375, 900, 2100, 0, { label: "9×21 ulko-ovi" }),
    op("ovi", p1, 275, 800, 2000, 0, { mat: "huurre" }),
    op("ovi", p2, 1375, 700, 1900, 0, { label: "7×19 lasiovi", mat: "lasi" }),
    op("ikkuna", bottom, 775, 800, 500, 1100),
    op("ikkuna", top, 775, 900, 900, 900)
  ];
  data.rooms = [{ ...room("Pukuhuone", 0, 0, 2000, 2200), fmat: "lauta" }, { ...room("Pesuhuone", 2100, 0, 3700, 2200), fmat: "laatta" }, { ...room("Löylyhuone", 3800, 0, 5800, 2200), fmat: "laatta" }];
  data.items = [
    item("kiuas", 4100, 300, 500, 500, 0, { safe: { f: 0, s: 0, b: 0 } }),
    item("kivilevy", 4100, 15, 900, 30, 0),
    item("laudejakkara", 4500, 1900, 450, 350, 0),
    item("lauteet", 5300, 1100, 2200, 1000, 90, { lu: 600, hu: 1050, ha: 600 }),
    item("seinavalo", 4550, 150, 300, 300, 0, { h: 1200 }),
    item("laude", 200, 800, 1400, 400, 270),
    item("pistorasia", 150, 1700, 300, 300, 270, { h: 300 }),
    item("katkaisija", 1700, 2050, 300, 300, 180, { h: 1000 }),
    item("kattovalo", 1100, 650, 300, 300, 0),
    item("lattiakaivo", 2900, 1550, 250, 250),
    item("vesipiste", 2900, 125, 250, 250, 0),
    item("poisto", 3300, 450, 250, 250)
  ];
  return { data, settings: { wallH: 2300, wallT: 150, grid: 50 } };
}

function extension() {
  const data = emptyData();
  data.walls = rectWalls(0, 0, 6000, 4000, 200, "existing");
  data.walls.forEach(w => { w.matA = "hirsi"; w.matB = "hirsi"; });
  data.rooms = [room("Nykyinen mökki", 0, 0, 6000, 4000)];
  data.texts = [{ id: uid(), x: 0, y: 4900, text: "Harmaa = olemassa oleva rakennus. Piirrä laajennus Seinä- tai Huone-työkalulla.", size: 10 }];
  return { data, settings: { wallH: 2400, wallT: 200, newStatus: "new" } };
}

export const TEMPLATES = [
  ["tyhja", "Tyhjä piirustus", "Aloita puhtaalta pöydältä", () => ({ data: emptyData(), settings: {} })],
  ["kontti20", "Merikontti 20′", "6058 × 2438, sisäkorkeus 2393", () => container(6058, 5898, 2393, "20′ kontti")],
  ["kontti40", "Merikontti 40′", "12192 × 2438, sisäkorkeus 2393", () => container(12192, 12032, 2393, "40′ kontti")],
  ["kontti40hc", "Merikontti 40′ HC", "12192 × 2438, sisäkorkeus 2698", () => container(12192, 12032, 2698, "40′ HC kontti")],
  ["sauna", "Sauna", "Pukuhuone, pesuhuone ja löylyhuone", sauna],
  ["laajennus", "Laajennus", "Olemassa oleva rakennus, jonka viereen piirretään uusi osa", extension]
];
export const templateById = id => TEMPLATES.find(t => t[0] === id) || TEMPLATES[0];
