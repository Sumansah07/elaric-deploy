import { vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  resolve: {
    conditions: ['module', 'browser', 'production'],
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '~': '/app',
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      external: ['electron', 'electron-log', 'electron-store', 'electron-updater'],
      output: {
        manualChunks: (id) => {
          // Skip electron files completely
          if (id.includes('electron')) {
            return undefined;
          }
          if (id.includes('node_modules')) {
            if (id.includes('@splinetool') || id.includes('three')) {
              return 'spline';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('codemirror') || id.includes('@codemirror')) {
              return 'codemirror';
            }
            if (id.includes('shiki')) {
              return 'shiki';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  plugins: [
    remixVitePlugin({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
      ignoredRouteFiles: ['**/electron/**', '**/*.electron.*'],
    }),
    UnoCSS(),
    tsconfigPaths(),
    optimizeCssModules({ apply: 'build' }),
  ],
  envPrefix: [
    'VITE_',
    'CLERK_',
    'OPENAI_LIKE_API_BASE_URL',
    'OPENAI_LIKE_API_MODELS',
    'OLLAMA_API_BASE_URL',
    'LMSTUDIO_API_BASE_URL',
    'TOGETHER_API_BASE_URL',
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});