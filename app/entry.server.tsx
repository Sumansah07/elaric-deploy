import type { AppLoadContext } from '@remix-run/cloudflare';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';
import { themeStore } from '~/lib/stores/theme';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: any,
  _loadContext: AppLoadContext,
) {
  try {
    // await initializeModelList({});

    const readable = await renderToReadableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        signal: request.signal,
        onError(error: unknown) {
          console.error('Render error:', error);
          responseStatusCode = 500;
        },
      },
    );

    const body = new ReadableStream({
      start(controller) {
        try {
          const head = renderHeadToString({ request, remixContext, Head });

          controller.enqueue(
            new Uint8Array(
              new TextEncoder().encode(
                `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
              ),
            ),
          );

          const reader = readable.getReader();

          function read() {
            reader
              .read()
              .then(({ done, value }) => {
                if (done) {
                  controller.enqueue(
                    new Uint8Array(
                      new TextEncoder().encode('</div></body></html>'),
                    ),
                  );
                  controller.close();
                  return;
                }

                controller.enqueue(value);
                read();
              })
              .catch((error) => {
                console.error('Stream read error:', error);
                controller.error(error);
                readable.cancel();
              });
          }
          read();
        } catch (error) {
          console.error('Body stream creation error:', error);
          controller.error(error);
        }
      },

      cancel() {
        readable.cancel();
      },
    });

    if (isbot(request.headers.get('user-agent') || '')) {
      await readable.allReady;
    }

    responseHeaders.set('Content-Type', 'text/html');
    responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
    responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

    return new Response(body, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  } catch (error) {
    console.error('handleRequest error:', error);
    
    // Return a simple error page
    const errorPage = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Error</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              background: #1e1e1e;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .error-container {
              text-align: center;
              max-width: 500px;
              padding: 2rem;
            }
            h1 {
              color: #ff6b6b;
              margin-bottom: 1rem;
            }
            p {
              color: #cccccc;
              margin-bottom: 1.5rem;
            }
            .reload-button {
              background: #4a4a4a;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
            }
            .reload-button:hover {
              background: #5a5a5a;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Application Error</h1>
            <p>We're sorry, but something went wrong. Please try reloading the page.</p>
            <button class="reload-button" onclick="window.location.reload()">Reload Page</button>
          </div>
        </body>
      </html>
    `;

    return new Response(errorPage, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}