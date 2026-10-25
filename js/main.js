// =============================================================
//  Pohjapiirros – käynnistys, kirjautuminen, reititys ja tietojen kuuntelu
// =============================================================
import { S, C, $, esc, db, auth, toast, fail, list, hydratePhotos, openLightbox, isPhone, nowIso, APP_NAME, LOGIN_EMAIL, ADMIN_NAME, DEFAULT_USERS, USERS_DOC, CONFIG_MISSING, isAdmin, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, collection, doc, setDoc, onSnapshot } from "./core.js";
import { showPicker, afterUsersLoaded, saveUsers, setUserHooks, openUserMenu, vUsers, avatar } from "./views/users.js";
import { vHome, vProject, actions, plansOf } from "./views/projects.js";
import { mountEditor } from "./plan/editor.js";

let editor = null, editorPlanId = null;

// ---------- Reititys ----------
function route() {
  const h = location.hash.slice(1);
  if (h.startsWith("e/")) return { name: "editor", id: h.slice(2) };
  if (h.startsWith("p/")) return { name: "project", id: h.slice(2) };
  if (h === "kayttajat") return { name: "users" };
  return { name: "home" };
}
window.addEventListener("hashchange", () => { S.route = route(); render(true); });

function closeEditor() {
  if (!editor) return;
  editor.destroy(); editor = null; editorPlanId = null;
  $("#editor").innerHTML = ""; $("#editor").hidden = true; document.body.classList.remove("editing");
}

let rq = false;
export function scheduleRender() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }
function render(nav = false) {
  if (!S.user || !S.me) return;
  const r = S.route;
  if (r.name === "editor") {
    const plan = list("plans").find(p => p.id === r.id);
    if (!plan) {
      if (S.loaded.plans) { closeEditor(); location.replace("#"); }
      return;
    }
    if (editor && editorPlanId === r.id) { editor.applyRemote(plan); return; }
    closeEditor();
    const project = list("projects").find(p => p.id === plan.projectId) || {};
    showOnly("editor");
    document.body.classList.add("editing");
    document.title = `${plan.name} · ${APP_NAME}`;
    editorPlanId = plan.id;
    editor = mountEditor($("#editor"), {
      plan: structuredClone(plan), project, readOnly: isPhone(), plans: plansOf(plan.projectId),
      onBack: () => { location.hash = "#p/" + plan.projectId; },
      onSwitch: id => { location.hash = "#e/" + id; },
      onSave: (data, settings) => savePlan(plan.id, plan.projectId, { data, settings }),
      onRename: name => savePlan(plan.id, plan.projectId, { name })
    });
    window.__editor = editor; // testejä varten (ei vaikuta käyttöön)
    return;
  }
  closeEditor();
  showOnly("app");
  renderUserChip();
  const view = $("#view");
  if (r.name === "users") { document.title = "Käyttäjät · " + APP_NAME; view.innerHTML = vUsers(); }
  else if (r.name === "project") {
    const p = list("projects").find(x => x.id === r.id);
    document.title = (p ? p.name + " · " : "") + APP_NAME;
    view.innerHTML = vProject(r.id);
  } else { document.title = APP_NAME; view.innerHTML = vHome(); }
  if (nav) window.scrollTo(0, 0);
  hydratePhotos(view);
}
function savePlan(id, projectId, data) {
  const clean = JSON.parse(JSON.stringify(data));
  const by = S.me?.name || null;
  setDoc(doc(db, C.plans, id), { ...clean, updatedAt: nowIso(), updatedByName: by }, { merge: true }).catch(fail);
  setDoc(doc(db, C.projects, projectId), { updatedAt: nowIso(), updatedByName: by }, { merge: true }).catch(fail);
}
function renderUserChip() {
  const el = $("#userchip"); if (!el || !S.me) return;
  const pending = isAdmin() ? S.users.filter(u => !S.pins[u]).length : 0;
  el.innerHTML = `${avatar(S.me.name)}<span>${esc(S.me.name)}</span>${pending ? `<b class="badge">${pending}</b>` : ""}`;
}

// Napautukset näkymässä
document.addEventListener("click", e => {
  const img = e.target.closest("img.thumb");
  if (img && img.src && !e.target.closest(".sheet")) { e.stopPropagation(); e.preventDefault(); openLightbox(img.src); return; }
  if (e.target.closest("#userchip")) { openUserMenu(); return; }
  const a = e.target.closest("[data-act]");
  if (!a || !actions[a.dataset.act]) return;
  if (!a.closest("#app")) return;
  e.preventDefault();
  actions[a.dataset.act](a.dataset.id);
});

// ---------- Näkymät ----------
function showOnly(id) { ["boot", "auth", "app", "editor"].forEach(x => { const el = document.getElementById(x); if (el) el.hidden = x !== id; }); }
function authError(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Väärä salasana.";
  if (c.includes("network-request-failed")) return "Ei verkkoyhteyttä.";
  if (c.includes("too-many-requests")) return "Liian monta yritystä. Odota hetki.";
  return "Virhe: " + (e?.message || c);
}
const LOGO = `<img class="auth-logo" src="icons/icon-192.png" alt="">`;
function showLogin() {
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${LOGO}<h1>${esc(APP_NAME)}</h1><p class="muted">Pohjapiirustukset mittoineen</p>
    <form id="authform" class="form">
      <input type="email" name="email" value="${esc(LOGIN_EMAIL)}" autocomplete="username" hidden>
      <label class="fld"><span>Salasana</span><input name="password" type="password" required autocomplete="current-password"></label>
      <div class="auth-err" id="autherr" role="alert"></div>
      <button class="btn primary block">Kirjaudu</button>
    </form>
    <p class="form-note">Tämä tehdään vain kerran laitteella. Sen jälkeen valitset oman nimesi ja PIN-koodisi.</p>
    <button class="link-btn muted" id="auth-reset">Unohtuiko salasana?</button></div>`;
  const form = $("#authform"), err = $("#autherr");
  $("#auth-reset").onclick = async () => {
    try { await sendPasswordResetEmail(auth, LOGIN_EMAIL); err.className = "auth-err ok"; err.textContent = "Vaihtolinkki lähetetty osoitteeseen " + LOGIN_EMAIL; }
    catch (e) { err.textContent = authError(e); }
  };
  form.onsubmit = async e => {
    e.preventDefault(); err.className = "auth-err"; err.textContent = "";
    const btn = form.querySelector("button"); btn.disabled = true; btn.textContent = "Kirjaudutaan…";
    try { await signInWithEmailAndPassword(auth, LOGIN_EMAIL, form.elements.password.value); }
    catch (ex) { err.textContent = authError(ex); btn.disabled = false; btn.textContent = "Kirjaudu"; }
  };
}

// ---------- Tiedot ----------
function startData() {
  stopData();
  for (const [key, col] of Object.entries({ projects: C.projects, plans: C.plans, notes: C.notes })) {
    S.unsubs.push(onSnapshot(collection(db, col), { includeMetadataChanges: true }, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const changed = JSON.stringify(docs) !== JSON.stringify(S.d[key]);
      S.d[key] = docs; S.loaded[key] = true;
      S.pending[key] = snap.docs.filter(d => d.metadata?.hasPendingWrites).length;
      updateNet();
      if (changed) scheduleRender();
    }, err => {
      console.error(key, err);
      if (err.code === "permission-denied") { showOnly("auth"); $("#auth").innerHTML = `<div class="auth-card">${LOGO}<p class="bad">Ei käyttöoikeutta tietokantaan. Tarkista Firestoren säännöt (UID).</p></div>`; }
    }));
  }
}
function stopData() { S.unsubs.forEach(u => u()); S.unsubs = []; }
function updateNet() {
  const el = $("#netstatus"); if (!el) return;
  const pend = Object.values(S.pending).reduce((a, b) => a + b, 0);
  if (!navigator.onLine) { el.hidden = false; el.className = "net"; el.textContent = "Ei yhteyttä – muutokset tallentuvat laitteelle ja lähetetään, kun yhteys palaa"; }
  else if (pend) { el.hidden = false; el.className = "net sending"; el.textContent = "Lähetetään muutoksia…"; }
  else el.hidden = true;
}
window.addEventListener("online", updateNet); window.addEventListener("offline", updateNet);

// Käyttäjän valinnan jälkeen
setUserHooks({
  onLogin: () => { S.route = route(); if (!S.unsubs.length) startData(); showOnly(S.route.name === "editor" ? "boot" : "app"); render(); },
  onLogout: () => { closeEditor(); location.hash = ""; },
  render: () => scheduleRender()
});

let usersUnsub = null;
if (CONFIG_MISSING) {
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${LOGO}<h1>${esc(APP_NAME)}</h1><p class="bad">Firebase-asetukset puuttuvat.</p><p class="form-note">Täytä tiedosto <b>firebase-config.js</b> oman Firebase-projektisi tiedoilla (ohje README.md-tiedostossa).</p></div>`;
} else onAuthStateChanged(auth, user => {
  S.user = user;
  if (usersUnsub) { usersUnsub(); usersUnsub = null; }
  closeEditor(); stopData(); S.me = null; S.d = { projects: [], plans: [], notes: [] }; S.loaded = {};
  if (!user) { showLogin(); return; }
  showOnly("boot");
  usersUnsub = onSnapshot(USERS_DOC(), snap => {
    if (!snap.exists()) {
      if (snap.metadata?.fromCache) { if (!navigator.onLine) { showOnly("auth"); $("#auth").innerHTML = `<div class="auth-card">${LOGO}<p class="bad">Ensimmäinen käynnistys vaatii verkkoyhteyden.</p></div>`; } return; }
      saveUsers([...DEFAULT_USERS], {});
    } else {
      const d = snap.data();
      S.users = Array.isArray(d.users) && d.users.length ? d.users : [...DEFAULT_USERS];
      if (!S.users.includes(ADMIN_NAME)) S.users.unshift(ADMIN_NAME);
      S.pins = d.pins || {};
    }
    afterUsersLoaded();
  }, err => {
    console.error(err);
    showOnly("auth");
    $("#auth").innerHTML = `<div class="auth-card">${LOGO}<p class="bad">${err.code === "permission-denied" ? "Ei käyttöoikeutta tietokantaan. Tarkista Firestoren säännöt (UID)." : "Yhteysvirhe: " + esc(err.message)}</p></div>`;
  });
});

// ---------- PWA ----------
if ("serviceWorker" in navigator && location.protocol === "https:") {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then(reg => {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => { }); });
  }).catch(e => console.warn("SW", e));
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || document.getElementById("update-banner")) return;
    const b = document.createElement("div");
    b.id = "update-banner"; b.className = "update-banner";
    b.innerHTML = `<span>✨ Uusi versio saatavilla</span><button class="btn small primary" type="button">Päivitä</button>`;
    b.querySelector("button").onclick = () => { editor?.flush(); location.reload(); };
    document.body.appendChild(b);
  });
}
