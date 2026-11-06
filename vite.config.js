import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Vergibt dem Service-Worker-Cache pro Build einen neuen Namen (Asset-Hash),
// damit nach jedem Deployment die neuen gehashten Bundles vorab gecacht werden.
function swVersionPlugin() {
  return {
    name: 'sw-version',
    apply: 'build',
    closeBundle() {
      const swPath = 'dist/sw.js';
      const html = readFileSync('dist/index.html', 'utf8');
      const assets = [...html.matchAll(/\/assets\/[^"']+/g)].map((m) => m[0]).join('|');
      const hash = createHash('sha1').update(assets).digest('hex').slice(0, 8);
      const src = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, src.replace('schulplaner-v1', `schulplaner-${hash}`));
    },
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [swVersionPlugin()],
  build: { outDir: 'dist', sourcemap: false, target: 'es2020', chunkSizeWarningLimit: 700 },
  server: { port: 5173 },
});
