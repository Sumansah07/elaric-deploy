import { useStore } from '@nanostores/react';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import { ClerkApp } from '@clerk/remix';
import { rootAuthLoader } from '@clerk/remix/ssr.server';
import { AuthProvider } from './lib/auth/auth-provider';
import { SupabasePersistenceProvider } from './components/SupabasePersistenceProvider';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';
import { cssTransition, ToastContainer } from 'react-toastify';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

// Clerk authentication loader - must return rootAuthLoader directly
export const loader = (args: LoaderFunctionArgs) => {
  // Debug environment variables (only in development)
  if (process.env.NODE_ENV === 'development') {
    const serverPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
    const clientPublishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
    const secretKey = process.env.CLERK_SECRET_KEY;
    
    console.log('🌐 Root Loader Environment Check:');
    console.log('- Server CLERK_PUBLISHABLE_KEY:', serverPublishableKey ? '✅ SET' : '❌ MISSING');
    console.log('- Client VITE_CLERK_PUBLISHABLE_KEY:', clientPublishableKey ? '✅ SET' : '❌ MISSING');
    console.log('- CLERK_SECRET_KEY:', secretKey ? '✅ SET' : '❌ MISSING');
  }

  // Return rootAuthLoader directly as per Clerk documentation
  return rootAuthLoader(args);
};

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    // Force dark mode by default
    let theme = localStorage.getItem('bolt_theme');

    if (!theme) {
      theme = 'dark';
      localStorage.setItem('bolt_theme', 'dark');
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
    document.querySelector('html')?.classList.add('dark');
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <Meta />
    <Links />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
    document.querySelector('html')?.classList.add('dark');
  }, [theme]);

  return (
    <>
      <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
        autoClose={3000}
      />
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';

function App() {
  const theme = useStore(themeStore);
  const loaderData = useLoaderData<typeof loader>();

  useEffect(() => {
    logStore.logSystem('Application initialized', {
      theme,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      clerkAuth: 'enabled', // Clerk is always enabled when using rootAuthLoader
    });

    // Initialize debug logging with improved error handling
    import('./utils/debugLogger')
      .then(({ debugLogger }) => {
        const status = debugLogger.getStatus();
        logStore.logSystem('Debug logging ready', {
          initialized: status.initialized,
          capturing: status.capturing,
          enabled: status.enabled,
        });
      })
      .catch((error) => {
        logStore.logError('Failed to initialize debug logging', error);
      });
  }, []);

  return (
    <AuthProvider>
      <SupabasePersistenceProvider>
        <Layout>
          <Outlet />
        </Layout>
      </SupabasePersistenceProvider>
    </AuthProvider>
  );
}

// Export the app wrapped with ClerkApp
// ClerkApp will automatically detect VITE_CLERK_PUBLISHABLE_KEY from environment
export default ClerkApp(App);
