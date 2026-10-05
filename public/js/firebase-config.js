// Configuration Firebase (web). Ces valeurs ne sont PAS secrètes : la sécurité repose sur firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyAf2M8lpXmcyJ8EKPIzpNGDTWN1E8POKfM",
  authDomain: "msquenum.firebaseapp.com",
  projectId: "msquenum",
  storageBucket: "msquenum.firebasestorage.app",
  messagingSenderId: "71167815311",
  appId: "1:71167815311:web:0f81ac27b6aeb14a930afa"
};

export const configOk = !Object.values(firebaseConfig).some(v => String(v).includes("REMPLACER"));
