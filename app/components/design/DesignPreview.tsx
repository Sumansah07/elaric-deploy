import React, { useEffect, useState } from 'react';

interface DesignPreview {
  id: string;
  html: string;
  title: string;
}

interface DesignPreviewProps {
  content: string;
  onDesignsDetected?: (designs: DesignPreview[]) => void;
}

export const DesignPreview: React.FC<DesignPreviewProps> = ({ content, onDesignsDetected }) => {
  const [designs, setDesigns] = useState<DesignPreview[]>([]);

  useEffect(() => {
    const detectHTMLDesigns = (text: string): DesignPreview[] => {
      const htmlBlocks: DesignPreview[] = [];
      
      // Detect HTML blocks with <!DOCTYPE html> or <html>
      const fullHTMLRegex = /(?:<!DOCTYPE html>[\s\S]*?<html[\s\S]*?<\/html>)|(?:<html[\s\S]*?<\/html>)/gi;
      const fullMatches = text.match(fullHTMLRegex);
      
      if (fullMatches) {
        fullMatches.forEach((match, index) => {
          const titleMatch = match.match(/<title>(.*?)<\/title>/i);
          const title = titleMatch ? titleMatch[1] : `Design ${index + 1}`;
          
          htmlBlocks.push({
            id: `design-${Date.now()}-${index}`,
            html: match,
            title
          });
        });
      }
      
      // Detect standalone HTML components
      const componentRegex = /<(?:div|section|main|article|header|footer|nav)[\s\S]*?<\/(?:div|section|main|article|header|footer|nav)>/gi;
      const componentMatches = text.match(componentRegex);
      
      if (componentMatches && !fullMatches) {
        componentMatches.forEach((match, index) => {
          const wrappedHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Component ${index + 1}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                * { box-sizing: border-box; }
              </style>
            </head>
            <body>
              ${match}
            </body>
            </html>
          `;
          
          htmlBlocks.push({
            id: `component-${Date.now()}-${index}`,
            html: wrappedHTML,
            title: `Component ${index + 1}`
          });
        });
      }
      
      return htmlBlocks;
    };

    const detectedDesigns = detectHTMLDesigns(content);
    setDesigns(detectedDesigns);
    onDesignsDetected?.(detectedDesigns);
  }, [content, onDesignsDetected]);

  if (designs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">No HTML designs detected. Generate some HTML content to see previews.</p>
      </div>
    );
  }

  return (
    <div className="design-canvas space-y-4">
      <h3 className="text-lg font-semibold mb-4">Design Previews ({designs.length})</h3>
      
      <div className="grid gap-4" style={{ gridTemplateColumns: designs.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {designs.map((design) => (
          <div key={design.id} className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-3 py-2 border-b">
              <h4 className="text-sm font-medium text-gray-700">{design.title}</h4>
            </div>
            
            <div className="relative" style={{ height: designs.length === 1 ? '600px' : '400px' }}>
              <iframe
                srcDoc={design.html}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                title={design.title}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DesignPreview;