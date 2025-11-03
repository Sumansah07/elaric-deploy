/**
 * Generate preview URLs from HTML/CSS/JS without WebContainer
 */

export function generatePreviewFromCode(html: string, css?: string, js?: string): string {
  const fullHTML = `
<!DOCTYPE html>
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
  <script>
    ${js || ''}
  </script>
</body>
</html>
  `;

  // Create blob URL for iframe
  const blob = new Blob([fullHTML], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

export function revokePreviewUrl(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
