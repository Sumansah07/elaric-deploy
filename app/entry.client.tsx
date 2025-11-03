import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { Buffer } from 'buffer';

// Make Buffer available globally for browser compatibility
globalThis.Buffer = Buffer;

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
