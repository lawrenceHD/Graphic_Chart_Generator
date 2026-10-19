import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The prototype calls the real color-engine (built dist) for live recolouring, hence the wider fs allow.
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  server: { port: 5180, fs: { allow: ['../..'] } },
  preview: { port: 5181 },
  build: { assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 4_000 },
});
