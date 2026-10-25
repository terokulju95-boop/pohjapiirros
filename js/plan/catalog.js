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
  // --- Sauna ---
  ["puukiuas", "Puukiuas", 450, 600, (w, d) => box(w, d) + R(-w / 2 + 40, -d / 2 + 40, w - 80, d * .55) + [-1, 0, 1].map(a => C(a * w * .22, -d / 2 + 40 + d * .27, Math.min(w, d) * .06, "sf")).join("") + R(-w * .3, d / 2 - d * .3, w * .6, d * .22) + T(0, d * .05, Math.min(w, d) * .16, "PUU"), { hot: true }],
  ["kivilevy", "Kivilevy / suojalevy seinään", 1200, 30, (w, d) => R(-w / 2, -d / 2, w, d, "sh") + L(-w / 2, d / 2 + 25, w / 2, d / 2 + 25, "sl") , { wall: true }],
  ["kiuaskaide", "Kiukaan suojakaide", 700, 40, (w, d) => R(-w / 2, -d / 2, w, d, "sh")],
  ["laudejakkara", "Laudejakkara", 450, 350, (w, d) => box(w, d) + L(-w / 2, -d / 6, w / 2, -d / 6) + L(-w / 2, d / 6, w / 2, d / 6)],
  ["selkanoja", "Lauteiden selkänoja", 1800, 60, (w, d) => box(w, d) + L(-w / 2, 0, w / 2, 0), { wall: true }],
  ["lattiaritila", "Lattiaritilä", 1000, 600, (w, d) => box(w, d) + Array.from({ length: Math.max(1, Math.floor(w / 120)) }, (_, i, ) => L(-w / 2 + (i + 1) * w / (Math.floor(w / 120) + 1), -d / 2, -w / 2 + (i + 1) * w / (Math.floor(w / 120) + 1), d / 2)).join("")],
  ["kiulu", "Löylykiulu ja kauha", 300, 300, (w, d) => E(0, 0, w * .35, d * .35) + L(w * .25, -d * .25, w * .5, -d * .5)],
  ["pesupata", "Pesupata / vesipata", 550, 550, (w, d) => E(0, 0, w / 2, d / 2) + E(0, 0, w * .32, d * .32), { hot: true }],
  // --- Pesuhuone ja WC ---
  ["suihkuseina", "Suihkuseinä (lasi)", 900, 30, (w, d) => R(-w / 2, -d / 2, w, d) + L(-w / 2, 0, w / 2, 0)],
  ["pesuallaskaappi", "Pesuallaskaappi", 800, 450, (w, d) => box(w, d) + E(0, d * .05, w * .3, d * .3)],
  ["peilikaappi", "Peilikaappi", 600, 150, (w, d) => box(w, d) + L(-w / 2, d / 2 - 20, w / 2, d / 2 - 20), { wall: true }],
  ["kuivauskaappi", "Kuivauskaappi", 600, 600, (w, d) => lab(w, d, "KK")],
  ["pyyhekuivain", "Pyyhekuivain", 500, 100, (w, d) => box(w, d) + [-1, 0, 1].map(a => L(a * w * .3, -d / 2, a * w * .3, d / 2)).join(""), { wall: true }],
  // --- Keittiö ---
  ["ylakaappi", "Yläkaappi", 800, 350, (w, d) => `<rect class="sl" x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" stroke-dasharray="${w * .06} ${w * .04}"/>`, { wall: true }],
  ["mikro", "Mikroaaltouuni", 500, 400, (w, d) => lab(w, d, "MI")],
  ["saareke", "Keittiösaareke", 1200, 900, (w, d) => box(w, d) + L(-w / 2, -d / 2 + 60, w / 2, -d / 2 + 60)],
  ["ruokaryhma4", "Ruokaryhmä 4 hlö", 1200, 1700, (w, d) => { const td = d * .47; return R(-w / 2, -td / 2, w, td) + [-1, 1].flatMap(sy => [-1, 1].map(sx => R(sx * w * .22 - 225, sy * (td / 2 + 40) - (sy < 0 ? 450 : 0), 450, 450, "s", 30))).join(""); }],
  ["ruokaryhma6", "Ruokaryhmä 6 hlö", 1800, 1700, (w, d) => { const td = d * .47; return R(-w / 2, -td / 2, w, td) + [-1, 1].flatMap(sy => [-1, 0, 1].map(sx => R(sx * w * .3 - 225, sy * (td / 2 + 40) - (sy < 0 ? 450 : 0), 450, 450, "s", 30))).join(""); }],
  // --- Makuuhuone ---
  ["vauvansanky", "Pinnasänky", 650, 1250, (w, d) => box(w, d) + R(-w / 2 + 50, -d / 2 + 50, w - 100, d - 100)],
  ["yopoyta", "Yöpöytä", 450, 400, (w, d) => box(w, d) + L(-w / 2, -d / 2 + 50, w / 2, -d / 2 + 50)],
  ["lipasto", "Lipasto", 800, 450, (w, d) => box(w, d) + L(-w / 2, d / 2 - 50, w / 2, d / 2 - 50)],
  // --- Olohuone ---
  ["kulmasohva", "Kulmasohva", 2600, 1700, (w, d) => P(`M ${-w / 2} ${-d / 2} H ${w / 2} V ${d / 2} H ${w / 2 - 900} V ${-d / 2 + 900} H ${-w / 2} Z`, "s") + P(`M ${-w / 2} ${-d / 2 + 220} H ${w / 2 - 220} V ${d / 2}`)],
  ["sohvapoyta", "Sohvapöytä", 1200, 600, (w, d) => R(-w / 2, -d / 2, w, d, "s", 40)],
  ["tvtaso", "TV-taso", 1600, 400, (w, d) => box(w, d) + R(-w * .3, -d / 2 - 40, w * .6, 40, "sh")],
  ["matto", "Matto", 2000, 1400, (w, d) => `<rect class="sl" x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" stroke-dasharray="40 30"/><rect class="sl" x="${-w / 2 + 80}" y="${-d / 2 + 80}" width="${w - 160}" height="${d - 160}" stroke-dasharray="40 30"/>`],
  // --- Eteinen ---
  ["naulakko", "Naulakko", 1200, 350, (w, d) => L(-w / 2, -d / 2, w / 2, -d / 2) + Array.from({ length: Math.max(2, Math.floor(w / 250)) }, (_, i, a) => C(-w / 2 + (i + .5) * w / Math.max(2, Math.floor(w / 250)), -d / 2 + 60, 30, "sf")).join("") + `<rect class="sl" x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" stroke-dasharray="40 30"/>`, { wall: true }],
  ["kenkahylly", "Kenkähylly", 800, 300, (w, d) => box(w, d) + L(-w / 2, 0, w / 2, 0)],
  ["penkki", "Penkki", 1200, 400, (w, d) => box(w, d)],
  // --- Lämmitys ja tekniikka ---
  ["kamiina", "Kamiina", 500, 500, (w, d) => E(0, 0, w / 2, d / 2) + T(0, 0, Math.min(w, d) * .3, "K"), { hot: true }],
  ["puulaatikko", "Puulaatikko", 600, 400, (w, d) => box(w, d) + L(-w / 2, -d / 2, w / 2, d / 2) + L(w / 2, -d / 2, -w / 2, d / 2)],
  ["kuivakaymala", "Kuivakäymälä", 600, 800, (w, d) => box(w, d) + E(0, d * .1, w * .3, d * .28) + R(-w / 2, -d / 2, w, d * .2)],
  ["ilpulko", "ILP-ulkoyksikkö", 800, 300, (w, d) => box(w, d) + C(-w * .15, 0, d * .38) + L(-w * .15 - d * .3, 0, -w * .15 + d * .3, 0)],
  // --- Ulko ja terassi ---
  ["ulkopoyta", "Ulkopöytä + penkit", 1800, 1600, (w, d) => R(-w / 2, -d * .25, w, d * .5) + R(-w / 2, -d / 2, w, d * .17) + R(-w / 2, d / 2 - d * .17, w, d * .17)],
  ["grilli", "Grilli", 600, 500, (w, d) => R(-w / 2, -d / 2, w, d, "s", 60) + [-1, 0, 1].map(a => L(-w * .35, a * d * .25, w * .35, a * d * .25)).join("")],
  ["aurinkotuoli", "Aurinkotuoli", 650, 1900, (w, d) => R(-w / 2, -d / 2, w, d, "s", 40) + L(-w / 2, -d / 2 + d * .3, w / 2, -d / 2 + d * .3)],
  ["kaide", "Kaide", 2000, 50, (w, d) => R(-w / 2, -d / 2, w, d, "sh")],
  ["palju", "Palju / kylpytynnyri", 1800, 1800, (w, d) => E(0, 0, w / 2, d / 2) + E(0, 0, w * .43, d * .43) + R(w * .3, -d * .1, w * .2, d * .2, "sh"), { hot: true }],
  ["ulkosuihku", "Ulkosuihku", 900, 900, (w, d) => box(w, d) + C(0, 0, 60)],
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
// Kalusteryhmät. Sama kaluste voi olla useassa ryhmässä.
export const GROUPS = [
  ["sauna", "Sauna", ["kiuas", "puukiuas", "kivilevy", "kiuaskaide", "laude", "laudejakkara", "selkanoja", "lattiaritila", "kiulu", "pesupata", "hormi"]],
  ["pesu", "Pesuhuone ja WC", ["suihku", "suihkuseina", "wc", "kuivakaymala", "pesuallas", "pesuallaskaappi", "peilikaappi", "amme", "pesukone", "kuivauskaappi", "pyyhekuivain", "varaaja"]],
  ["keittio", "Keittiö", ["keittiotaso", "ylakaappi", "tiskiallas", "liesi", "puuliesi", "jaakaappi", "pakastin", "astianpesukone", "mikro", "saareke", "ruokaryhma4", "ruokaryhma6", "poyta", "pyoreapoyta", "tuoli"]],
  ["makuu", "Makuuhuone", ["sanky", "sanky2", "kerrossanky", "vauvansanky", "yopoyta", "lipasto", "kaappi", "hylly"]],
  ["olo", "Olohuone", ["sohva", "kulmasohva", "nojatuoli", "sohvapoyta", "tvtaso", "hylly", "matto", "takka"]],
  ["eteinen", "Eteinen ja säilytys", ["naulakko", "kenkahylly", "penkki", "kaappi", "hylly"]],
  ["lammitys", "Lämmitys ja tekniikka", ["takka", "puuliesi", "kamiina", "hormi", "varaaja", "puulaatikko", "ilpulko", "portaat"]],
  ["ulko", "Ulko ja terassi", ["ulkopoyta", "grilli", "aurinkotuoli", "kaide", "palju", "ulkosuihku", "ilpulko", "portaat", "puulaatikko"]],
  ["muut", "Muut", ["laatikko", "portaat", "matto"]]
];
export const KINDS = {};
for (const [k, n, w, d, draw, x] of FURN) KINDS[k] = { k, cat: "kaluste", name: n, w, d, draw, hot: x?.hot, wall: x?.wall };
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
