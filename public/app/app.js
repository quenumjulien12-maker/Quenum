import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc,
  query, where, orderBy, limit, serverTimestamp, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, configOk } from "../js/firebase-config.js";

/* ---------- Constantes ---------- */
const SPACES = {
  direction:    { label: "Direction (PDG)", group: "Direction", pdgOnly: true, desc: "Vue globale, comptes, délégations et journal d'activité." },
  secretariat:  { label: "Secrétariat", group: "Administration", desc: "Messages du site, demandes reçues, rendez-vous, courrier et archivage.",
                  todo: ["Rendez-vous et agenda", "Courrier entrant et sortant", "Archivage des documents"] },
  comptabilite: { label: "Comptabilité et trésorerie", group: "Administration", desc: "Devis, factures, dépenses, paiements, caisse et banque, multi-devises.",
                  todo: ["Devis et factures", "Dépenses et paiements", "Caisse, banque et trésorerie", "Devises : FCFA, USD, EUR, CNY"] },
  commercial:   { label: "Commercial et clients", group: "Administration", desc: "Fichier clients, suivi des demandes et relances.",
                  todo: ["Fichier clients", "Suivi des demandes et relances"] },
  btp:          { label: "Pôle BTP", group: "Pôles", desc: "Chantiers, planning, équipes, matériaux, sous-traitants et avancement.",
                  todo: ["Chantiers et planning", "Équipes et sous-traitants", "Matériaux", "Avancement avec photos"] },
  import_export:{ label: "Pôle Import-Export", group: "Pôles", desc: "Commandes, fournisseurs, expéditions, douane et stock.",
                  todo: ["Commandes et fournisseurs", "Expéditions et douane", "Stock"] },
  juridique:    { label: "Pôle Conseil juridique", group: "Pôles", desc: "Dossiers clients, échéances, documents et honoraires.",
                  todo: ["Dossiers clients", "Échéances", "Documents", "Honoraires"] },
  rh:           { label: "Ressources humaines", group: "Administration", desc: "Personnel, contrats et congés.",
                  todo: ["Personnel et contrats", "Congés"] }
};
const DELEGABLE = Object.keys(SPACES).filter(k => !SPACES[k].pdgOnly);
const POLE_LABEL = { general: "Question générale", btp: "BTP", import_export: "Import-Export", juridique: "Conseil juridique" };
const STATUT_MSG = { nouveau: "Nouveau", lu: "Lu", traite: "Traité" };

/* ---------- Utilitaires ---------- */
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (ts) => { try { return ts && ts.toDate ? ts.toDate().toLocaleString("fr-FR") : "—"; } catch (e) { return "—"; } };
const firebaseError = (e) => {
  const c = e && e.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Email ou mot de passe incorrect.";
  if (c.includes("too-many-requests")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (c.includes("email-already-in-use")) return "Cet email est déjà utilisé par un autre compte.";
  if (c.includes("weak-password")) return "Mot de passe trop faible.";
  if (c.includes("invalid-email")) return "Adresse email invalide.";
  if (c.includes("permission-denied")) return "Action non autorisée.";
  if (c.includes("network")) return "Problème de connexion réseau.";
  return "Une erreur est survenue. Réessayez.";
};
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}
function openModal(html) {
  $("#modalBox").innerHTML = html; $("#modal").hidden = false;
  return $("#modalBox");
}
function closeModal() { $("#modal").hidden = true; $("#modalBox").innerHTML = ""; }
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const a = new Uint32Array(14); crypto.getRandomValues(a);
  return Array.from(a, n => chars[n % chars.length]).join("") + "!7";
}

/* ---------- Firebase ---------- */
if (!configOk) {
  $("#login").querySelector("form").insertAdjacentHTML("afterbegin",
    '<div class="alert warn">Firebase n\'est pas encore configuré. Complétez public/js/firebase-config.js.</div>');
  $("#loginBtn").disabled = true;
}
const app = configOk ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

let me = null;          // profil connecté (avec uid)
let usersCache = [];    // liste des comptes (PDG uniquement)
let current = null;     // espace affiché

const isPdg = () => me && me.role === "pdg";
const canAccess = (space) => isPdg() || (me.espaces || []).includes(space);

async function journal(action, espace, detail) {
  try {
    await addDoc(collection(db, "journal"), {
      action, espace: espace || "", detail: detail || "", auteur: me.uid, auteurNom: me.nom, creeLe: serverTimestamp()
    });
  } catch (e) { console.warn("journal", e); }
}

/* ---------- Connexion ---------- */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#loginErr"); err.hidden = true;
  $("#loginBtn").disabled = true;
  try {
    await signInWithEmailAndPassword(auth, $("#loginEmail").value.trim(), $("#loginPass").value);
  } catch (ex) {
    err.textContent = firebaseError(ex); err.hidden = false;
  } finally { $("#loginBtn").disabled = !configOk; }
});
$("#forgotBtn").addEventListener("click", async () => {
  const err = $("#loginErr"); const email = $("#loginEmail").value.trim();
  if (!email) { err.textContent = "Saisissez d'abord votre email."; err.hidden = false; return; }
  try { await sendPasswordResetEmail(auth, email); err.className = "alert ok"; err.textContent = "Email de réinitialisation envoyé (vérifiez aussi les courriers indésirables)."; }
  catch (ex) { err.className = "alert err"; err.textContent = firebaseError(ex); }
  err.hidden = false;
});
$("#logoutBtn").addEventListener("click", () => signOut(auth));
$("#menuBtn").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

function showLogin(message) {
  $("#shell").hidden = true; $("#login").hidden = false;
  const err = $("#loginErr");
  if (message) { err.className = "alert err"; err.textContent = message; err.hidden = false; }
}

if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { me = null; showLogin(); return; }
    try {
      const snap = await getDoc(doc(db, "utilisateurs", user.uid));
      if (!snap.exists()) { await signOut(auth); showLogin("Votre profil n'est pas encore activé. Contactez le PDG."); return; }
      const p = snap.data();
      if (p.statut !== "actif") { await signOut(auth); showLogin("Ce compte est bloqué. Contactez le PDG."); return; }
      me = { uid: user.uid, ...p, espaces: p.espaces || [] };
      startApp();
    } catch (e) {
      console.error(e); await signOut(auth); showLogin("Impossible de charger votre profil.");
    }
  });
}

function startApp() {
  $("#login").hidden = true; $("#shell").hidden = false;
  $("#loginErr").hidden = true; $("#loginPass").value = "";
  $("#meName").textContent = me.nom || me.email;
  $("#meRole").textContent = isPdg() ? "PDG" : "Collaborateur";
  buildNav();
  const first = isPdg() ? "direction" : me.espaces.find(s => SPACES[s]);
  if (first) go(first); else $("#view").innerHTML = '<div class="card empty">Aucun espace ne vous est encore délégué. Contactez le PDG.</div>';
}

function buildNav() {
  const groups = {};
  Object.entries(SPACES).forEach(([id, s]) => { if (canAccess(id)) (groups[s.group] ||= []).push(id); });
  $("#nav").innerHTML = Object.entries(groups).map(([g, ids]) =>
    `<div class="group">${esc(g)}</div>` + ids.map(id => `<button data-space="${id}">${esc(SPACES[id].label)}</button>`).join("")
  ).join("");
  $("#nav").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { go(b.dataset.space); $("#sidebar").classList.remove("open"); }));
}

function go(space) {
  if (!canAccess(space)) return;
  current = space;
  $("#nav").querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.space === space));
  if (space === "direction") return renderDirection("apercu");
  if (space === "secretariat") return renderSecretariat();
  return renderGeneric(space);
}

/* ---------- Chargement des comptes (PDG) ---------- */
async function loadUsers() {
  const snap = await getDocs(collection(db, "utilisateurs"));
  usersCache = snap.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== me.uid);
  usersCache.sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
  return usersCache;
}
const userName = (uid) => (usersCache.find(u => u.uid === uid) || {}).nom || uid;

/* ---------- Délégation ---------- */
async function setEspaces(uid, espaces, detail) {
  await updateDoc(doc(db, "utilisateurs", uid), { espaces, modifieLe: serverTimestamp(), modifiePar: me.uid });
  await journal("delegation", "", detail);
}

function delegateSpaceModal(space) {
  const candidats = usersCache.filter(u => u.statut === "actif" && !(u.espaces || []).includes(space));
  const box = openModal(`
    <h3>Déléguer « ${esc(SPACES[space].label)} »</h3>
    <p class="muted">À qui souhaitez-vous confier cet espace ? La personne verra tout l'historique existant et continuera le travail.</p>
    ${candidats.length ? `<label>Collaborateur<select id="dlgUser">${candidats.map(u => `<option value="${u.uid}">${esc(u.nom)} — ${esc(u.email)}</option>`).join("")}</select></label>`
      : '<div class="alert warn">Aucun collaborateur actif disponible. Créez d\'abord un compte dans Direction → Comptes.</div>'}
    <div class="modal-actions"><button class="btn ghost dark" id="cancel">Annuler</button>${candidats.length ? '<button class="btn" id="ok">Déléguer</button>' : ""}</div>`);
  box.querySelector("#cancel").onclick = closeModal;
  const ok = box.querySelector("#ok");
  if (ok) ok.onclick = async () => {
    const uid = box.querySelector("#dlgUser").value;
    const u = usersCache.find(x => x.uid === uid);
    ok.disabled = true;
    try {
      await setEspaces(uid, [...new Set([...(u.espaces || []), space])], `${SPACES[space].label} délégué à ${u.nom}`);
      closeModal(); toast("Espace délégué."); go(current);
    } catch (e) { toast(firebaseError(e)); ok.disabled = false; }
  };
}

async function removeFromUser(uid, space) {
  const u = usersCache.find(x => x.uid === uid);
  if (!confirm(`Retirer « ${SPACES[space].label} » à ${u.nom} ? Les données restent dans l'espace.`)) return;
  try {
    await setEspaces(uid, (u.espaces || []).filter(s => s !== space), `${SPACES[space].label} retiré à ${u.nom}`);
    toast("Délégation retirée."); go(current);
  } catch (e) { toast(firebaseError(e)); }
}

/* ---------- Espace générique (phase 2) ---------- */
async function renderGeneric(space) {
  const s = SPACES[space];
  let holders = "";
  if (isPdg()) {
    await loadUsers();
    const hs = usersCache.filter(u => (u.espaces || []).includes(space));
    holders = `<h3 class="section-title">Titulaires de cet espace</h3>` + (hs.length
      ? `<div class="table-wrap"><table><tbody>${hs.map(u => `<tr><td><b>${esc(u.nom)}</b><br><span class="muted">${esc(u.email)}</span></td><td>${u.statut === "actif" ? '<span class="chip green">Actif</span>' : '<span class="chip red">Bloqué</span>'}</td><td><button class="btn small danger" data-remove="${u.uid}">Retirer</button></td></tr>`).join("")}</tbody></table></div>`
      : '<div class="card muted">Aucun collaborateur. Vous (PDG) tenez actuellement cet espace.</div>');
  }
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>${esc(s.label)}</h2><p>${esc(s.desc)}</p></div>
      ${isPdg() ? '<button class="btn" id="dlgBtn">Déléguer cet espace</button>' : ""}</div>
    <div class="card"><h3>Module en préparation (phase 2)</h3>
      <p class="muted">L'espace est en place, avec ses droits d'accès. Les fonctions suivantes seront ajoutées :</p>
      <ul class="todo">${(s.todo || []).map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
    ${holders}`;
  if (isPdg()) {
    $("#dlgBtn").onclick = () => delegateSpaceModal(space);
    $("#view").querySelectorAll("[data-remove]").forEach(b => b.onclick = () => removeFromUser(b.dataset.remove, space));
  }
}

/* ---------- Secrétariat : messages du site ---------- */
let msgFilter = "tous";
async function renderSecretariat() {
  const s = SPACES.secretariat;
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>${esc(s.label)}</h2><p>${esc(s.desc)}</p></div>
      ${isPdg() ? '<button class="btn" id="dlgBtn">Déléguer cet espace</button>' : ""}</div>
    <div class="tabs" id="msgTabs">
      <button data-f="tous">Tous</button><button data-f="nouveau">Nouveaux</button><button data-f="lu">Lus</button><button data-f="traite">Traités</button>
    </div>
    <div class="msg-layout"><div class="msg-list" id="msgList"><div class="empty">Chargement…</div></div><div id="msgDetail" class="msg-detail"><div class="empty">Sélectionnez un message.</div></div></div>`;
  if (isPdg()) { await loadUsers(); $("#dlgBtn").onclick = () => delegateSpaceModal("secretariat"); }
  $("#msgTabs").querySelectorAll("button").forEach(b => {
    b.classList.toggle("active", b.dataset.f === msgFilter);
    b.onclick = () => { msgFilter = b.dataset.f; renderSecretariat(); };
  });
  try {
    const q = msgFilter === "tous"
      ? query(collection(db, "messages"), orderBy("creeLe", "desc"), limit(200))
      : query(collection(db, "messages"), where("statut", "==", msgFilter), orderBy("creeLe", "desc"), limit(200));
    const snap = await getDocs(q);
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const list = $("#msgList");
    if (!msgs.length) { list.innerHTML = '<div class="empty">Aucun message.</div>'; return; }
    list.innerHTML = msgs.map(m => `
      <div class="msg-item ${m.statut === "nouveau" ? "nouveau" : ""}" data-id="${m.id}">
        <div class="who"><span>${esc(m.nom)}</span><span class="chip ${m.statut === "nouveau" ? "gold" : m.statut === "traite" ? "green" : ""}">${esc(STATUT_MSG[m.statut] || m.statut)}</span></div>
        <div class="sub">${esc(m.sujet || m.message)}</div></div>`).join("");
    list.querySelectorAll(".msg-item").forEach(el => el.onclick = () => openMessage(msgs.find(m => m.id === el.dataset.id), el));
  } catch (e) {
    console.error(e);
    $("#msgList").innerHTML = '<div class="empty">Impossible de charger les messages.</div>';
  }
}

async function openMessage(m, el) {
  document.querySelectorAll(".msg-item").forEach(x => x.classList.remove("active"));
  el.classList.add("active"); el.classList.remove("nouveau");
  if (m.statut === "nouveau") {
    try {
      await updateDoc(doc(db, "messages", m.id), { statut: "lu", luPar: me.uid, luLe: serverTimestamp() });
      m.statut = "lu";
      el.querySelector(".chip").className = "chip"; el.querySelector(".chip").textContent = STATUT_MSG.lu;
    } catch (e) { console.warn(e); }
  }
  const mailto = `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent("Re: " + (m.sujet || "Votre message"))}`;
  $("#msgDetail").innerHTML = `
    <h3>${esc(m.sujet || "(sans objet)")}</h3>
    <div class="meta">
      <span><b>De :</b> ${esc(m.nom)} — ${esc(m.email)}${m.telephone ? " — " + esc(m.telephone) : ""}</span>
      <span><b>Sujet concerné :</b> ${esc(POLE_LABEL[m.pole] || m.pole)} · <b>Langue :</b> ${esc((m.langue || "").toUpperCase())}</span>
      <span><b>Reçu le :</b> ${esc(fmtDate(m.creeLe))}</span>
      ${m.reponduPar ? `<span><b>Traité par :</b> ${esc(isPdg() ? userName(m.reponduPar) : "un collaborateur")}</span>` : ""}
    </div>
    <div class="msg-body">${esc(m.message)}</div>
    <div class="row-actions">
      <a class="btn" href="${mailto}">Répondre par email</a>
      <button class="btn dark" id="doneBtn" ${m.statut === "traite" ? "disabled" : ""}>Marquer comme traité</button>
      ${isPdg() ? '<button class="btn danger" id="delBtn">Supprimer</button>' : ""}
    </div>`;
  $("#doneBtn").onclick = async () => {
    try {
      await updateDoc(doc(db, "messages", m.id), { statut: "traite", reponduPar: me.uid, reponduLe: serverTimestamp() });
      await journal("message_traite", "secretariat", `Message de ${m.nom} traité`);
      toast("Message marqué comme traité."); renderSecretariat();
    } catch (e) { toast(firebaseError(e)); }
  };
  if (isPdg()) $("#delBtn").onclick = async () => {
    if (!confirm("Supprimer définitivement ce message ?")) return;
    try { await deleteDoc(doc(db, "messages", m.id)); await journal("message_supprime", "secretariat", `Message de ${m.nom} supprimé`); toast("Message supprimé."); renderSecretariat(); }
    catch (e) { toast(firebaseError(e)); }
  };
}

/* ---------- Direction ---------- */
async function renderDirection(tab) {
  $("#view").innerHTML = `
    <div class="page-head"><div><h2>Direction</h2><p>${esc(SPACES.direction.desc)}</p></div></div>
    <div class="tabs" id="dirTabs">
      <button data-t="apercu">Aperçu</button><button data-t="comptes">Comptes et délégations</button><button data-t="journal">Journal d'activité</button>
    </div><div id="dirBody"><div class="empty">Chargement…</div></div>`;
  $("#dirTabs").querySelectorAll("button").forEach(b => {
    b.classList.toggle("active", b.dataset.t === tab);
    b.onclick = () => renderDirection(b.dataset.t);
  });
  try {
    await loadUsers();
    if (tab === "apercu") await dirApercu();
    else if (tab === "comptes") dirComptes();
    else await dirJournal();
  } catch (e) { console.error(e); $("#dirBody").innerHTML = '<div class="alert err">Impossible de charger les données.</div>'; }
}

async function dirApercu() {
  const nouveaux = (await getCountFromServer(query(collection(db, "messages"), where("statut", "==", "nouveau")))).data().count;
  const total = (await getCountFromServer(collection(db, "messages"))).data().count;
  const actifs = usersCache.filter(u => u.statut === "actif").length;
  const bloques = usersCache.filter(u => u.statut !== "actif").length;
  $("#dirBody").innerHTML = `
    <div class="grid">
      <div class="card"><div class="stat">${nouveaux}</div><div class="stat-label">Messages non lus</div></div>
      <div class="card"><div class="stat">${total}</div><div class="stat-label">Messages reçus au total</div></div>
      <div class="card"><div class="stat">${actifs}</div><div class="stat-label">Collaborateurs actifs</div></div>
      <div class="card"><div class="stat">${bloques}</div><div class="stat-label">Comptes bloqués</div></div>
    </div>
    <h3 class="section-title">Tableaux de bord par pôle</h3>
    <div class="grid">
      ${["btp", "import_export", "juridique"].map(k => `<div class="card"><h3>${esc(SPACES[k].label)}</h3><p class="muted">Indicateurs (chiffre d'affaires, dossiers, avancement) disponibles en phase 2.</p></div>`).join("")}
    </div>`;
}

function dirComptes() {
  const rows = usersCache.map(u => `
    <tr>
      <td><b>${esc(u.nom)}</b><br><span class="muted">${esc(u.email)}</span></td>
      <td><div class="chips">${(u.espaces || []).map(s => `<span class="chip">${esc(SPACES[s] ? SPACES[s].label : s)}</span>`).join("") || '<span class="muted">Aucun</span>'}</div>
        ${(u.anciensEspaces || []).length && u.statut !== "actif" ? `<div class="muted" style="margin-top:4px;font-size:.78rem">Espaces transférés lors de la passation</div>` : ""}</td>
      <td>${u.statut === "actif" ? '<span class="chip green">Actif</span>' : '<span class="chip red">Bloqué</span>'}</td>
      <td><div class="actions">
        ${u.statut === "actif" ? `<button class="btn small dark" data-act="spaces" data-uid="${u.uid}">Espaces</button>
          <button class="btn small danger" data-act="block" data-uid="${u.uid}">Bloquer</button>`
          : `<button class="btn small dark" data-act="unblock" data-uid="${u.uid}">Réactiver</button>`}
        <button class="btn small ghost dark" style="color:var(--royal);border-color:var(--line)" data-act="reset" data-uid="${u.uid}">Réinit. mot de passe</button>
      </div></td>
    </tr>`).join("");
  $("#dirBody").innerHTML = `
    <div class="row-actions" style="margin-bottom:14px"><button class="btn" id="newUser">+ Créer un compte</button></div>
    ${usersCache.length ? `<div class="table-wrap"><table><thead><tr><th>Collaborateur</th><th>Espaces délégués</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<div class="card empty">Aucun collaborateur pour le moment. Vous tenez tous les espaces. Créez un compte pour déléguer.</div>'}`;
  $("#newUser").onclick = createUserModal;
  $("#dirBody").querySelectorAll("[data-act]").forEach(b => b.onclick = () => userAction(b.dataset.act, b.dataset.uid));
}

function spacesChecks(selected = []) {
  return `<div class="checks">${DELEGABLE.map(k => `<label class="check"><input type="checkbox" value="${k}" ${selected.includes(k) ? "checked" : ""}> ${esc(SPACES[k].label)}</label>`).join("")}</div>`;
}
const readChecks = (box) => [...box.querySelectorAll('.checks input:checked')].map(i => i.value);

function createUserModal() {
  const box = openModal(`
    <h3>Créer un compte</h3>
    <p class="muted">Le collaborateur ne crée jamais son compte lui-même. Un mot de passe provisoire sera généré.</p>
    <label>Nom complet<input id="cuNom" maxlength="120"></label>
    <label>Email<input id="cuEmail" type="email" maxlength="200"></label>
    <div><div class="muted" style="font-size:.85rem;margin-bottom:6px">Espaces à déléguer (modifiable plus tard)</div>${spacesChecks()}</div>
    <div id="cuErr" class="alert err" hidden></div>
    <div class="modal-actions"><button class="btn ghost dark" id="cancel">Annuler</button><button class="btn" id="ok">Créer le compte</button></div>`);
  box.querySelector("#cancel").onclick = closeModal;
  box.querySelector("#ok").onclick = async () => {
    const nom = box.querySelector("#cuNom").value.trim();
    const email = box.querySelector("#cuEmail").value.trim().toLowerCase();
    const err = box.querySelector("#cuErr"); err.hidden = true;
    if (!nom || !/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Nom et email valides requis."; err.hidden = false; return; }
    const espaces = readChecks(box);
    const btn = box.querySelector("#ok"); btn.disabled = true;
    const pass = genPassword();
    let secApp;
    try {
      // Seconde instance : le PDG reste connecté sur l'instance principale.
      secApp = initializeApp(firebaseConfig, "secondary-" + Date.now());
      const secAuth = getAuth(secApp);
      const cred = await createUserWithEmailAndPassword(secAuth, email, pass);
      const uid = cred.user.uid;
      await signOut(secAuth);
      await setDoc(doc(db, "utilisateurs", uid), {
        nom, email, role: "collaborateur", espaces, statut: "actif", creePar: me.uid, creeLe: serverTimestamp()
      });
      await journal("compte_cree", "direction", `Compte créé pour ${nom} (${email})`);
      box.innerHTML = `
        <h3>Compte créé</h3>
        <div class="alert ok">Le compte de <b>${esc(nom)}</b> est prêt.</div>
        <p class="muted">Communiquez ces identifiants de façon sécurisée. Ce mot de passe ne sera plus affiché ; le collaborateur pourra le changer via « Mot de passe oublié ».</p>
        <div><b>Email :</b></div><div class="secret">${esc(email)}</div>
        <div><b>Mot de passe provisoire :</b></div><div class="secret">${esc(pass)}</div>
        <div class="modal-actions"><button class="btn" id="done">Terminé</button></div>`;
      box.querySelector("#done").onclick = () => { closeModal(); renderDirection("comptes"); };
    } catch (e) {
      console.error(e); err.textContent = firebaseError(e); err.hidden = false; btn.disabled = false;
    }
  };
}

async function userAction(act, uid) {
  const u = usersCache.find(x => x.uid === uid); if (!u) return;
  try {
    if (act === "reset") {
      await sendPasswordResetEmail(auth, u.email);
      await journal("mdp_reinit", "direction", `Réinitialisation du mot de passe envoyée à ${u.nom}`);
      toast("Email de réinitialisation envoyé.");
    } else if (act === "unblock") {
      await updateDoc(doc(db, "utilisateurs", uid), { statut: "actif", modifieLe: serverTimestamp(), modifiePar: me.uid });
      await journal("compte_reactive", "direction", `Compte de ${u.nom} réactivé`);
      toast("Compte réactivé."); dirRefresh();
    } else if (act === "spaces") {
      const box = openModal(`<h3>Espaces de ${esc(u.nom)}</h3>${spacesChecks(u.espaces || [])}
        <div class="modal-actions"><button class="btn ghost dark" id="cancel">Annuler</button><button class="btn" id="ok">Enregistrer</button></div>`);
      box.querySelector("#cancel").onclick = closeModal;
      box.querySelector("#ok").onclick = async () => {
        try { await setEspaces(uid, readChecks(box), `Espaces de ${u.nom} mis à jour`); closeModal(); toast("Espaces mis à jour."); dirRefresh(); }
        catch (e) { toast(firebaseError(e)); }
      };
    } else if (act === "block") blockModal(u);
  } catch (e) { console.error(e); toast(firebaseError(e)); }
}
const dirRefresh = () => renderDirection("comptes");

function blockModal(u) {
  const others = usersCache.filter(x => x.uid !== u.uid && x.statut === "actif");
  const hasSpaces = (u.espaces || []).length > 0;
  const box = openModal(`
    <h3>Bloquer ${esc(u.nom)}</h3>
    <p class="muted">Le compte ne pourra plus rien lire ni écrire. Le travail déjà effectué reste dans les espaces.</p>
    ${hasSpaces ? `<label>Passation de service : transférer ses espaces à (facultatif)
      <select id="blkTarget"><option value="">— Ne pas transférer maintenant —</option>${others.map(o => `<option value="${o.uid}">${esc(o.nom)}</option>`).join("")}</select></label>
      <p class="muted" style="font-size:.85rem">Le successeur reprend les espaces avec tout l'historique. Vous pouvez aussi créer son compte puis déléguer plus tard.</p>` : ""}
    <div class="modal-actions"><button class="btn ghost dark" id="cancel">Annuler</button><button class="btn danger" id="ok">Bloquer le compte</button></div>`);
  box.querySelector("#cancel").onclick = closeModal;
  box.querySelector("#ok").onclick = async () => {
    const btn = box.querySelector("#ok"); btn.disabled = true;
    try {
      const targetUid = hasSpaces ? box.querySelector("#blkTarget").value : "";
      const patch = { statut: "bloque", bloqueLe: serverTimestamp(), bloquePar: me.uid, modifieLe: serverTimestamp(), modifiePar: me.uid };
      let detail = `Compte de ${u.nom} bloqué`;
      if (targetUid) {
        const t = usersCache.find(x => x.uid === targetUid);
        await updateDoc(doc(db, "utilisateurs", targetUid), { espaces: [...new Set([...(t.espaces || []), ...u.espaces])], modifieLe: serverTimestamp(), modifiePar: me.uid });
        patch.anciensEspaces = u.espaces; patch.espaces = [];
        detail += `, espaces transférés à ${t.nom}`;
      }
      await updateDoc(doc(db, "utilisateurs", u.uid), patch);
      await journal("compte_bloque", "direction", detail);
      closeModal(); toast("Compte bloqué."); dirRefresh();
    } catch (e) { toast(firebaseError(e)); btn.disabled = false; }
  };
}

async function dirJournal() {
  const snap = await getDocs(query(collection(db, "journal"), orderBy("creeLe", "desc"), limit(100)));
  const rows = snap.docs.map(d => d.data());
  $("#dirBody").innerHTML = rows.length
    ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Auteur</th><th>Action</th><th>Détail</th></tr></thead><tbody>${rows.map(r =>
        `<tr><td>${esc(fmtDate(r.creeLe))}</td><td>${esc(r.auteurNom || userName(r.auteur))}</td><td><span class="chip">${esc(r.action)}</span></td><td>${esc(r.detail)}</td></tr>`).join("")}</tbody></table></div>`
    : '<div class="card empty">Aucune activité enregistrée.</div>';
}
