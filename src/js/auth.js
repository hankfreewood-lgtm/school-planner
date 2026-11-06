import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, provider);
  } catch (err) {
    // Manche mobile Browser blockieren Pop-ups → Redirect als Fallback
    if (err?.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider);
    throw err;
  }
}

export const logout = () => signOut(auth);

/** Legt/aktualisiert das Profildokument users/{uid}. createdAt stammt aus den Auth-Metadaten. */
export function saveUserProfile(user) {
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
