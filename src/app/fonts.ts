// Self-hosted fonts (licenses in /public/licenses). next/font serves them from /_next/static with immutable caching,
// adds size-adjusted fallbacks to reduce layout shift, and exposes each family as a CSS variable used in site.css.
import localFont from 'next/font/local';

export const archivo = localFont({
  src: '../fonts/Archivo-500.woff2',
  weight: '500',
  style: 'normal',
  display: 'swap',
  variable: '--font-archivo',
});

export const geist = localFont({
  src: [
    { path: '../fonts/Geist-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/Geist-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/Geist-600.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-geist',
});

export const plexMono = localFont({
  src: '../fonts/IBMPlexMono-500.woff2',
  weight: '500',
  style: 'normal',
  display: 'swap',
  variable: '--font-plex-mono',
  preload: false,
  adjustFontFallback: false, // metric overrides are based on Arial, which does not suit a monospace face
});

export const montserrat = localFont({
  src: '../fonts/Montserrat-variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-montserrat',
  preload: false,
});

export const fontVariables = [archivo, geist, plexMono, montserrat].map(f => f.variable).join(' ');
