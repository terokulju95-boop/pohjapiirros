// =============================================================
//  Seinätyypit rakennekerroksineen
//  Kerrokset luetellaan puolelta B puolelle A (ulkoa sisään, kun seinät on piirretty myötäpäivään).
//  Seinän paksuus = kerrosten summa.
// =============================================================
export const LAYER_KINDS = {
  verhous: ["Ulkoverhous", "#c9a46a"], rako: ["Rako / koolaus", "#ffffff"], levy: ["Levy (tuulensuoja, OSB…)", "#9aa0a6"],
  runko: ["Runko + eriste", "#f2dc8d"], eriste: ["Eriste", "#f6e7ad"], kalvo: ["Kalvo (höyrynsulku, alumiinipaperi)", "#c0473f"],
  paneeli: ["Paneeli", "#e3c79a"], kipsi: ["Kipsilevy", "#e9e9e6"], hirsi: ["Hirsi", "#c99a5e"], teras: ["Teräs / pelti", "#6c7a86"],
  laatta: ["Laatoitus + vedeneristys", "#dfe7ee"], muu: ["Muu", "#cccccc"]
};
const L = (name, kind, t) => ({ name, kind, t });
export const DEFAULT_WALL_TYPES = [
  { id: "ulko150", name: "Ulkoseinä, runko 150", layers: [L("Ulkoverhous", "verhous", 22), L("Tuuletusrako", "rako", 22), L("Tuulensuojalevy", "levy", 9), L("Runko + mineraalivilla", "runko", 150), L("Höyrynsulku", "kalvo", 0), L("Sisäpaneeli", "paneeli", 15)] },
  { id: "sauna", name: "Löylyhuoneen ulkoseinä", layers: [L("Ulkoverhous", "verhous", 22), L("Tuuletusrako", "rako", 22), L("Tuulensuojalevy", "levy", 9), L("Runko + mineraalivilla", "runko", 150), L("Alumiinipaperi", "kalvo", 0), L("Tuuletusrako / koolaus", "rako", 22), L("Saunapaneeli", "paneeli", 15)] },
  { id: "vali66", name: "Väliseinä, kipsi", layers: [L("Kipsilevy", "kipsi", 13), L("Runko 66 + eriste", "runko", 66), L("Kipsilevy", "kipsi", 13)] },
  { id: "valipaneeli", name: "Väliseinä, paneeli", layers: [L("Paneeli", "paneeli", 15), L("Runko 70 + eriste", "runko", 70), L("Paneeli", "paneeli", 15)] },
  { id: "markatila", name: "Pesuhuoneen väliseinä", layers: [L("Paneeli", "paneeli", 15), L("Runko 70 + eriste", "runko", 70), L("Märkätilalevy", "levy", 12), L("Laatoitus + vedeneristys", "laatta", 10)] },
  { id: "hirsi200", name: "Hirsiseinä 200", layers: [L("Hirsi", "hirsi", 200)] },
  { id: "kontti", name: "Kontin seinä + sisäeristys 70", layers: [L("Aaltopelti", "teras", 43), L("Runko 70 + eriste", "runko", 70), L("Höyrynsulku", "kalvo", 0), L("Sisäpaneeli", "paneeli", 15)] }
];
export const typeT = ty => Math.max(10, (ty?.layers || []).reduce((s, l) => s + (Number(l.t) || 0), 0));
export const typeOf = (S, id) => (S.wallTypes || []).find(t => t.id === id);
// Seinän kerrokset puolelta B puolelle A (käännetty, jos w.flip)
export function wallLayers(w, S) {
  const ty = typeOf(S, w.type); if (!ty) return null;
  const ls = ty.layers.filter(l => l && (Number(l.t) || 0) >= 0);
  return w.flip ? [...ls].reverse() : ls;
}
