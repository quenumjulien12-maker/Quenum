# Maison Quenum — site public et espace de gestion

Site web public (FR/EN) et application de gestion interne de **Quenum Entreprise et Conseil**, sur Firebase (plan gratuit Spark) et GitHub. Voir `PLAN.md` pour l'architecture complète.

- Site public : `public/index.html`
- Espace de gestion : `public/app/` (adresse `/app/`)
- Règles de sécurité : `firestore.rules`

## Mise en route (une seule fois)

### 1. Projet Firebase
1. Console Firebase > votre projet > **Build > Authentication** > Commencer > activer **Adresse e-mail/Mot de passe**.
2. **Build > Firestore Database** > Créer une base (mode production, région proche de vos utilisateurs).
3. **Paramètres du projet > Vos applications > Web (`</>`)** : enregistrez une application et copiez la configuration dans `public/js/firebase-config.js`.
4. Mettez l'identifiant du projet dans `.firebaserc`.

### 2. Premier compte : le PDG (automatique)
Une fois les secrets GitHub en place (étape 3) : onglet **Actions > Créer le compte PDG > Run workflow**, saisissez l'email et le nom du PDG.
Le workflow crée l'utilisateur et son profil `role = pdg`. À la première connexion, cliquez sur **« Mot de passe oublié ? »** sur la page de connexion pour définir votre mot de passe.

### 3. Déploiement automatique (GitHub Actions)
Dans GitHub : dépôt > **Settings > Secrets and variables > Actions** > ajoutez :
- `FIREBASE_PROJECT_ID` : l'identifiant du projet
- `FIREBASE_SERVICE_ACCOUNT` : le contenu complet du fichier JSON d'un compte de service (Console Firebase > Paramètres du projet > Comptes de service > Générer une nouvelle clé privée ; rôle Firebase Admin ou équivalent Hosting + Firestore rules)

Chaque `push` sur `main` déploie Hosting et les règles Firestore. Ne placez **jamais** la clé JSON dans le dépôt ni dans une conversation.

### 4. Domaine
Quand le nom de domaine est acheté : Firebase Hosting > Ajouter un domaine personnalisé, puis ajoutez le domaine dans Authentication > Paramètres > Domaines autorisés.

## Fonctionnement des rôles
- Le PDG accède à tous les espaces.
- Il crée les comptes, délègue les espaces, bloque ou réactive un compte.
- Au blocage, il peut **transférer les espaces** à un successeur (passation de service) : les données restent dans l'espace.
- Le journal d'activité (Direction) trace les actions sensibles.

## Tester en local
```bash
npx firebase-tools emulators:start --only hosting
```
ou servez simplement le dossier `public/` avec n'importe quel serveur statique.
