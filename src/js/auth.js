import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, LOCAL } from './firebase.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/* ---------------- Lokaler Modus (file:// oder ?local) ---------------- */
const LOCAL_USER = {
  uid: 'local',
  displayName: 'Lokaler Modus',
  email: 'Daten bleiben auf diesem Gerät',
  photoURL: null,
  metadata: {},
};
const SIGNED_KEY = 'sp-local-signed-in';
let memSignedIn = true;

const localSignedIn = () => {
  try {
    const v = localStorage.getItem(SIGNED_KEY);
    return v === null ? memSignedIn : v !== '0';
  } catch {
    return memSignedIn;
  }
};
const setLocalSignedIn = (on) => {
  memSignedIn = on;
  try { localStorage.setItem(SIGNED_KEY, on ? '1' : '0'); } catch { /* Ignorieren */ }
  window.dispatchEvent(new Event('sp-local-auth'));
};

/* ---------------- Auth-API ---------------- */

export function watchAuth(cb) {
  if (!LOCAL) return onAuthStateChanged(auth, cb);
  queueMicrotask(() => cb(localSignedIn() ? LOCAL_USER : null));
  const handler = () => cb(localSignedIn() ? LOCAL_USER : null);
  window.addEventListener('sp-local-auth', handler);
  return () => window.removeEventListener('sp-local-auth', handler);
}

export async function signInWithGoogle() {
  if (LOCAL) { setLocalSignedIn(true); return LOCAL_USER; }
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    // Manche mobile Browser blockieren Pop-ups → Redirect als Fallback
    if (err?.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider);
    throw err;
  }
}

export const logout = () => {
  if (LOCAL) { setLocalSignedIn(false); return Promise.resolve(); }
  return signOut(auth);
};

/** Legt/aktualisiert das Profildokument users/{uid}. createdAt stammt aus den Auth-Metadaten. */
export function saveUserProfile(user) {
  if (LOCAL) return Promise.resolve();
  const created = user.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date();
  return setDoc(
    doc(db, 'users', user.uid),
    {
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      createdAt: created,
      lastLoginAt: new Date(),
    },
    { merge: true },
  );
}
