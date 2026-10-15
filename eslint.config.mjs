import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // public/js/via.js is a prebuilt third-party-style bundle; it is served as-is.
  globalIgnores(['.next/**', 'out/**', 'dist/**', 'next-env.d.ts', 'public/js/**']),
]);
