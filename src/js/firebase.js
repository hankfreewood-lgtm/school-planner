import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';

/**
 * Lokaler Modus: Die App läuft ohne Backend, wenn sie direkt aus dem Dateisystem
 * geöffnet wird (file://) oder `?local` in der URL steht. Daten liegen dann in
 * localStorage. So funktioniert die eigenständige index.html vollständig offline.
 */
export const LOCAL =
  location.protocol === 'file:' || new URLSearchParams(location.search).has('local');

// Öffentliche Web-Konfiguration (kein Geheimnis). Die Sicherheit liegt in Auth + firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyCpuRQrvjS-rDnynreHvKhQ3wM7K0sMSAs',
  authDomain: 'school-planner-hf26.firebaseapp.com',
  projectId: 'school-planner-hf26',
  storageBucket: 'school-planner-hf26.firebasestorage.app',
  messagingSenderId: '12221756413',
  appId: '1:12221756413:web:acabc2cd674905a041df94',
};

export const app = LOCAL ? null : initializeApp(firebaseConfig);

export const auth = LOCAL ? null : getAuth(app);
if (!LOCAL) {
  // Anmeldung bleibt dauerhaft (IndexedDB/localStorage) bestehen.
  setPersistence(auth, browserLocalPersistence).catch((e) => console.warn('Persistenz:', e));
}

// Offline-Cache in IndexedDB; Schreibvorgänge werden lokal gepuffert und bei Verbindung synchronisiert.
export const db = LOCAL ? null : initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Nur im Dev-Server mit ?emulator in der URL: lokale Firebase-Emulatoren statt Produktion (für Tests).
if (!LOCAL && import.meta.env.DEV && new URLSearchParams(location.search).has('emulator')) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
