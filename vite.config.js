import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' https: data: shiori-media:",
  "media-src 'self' shiori-media:",
  'connect-src https://graphql.anilist.co https://api.jikan.moe https://api.aniskip.com',
].join('; ');

const FONT_FILE = /\.(woff2?|ttf|otf)$/;
const FONTSOURCE_STYLESHEET = /@fontsource[\\/].+\.css$/;
const WOFF_FALLBACK_SOURCE = /,\s*url\([^)]+\.woff\)\s*format\(['"]woff['"]\)/g;

const woff2FontsOnly = {
  name: 'shiori-woff2-fonts-only',
  enforce: 'pre',
  transform: (code, id) => (FONTSOURCE_STYLESHEET.test(id) ? code.replace(WOFF_FALLBACK_SOURCE, '') : null),
};

const productionContentSecurityPolicy = {
  name: 'shiori-csp',
  apply: 'build',

  transformIndexHtml: (html) =>
    html.replace(
      '<meta charset="utf-8" />',
      `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
    ),
};

export default defineConfig({
  base: './',
  build: { assetsInlineLimit: (filePath) => (FONT_FILE.test(filePath) ? false : undefined) },
  plugins: [react(), woff2FontsOnly, productionContentSecurityPolicy],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },

  server: { host: '127.0.0.1', port: 5173, strictPort: true },

  test: {
    projects: [
      {
        extends: true,

        test: {
          name: 'app',
          include: ['tests/**/*.test.{js,jsx}'],
          exclude: ['tests/electron/**'],
          environment: 'happy-dom',
        },
      },

      { extends: true, test: { name: 'electron', include: ['tests/electron/**/*.test.js'], environment: 'node' } },
    ],
  },

  fmt: { singleQuote: true, printWidth: 120, ignorePatterns: ['CLAUDE.md'] },
  lint: { rules: { 'no-nested-ternary': 'error' } },
});
