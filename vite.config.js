import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Verschiebt die HTML-Eingabe app/index.html nach dist/index.html und vergibt dem
// Service-Worker-Cache pro Build einen neuen Namen (Asset-Hash).
function buildOutputPlugin() {
  return {
    name: 'build-output',
    apply: 'build',
    closeBundle() {
      const from = resolve('dist/app/index.html');
      const to = resolve('dist/index.html');
      if (existsSync(from)) {
        writeFileSync(to, readFileSync(from, 'utf8'));
        rmSync(resolve('dist/app'), { recursive: true, force: true });
      }

      const swPath = resolve('dist/sw.js');
      if (!existsSync(swPath) || !existsSync(to)) return;
      const html = readFileSync(to, 'utf8');
      const assets = [...html.matchAll(/\/assets\/[^"']+/g)].map((m) => m[0]).join('|');
      const hash = createHash('sha1').update(assets).digest('hex').slice(0, 8);
      const src = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, src.replace('schulplaner-v1', `schulplaner-${hash}`));
    },
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [buildOutputPlugin()],
  server: { port: 5173, open: '/app/' },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve('app/index.html'),
      output: { inlineDynamicImports: true },
    },
  },
});
