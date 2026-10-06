import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, configOk } from "./firebase-config.js";
import { T, getLang, setLang, applyLang } from "./i18n.js";

let lang = getLang();
applyLang(lang);
const yr = document.getElementById("year"); if (yr) yr.textContent = new Date().getFullYear();

document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang;
    setLang(lang);
    applyLang(lang);
  });
});

const db = configOk ? getFirestore(initializeApp(firebaseConfig)) : null;

const form = document.getElementById("contactForm");
const notice = document.getElementById("formNotice");
const sendBtn = document.getElementById("sendBtn");

function show(type, key) {
  notice.className = "notice show " + type;
  notice.textContent = T[lang][key];
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  notice.className = "notice";
  const f = new FormData(form);

  if (f.get("website")) return; // anti-spam (champ piège)

  const nom = String(f.get("nom") || "").trim();
  const email = String(f.get("email") || "").trim();
  const message = String(f.get("message") || "").trim();
  if (!nom || !message || !/^\S+@\S+\.\S+$/.test(email)) {
    show("err", "form.err");
    return;
  }
  if (!db) { show("err", "form.noconfig"); return; }

  sendBtn.disabled = true;
  sendBtn.textContent = T[lang]["form.sending"];
  try {
    await addDoc(collection(db, "messages"), {
      nom,
      email,
      telephone: String(f.get("telephone") || "").trim(),
      pole: String(f.get("pole") || "general"),
      sujet: String(f.get("sujet") || "").trim(),
      message,
      langue: lang,
      statut: "nouveau",
      creeLe: serverTimestamp()
    });
    form.reset();
    show("ok", "form.ok");
  } catch (err) {
    console.error(err);
    show("err", "form.err");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = T[lang]["form.send"];
  }
});

const burger = document.querySelector(".burger");
const mainNav = document.getElementById("mainNav");
burger?.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  burger.setAttribute("aria-expanded", String(open));
});
const sel = document.querySelector('select[name="pole"]');
const wanted = new URLSearchParams(location.search).get("pole");
if (sel && wanted && [...sel.options].some(o => o.value === wanted)) sel.value = wanted;
