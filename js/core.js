// =============================================================
//  Pohjapiirros – ydin: Firebase, tila, apurit, lomakkeet
//  Pelkkä HTML/JS + Firebase (Auth + Firestore, offline-tuki)
// =============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, LOGIN_EMAIL, APP_NAME, COL_PREFIX, ADMIN_NAME, DEFAULT_USERS } from "../firebase-config.js";
export const CONFIG_MISSING = !firebaseConfig.apiKey || /LIIT/.test(firebaseConfig.apiKey);

export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export let db;
try {
  db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) { console.warn("Offline-välimuisti ei käytössä", e); db = getFirestore(fbApp); }

// Kokoelmat. Etuliite pitää tiedot erillään Mökki-sovelluksen tiedoista, jos käytössä on sama Firebase-projekti.
export const C = { projects: COL_PREFIX + "projects", plans: COL_PREFIX + "plans", notes: COL_PREFIX + "notes", photos: COL_PREFIX + "photos" };
export const S = { user: null, me: null, users: [...DEFAULT_USERS], pins: {}, d: { projects: [], plans: [], notes: [] }, loaded: {}, route: { name: "home" }, unsubs: [], pending: {} };
export const USER_KEY = "piirros_user";
export const USERS_DOC = () => doc(db, COL_PREFIX + "app", "users");
export const isAdmin = () => S.me?.name === ADMIN_NAME;
export { ADMIN_NAME, DEFAULT_USERS, APP_NAME, LOGIN_EMAIL, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, collection, doc, setDoc, onSnapshot, getDoc };

// ---------- Apurit ----------
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const nl2br = s => esc(s).replace(/\n/g, "<br>");
export const nowIso = () => new Date().toISOString();
export const pad = n => String(n).padStart(2, "0");
export const fmtDT = iso => { if (!iso) return ""; const d = new Date(iso); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} klo ${d.getHours()}.${pad(d.getMinutes())}`; };
export const fmtD = iso => { if (!iso) return ""; const d = new Date(iso); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`; };
export const num = v => { const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
export const list = c => S.d[c] || [];
export const byUpdated = (a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
export const isPhone = () => matchMedia("(max-width: 899px), (pointer: coarse) and (max-width: 1100px)").matches;
export function clean(o) { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = v === undefined ? null : v; return r; }

// ---------- Tallennus (ei odoteta palvelinta → toimii offline) ----------
export function fail(e) { console.error(e); toast("Tallennus epäonnistui: " + (e.code || e.message), true); }
export function save(col, data, id) {
  const ref = id ? doc(db, col, id) : doc(collection(db, col));
  const by = S.me?.name || null;
  const payload = id ? { ...clean(data), updatedAt: nowIso(), updatedByName: by } : { ...clean(data), createdAt: nowIso(), updatedAt: nowIso(), createdByName: by, updatedByName: by };
  (id ? setDoc(ref, payload, { merge: true }) : setDoc(ref, payload)).catch(fail);
  return ref.id;
}
export function newId(col) { return doc(collection(db, col)).id; }
export function patch(col, id, data) { updateDoc(doc(db, col, id), data).catch(fail); }
export function remove(col, id) { deleteDoc(doc(db, col, id)).catch(fail); }

// ---------- Kuvat (tallennetaan Firestoreen pakattuina, kuten Mökki-sovelluksessa) ----------
export const photoCache = new Map();
export function newPhoto(dataUrl) {
  const ref = doc(collection(db, C.photos));
  photoCache.set(ref.id, dataUrl);
  setDoc(ref, { data: dataUrl, createdAt: nowIso(), createdByName: S.me?.name || null }).catch(fail);
  return ref.id;
}
export function delPhoto(id) { photoCache.delete(id); deleteDoc(doc(db, C.photos, id)).catch(() => { }); }
export const delPhotos = ids => (ids || []).forEach(delPhoto);
async function loadPhoto(img) {
  const id = img.dataset.photo;
  if (photoCache.has(id)) { img.src = photoCache.get(id); return; }
  img.classList.add("loading");
  try {
    const s = await getDoc(doc(db, C.photos, id));
    if (s.exists()) { photoCache.set(id, s.data().data); img.src = s.data().data; } else img.classList.add("missing");
  } catch { img.classList.add("missing"); }
  img.classList.remove("loading");
}
export function hydratePhotos(root = document) { root.querySelectorAll("img[data-photo]").forEach(img => { if (!img.getAttribute("src")) loadPhoto(img); }); }
export function compressImage(file, maxDim = 1600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      let q = .8, out = c.toDataURL("image/jpeg", q);
      while (out.length > 700000 && q > .35) { q -= .1; out = c.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Kuvaa ei voitu lukea")); };
    img.src = url;
  });
}
export const thumbs = ids => ids?.length ? `<div class="thumbs">${ids.map(id => `<img class="thumb" data-photo="${esc(id)}" alt="Kuva">`).join("")}</div>` : "";
export function openLightbox(src) {
  const lb = $("#lightbox");
  lb.innerHTML = `<button class="lb-close" aria-label="Sulje">✕</button><div class="lb-scroll"><img src="${src}" alt=""></div>`;
  lb.classList.add("open");
  lb.onclick = e => { if (e.target.tagName === "IMG") { e.target.classList.toggle("zoom"); return; } lb.classList.remove("open"); lb.innerHTML = ""; };
}

// ---------- Ilmoitus ----------
let toastTimer;
export function toast(msg, isErr = false) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = "toast", isErr ? 5000 : 2500);
}

// ---------- Lomake-ikkuna ----------
function fieldHtml(f, v) {
  const req = f.required ? "required" : "";
  const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : "";
  switch (f.type) {
    case "heading": return `<h3 class="form-h">${esc(f.label)}</h3>`;
    case "note": return `<p class="form-note">${esc(f.label)}</p>`;
    case "textarea": return `<label class="fld"><span>${esc(f.label)}</span><textarea name="${f.name}" rows="${f.rows || 3}" ${req} ${ph}>${esc(v ?? "")}</textarea></label>`;
    case "select": {
      const opts = (typeof f.options === "function" ? f.options() : f.options).map(o => Array.isArray(o) ? o : [o, o]);
      return `<label class="fld"><span>${esc(f.label)}</span><select name="${f.name}" ${req}>${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(v ?? "") === String(val) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
    }
    case "cards": {
      // Isot valintakortit (esim. pohjan valinta)
      return `<div class="fld"><span>${esc(f.label)}</span><div class="pick-cards">${f.options.map(([val, l, sub]) => `<label class="pick-card"><input type="radio" name="${f.name}" value="${esc(val)}" ${String(v) === String(val) ? "checked" : ""}><b>${esc(l)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</label>`).join("")}</div></div>`;
    }
    case "checkbox": return `<label class="fld-check"><input type="checkbox" name="${f.name}" ${v ? "checked" : ""}><span>${esc(f.label)}</span></label>`;
    case "photos": return `<div class="fld" data-photos="${f.name}"><span>${esc(f.label)}</span><div class="thumbs edit"></div><label class="btn small ghost file-btn">📷 Lisää kuva<input type="file" accept="image/*" multiple data-pfield="${f.name}" hidden></label></div>`;
    case "number": return `<label class="fld"><span>${esc(f.label)}</span><input name="${f.name}" type="text" inputmode="decimal" value="${v === null || v === undefined ? "" : esc(String(v).replace(".", ","))}" ${req} ${ph}></label>`;
    default: return `<label class="fld"><span>${esc(f.label)}</span><input name="${f.name}" type="${f.type || "text"}" value="${esc(v ?? "")}" ${req} ${ph} ${f.list ? `list="dl_${f.name}"` : ""} autocomplete="off"></label>${f.list ? `<datalist id="dl_${f.name}">${f.list.map(o => `<option value="${esc(o)}">`).join("")}</datalist>` : ""}`;
  }
}

export function openForm({ title, fields, values = {}, onSubmit, onDelete, submitLabel = "Tallenna", deleteLabel = "Poista" }) {
  const m = $("#modal"), photoState = {}, added = new Set();
  let finished = false;
  const initial = f => values[f.name] !== undefined && values[f.name] !== null ? values[f.name] : (typeof f.def === "function" ? f.def() : f.def);
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-mclose aria-label="Sulje">✕</button></div>
    <form class="form">${fields.map(f => fieldHtml(f, initial(f))).join("")}
      <div class="form-actions">${onDelete ? `<button type="button" class="btn danger ghost" data-mdel>${esc(deleteLabel)}</button>` : "<span></span>"}<button type="submit" class="btn primary">${esc(submitLabel)}</button></div>
    </form></div>`;
  const form = m.querySelector("form");
  const drawPhotos = name => {
    const box = m.querySelector(`[data-photos="${name}"] .thumbs`);
    box.innerHTML = photoState[name].map(id => `<div class="thumb-wrap"><img class="thumb" data-photo="${esc(id)}" alt=""><button type="button" class="thumb-del" data-pdel="${name}" data-id="${esc(id)}" aria-label="Poista kuva">✕</button></div>`).join("");
    hydratePhotos(box);
  };
  fields.filter(f => f.type === "photos").forEach(f => { photoState[f.name] = [...(values[f.name] || [])]; drawPhotos(f.name); });
  m.querySelectorAll("input[data-pfield]").forEach(inp => inp.addEventListener("change", async () => {
    const name = inp.dataset.pfield;
    for (const file of inp.files) {
      try { const id = newPhoto(await compressImage(file)); added.add(id); photoState[name].push(id); drawPhotos(name); }
      catch { toast("Kuvan lisäys epäonnistui", true); }
    }
    inp.value = "";
  }));
  const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  const close = () => {
    if (!finished) added.forEach(delPhoto);
    m.classList.remove("open"); m.innerHTML = ""; m.onclick = null;
    document.removeEventListener("keydown", onKey, true);
  };
  document.addEventListener("keydown", onKey, true);
  m.onclick = e => {
    if (e.target === m || e.target.closest("[data-mclose]")) return close();
    const pd = e.target.closest("[data-pdel]");
    if (pd) { const n = pd.dataset.pdel; photoState[n] = photoState[n].filter(x => x !== pd.dataset.id); drawPhotos(n); return; }
    if (e.target.closest("[data-mdel]")) {
      if (!confirm("Poistetaanko varmasti?")) return;
      onDelete();
      fields.filter(f => f.type === "photos").forEach(f => { delPhotos(values[f.name]); delPhotos([...photoState[f.name]].filter(id => added.has(id))); });
      finished = true; close();
    }
  };
  form.onsubmit = e => {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      if (f.type === "heading" || f.type === "note") continue;
      if (f.type === "photos") { out[f.name] = photoState[f.name]; continue; }
      if (f.type === "cards") { out[f.name] = form.querySelector(`input[name="${f.name}"]:checked`)?.value ?? null; continue; }
      const el = form.elements[f.name];
      if (f.type === "checkbox") out[f.name] = el.checked;
      else if (f.type === "number") out[f.name] = el.value.trim() === "" ? null : num(el.value);
      else out[f.name] = el.value.trim();
    }
    if (onSubmit(out) === false) return;
    fields.filter(f => f.type === "photos").forEach(f => (values[f.name] || []).forEach(id => { if (!photoState[f.name].includes(id)) delPhoto(id); }));
    finished = true; close();
  };
  m.classList.add("open");
  setTimeout(() => form.querySelector("input:not([type=hidden]):not([type=radio]),textarea")?.focus(), 30);
}

export function openSheet(title, html, { wide = false, onClose } = {}) {
  const m = $("#modal");
  m.innerHTML = `<div class="sheet ${wide ? "wide" : ""}" role="dialog" aria-modal="true"><div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-mclose aria-label="Sulje">✕</button></div><div class="sheet-body">${html}</div></div>`;
  m.classList.add("open");
  hydratePhotos(m);
  const close = () => { m.classList.remove("open"); m.innerHTML = ""; m.onclick = null; document.removeEventListener("keydown", onKey, true); onClose?.(); };
  const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  document.addEventListener("keydown", onKey, true);
  m.onclick = e => { if (e.target === m || e.target.closest("[data-mclose]")) close(); };
  return { el: m.querySelector(".sheet-body"), close };
}
const PALETTE = ["#2d5f8a", "#b8622f", "#2f7d5b", "#9b4f96", "#b0892a", "#c0473f", "#2b8a8a", "#6b6b2f"];
export function colorFor(name) { let h = 0; for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
export const initials = name => String(name || "?").slice(0, 2);
export const empty = t => `<div class="empty">${t}</div>`;
