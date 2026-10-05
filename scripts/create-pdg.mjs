// Crée (ou répare) le compte PDG : utilisateur Authentication + profil Firestore.
// Lancé par le workflow GitHub « Créer le compte PDG » ; la clé de service vient des secrets, jamais du dépôt.
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const email = (process.env.PDG_EMAIL || "").trim().toLowerCase();
const nom = (process.env.PDG_NOM || "").trim();
if (!email || !nom) { console.error("PDG_EMAIL et PDG_NOM sont requis."); process.exit(1); }

const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
initializeApp({ credential: cert(sa) });
const auth = getAuth();
const db = getFirestore();

let user;
try {
  user = await auth.getUserByEmail(email);
  console.log("Compte Authentication déjà existant.");
} catch (e) {
  if (e.code !== "auth/user-not-found") throw e;
  // Mot de passe aléatoire jamais affiché : le PDG définit le sien via « Mot de passe oublié ».
  user = await auth.createUser({ email, displayName: nom, password: randomBytes(24).toString("base64url") });
  console.log("Compte Authentication créé.");
}

await db.collection("utilisateurs").doc(user.uid).set({
  nom, email, role: "pdg", espaces: [], statut: "actif", creeLe: FieldValue.serverTimestamp()
}, { merge: true });
console.log("Profil PDG enregistré dans Firestore.");
