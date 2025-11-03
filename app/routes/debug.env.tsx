import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

export async function loader({ request }: LoaderFunctionArgs) {
  // Debug endpoint to check environment variables
  const envVars = {
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY ? '✅ SET' : '❌ MISSING',
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? '✅ SET' : '❌ MISSING',
    VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY ? '✅ SET' : '❌ MISSING',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '✅ SET' : '❌ MISSING',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING',
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    // Actual values (masked for security)
    CLERK_PUBLISHABLE_KEY_VALUE: process.env.CLERK_PUBLISHABLE_KEY ? `${process.env.CLERK_PUBLISHABLE_KEY.substring(0, 10)}...` : null,
    VITE_CLERK_PUBLISHABLE_KEY_VALUE: process.env.VITE_CLERK_PUBLISHABLE_KEY ? `${process.env.VITE_CLERK_PUBLISHABLE_KEY.substring(0, 10)}...` : null,
    VITE_SUPABASE_URL_VALUE: process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL.substring(0, 20)}...` : null,
    VITE_SUPABASE_ANON_KEY_VALUE: process.env.VITE_SUPABASE_ANON_KEY ? `${process.env.VITE_SUPABASE_ANON_KEY.substring(0, 10)}...` : null,
  };

  return new Response(
    JSON.stringify({
      status: 'Environment Variables Check',
      timestamp: new Date().toISOString(),
      envVars,
    }, null, 2),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}

export default function DebugEnvRoute() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Environment Variables Debug Page</h1>
      <p>This page helps debug environment variable issues.</p>
      <p>To check the environment variables, visit: <a href="/debug.env">/debug.env</a></p>
    </div>
  );
}