// =============================================================
//  Projektit, piirustukset ja muistiinpanot
// =============================================================
import { S, C, $, esc, nl2br, list, byUpdated, fmtD, fmtDT, save, remove, newId, openForm, empty, thumbs, delPhotos, isPhone, toast, APP_NAME } from "../core.js";
import { thumbSvg } from "../plan/render.js";
import { TEMPLATES, templateById } from "../plan/templates.js";

export const plansOf = pid => list("plans").filter(p => p.projectId === pid).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || "").localeCompare(b.createdAt || ""));
export const notesOf = pid => list("notes").filter(n => n.projectId === pid).sort(byUpdated);
const ICON_PLUS = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`;

// ---------- Etusivu: projektit ----------
export function vHome() {
  const ps = [...list("projects")].sort(byUpdated);
  return `<div class="page-head"><div><h1>Projektit</h1><p class="muted">${ps.length ? `${ps.length} projektia` : "Aloita luomalla ensimmäinen projekti"}</p></div>
      <button class="btn primary" data-act="newProject">${ICON_PLUS}Uusi projekti</button></div>
    ${ps.length ? `<div class="pgrid">${ps.map(p => {
      const pl = plansOf(p.id);
      return `<a class="pcard" href="#p/${esc(p.id)}"><div class="pthumb">${pl[0] ? thumbSvg(pl[0]) : thumbSvg(null)}</div>
        <div class="pcard-b"><b>${esc(p.name)}</b>${p.desc ? `<span class="muted small clamp">${esc(p.desc)}</span>` : ""}
        <span class="chips"><span class="chip">${pl.length} piirustus${pl.length === 1 ? "" : "ta"}</span>${notesOf(p.id).length ? `<span class="chip">${notesOf(p.id).length} muistiinpanoa</span>` : ""}<span class="chip ghost">${fmtD(p.updatedAt)}</span></span></div></a>`;
    }).join("")}</div>` : empty(`<p><b>Ei vielä projekteja.</b></p><p>Projekti on esimerkiksi “Kontin muutos”, “Mökin laajennus” tai “Sauna”. Yhteen projektiin voi tehdä useita piirustuksia ja vaihtoehtoja.</p><button class="btn primary" data-act="newProject">${ICON_PLUS}Uusi projekti</button>`)}
    <div class="foot muted small">${esc(APP_NAME)}</div>`;
}

// ---------- Projektisivu ----------
export function vProject(id) {
  const p = list("projects").find(x => x.id === id);
  if (!p) return S.loaded.projects ? `<a class="back" href="#">‹ Projektit</a>${empty("Projektia ei löytynyt.")}` : `<div class="spinner"></div>`;
  const pl = plansOf(id), notes = notesOf(id);
  return `<a class="back" href="#">‹ Projektit</a>
    <div class="page-head"><div><h1>${esc(p.name)}</h1>${p.desc ? `<p class="muted">${nl2br(p.desc)}</p>` : ""}</div>
      <button class="btn ghost small" data-act="editProject" data-id="${esc(id)}">Muokkaa</button></div>
    <div class="sec-h"><h2>Piirustukset</h2><button class="btn small" data-act="newPlan" data-id="${esc(id)}">${ICON_PLUS}Uusi piirustus</button></div>
    ${pl.length ? `<div class="pgrid">${pl.map(x => `<div class="pcard plan"><a class="pthumb" href="#e/${esc(x.id)}" title="Avaa">${thumbSvg(x)}</a>
        <div class="pcard-b"><a href="#e/${esc(x.id)}"><b>${esc(x.name)}</b></a><span class="muted small">Muokattu ${fmtDT(x.updatedAt)}${x.updatedByName ? ` · ${esc(x.updatedByName)}` : ""}</span>
        <div class="row-btns tight"><a class="btn small primary" href="#e/${esc(x.id)}">${isPhone() ? "Katso" : "Avaa"}</a><button class="btn small ghost" data-act="dupPlan" data-id="${esc(x.id)}" title="Tee kopio vaihtoehdoksi">Monista</button><button class="btn small ghost" data-act="editPlan" data-id="${esc(x.id)}">Nimeä</button></div></div></div>`).join("")}</div>`
      : empty("Ei piirustuksia. Lisää ensimmäinen.")}
    <div class="sec-h"><h2>Muistiinpanot ja kuvat</h2><button class="btn small" data-act="newNote" data-id="${esc(id)}">${ICON_PLUS}Lisää</button></div>
    ${notes.length ? `<div class="list">${notes.map(n => `<div class="item note" data-act="editNote" data-id="${esc(n.id)}"><div class="item-row"><div class="item-main">
        <div class="item-title">${esc(n.title || "Muistiinpano")}</div>${n.text ? `<div class="notes">${nl2br(n.text)}</div>` : ""}${thumbs(n.photos)}<div class="by">${fmtDT(n.updatedAt)}${n.createdByName ? ` · ${esc(n.createdByName)}` : ""}</div></div></div></div>`).join("")}</div>`
      : empty("Mittoja työmaalta, kuvia, hankintalistoja… Muistiinpanoja voi lisätä myös puhelimella.")}
    <p class="muted small center">Projekti luotu ${fmtD(p.createdAt)}</p>`;
}

// ---------- Toiminnot ----------
function createPlan(projectId, name, tpl, order) {
  const t = templateById(tpl)[3]();
  const id = save(C.plans, { projectId, name, template: tpl, order, data: t.data, settings: t.settings || {} });
  save(C.projects, {}, projectId);
  return id;
}
const tplOptions = () => TEMPLATES.map(([k, n, d]) => [k, n, d]);

export const actions = {
  newProject() {
    openForm({
      title: "Uusi projekti", submitLabel: "Luo projekti",
      fields: [{ name: "name", label: "Nimi", required: true, placeholder: "esim. Kontin muutos" }, { name: "desc", label: "Kuvaus", type: "textarea", rows: 2 },
        { name: "tpl", label: "Ensimmäisen piirustuksen pohja", type: "cards", options: tplOptions(), def: "tyhja" }],
      onSubmit: v => {
        const pid = save(C.projects, { name: v.name, desc: v.desc });
        const plid = createPlan(pid, templateById(v.tpl)[0] === "tyhja" ? "Pohjapiirustus" : templateById(v.tpl)[1], v.tpl || "tyhja", 0);
        location.hash = isPhone() ? "#p/" + pid : "#e/" + plid;
      }
    });
  },
  editProject(id) {
    const p = list("projects").find(x => x.id === id); if (!p) return;
    openForm({
      title: "Muokkaa projektia", values: p, deleteLabel: "Poista projekti",
      fields: [{ name: "name", label: "Nimi", required: true }, { name: "desc", label: "Kuvaus", type: "textarea", rows: 3 }],
      onSubmit: v => { save(C.projects, v, id); },
      onDelete: () => {
        if (!confirm(`Poistetaanko myös kaikki projektin piirustukset (${plansOf(id).length}) ja muistiinpanot (${notesOf(id).length})? Tätä ei voi perua.`)) return;
        plansOf(id).forEach(x => remove(C.plans, x.id));
        notesOf(id).forEach(n => { delPhotos(n.photos); remove(C.notes, n.id); });
        remove(C.projects, id); location.hash = ""; toast("Projekti poistettu");
      }
    });
  },
  newPlan(pid) {
    const n = plansOf(pid).length;
    openForm({
      title: "Uusi piirustus", submitLabel: "Luo",
      fields: [{ name: "name", label: "Nimi", required: true, def: n ? `Piirustus ${n + 1}` : "Pohjapiirustus" }, { name: "tpl", label: "Pohja", type: "cards", options: tplOptions(), def: "tyhja" }],
      onSubmit: v => { const id = createPlan(pid, v.name, v.tpl || "tyhja", n); if (!isPhone()) location.hash = "#e/" + id; }
    });
  },
  dupPlan(id) {
    const p = list("plans").find(x => x.id === id); if (!p) return;
    const name = prompt("Kopion nimi", p.name + " – vaihtoehto B"); if (!name) return;
    save(C.plans, { projectId: p.projectId, name, template: p.template || null, order: plansOf(p.projectId).length, data: p.data, settings: p.settings || {} });
    save(C.projects, {}, p.projectId);
    toast("Kopio tehty");
  },
  editPlan(id) {
    const p = list("plans").find(x => x.id === id); if (!p) return;
    openForm({
      title: "Piirustus", values: p, deleteLabel: "Poista piirustus",
      fields: [{ name: "name", label: "Nimi", required: true }],
      onSubmit: v => save(C.plans, v, id),
      onDelete: () => { remove(C.plans, id); toast("Piirustus poistettu"); }
    });
  },
  newNote(pid) { noteForm({ projectId: pid }); },
  editNote(id) { const n = list("notes").find(x => x.id === id); if (n) noteForm(n, id); },
};
function noteForm(values, id) {
  openForm({
    title: id ? "Muistiinpano" : "Uusi muistiinpano", values,
    fields: [{ name: "title", label: "Otsikko", placeholder: "esim. Mitat kontin oviaukosta" }, { name: "text", label: "Teksti", type: "textarea", rows: 5 }, { name: "photos", label: "Kuvat", type: "photos" }],
    onSubmit: v => {
      if (!v.title && !v.text && !v.photos.length) return false;
      save(C.notes, { ...v, projectId: values.projectId }, id);
      save(C.projects, {}, values.projectId);
    },
    onDelete: id ? () => remove(C.notes, id) : null
  });
}
