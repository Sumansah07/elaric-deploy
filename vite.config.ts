import { cloudflareDevProxyVitePlugin as remixCloudflareDevProxy, vitePlugin as remixVitePlugin } from '@remix-run/dev';
import UnoCSS from 'unocss/vite';
import { defineConfig, type ViteDevServer } from 'vite';
// import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { optimizeCssModules } from 'vite-plugin-optimize-css-modules';
import tsconfigPaths from 'vite-tsconfig-paths';
import * as dotenv from 'dotenv';

// Load environment variables from multiple files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

// Log environment variables for debugging
console.log('🔍 Vite Config Environment Check:');
console.log('- process.env.CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY ? '✅ SET' : '❌ MISSING');
console.log('- process.env.VITE_CLERK_PUBLISHABLE_KEY:', process.env.VITE_CLERK_PUBLISHABLE_KEY ? '✅ SET' : '❌ MISSING');
console.log('- process.env.CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? '✅ SET' : '❌ MISSING');
console.log('- process.env.VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING');
console.log('- process.env.VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING');
console.log('- process.env.VERCEL:', process.env.VERCEL ? '✅ SET' : '❌ MISSING');

export default defineConfig((config) => {
  // Check if we're running in Vercel environment
  const isVercel = process.env.VERCEL === '1';
  const isProduction = config.mode === 'production';
  
  console.log('🔧 Vercel Environment Check:');
  console.log('- isVercel:', isVercel);
  console.log('- isProduction:', isProduction);
  console.log('- config.mode:', config.mode);
  console.log('- process.env.NODE_ENV:', process.env.NODE_ENV);

  return {
    define: {
      // Make environment variables available in client-side code
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(process.env.VITE_CLERK_PUBLISHABLE_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.VERCEL': JSON.stringify(process.env.VERCEL || null),
    },
    resolve: {
      conditions: ['module', 'browser', config.mode === 'production' ? 'production' : 'development'],
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      alias: {
        '~': '/app',
      },
    },
    build: {
      target: 'es2022',
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      sourcemap: false,
      minify: isVercel ? 'esbuild' : 'esbuild',
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        external: ['electron', 'electron-log', 'electron-store', 'electron-updater'],
        output: {
          manualChunks: isVercel ? undefined : (id) => {
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
      // Only use the Cloudflare dev proxy when not in Vercel and not in test mode
      config.mode !== 'test' && !isVercel && remixCloudflareDevProxy(),
      remixVitePlugin({
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
        },
        ignoredRouteFiles: ['**/electron/**', '**/*.electron.*'],
        serverBuildFile: isVercel ? 'index.js' : 'server.js',
      }),
      UnoCSS(),
      tsconfigPaths(),
      !isVercel && chrome129IssuePlugin(),
      config.mode === 'production' && !isVercel && optimizeCssModules({ apply: 'build' }),
    ].filter(Boolean),
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
    test: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/tests/preview/**', // Exclude preview tests that require Playwright
      ],
    },
  };
});

function chrome129IssuePlugin() {
  return {
    name: 'chrome129IssuePlugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const raw = req.headers['user-agent']?.match(/Chrom(e|ium)\/([0-9]+)\./);

        if (raw) {
          const version = parseInt(raw[2], 10);

          if (version === 129) {
            res.setHeader('content-type', 'text/html');
            res.end(
              '<body><h1>Please use Chrome Canary for testing.</h1><p>Chrome 129 has an issue with JavaScript modules & Vite local development, see <a href="https://github.com/stackblitz/bolt.new/issues/86#issuecomment-2395519258">for more information.</a></p><p><b>Note:</b> This only impacts <u>local development</u>. `pnpm run build` and `pnpm run start` will work fine in this browser.</p></body>',
            );

            return;
          }
        }

        next();
      });
    },
  };
}