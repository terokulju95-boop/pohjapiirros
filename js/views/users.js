// =============================================================
//  Käyttäjät: nimen valinta, PIN-koodi ja pääkäyttäjän käyttäjähallinta
//  Laite kirjautuu kerran yhteisellä Firebase-tunnuksella, jonka jälkeen
//  jokainen valitsee oman nimensä ja syöttää oman PIN-koodinsa.
// =============================================================
import { S, $, esc, setDoc, USERS_DOC, USER_KEY, ADMIN_NAME, APP_NAME, isAdmin, colorFor, initials, nowIso, fail, toast, openForm, openSheet, auth, signOut } from "../core.js";

const LOGO = `<img class="auth-logo" src="icons/icon-192.png" alt="">`;
const hooks = { onLogin: () => { }, onLogout: () => { }, render: () => { } };
export const setUserHooks = h => Object.assign(hooks, h);
const validPin = p => /^\d{4}$/.test(String(p || ""));
export const avatar = (name, cls = "") => `<span class="avatar ${cls}" style="background:${colorFor(name)}">${esc(initials(name))}</span>`;

function showAuth(html) {
  ["boot", "app", "editor"].forEach(x => { const el = document.getElementById(x); if (el) el.hidden = true; });
  const a = $("#auth"); a.hidden = false; a.innerHTML = html;
}

// 1) Nimen valinta
export function showPicker() {
  S.authView = "picker";
  showAuth(`<div class="auth-card">${LOGO}<h1>Kuka olet?</h1>
    <div class="picker">${S.users.map(u => `<button class="pick-btn ${u === ADMIN_NAME ? "admin" : ""}" data-name="${esc(u)}">${avatar(u)}<span>${u === ADMIN_NAME ? "👑 " : ""}${esc(u)}</span></button>`).join("")}</div>
    ${S.users.length === 1 ? `<p class="form-note">Muita käyttäjiä voi lisätä sovelluksesta kirjautumisen jälkeen (oma nimi oikeassa yläkulmassa → Käyttäjät).</p>` : ""}
    <button class="link-btn muted" id="dev-logout">Kirjaa laite ulos</button></div>`);
  $("#auth").querySelectorAll(".pick-btn").forEach(b => b.onclick = () => showPinPad(b.dataset.name));
  $("#dev-logout").onclick = () => { if (confirm("Kirjataanko tämä laite ulos? Kirjautuminen vaatii sen jälkeen yhteisen salasanan.")) signOut(auth); };
}

// 2) PIN-koodi
export function showPinPad(name) {
  let buf = "";
  S.authView = "pin";
  showAuth(`<div class="auth-card">
    <button class="link-btn back-btn" id="pin-back">‹ Takaisin</button>
    ${avatar(name, "big-avatar")}
    <h1>${name === ADMIN_NAME ? "👑 " : ""}${esc(name)}</h1><p class="muted">${!S.pins[name] && name === ADMIN_NAME ? "Valitse itsellesi 4-numeroinen PIN-koodi" : "Syötä PIN-koodi"}</p>
    <div class="pin-dots" id="pin-dots"></div>
    <div class="auth-err" id="pin-err" role="alert"></div>
    <div class="pinpad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map(k => `<button class="pin-key ${k.length > 1 ? "fn" : ""}" data-k="${k}" aria-label="${k === "back" ? "Poista" : k === "clear" ? "Tyhjennä" : k}">${k === "back" ? "⌫" : k === "clear" ? "C" : k}</button>`).join("")}</div>
    ${name !== ADMIN_NAME ? `<p class="form-note pin-help">Unohtuiko PIN? Pyydä pääkäyttäjää (${esc(ADMIN_NAME)}) asettamaan uusi.</p>` : ""}
  </div>`);
  const dots = () => $("#pin-dots").innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < buf.length ? "on" : ""}"></i>`).join("");
  const err = t => $("#pin-err").textContent = t;
  dots();
  $("#pin-back").onclick = () => { document.onkeydown = null; showPicker(); };
  const press = k => {
    if (k === "clear") { buf = ""; err(""); return dots(); }
    if (k === "back") { buf = buf.slice(0, -1); err(""); return dots(); }
    if (buf.length >= 4) return;
    buf += k; dots();
    if (buf.length < 4) return;
    const stored = S.pins[name];
    if (!stored) {
      // Pääkäyttäjän ensimmäinen kirjautuminen: syötetty koodi tallennetaan PIN-koodiksi
      if (name === ADMIN_NAME) { saveUsers(S.users, { ...S.pins, [name]: buf }); toast("PIN-koodi tallennettu"); return loginAs(name); }
      err(`PIN-koodia ei ole asetettu. Pyydä ${ADMIN_NAME}a asettamaan se.`); buf = ""; return setTimeout(dots, 200);
    }
    if (buf === stored) return loginAs(name);
    err("Väärä PIN-koodi."); buf = ""; setTimeout(dots, 200);
    const d = $("#pin-dots"); d.classList.remove("shake"); void d.offsetWidth; d.classList.add("shake");
  };
  $("#auth").querySelectorAll(".pin-key").forEach(b => b.onclick = () => press(b.dataset.k));
  document.onkeydown = e => {
    if (!$("#pin-dots")) { document.onkeydown = null; return; }
    if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") press("back");
  };
}

export function loginAs(name) {
  document.onkeydown = null; S.authView = null;
  S.me = { name };
  try { localStorage.setItem(USER_KEY, name); } catch { }
  hooks.onLogin();
}
export function switchUser() {
  try { localStorage.removeItem(USER_KEY); } catch { }
  S.me = null; hooks.onLogout();
  showPicker();
}
export function saveUsers(users, pins) {
  S.users = users; S.pins = pins;
  setDoc(USERS_DOC(), { users, pins, updatedAt: nowIso(), updatedByName: S.me?.name || null }).catch(fail);
  hooks.render();
}

// Kun käyttäjälista on ladattu tai muuttunut
export function afterUsersLoaded() {
  if (S.me) {
    if (!S.users.includes(S.me.name)) { toast("Käyttäjäsi on poistettu", true); switchUser(); return; }
    hooks.render(); return;
  }
  if (S.authView === "pin") return;
  let saved = null; try { saved = localStorage.getItem(USER_KEY); } catch { }
  if (saved && S.users.includes(saved)) loginAs(saved); else showPicker();
}

// ---------- Käyttäjävalikko (oma nimi yläkulmassa) ----------
export function openUserMenu() {
  const pending = isAdmin() ? S.users.filter(u => !S.pins[u]).length : 0;
  const { el, close } = openSheet(S.me.name, `<div class="menu">
      ${isAdmin() ? `<a class="menu-item" href="#kayttajat" data-close><span class="menu-ic">👥</span><span class="menu-t">Käyttäjät ja PIN-koodit${pending ? `<small class="warn">${pending} ilman PIN-koodia</small>` : `<small>Lisää, nimeä ja poista käyttäjiä</small>`}</span><span class="chev">›</span></a>` : ""}
      <button class="menu-item" data-m="pin"><span class="menu-ic">🔑</span><span class="menu-t">Vaihda oma PIN-koodi</span></button>
      <button class="menu-item" data-m="switch"><span class="menu-ic">🔄</span><span class="menu-t">Vaihda käyttäjää</span></button>
      <button class="menu-item" data-m="logout"><span class="menu-ic">🚪</span><span class="menu-t">Kirjaa laite ulos<small>Vaatii yhteisen salasanan uudelleen</small></span></button>
    </div><p class="form-note center">${esc(APP_NAME)}</p>`);
  el.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) { close(); return; }
    const m = e.target.closest("[data-m]")?.dataset.m; if (!m) return;
    close();
    if (m === "pin") pinForm(S.me.name, true);
    if (m === "switch") switchUser();
    if (m === "logout" && confirm("Kirjataanko tämä laite ulos?")) signOut(auth);
  });
}

function pinForm(name, own = false) {
  openForm({
    title: own ? "Vaihda oma PIN-koodi" : `PIN-koodi: ${name}`, submitLabel: "Tallenna",
    fields: [{ name: "pin", label: "Uusi PIN-koodi (4 numeroa)", type: "password", required: true }, { name: "pin2", label: "Uudelleen", type: "password", required: true }],
    onSubmit: v => {
      if (!validPin(v.pin)) { alert("PIN-koodissa pitää olla 4 numeroa."); return false; }
      if (v.pin !== v.pin2) { alert("PIN-koodit eivät täsmää."); return false; }
      saveUsers(S.users, { ...S.pins, [name]: v.pin }); toast("PIN-koodi tallennettu");
    }
  });
  setTimeout(() => document.querySelectorAll('#modal input[type=password]').forEach(i => { i.inputMode = "numeric"; i.maxLength = 4; i.autocomplete = "off"; }), 0);
}

// ---------- Pääkäyttäjän käyttäjähallinta ----------
export function vUsers() {
  if (!isAdmin()) return `<a class="back" href="#">‹ Projektit</a><div class="empty">Vain pääkäyttäjä voi hallita käyttäjiä.</div>`;
  return `<a class="back" href="#">‹ Projektit</a>
    <div class="page-head"><div><h1>Käyttäjät</h1><p class="muted">Jokainen kirjautuu omalla nimellään ja PIN-koodillaan. Muutos näkyy kaikilla laitteilla.</p></div>
      <button class="btn primary" data-uact="add">+ Lisää käyttäjä</button></div>
    <div class="list">${S.users.map(u => `<div class="item"><div class="item-row user-row">${avatar(u)}
      <div class="item-main"><div class="item-title">${u === ADMIN_NAME ? "👑 " : ""}${esc(u)}</div>
        <div>${S.pins[u] ? `<span class="chip ok-chip">PIN asetettu</span>` : `<span class="chip warn">Ei PIN-koodia – ei voi kirjautua</span>`}</div></div>
      <div class="user-btns"><button class="btn small" data-uact="pin" data-name="${esc(u)}">${S.pins[u] ? "Vaihda PIN" : "Aseta PIN"}</button>
        ${u !== ADMIN_NAME ? `<button class="btn small ghost" data-uact="rename" data-name="${esc(u)}">Nimeä</button><button class="btn small danger ghost" data-uact="del" data-name="${esc(u)}">Poista</button>` : ""}</div>
    </div></div>`).join("")}</div>
    <p class="form-note">Pääkäyttäjän nimi (${esc(ADMIN_NAME)}) määritetään tiedostossa firebase-config.js. Piirustukset ja muistiinpanot säilyvät, vaikka käyttäjä poistetaan.</p>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-uact]"); if (!b || !isAdmin()) return;
  const name = b.dataset.name, a = b.dataset.uact;
  if (a === "add") openForm({
    title: "Uusi käyttäjä", submitLabel: "Lisää",
    fields: [{ name: "name", label: "Nimi", required: true }, { name: "pin", label: "PIN-koodi (4 numeroa)", type: "password", required: true }],
    onSubmit: v => {
      const n = v.name.trim();
      if (S.users.some(u => u.toLowerCase() === n.toLowerCase())) { alert("Tämän niminen käyttäjä on jo olemassa."); return false; }
      if (!validPin(v.pin)) { alert("PIN-koodissa pitää olla 4 numeroa."); return false; }
      saveUsers([...S.users, n], { ...S.pins, [n]: v.pin }); toast(`${n} lisätty`);
    }
  });
  if (a === "pin") pinForm(name);
  if (a === "rename") openForm({
    title: "Nimeä käyttäjä", values: { name }, fields: [{ name: "name", label: "Nimi", required: true }],
    onSubmit: v => {
      const n = v.name.trim(); if (n === name) return;
      if (S.users.includes(n)) { alert("Nimi on jo käytössä."); return false; }
      const pins = { ...S.pins, [n]: S.pins[name] }; delete pins[name];
      saveUsers(S.users.map(u => u === name ? n : u), pins);
    }
  });
  if (a === "del" && confirm(`Poistetaanko käyttäjä ${name}?`)) {
    const pins = { ...S.pins }; delete pins[name];
    saveUsers(S.users.filter(u => u !== name), pins); toast(`${name} poistettu`);
  }
  if (a === "add" || a === "pin" || a === "rename") setTimeout(() => document.querySelectorAll('#modal input[type=password]').forEach(i => { i.inputMode = "numeric"; i.maxLength = 4; i.autocomplete = "off"; }), 0);
});
