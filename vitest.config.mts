// Unit and integration tests for the contact form's server path (`npm test`). Pages are static and covered by
// `npm run check` against a running build instead.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': local('./src'),
      // `server-only` throws unless bundled for React Server Components; its own server build is an empty module.
      'server-only': local('./node_modules/server-only/empty.js'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
  },
});
