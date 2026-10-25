// =============================================================
//  3D-materiaalit: seinäpinnat, lattiat, ovet, ikkunankarmit ja kalusteet
//  [nimi, perusväri, kuvio, kuvion koko mm]. Kuvio piirretään 3D:ssä harmaasävyisenä ja sävytetään värillä.
// =============================================================
export const WALL_MATS = {
  maali: ["Maalattu", "#ece7de", null, 0],
  paneeli: ["Puupaneeli, vaaka", "#e3c79a", "panelH", 480],
  paneelipysty: ["Puupaneeli, pysty", "#e3c79a", "panelV", 480],
  tummapaneeli: ["Tumma paneeli (lämpökäsitelty)", "#8a5d3b", "panelH", 480],
  hirsi: ["Hirsi", "#c99a5e", "log", 400],
  peiterima: ["Ulkoverhous, peiterima", "#8e2f22", "boardV", 400],
  vaakaverhous: ["Ulkoverhous, vaaka", "#e2ddd0", "clapH", 400],
  laatta: ["Laatta 200 × 200", "#f2f2ef", "tile", 400],
  isolaatta: ["Laatta 300 × 600", "#cdc8bf", "tileL", 600],
  kivi: ["Kivilevy / luonnonkivi", "#8d8a84", "stone", 600],
  tiili: ["Tiili", "#a9553d", "brick", 520],
  betoni: ["Betoni", "#a9a9a4", "noise", 1000],
  teras: ["Kontin aaltopelti", "#3f6079", "corr", 560],
  lasi: ["Lasi", "#9cc6e6", "glass", 0]
};
export const FLOOR_MATS = {
  puu: ["Parketti", "#c9a36f", "planks", 1120],
  lauta: ["Lattialauta", "#b88d58", "planksWide", 1200],
  laatta: ["Laatta 200 × 200", "#e9e7e2", "tile", 400],
  isolaatta: ["Laatta 300 × 600", "#bdb8af", "tileL", 600],
  betoni: ["Betoni", "#a9a9a4", "noise", 1000],
  vinyyli: ["Vinyyli / muovimatto", "#d8d0c4", null, 0],
  ritila: ["Puuritilä", "#c49a64", "panelV", 480]
};
export const DOOR_MATS = {
  puu: ["Puu", "#b98a5c", "panelV", 480],
  valkoinen: ["Valkoinen", "#f3f3f1", null, 0],
  tumma: ["Tumma puu", "#5a3d28", "panelV", 480],
  puulasi: ["Puu + lasi-ikkuna", "#b98a5c", "panelV", 480],
  lasi: ["Kirkas lasi (saunan lasiovi)", "#9cc6e6", "glass", 0],
  huurre: ["Huurrettu lasi", "#e8eef2", "frost", 0],
  teras: ["Teräs", "#6b7378", null, 0]
};
export const FRAME_MATS = { valkoinen: ["Valkoinen", "#f3f3f1"], puu: ["Puu", "#b98a5c"], musta: ["Musta", "#2b2d2f"], harmaa: ["Harmaa", "#7d8489"] };
export const ITEM_MATS = {
  oletus: ["Oletus", null, null, 0],
  puu: ["Vaalea puu", "#d8b98a", "panelH", 480],
  tummapuu: ["Tumma puu", "#6b4a32", "panelH", 480],
  valkoinen: ["Valkoinen", "#f4f4f2", null, 0],
  musta: ["Musta", "#2e3033", null, 0],
  harmaa: ["Harmaa", "#8c9196", null, 0],
  kivi: ["Kivi", "#8d8a84", "stone", 600]
};
export const opts = M => Object.entries(M).map(([k, v]) => [k, v[0]]);
