import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { outDir: 'dist', sourcemap: false, target: 'es2020', chunkSizeWarningLimit: 700 },
  server: { port: 5173 },
});
