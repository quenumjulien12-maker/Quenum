export const T = {
  fr: {
    "nav.home": "Accueil", "nav.poles": "Nos pôles", "nav.about": "À propos", "nav.contact": "Contact", "nav.login": "Espace gestion",
    "hero.eyebrow": "Quenum Entreprise et Conseil",
    "hero.title": "Bâtir, échanger, conseiller.",
    "hero.text": "Maison Quenum accompagne particuliers et entreprises dans trois métiers : le bâtiment et les travaux publics, l'import-export, et le conseil juridique.",
    "hero.cta1": "Demander un devis", "hero.cta2": "Découvrir nos pôles",
    "poles.title": "Trois pôles, une même exigence",
    "poles.sub": "Un interlocuteur unique pour construire, commercer et sécuriser vos projets.",
    "btp.title": "Bâtiment et Travaux Publics", "btp.text": "Construction, rénovation, aménagement, voirie et ouvrages. Étude, suivi de chantier et respect des délais.",
    "ie.title": "Import-Export", "ie.text": "Commerce général et sourcing international, notamment avec la Chine : achats, expédition, dédouanement et livraison.",
    "jur.title": "Conseil juridique", "jur.text": "Conseil aux entreprises et aux particuliers : contrats, création de sociétés, litiges, accompagnement des projets.",
    "about.title": "À propos de Maison Quenum",
    "about.text": "Maison Quenum est le nom commercial de Quenum Entreprise et Conseil. Notre ambition : réunir sous une même enseigne la réalisation, le commerce et le conseil, avec rigueur, transparence et sens du service.",
    "about.v1": "Rigueur", "about.v2": "Transparence", "about.v3": "Service",
    "contact.title": "Contactez-nous", "contact.sub": "Décrivez votre besoin : notre équipe vous répond dans les meilleurs délais.",
    "form.nom": "Nom complet", "form.email": "Email", "form.tel": "Téléphone (facultatif)", "form.pole": "Sujet concerné",
    "form.pole.general": "Question générale", "form.pole.btp": "Bâtiment et Travaux Publics", "form.pole.import_export": "Import-Export", "form.pole.juridique": "Conseil juridique",
    "form.sujet": "Objet", "form.message": "Votre message", "form.send": "Envoyer",
    "form.sending": "Envoi en cours…", "form.ok": "Merci, votre message a bien été envoyé. Nous revenons vers vous rapidement.",
    "form.err": "Le message n'a pas pu être envoyé. Réessayez ou contactez-nous directement.",
    "form.noconfig": "Le site n'est pas encore relié à Firebase (configuration à compléter).",
    "footer.rights": "Tous droits réservés."
  },
  en: {
    "nav.home": "Home", "nav.poles": "Our divisions", "nav.about": "About", "nav.contact": "Contact", "nav.login": "Staff portal",
    "hero.eyebrow": "Quenum Entreprise et Conseil",
    "hero.title": "Build, trade, advise.",
    "hero.text": "Maison Quenum supports individuals and businesses across three trades: construction and public works, import-export, and legal advisory.",
    "hero.cta1": "Request a quote", "hero.cta2": "Discover our divisions",
    "poles.title": "Three divisions, one standard",
    "poles.sub": "A single partner to build, trade and secure your projects.",
    "btp.title": "Construction and Public Works", "btp.text": "Building, renovation, fit-out, roads and structures. Design, site supervision and on-time delivery.",
    "ie.title": "Import-Export", "ie.text": "General trade and international sourcing, notably with China: purchasing, shipping, customs clearance and delivery.",
    "jur.title": "Legal advisory", "jur.text": "Advice for businesses and individuals: contracts, company formation, disputes and project support.",
    "about.title": "About Maison Quenum",
    "about.text": "Maison Quenum is the trading name of Quenum Entreprise et Conseil. Our ambition: to bring delivery, trade and advice under one banner, with rigour, transparency and a service mindset.",
    "about.v1": "Rigour", "about.v2": "Transparency", "about.v3": "Service",
    "contact.title": "Get in touch", "contact.sub": "Tell us what you need: our team will reply as soon as possible.",
    "form.nom": "Full name", "form.email": "Email", "form.tel": "Phone (optional)", "form.pole": "Topic",
    "form.pole.general": "General question", "form.pole.btp": "Construction and Public Works", "form.pole.import_export": "Import-Export", "form.pole.juridique": "Legal advisory",
    "form.sujet": "Subject", "form.message": "Your message", "form.send": "Send",
    "form.sending": "Sending…", "form.ok": "Thank you, your message has been sent. We will get back to you shortly.",
    "form.err": "Your message could not be sent. Please try again or contact us directly.",
    "form.noconfig": "The site is not yet connected to Firebase (configuration to complete).",
    "footer.rights": "All rights reserved."
  }
};

export function getLang() {
  try { const l = localStorage.getItem("lang"); if (l === "fr" || l === "en") return l; } catch (e) {}
  return (navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr";
}

export function setLang(l) {
  try { localStorage.setItem("lang", l); } catch (e) {}
}

export function applyLang(l) {
  document.documentElement.lang = l;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const v = T[l][el.dataset.i18n];
    if (v) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const v = T[l][el.dataset.i18nPh];
    if (v) el.placeholder = v;
  });
  document.querySelectorAll(".lang-btn").forEach(b => b.classList.toggle("active", b.dataset.lang === l));
}
