import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

export async function loader({ request }: LoaderFunctionArgs) {
  return new Response(
    JSON.stringify({
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      env: {
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}

export default function TestRoute() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Test Route</h1>
      <p>This is a simple test route to verify the application is working.</p>
    </div>
  );
}