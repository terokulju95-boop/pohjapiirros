// =============================================================
//  Katot: harja-, pulpetti-, auma- ja tasakatto
//  Katto määritellään ulkoseinien suorakaiteen (x1..x2, y1..y2) päälle.
//  Korkeudet: base = katon alapinta seinälinjalla (yleensä seinän yläreuna), t = rakennepaksuus.
//  Kaikki pinnat palautetaan 3D-pisteinä [x, y, z] (mm, z ylös).
// =============================================================
export const ROOF_TYPES = [["harja", "Harjakatto"], ["pulpetti", "Pulpettikatto"], ["auma", "Aumakatto"], ["tasa", "Tasakatto"]];
export const defaultRoof = (b, wallH) => {
  const W = b.x2 - b.x1, D = b.y2 - b.y1;
  return { type: "harja", pitch: 22, eave: 500, gable: 300, dir: W >= D ? "x" : "y", low: "a", base: wallH, t: 250, mat: "pelti", x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 };
};
export const ratio = deg => { const k = Math.tan(deg * Math.PI / 180); return k > 0.001 ? `1:${(1 / k).toFixed(1).replace(".", ",")}` : "–"; };

// Paikalliset akselit: u = harjan suunta, v = kaltevuuden suunta
function axes(r) {
  const alongX = (r.type === "auma" ? ((r.x2 - r.x1) >= (r.y2 - r.y1) ? "x" : "y") : (r.dir || "x")) === "x";
  const U1 = alongX ? r.x1 : r.y1, U2 = alongX ? r.x2 : r.y2, V1 = alongX ? r.y1 : r.x1, V2 = alongX ? r.y2 : r.x2;
  const P = (u, v, z) => alongX ? [u, v, z] : [v, u, z];
  return { alongX, U1, U2, V1, V2, P };
}

// Katon alapinnan tasot ja tiedot reunoista
export function roofGeom(r) {
  const k = Math.tan((r.type === "tasa" ? 0 : (r.pitch || 0)) * Math.PI / 180), e = r.eave ?? 500, g = r.type === "auma" ? e : (r.gable ?? 300), base = r.base ?? 2400;
  const { U1, U2, V1, V2, P, alongX } = axes(r), D = V2 - V1, W = U2 - U1;
  const faces = [], gables = [], eaves = [], ridges = [], hips = [], rakes = [];
  const z = dv => base + dv * k; // korkeus etäisyydellä dv seinälinjasta sisäänpäin
  if (r.type === "harja") {
    const vm = (V1 + V2) / 2, zr = z(D / 2), ze = z(-e);
    faces.push([P(U1 - g, V1 - e, ze), P(U2 + g, V1 - e, ze), P(U2 + g, vm, zr), P(U1 - g, vm, zr)]);
    faces.push([P(U2 + g, V2 + e, ze), P(U1 - g, V2 + e, ze), P(U1 - g, vm, zr), P(U2 + g, vm, zr)]);
    for (const u of [U1, U2]) gables.push({ u, pts: [P(u, V1, base), P(u, V2, base), P(u, vm, zr)], inward: u === U1 ? 1 : -1 });
    eaves.push([P(U1 - g, V1 - e, ze), P(U2 + g, V1 - e, ze)], [P(U1 - g, V2 + e, ze), P(U2 + g, V2 + e, ze)]);
    ridges.push([P(U1 - g, vm, zr), P(U2 + g, vm, zr)]);
    for (const u of [U1 - g, U2 + g]) rakes.push([P(u, V1 - e, ze), P(u, vm, zr)], [P(u, V2 + e, ze), P(u, vm, zr)]);
  } else if (r.type === "pulpetti") {
    // matala reuna puolella a (V1) tai b (V2)
    const lowA = (r.low || "a") === "a", zl = z(-e), zh = z(D + e);
    const vl = lowA ? V1 - e : V2 + e, vh = lowA ? V2 + e : V1 - e;
    faces.push([P(U1 - g, vl, zl), P(U2 + g, vl, zl), P(U2 + g, vh, zh), P(U1 - g, vh, zh)]);
    const wl = lowA ? V1 : V2, wh = lowA ? V2 : V1, ztop = z(D);
    for (const u of [U1, U2]) gables.push({ u, pts: [P(u, wl, base), P(u, wh, base), P(u, wh, ztop)], inward: u === U1 ? 1 : -1 });
    gables.push({ v: wh, pts: [P(U1, wh, base), P(U2, wh, base), P(U2, wh, ztop), P(U1, wh, ztop)], inwardV: lowA ? -1 : 1 });
    eaves.push([P(U1 - g, vl, zl), P(U2 + g, vl, zl)]);
    ridges.push([P(U1 - g, vh, zh), P(U2 + g, vh, zh)]);
    for (const u of [U1 - g, U2 + g]) rakes.push([P(u, vl, zl), P(u, vh, zh)]);
  } else if (r.type === "auma") {
    const vm = (V1 + V2) / 2, zr = z(D / 2), ze = z(-e), h = Math.min(D / 2, W / 2);
    const a = [U1 - e, V1 - e], b = [U2 + e, V1 - e], c = [U2 + e, V2 + e], d = [U1 - e, V2 + e];
    const r1 = [U1 + h, vm], r2 = [U2 - h, vm];
    faces.push([P(...a, ze), P(...b, ze), P(...r2, zr), P(...r1, zr)]);
    faces.push([P(...c, ze), P(...d, ze), P(...r1, zr), P(...r2, zr)]);
    faces.push([P(...d, ze), P(...a, ze), P(...r1, zr)]);
    faces.push([P(...b, ze), P(...c, ze), P(...r2, zr)]);
    eaves.push([P(...a, ze), P(...b, ze)], [P(...b, ze), P(...c, ze)], [P(...c, ze), P(...d, ze)], [P(...d, ze), P(...a, ze)]);
    if (r2[0] - r1[0] > 1) ridges.push([P(...r1, zr), P(...r2, zr)]);
    hips.push([P(...a, ze), P(...r1, zr)], [P(...d, ze), P(...r1, zr)], [P(...b, ze), P(...r2, zr)], [P(...c, ze), P(...r2, zr)]);
  } else {
    faces.push([P(U1 - g, V1 - e, base), P(U2 + g, V1 - e, base), P(U2 + g, V2 + e, base), P(U1 - g, V2 + e, base)]);
    eaves.push([P(U1 - g, V1 - e, base), P(U2 + g, V1 - e, base)], [P(U2 + g, V1 - e, base), P(U2 + g, V2 + e, base)], [P(U2 + g, V2 + e, base), P(U1 - g, V2 + e, base)], [P(U1 - g, V2 + e, base), P(U1 - g, V1 - e, base)]);
  }
  const top = Math.max(...faces.flat().map(p => p[2])) + (r.t ?? 250) / Math.cos(Math.atan(k));
  return { faces, gables, eaves, ridges, hips, rakes, k, top, alongX, outline: outlineOf(faces) };
}
function outlineOf(faces) {
  const xs = faces.flat().map(p => p[0]), ys = faces.flat().map(p => p[1]);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}
const len3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
function area3(poly) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    x += a[1] * b[2] - a[2] * b[1]; y += a[2] * b[0] - a[0] * b[2]; z += a[0] * b[1] - a[1] * b[0];
  }
  return Math.hypot(x, y, z) / 2;
}
// Määrät: katon pinta-ala (kalteva), räystäät, harja, aumataitteet, päätyräystäät, päätykolmiot
export function roofQty(r) {
  const G = roofGeom(r);
  return {
    area: G.faces.reduce((s, f) => s + area3(f), 0),
    eave: G.eaves.reduce((s, [a, b]) => s + len3(a, b), 0),
    ridge: G.ridges.reduce((s, [a, b]) => s + len3(a, b), 0),
    hip: G.hips.reduce((s, [a, b]) => s + len3(a, b), 0),
    rake: G.rakes.reduce((s, [a, b]) => s + len3(a, b), 0),
    gable: G.gables.reduce((s, g) => s + area3(g.pts), 0),
    top: G.top
  };
}
