# Plan — Maison Quenum (Quenum Entreprise et Conseil)

Site public + espace de gestion interne, sur un seul projet Firebase (plan gratuit Spark) et un dépôt GitHub.

## 1. Identité
- Nom commercial : **Maison Quenum**
- Raison sociale : **Quenum Entreprise et Conseil**
- Trois pôles : **BTP** (bâtiment et travaux publics), **Import-Export** (commerce général), **Conseil juridique**
- Couleurs : bleu royal (fond), or (logo, accents), blanc
- Langues du site : français (défaut) et anglais
- Devises : FCFA (XOF), USD, EUR, CNY, et autres à ajouter

## 2. Technique
- Front : HTML/CSS/JavaScript modulaire, sans étape de build (déploiement simple et fiable)
- Firebase : Hosting, Authentication (email + mot de passe), Firestore, Storage
- Aucun Cloud Functions : plan Spark gratuit
  - Création de comptes : le PDG connecté crée un compte via une seconde instance Firebase (il reste connecté), puis écrit le profil dans Firestore
  - Blocage : champ `statut = "bloque"` dans le profil, vérifié par les règles de sécurité et par l'application
- Déploiement : GitHub Actions déploie à chaque push sur `main` (clé Firebase placée dans les secrets GitHub, jamais dans le chat ni dans le code)

## 3. Espaces de l'espace de gestion
| Espace | Contenu |
|---|---|
| Direction (PDG) | Vue globale, tableaux de bord par pôle, création et blocage des comptes, délégation, journal d'activité |
| Secrétariat | Messages du site, demandes reçues, rendez-vous, courrier, archivage |
| Comptabilité et trésorerie | Factures, devis, dépenses, paiements, caisse/banque, multi-devises |
| Commercial et clients | Fichier clients, suivi des demandes, relances |
| Pôle BTP | Chantiers, planning, équipes, matériaux, sous-traitants, avancement avec photos |
| Pôle Import-Export | Commandes, fournisseurs, expéditions, douane, stock |
| Pôle Conseil juridique | Dossiers clients, échéances, documents, honoraires |
| Ressources humaines | Personnel, contrats, congés (phase 3) |

## 4. Rôles, délégation et passation
- Les données appartiennent à un **espace**, jamais à une personne.
- Le PDG a accès à tous les espaces depuis son compte.
- Aucun collaborateur ne crée son compte : c'est le PDG qui le fait.
- Bouton **Déléguer** sur chaque espace : il demande à qui (liste des comptes actifs). Un espace peut avoir un ou plusieurs titulaires.
- Le PDG peut **bloquer** un compte à tout moment (le compte ne peut plus rien lire ni écrire) et le **réactiver**.
- **Passation de service** : en cas de départ, les données restent dans l'espace. Le PDG bloque l'ancien compte, crée le nouveau et lui délègue l'espace. Le nouveau voit tout l'historique et continue le travail, sans rien refaire.
- Chaque enregistrement garde l'auteur d'origine (`creePar`, `creeLe`) ; un **journal d'activité** trace qui a fait quoi et quand.

## 5. Modèle de données (Firestore)
- `utilisateurs/{uid}` : nom, email, role (`pdg` | `collaborateur`), espaces[] (espaces délégués), statut (`actif` | `bloque`), creePar, creeLe
- `messages/{id}` : écrit par le site public (nom, email, téléphone, pôle, sujet, message, langue), traitement : statut (`nouveau` | `lu` | `traite`), reponduPar
- `clients/{id}`, `devis/{id}`, `factures/{id}`, `depenses/{id}`, `paiements/{id}`
- `chantiers/{id}`, `commandes/{id}`, `dossiers/{id}`
- `journal/{id}` : action, espace, auteur, date
- `parametres/devises` : liste des devises et taux

## 6. Sécurité
- Visiteurs : peuvent seulement **créer** un message (champs et tailles validés), jamais lire.
- Connectés actifs : accès limité aux espaces qui leur sont délégués.
- PDG : accès total.
- Comptes bloqués : aucun accès.
- Le premier compte (PDG) est créé par vous dans la console Firebase, puis son profil `role = pdg` est initialisé une seule fois (voir README).

## 7. Phasage
1. **Phase 1 (maintenant)** : structure, site public bilingue avec formulaire de contact/devis, connexion, espaces, création/blocage de comptes, délégation, messages reçus, journal.
2. **Phase 2** : Comptabilité (devis, factures, dépenses, paiements, devises) et les trois pôles (chantiers, commandes, dossiers), fichier clients.
3. **Phase 3** : RH, exports PDF, notifications par email, nom de domaine, référencement.
