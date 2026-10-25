// =============================================================
//  Kalusteet, sähkö- ja LVI-symbolit sekä ovet ja ikkunat
//  Symboli piirretään paikallisiin koordinaatteihin: keskipiste (0,0),
//  leveys w x-akselilla, syvyys d y-akselilla. Takareuna (seinää vasten) on -y.
// =============================================================
const R = (x, y, w, h, c = "s", rx = 0) => `<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ""}/>`;
const L = (x1, y1, x2, y2, c = "sl") => `<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const C = (x, y, r, c = "s") => `<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`;
const E = (x, y, rx, ry, c = "s") => `<ellipse class="${c}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`;
const P = (d, c = "sl") => `<path class="${c}" d="${d}"/>`;
const T = (x, y, s, t) => `<text class="st" x="${x}" y="${y}" font-size="${s}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
const box = (w, d) => R(-w / 2, -d / 2, w, d);
const lab = (w, d, t, k = .32) => box(w, d) + T(0, 0, Math.min(w, d) * k, t);

// [avain, nimi, w, d, piirto, lisätiedot]
const FURN = [
  ["sanky", "Sänky 90×200", 900, 2000, (w, d) => box(w, d) + R(-w / 2 + 60, -d / 2 + 60, w - 120, Math.min(350, d * .18), "s", 40) + L(-w / 2, -d / 2 + d * .3, w / 2, -d / 2 + d * .3)],
  ["sanky2", "Parisänky 160×200", 1600, 2000, (w, d) => box(w, d) + R(-w / 2 + 60, -d / 2 + 60, w / 2 - 90, Math.min(350, d * .18), "s", 40) + R(30, -d / 2 + 60, w / 2 - 90, Math.min(350, d * .18), "s", 40) + L(-w / 2, -d / 2 + d * .3, w / 2, -d / 2 + d * .3)],
  ["kerrossanky", "Kerrossänky", 900, 2000, (w, d) => box(w, d) + L(-w / 2, -d / 2, w / 2, d / 2) + L(w / 2, -d / 2, -w / 2, d / 2) + R(-w / 2 + 60, -d / 2 + 60, w - 120, 300, "s", 40)],
  ["sohva", "Sohva", 2000, 900, (w, d) => box(w, d) + R(-w / 2, -d / 2, w, d * .25) + R(-w / 2, -d / 2, w * .09, d) + R(w / 2 - w * .09, -d / 2, w * .09, d) + L(0, -d / 2 + d * .25, 0, d / 2)],
  ["nojatuoli", "Nojatuoli", 800, 800, (w, d) => box(w, d) + R(-w / 2, -d / 2, w, d * .25) + R(-w / 2, -d / 2, w * .16, d) + R(w / 2 - w * .16, -d / 2, w * .16, d)],
  ["poyta", "Pöytä", 1200, 800, (w, d) => box(w, d)],
  ["pyoreapoyta", "Pyöreä pöytä", 900, 900, (w, d) => E(0, 0, w / 2, d / 2)],
  ["tuoli", "Tuoli", 450, 450, (w, d) => R(-w / 2, -d / 2, w, d, "s", 30) + L(-w / 2, -d / 2 + d * .18, w / 2, -d / 2 + d * .18)],
  ["kaappi", "Vaatekaappi", 600, 600, (w, d) => box(w, d) + L(-w / 2, -d / 2, w / 2, d / 2) + L(-w / 2, d / 2 - 40, w / 2, d / 2 - 40)],
  ["hylly", "Hylly", 800, 350, (w, d) => box(w, d) + L(-w / 2, 0, w / 2, 0)],
  ["keittiotaso", "Keittiötaso", 1800, 600, (w, d) => box(w, d) + L(-w / 2, d / 2 - 50, w / 2, d / 2 - 50)],
  ["tiskiallas", "Tiskiallas", 800, 600, (w, d) => box(w, d) + R(-w / 2 + 70, -d / 2 + 70, w - 140, d - 140, "s", 50) + C(0, 0, 30)],
  ["liesi", "Liesi", 600, 600, (w, d) => box(w, d) + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => C(a * w * .22, b * d * .22, Math.min(w, d) * .14)).join("")],
  ["jaakaappi", "Jääkaappi", 600, 600, (w, d) => lab(w, d, "JK")],
  ["pakastin", "Pakastin", 600, 600, (w, d) => lab(w, d, "PA")],
  ["astianpesukone", "Astianpesukone", 600, 600, (w, d) => lab(w, d, "AP")],
  ["pesukone", "Pyykinpesukone", 600, 600, (w, d) => lab(w, d, "PK")],
  ["wc", "WC-istuin", 400, 650, (w, d) => R(-w / 2, -d / 2, w, d * .28) + E(0, d * .12, w * .44, d * .34)],
  ["pesuallas", "Pesuallas", 500, 400, (w, d) => R(-w / 2, -d / 2, w, d, "s", 40) + E(0, d * .06, w * .34, d * .3)],
  ["suihku", "Suihku", 900, 900, (w, d) => box(w, d) + L(-w / 2, -d / 2, w / 2, d / 2) + L(w / 2, -d / 2, -w / 2, d / 2) + C(0, 0, 50)],
  ["amme", "Kylpyamme", 1700, 750, (w, d) => R(-w / 2, -d / 2, w, d, "s", 60) + R(-w / 2 + 80, -d / 2 + 80, w - 160, d - 160, "s", 200)],
  ["kiuas", "Kiuas", 500, 500, (w, d) => box(w, d) + R(-w / 2 + 50, -d / 2 + 50, w - 100, d - 100) + [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => C(a * w * .22, b * d * .22, Math.min(w, d) * .07, "sf"))).join(""), { hot: true }],
  ["laude", "Laude", 2000, 600, (w, d) => box(w, d) + [1, 2, 3, 4].map(i => L(-w / 2, -d / 2 + d * i / 5, w / 2, -d / 2 + d * i / 5)).join("")],
  ["takka", "Takka / tulisija", 900, 600, (w, d) => box(w, d) + P(`M ${-w * .3} ${d / 2} L ${-w * .3} 0 A ${w * .3} ${w * .3} 0 0 1 ${w * .3} 0 L ${w * .3} ${d / 2}`), { hot: true }],
  ["puuliesi", "Puuliesi", 800, 600, (w, d) => box(w, d) + C(-w * .2, -d * .1, Math.min(w, d) * .16) + C(w * .2, -d * .1, Math.min(w, d) * .16) + R(-w * .3, d * .2, w * .6, d * .22), { hot: true }],
  ["hormi", "Hormi", 400, 400, (w, d) => R(-w / 2, -d / 2, w, d, "sh") + L(-w / 2, -d / 2, w / 2, d / 2) + L(w / 2, -d / 2, -w / 2, d / 2)],
  ["varaaja", "Lämminvesivaraaja", 550, 550, (w, d) => E(0, 0, w / 2, d / 2) + T(0, 0, Math.min(w, d) * .26, "LVV")],
  ["portaat", "Portaat", 900, 2700, (w, d) => box(w, d) + Array.from({ length: Math.max(1, Math.floor(d / 250) - 1) }, (_, i) => L(-w / 2, -d / 2 + (i + 1) * d / Math.floor(d / 250), w / 2, -d / 2 + (i + 1) * d / Math.floor(d / 250))).join("") + P(`M 0 ${d / 2 - 100} L 0 ${-d / 2 + 150} M -90 ${-d / 2 + 300} L 0 ${-d / 2 + 150} L 90 ${-d / 2 + 300}`)],
  ["laatikko", "Muu (oma nimi)", 1000, 600, (w, d, it) => box(w, d) + T(0, 0, Math.max(60, Math.min(w * .9 / Math.max(3, (it?.label || "").length) * 1.6, d * .3)), esc(it?.label || "?"))]
];

// Sähkösymbolit (koko 300 mm ≈ 6 mm paperilla mittakaavassa 1:50)
const S = 300, r = S * .3;
const sock = (n = 1) => Array.from({ length: n }, (_, i) => { const ox = (i - (n - 1) / 2) * r * 1.2; return P(`M ${ox - r} ${-S / 2 + 20} A ${r} ${r} 0 0 0 ${ox + r} ${-S / 2 + 20} Z`, "s"); }).join("") + L(-S / 2, -S / 2, S / 2, -S / 2);
const ELEC = [
  ["pistorasia", "Pistorasia", sock(1), 300],
  ["pistorasia2", "Pistorasia 2-os.", sock(2), 300],
  ["pistorasiaU", "Ulkopistorasia IP44", sock(1) + T(0, S * .3, S * .3, "IP"), 600],
  ["katkaisija", "Valokatkaisija", C(0, 0, r * .55) + L(r * .35, -r * .35, r * 1.4, -r * 1.4), 1000],
  ["vaihtokytkin", "Vaihtokytkin", C(0, 0, r * .55) + L(r * .35, -r * .35, r * 1.4, -r * 1.4) + L(-r * .35, r * .35, -r * 1.4, r * 1.4), 1000],
  ["himmennin", "Himmennin", C(0, 0, r * .55) + L(r * .35, -r * .35, r * 1.4, -r * 1.4) + P(`M ${-r * .9} ${r * .9} L ${-r * .2} ${r * .9} L ${-r * .9} ${r * .3} Z`, "sf"), 1000],
  ["kattovalo", "Kattovalaisin", C(0, 0, r) + L(-r * .7, -r * .7, r * .7, r * .7) + L(r * .7, -r * .7, -r * .7, r * .7), null],
  ["seinavalo", "Seinävalaisin", P(`M ${-r} ${-S / 2} A ${r} ${r} 0 0 0 ${r} ${-S / 2} Z`, "s") + L(-r * .6, -S / 2, r * .6, -S / 2 + r * .8) + L(r * .6, -S / 2, -r * .6, -S / 2 + r * .8), 1800],
  ["spotti", "Alasvalo / spotti", C(0, 0, r * .55) + C(0, 0, r * .22, "sf"), null],
  ["ulkovalo", "Ulkovalaisin", C(0, 0, r) + L(-r * .7, -r * .7, r * .7, r * .7) + L(r * .7, -r * .7, -r * .7, r * .7) + T(0, r * 1.5, r * .8, "U"), 2000],
  ["rasia", "Kytkentärasia", R(-r * .6, -r * .6, r * 1.2, r * 1.2) + C(0, 0, r * .18, "sf"), 2000],
  ["keskus", "Sähkökeskus", R(-S, -S / 3, S * 2, S / 1.5) + P(`M ${-S} ${-S / 3} L ${S} ${-S / 3} L ${S} ${S / 3} Z`, "sf"), 1500, 600, 200],
  ["termostaatti", "Termostaatti", R(-r * .8, -r * .8, r * 1.6, r * 1.6) + T(0, 0, r, "T"), 1000],
  ["palovaroitin", "Palovaroitin", C(0, 0, r) + T(0, 0, r * .9, "PV"), null],
  ["antenni", "Antenni / TV", C(0, 0, r) + T(0, 0, r * .8, "TV"), 300],
  ["data", "Verkkopiste", R(-r * .8, -r * .8, r * 1.6, r * 1.6) + T(0, 0, r * .75, "ATK"), 300],
  ["kiuasohjain", "Kiukaan ohjain", R(-r * .8, -r * .8, r * 1.6, r * 1.6) + T(0, 0, r * .75, "KO"), 1500],
  ["patteri", "Lämmitin / patteri", null, 200, 800, 100],
  ["ilp", "Ilmalämpöpumppu", null, 2100, 800, 250],
  ["lattialammitys", "Lattialämmitys (merkintä)", P(`M ${-r} ${r * .3} q ${r * .25} ${-r * .6} ${r * .5} 0 t ${r * .5} 0 t ${r * .5} 0 t ${r * .5} 0`) + P(`M ${-r} ${-r * .3} q ${r * .25} ${-r * .6} ${r * .5} 0 t ${r * .5} 0 t ${r * .5} 0 t ${r * .5} 0`), null]
];
const ELEC_DRAW = {
  patteri: (w, d) => { const n = Math.max(2, Math.floor((w - 80) / 80)); return box(w, d) + P(`M ${-w / 2 + 40} 0 ` + Array.from({ length: n }, (_, i) => `L ${-w / 2 + 40 + (i + 1) * (w - 80) / n} ${i === n - 1 ? 0 : i % 2 ? -d * .3 : d * .3}`).join(" ")); },
  ilp: (w, d) => R(-w / 2, -d / 2, w, d, "s", 40) + T(0, 0, d * .45, "ILP")
};

const LVI = [
  ["lattiakaivo", "Lattiakaivo", 250, (w, d) => box(w, d) + C(0, 0, w * .32) + L(-w * .22, 0, w * .22, 0) + L(0, -w * .22, 0, w * .22)],
  ["vesipiste", "Vesipiste", 250, (w, d) => C(0, 0, w * .3) + T(0, 0, w * .32, "V")],
  ["tulo", "Tuloilmaventtiili", 250, (w, d) => C(0, 0, w * .4) + T(0, 0, w * .3, "TU")],
  ["poisto", "Poistoilmaventtiili", 250, (w, d) => C(0, 0, w * .4) + T(0, 0, w * .3, "PO")],
  ["korvausilma", "Korvausilmaventtiili", 250, (w, d) => R(-w * .4, -w * .4, w * .8, w * .8) + T(0, 0, w * .3, "KI")],
  ["viemari", "Viemäri", 250, (w, d) => C(0, 0, w * .35, "sf")]
];

function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

export const CATS = [["kaluste", "Kalusteet"], ["sahko", "Sähkö"], ["lvi", "LVI"]];
export const KINDS = {};
for (const [k, n, w, d, draw, x] of FURN) KINDS[k] = { k, cat: "kaluste", name: n, w, d, draw, hot: x?.hot };
for (const [k, n, svg, h, w = S, d = S] of ELEC) KINDS[k] = { k, cat: "sahko", name: n, w, d, h, wall: h !== null, draw: ELEC_DRAW[k] || (() => svg) };
for (const [k, n, s, draw] of LVI) KINDS[k] = { k, cat: "lvi", name: n, w: s, d: s, draw, h: null };
KINDS.seinavalo.wall = true;
["vesipiste"].forEach(k => KINDS[k].wall = true);

export function drawItem(it) {
  const K = KINDS[it.kind];
  if (!K) return box(it.w || 300, it.d || 300) + T(0, 0, 80, "?");
  return K.draw(it.w, it.d, it);
}

// ---------- Ovet ja ikkunat ----------
export const OPENINGS = {
  ovi: { name: "Ovi", w: 900, h: 2100, sill: 0 },
  pariovi: { name: "Pariovi", w: 1600, h: 2100, sill: 0 },
  liukuovi: { name: "Liukuovi", w: 1200, h: 2100, sill: 0 },
  ikkuna: { name: "Ikkuna", w: 1200, h: 1200, sill: 900 },
  aukko: { name: "Aukko", w: 900, h: 2100, sill: 0 }
};

// ---------- Tilat ----------
export const ROOM_NAMES = ["Olohuone", "Keittiö", "Makuuhuone", "Eteinen", "Pukuhuone", "Pesuhuone", "Löylyhuone", "WC", "Tekninen tila", "Varasto", "Kuisti", "Terassi", "Parvi"];
export const STATUS = [["new", "Uusi"], ["existing", "Olemassa oleva"], ["demolish", "Purettava"]];
