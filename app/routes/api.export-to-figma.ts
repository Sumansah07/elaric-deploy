import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.export-to-figma');

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { html, css = '' } = await request.json<{
      html: string;
      css?: string;
    }>();

    // Validate input
    if (!html || typeof html !== 'string') {
      return json({ error: 'Invalid or missing HTML content' }, { status: 400 });
    }

    // Check HTML size - code.to.design has limits
    const htmlSizeKB = new Blob([html]).size / 1024;
    const MAX_SIZE_KB = 500; // 500KB limit to prevent memory errors
    
    if (htmlSizeKB > MAX_SIZE_KB) {
      logger.warn(`HTML too large: ${htmlSizeKB.toFixed(2)}KB (max: ${MAX_SIZE_KB}KB)`);
      return json({ 
        error: `HTML content too large (${htmlSizeKB.toFixed(0)}KB). Maximum size is ${MAX_SIZE_KB}KB. Try simplifying your design or removing unnecessary code.` 
      }, { status: 413 });
    }
    
    logger.info(`HTML size: ${htmlSizeKB.toFixed(2)}KB`);

    // Get API key from environment (with fallback to process.env for local dev)
    const apiKey = (context?.cloudflare?.env as any)?.FIGMA_EXPORT_API_KEY || process.env.FIGMA_EXPORT_API_KEY;

    if (!apiKey) {
      logger.error('FIGMA_EXPORT_API_KEY not found in environment variables');
      return json({ error: 'Figma export service is not configured. Please contact support.' }, { status: 500 });
    }

    logger.info('Calling code.to.design API...');

    // Optimize HTML by removing unnecessary whitespace and comments
    const optimizedHTML = html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS comments
      .replace(/\/\/.*$/gm, '') // Remove JS single-line comments
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    const optimizedSizeKB = new Blob([optimizedHTML]).size / 1024;
    logger.info(`Optimized HTML size: ${optimizedSizeKB.toFixed(2)}KB (reduced by ${(htmlSizeKB - optimizedSizeKB).toFixed(2)}KB)`);

    // Call code.to.design API with optimized HTML
    const response = await fetch('https://api.to.design/html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        html: optimizedHTML,
        css: css || '',
        clip: true,
      }),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      logger.error('code.to.design API error:');
      logger.error('Status:', response.status, response.statusText);
      logger.error('Response:', responseText.substring(0, 500));

      if (response.status === 401) {
        return json({ error: 'Invalid API key for Figma export service' }, { status: 401 });
      }

      if (response.status === 429) {
        return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
      }

      // Handle memory errors specifically
      if (responseText.includes('memory access out of bounds') || response.status === 500) {
        return json({ 
          error: 'Design too complex for Figma export. Try simplifying your design, removing large images, or splitting into smaller components.' 
        }, { status: 413 });
      }

      return json({ error: `Figma export failed: ${response.statusText}` }, { status: response.status });
    }

    logger.info('Successfully generated Figma clipboard data');
    logger.info('Response length:', responseText.length);
    
    return json({
      success: true,
      clipboardData: responseText,
    });


  } catch (error: any) {
    logger.error('Export to Figma error:', error);

    // Handle JSON parsing errors specifically
    if (error.message?.includes('JSON')) {
      return json(
        {
          error: 'Invalid response from Figma export service',
        },
        { status: 500 },
      );
    }

    return json(
      {
        error: error.message || 'An unexpected error occurred during Figma export',
      },
      { status: 500 },
    );
  }
}
