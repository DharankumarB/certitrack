import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Preview hosts (sandbox proxy) must be allowed explicitly, otherwise Vite rejects the Host header.
const allowedHosts = ['.e2b.app', 'localhost', '127.0.0.1'];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', allowedHosts },
  preview: { host: '0.0.0.0', allowedHosts },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
