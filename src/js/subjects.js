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
