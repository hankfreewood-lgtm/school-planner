/**
 * Baut aus dem Vite-Output (dist/) eine eigenständige index.html,
 * die ohne Server per Doppelklick (file://) geöffnet werden kann.
 * CSS und JS werden direkt eingebettet – keine externen Dateien nötig.
 *
 * Aufruf: npm run standalone   (führt vorher den normalen Build aus)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve('.');
const dist = join(root, 'dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html fehlt – bitte zuerst "npm run build" ausführen.');
  process.exit(1);
}

const fileFor = (url) => join(dist, url.replace(/^https?:\/\/[^/]+/, '').replace(/^\.?\//, ''));

let html = readFileSync(join(dist, 'index.html'), 'utf8');
const embedded = [];

// Stylesheets einbetten
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/gi, (tag) => {
  const href = tag.match(/href="([^"]+)"/i)?.[1];
  if (!href || /^https?:/i.test(href)) return tag;
  const file = fileFor(href);
  if (!existsSync(file)) return tag;
  embedded.push(href);
  return `<style>\n${readFileSync(file, 'utf8')}\n</style>`;
});

// JavaScript einbetten (inline ausgeführt – kein Netzwerk nötig)
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/gi, (tag, src) => {
  if (/^https?:/i.test(src)) return tag;
  const file = fileFor(src);
  if (!existsSync(file)) return tag;
  embedded.push(src);
  const js = readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">\n${js}\n</script>`;
});

// Preload-Hinweise entfernen (Assets sind bereits eingebettet)
html = html.replace(/[ \t]*<link\b[^>]*rel="modulepreload"[^>]*>\s*\n?/gi, '');

// PWA-Ressourcen (Manifest/Icons) benötigen einen Server → durch Inline-Icon ersetzen
const iconSvg = readFileSync(join(root, 'public/icons/icon.svg'), 'utf8');
const iconUri = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`;
html = html.replace(/[ \t]*<link\b[^>]*rel="(?:manifest|icon|apple-touch-icon)"[^>]*>\s*\n?/gi, '');
html = html.replace('</title>', `</title>\n  <link rel="icon" href="${iconUri}">`);

html = html.replace('</head>', '  <!-- Eigenständige Version: ohne Server per Doppelklick öffnen -->\n</head>');

writeFileSync(join(root, 'index.html'), html, 'utf8');
console.log(`index.html erzeugt (${embedded.length} Assets eingebettet, ${(html.length / 1024).toFixed(0)} kB).`);
