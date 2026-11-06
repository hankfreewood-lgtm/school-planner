// Fächer mit fester Farbe. CSS-Variablen --subj-<key> (siehe themes.css) liefern pro Theme eine eigene Variante.
export const SUBJECTS = [
  'Mathematik', 'Deutsch', 'Englisch', 'Biologie', 'Chemie', 'Physik', 'Geschichte',
  'Geografie', 'Informatik', 'Musik', 'Kunst', 'Sport', 'Sozialkunde', 'Sonstiges',
];

const KEYS = {
  Mathematik: 'math', Deutsch: 'german', Englisch: 'english', Biologie: 'bio', Chemie: 'chem',
  Physik: 'phys', Geschichte: 'hist', Geografie: 'geo', Informatik: 'cs', Musik: 'music',
  Kunst: 'art', Sport: 'sport', Sozialkunde: 'social', Sonstiges: 'other',
};

export const subjectKey = (s) => KEYS[s] || 'other';

// Benutzerdefinierte Fächer werden in Firestore unter users/{uid}/subjects gespeichert.
// Jedes Thema hat: name, color (Hex-String), id.
export const subjectColor = (subject, userSubjects = []) => {
  const key = subjectKey(subject);
  const builtIn = { math: '#7fa6f0', german: '#f28c7a', english: '#e88aa6', bio: '#8fd98a', chem: '#5fd0c5', phys: '#f2ab63', hist: '#cfa583', geo: '#63c3d6', cs: '#7fb2e8', music: '#ff8fc0', art: '#e08fbf', sport: '#e6c94a', social: '#a6aab5', other: '#8e919b' };

  // Prüfe ob built-in Fach (alle Keys inkl. 'other' für Sonstiges)
  if (KEYS[subject]) {
    return builtIn[key] || builtIn.other;
  }

  // Wenn nicht im Standard-Lookup, suche in userSubjects nach exaktem Match
  for (const us of userSubjects) {
    if (us.name.toLowerCase() === subject.toLowerCase()) return us.color || builtIn.other;
  }

  // Falls nichts gefunden → Benutzer-Fach (eigene Farbe)
  return null; // null bedeutet: "custom subject" -> Karte wird --s inline setzen
};

// Liefert CSS-Klasse und Farbe für --s Variable basierend auf userSubjects.
// Built-in Fächer: keine Inline-Farbe (CSS-Klasse regelt Theme-awareness).
// Custom Fächer: Farbe wird inline via style="--s: #hex" gesetzt.
export const getSubjectVars = (subject, userSubjects = []) => {
  const key = subjectKey(subject);
  const color = subjectColor(subject, userSubjects);

  if (KEYS[subject]) {
    return { class: `subj-${key}`, color: null };
  }

  return { class: 'subj-custom', color };
};