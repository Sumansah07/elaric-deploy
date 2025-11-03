import { useState } from 'react';
import { Button } from '~/components/ui/Button';
import { useToast } from '~/components/ui/use-toast';
import { classNames } from '~/utils/classNames';

interface ExportToFigmaProps {
  html: string;
  css: string;
  js?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  buttonText?: string;
  showIcon?: boolean;
}

export function ExportToFigma({
  html,
  css,
  js,
  className,
  variant = 'default',
  size = 'default',
  buttonText = 'Export to Figma',
  showIcon = true,
}: ExportToFigmaProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const handleExportToFigma = async () => {
    if (!html) {
      error('No design content to export');
      return;
    }

    setIsLoading(true);

    try {
      // Combine HTML, CSS, and JS into a complete HTML document
      const combinedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${css || ''}
  </style>
</head>
<body>
  ${html}
  ${
    js
      ? `<script>
    (function() {
      'use strict';
      ${js}
    })();
  </script>`
      : ''
  }
</body>
</html>`;

      // Call our Remix API route with combined HTML
      const response = await fetch('/api/export-to-figma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html: combinedHTML, css: '' }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = 'Failed to export to Figma';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch {
          console.error('Server returned non-JSON response:', text.substring(0, 200));
          errorMsg = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = (await response.json()) as { error?: string; clipboardData?: string };

      // Copy the Figma clipboard HTML to user's clipboard with proper HTML mime type
      const blob = new Blob([data.clipboardData || ''], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);

      // Show success message with instructions
      success('Design copied! Open Figma and press Cmd+V (Mac) or Ctrl+V (Windows) to paste', {
        duration: 8000,
      });
    } catch (err: any) {
      console.error('Export to Figma error:', err);

      // Handle specific error cases
      if (err.message?.includes('clipboard')) {
        error('Failed to copy to clipboard. Please check browser permissions.');
      } else if (err.message?.includes('API key')) {
        error('Figma export is not configured. Please contact support.');
      } else if (err.message?.includes('Rate limit')) {
        error('Export limit reached. Please try again later.');
      } else {
        error(err.message || 'Failed to export to Figma. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleExportToFigma}
      disabled={isLoading || !html}
      variant={variant}
      size={size}
      className={classNames('gap-2 transition-all', isLoading && 'opacity-70 cursor-wait', className)}
    >
      {showIcon && (
        <div className={classNames('text-base', isLoading ? 'i-svg-spinners:90-ring-with-bg' : 'i-ph:figma-logo')} />
      )}
      {isLoading ? 'Exporting...' : buttonText}
    </Button>
  );
}

// Compact version for dropdown menus or icon buttons
export function ExportToFigmaIconButton({
  html,
  css,
  js,
  className,
}: Pick<ExportToFigmaProps, 'html' | 'css' | 'js' | 'className'>) {
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const handleExportToFigma = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!html) {
      error('No design content to export');
      return;
    }

    setIsLoading(true);

    try {
      // Combine HTML, CSS, and JS into a complete HTML document
      const combinedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${css || ''}
  </style>
</head>
<body>
  ${html}
  ${
    js
      ? `<script>
    (function() {
      'use strict';
      ${js}
    })();
  </script>`
      : ''
  }
</body>
</html>`;

      const response = await fetch('/api/export-to-figma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ html: combinedHTML, css: '' }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMsg = 'Failed to export to Figma';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch {
          console.error('Server returned non-JSON response:', text.substring(0, 200));
          errorMsg = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = (await response.json()) as { error?: string; clipboardData?: string };

      const blob = new Blob([data.clipboardData || ''], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([clipboardItem]);

      success('Design copied to clipboard! Paste in Figma (Cmd/Ctrl+V)', {
        duration: 8000,
      });
    } catch (err: any) {
      console.error('Export to Figma error:', err);
      error(err.message || 'Failed to export to Figma');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleExportToFigma}
      disabled={isLoading || !html}
      className={classNames(
        'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
        'hover:bg-bolt-elements-background-depth-2 disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      <div className={classNames('text-base', isLoading ? 'i-svg-spinners:90-ring-with-bg' : 'i-ph:figma-logo')} />
      <span>{isLoading ? 'Exporting...' : 'Export to Figma'}</span>
    </button>
  );
}
