import { memo, useRef, useState, useEffect, useCallback } from 'react';
import type { PageInfo } from '~/lib/stores/canvas';
import { canvasStore } from '~/lib/stores/canvas';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { ExportToFigmaIconButton } from './ExportToFigma';

interface PagePreviewCardProps {
  page: PageInfo;
  isDragging: boolean;
}

export const PagePreviewCard = memo(({ page, isDragging }: PagePreviewCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasMeasuredRef = useRef(false); // Track if we've already measured this page
  const measurementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentRef = useRef<string>(''); // Track previous content to avoid unnecessary updates

  const [isCardDragging, setIsCardDragging] = useState(false);
  const [isSelected, setIsSelected] = useState(false); // Track selection state (Google Stitch style)
  const [showCode, setShowCode] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contentHeight, setContentHeight] = useState(600); // Default height, will auto-adjust
  const [useAutoHeight, setUseAutoHeight] = useState(true); // Auto-adjust height to content by default
  const [showHeightControls, setShowHeightControls] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ y: 0, height: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDragging) return; // Don't start card drag if canvas is being dragged

    e.stopPropagation();
    setIsCardDragging(true);
    setDragStart({
      x: e.clientX - page.position.x,
      y: e.clientY - page.position.y,
    });
  };

  // Handle card selection (Google Stitch style - click to select)
  const handleCardClick = (e: React.MouseEvent) => {
    if (isCardDragging) return;
    e.stopPropagation();
    setIsSelected(true);
  };

  // Deselect when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsSelected(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isCardDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    canvasStore.updatePagePosition(page.id, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsCardDragging(false);
  };

  // Manual height adjustment functions
  const adjustHeight = (delta: number) => {
    const newHeight = Math.max(200, Math.min(contentHeight + delta, 1200));
    setContentHeight(newHeight);
    updatePageHeight(newHeight);
  };

  const setExactHeight = (height: number) => {
    const clampedHeight = Math.max(200, Math.min(height, 1200));
    setContentHeight(clampedHeight);
    updatePageHeight(clampedHeight);
  };

  const updatePageHeight = (height: number) => {
    const currentPage = canvasStore.getPageById(page.id);

    if (currentPage) {
      canvasStore.updatePageSize(page.id, {
        ...currentPage.size,
        height: height + 40,
      });
    }
  };

  // Resize handle functions
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      y: e.clientY,
      height: contentHeight,
    });
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaY = e.clientY - resizeStart.y;
    const newHeight = Math.max(200, Math.min(resizeStart.height + deltaY, 1200));
    setContentHeight(newHeight);
  };

  const handleResizeEnd = () => {
    if (isResizing) {
      setIsResizing(false);
      updatePageHeight(contentHeight);
    }
  };

  // Function to adjust iframe height based on content
  const adjustIframeHeight = useCallback(() => {
    if (!useAutoHeight) return;
    if (hasMeasuredRef.current) return; // Already measured, don't measure again

    const iframe = iframeRef.current;
    if (!iframe) return;

    const measureHeight = () => {
      try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDocument) {
          console.warn('Cannot access iframe document - using default height');
          setContentHeight(600);
          return;
        }

        // Wait a bit for content to render
        setTimeout(() => {
          try {
            const body = iframeDocument.body;
            const html = iframeDocument.documentElement;

            if (!body) {
              setContentHeight(600);
              return;
            }

            // 🎯 METHOD 3: Check if AI provided a content-height hint
            const aiProvidedHeight = body.getAttribute('data-content-height');

            if (aiProvidedHeight) {
              const hintHeight = parseInt(aiProvidedHeight, 10);

              if (!isNaN(hintHeight) && hintHeight > 0 && hintHeight < 5000) {
                // AI provided a valid height hint - use it!
                const minHeight = 200;
                const maxHeight = 3500;
                const finalHeight = Math.max(minHeight, Math.min(hintHeight, maxHeight));

                console.log('✨ Using AI-provided height for', page.name, ':', {
                  aiHint: hintHeight,
                  finalHeight,
                });

                setContentHeight(finalHeight);
                hasMeasuredRef.current = true; // Mark as measured

                // Update store only if height actually changed
                const currentPage = canvasStore.getPageById(page.id);

                if (currentPage && currentPage.size.height !== finalHeight + 40) {
                  canvasStore.updatePageSize(page.id, {
                    ...currentPage.size,
                    height: finalHeight + 40,
                  });
                }

                return; // Skip measurement, AI hint is reliable
              }
            }

            // 🔍 METHOD 4: Fallback to measurement if no AI hint
            console.log('📏 No AI hint found for', page.name, ', measuring...');

            const bodyScrollHeight = body.scrollHeight;
            const htmlScrollHeight = html.scrollHeight;
            const bodyOffsetHeight = body.offsetHeight;

            // Use the MAXIMUM to ensure we capture full content height
            let measuredHeight = Math.max(bodyScrollHeight, htmlScrollHeight, bodyOffsetHeight);

            // Apply sensible constraints
            const minHeight = 200;
            const maxHeight = 3000;
            const defaultHeight = 600;

            // Validate the measured height
            if (measuredHeight < 10 || measuredHeight > 10000 || isNaN(measuredHeight)) {
              console.warn('Invalid height measurement, using default:', measuredHeight);
              measuredHeight = defaultHeight;
            }

            // Apply constraints with minimal padding
            const finalHeight = Math.max(minHeight, Math.min(measuredHeight + 20, maxHeight));

            console.log('📏 Measured height for', page.name, ':', {
              bodyScrollHeight,
              htmlScrollHeight,
              bodyOffsetHeight,
              measuredHeight,
              finalHeight,
            });

            setContentHeight(finalHeight);
            hasMeasuredRef.current = true; // Mark as measured

            // Update store only if height actually changed
            const currentPage = canvasStore.getPageById(page.id);

            if (currentPage && currentPage.size.height !== finalHeight + 40) {
              canvasStore.updatePageSize(page.id, {
                ...currentPage.size,
                height: finalHeight + 40,
              });
            }

            // Note: No retry needed - AI hint provides accurate height, measurement is just fallback
          } catch (innerError) {
            console.warn('Error measuring content height:', innerError);
            setContentHeight(600);
          }
        }, 300);
      } catch (error) {
        console.warn('Error accessing iframe content:', error);
        setContentHeight(600);
      }
    };

    // Set up load handler
    if (iframe.contentDocument?.readyState === 'complete') {
      measureHeight();
    } else {
      iframe.onload = measureHeight;
    }
  }, [page.id, useAutoHeight, page.size.height]);

  // Update iframe content without changing src (prevents flickering)
  const updateIframeContent = useCallback(
    (html: string, css?: string, js?: string) => {
      const iframe = iframeRef.current;
      if (!iframe) return;

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
  ${
    js
      ? `<script>
    // Wrap in IIFE to prevent variable collision between pages
    (function() {
      'use strict';
      ${js}
    })();
  </script>`
      : ''
  }
</body>
</html>
    `;

      // Only update if content actually changed
      if (previousContentRef.current === fullHTML) return;
      previousContentRef.current = fullHTML;

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(fullHTML);
          iframeDoc.close();

          // Measure height after content update
          if (useAutoHeight && !hasMeasuredRef.current) {
            setTimeout(() => {
              adjustIframeHeight();
            }, 200);
          }
        }
      } catch (error) {
        console.warn('Failed to update iframe content:', error);
      }
    },
    [useAutoHeight, adjustIframeHeight],
  );

  // Use useEffect for event listeners to prevent memory leaks
  useEffect(() => {
    if (isCardDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isCardDragging, dragStart]);

  // Resize event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStart, contentHeight]);

  // Update iframe content when page HTML/CSS/JS changes (without reloading)
  useEffect(() => {
    if (page.html) {
      updateIframeContent(page.html, page.css, page.js);
    }
  }, [page.html, page.css, page.js, updateIframeContent]);

  // Adjust iframe height when preview URL changes or content loads
  useEffect(() => {
    if (!showCode && page.previewUrl && useAutoHeight) {
      // Clear any existing timeouts
      if (measurementTimeoutRef.current) {
        clearTimeout(measurementTimeoutRef.current);
      }

      // Wait for iframe to fully load before measuring
      const iframe = iframeRef.current;
      if (iframe && !hasMeasuredRef.current) {
        // Single measurement after content loads
        measurementTimeoutRef.current = setTimeout(() => {
          adjustIframeHeight();
        }, 500);

        return () => {
          if (measurementTimeoutRef.current) {
            clearTimeout(measurementTimeoutRef.current);
          }
        };
      }
    }
  }, [page.previewUrl, showCode, useAutoHeight, adjustIframeHeight]);

  // Reset to default height when auto-height is disabled
  useEffect(() => {
    if (!useAutoHeight) {
      setContentHeight(600);
      hasMeasuredRef.current = false; // Reset measurement flag
    }
  }, [useAutoHeight]);

  // Reset measurement flag when page URL changes (new content)
  useEffect(() => {
    hasMeasuredRef.current = false;
  }, [page.previewUrl]);

  return (
    <div
      ref={cardRef}
      className={`absolute bg-bolt-elements-background-depth-2 rounded-lg shadow-xl overflow-hidden transition-all ${
        isSelected ? 'border-2 border-blue-500 ring-2 ring-blue-500/20' : 'border border-bolt-elements-borderColor'
      }`}
      style={{
        left: `${page.position.x}px`,
        top: `${page.position.y}px`,
        width: `${page.size.width}px`,
        height: useAutoHeight
          ? `${contentHeight + (isSelected ? (showHeightControls ? 78 : 48) : 0)}px`
          : `${contentHeight + (isSelected ? (showHeightControls ? 78 : 48) : 0)}px`,
        cursor: isCardDragging ? 'grabbing' : 'default',
        transition: isCardDragging ? 'none' : 'all 0.2s ease',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleCardClick}
    >
      {/* Card Header - Only show when selected (Google Stitch style) */}
      {isSelected && (
        <div className="flex items-center justify-between px-3 py-2 bg-bolt-elements-background-depth-3 border-b border-bolt-elements-borderColor mb-2">
          <div className="flex items-center gap-2">
            <div className="i-ph:file-html text-lg" />
            <span className="text-sm font-medium text-bolt-elements-textPrimary">{page.name}</span>
            {/* {useAutoHeight && (
              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">
                Auto
              </span>
            )} */}
          </div>
          <div className="flex items-center gap-3">
            {/* View Code Button - Google Stitch Style */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCodeModal(true);
              }}
              className="p-1 hover:bg-bolt-elements-background-depth-2 rounded transition-colors"
              title="View Code"
            >
              <div className="i-ph:code text-lg" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHeightControls(!showHeightControls);
              }}
              className={`p-1.5 hover:bg-bolt-elements-background-depth-2 rounded transition-colors ${
                showHeightControls ? 'text-white-500' : 'text-gray-100'
              }`}
              title={useAutoHeight ? 'Height: Auto-adjusted' : 'Adjust Height'}
            >
              <div className="i-ph:arrows-out-simple text-sm" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUseAutoHeight(!useAutoHeight);
              }}
              className={`p-1 hover:bg-bolt-elements-background-depth-2 rounded transition-colors ${
                useAutoHeight ? 'text-white-500' : 'text-gray-100'
              }`}
              title={useAutoHeight ? 'Switch to Fixed Height' : 'Switch to Auto Height'}
            >
              <div className="i-ph:arrows-vertical text-sm" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Force reload the preview by clearing cache and updating iframe
                previousContentRef.current = ''; // Clear cache to force update
                if (page.html) {
                  updateIframeContent(page.html, page.css, page.js);
                }
              }}
              className="p-1 hover:bg-bolt-elements-background-depth-2 rounded transition-colors"
              title="Reload Preview"
            >
              <div className="i-ph:arrow-clockwise text-sm" />
            </button>
            {/* <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCode(!showCode);
              }}
              className="p-1 hover:bg-bolt-elements-background-depth-2 rounded transition-colors"
              title="View Code"
            >
              <div className="i-ph:code text-sm" />
            </button> */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="p-1 hover:bg-bolt-elements-background-depth-2 rounded transition-colors"
                  title="Download options"
                >
                  <div className="i-ph:download text-sm" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                className="z-50 min-w-[200px] bg-white dark:bg-[#141414] rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-800/50 p-1"
                side="bottom"
                align="end"
              >
                <DropdownMenu.Item
                  className="cursor-pointer flex items-center px-3 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive rounded-md gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
${page.css}
  </style>
</head>
<body>
${page.html}
          <script>
${page.js}
          </script>
</body>
</html>`;
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${page.name}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <div className="i-ph:code text-base" />
                  Download HTML
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="cursor-pointer flex items-center px-3 py-2 text-sm text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive rounded-md gap-2"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      // Use html2canvas to capture the iframe as image
                      const iframe = iframeRef.current;
                      if (!iframe) {
                        throw new Error('Iframe not found');
                      }

                      // Import html2canvas dynamically
                      const html2canvas = (await import('html2canvas')).default;

                      // Capture the iframe content
                      const canvas = await html2canvas(iframe.contentDocument?.body || iframe, {
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: null,
                      });

                      // Convert to blob
                      canvas.toBlob(async (blob) => {
                        if (!blob) {
                          throw new Error('Failed to create image blob');
                        }

                        // Write image to clipboard
                        await navigator.clipboard.write([
                          new ClipboardItem({
                            'image/png': blob,
                          }),
                        ]);

                        alert('Design image copied to clipboard! Paste in Figma to add as image layer.');
                      }, 'image/png');
                    } catch (error) {
                      console.error('Failed to copy image to clipboard:', error);
                      // Fallback to HTML copy
                      const htmlContent = `<!DOCTYPE html>
<html>
<head><style>${page.css}</style></head>
<body>${page.html}</body>
</html>`;
                      await navigator.clipboard.writeText(htmlContent);
                      alert('Copied HTML to clipboard as fallback.');
                    }
                  }}
                >
                  <div className="i-ph:image text-base" />
                  Copy Image to Figma
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-bolt-elements-borderColor my-1" />
                <DropdownMenu.Item className="cursor-pointer" onSelect={(e) => e.preventDefault()} asChild>
                  <ExportToFigmaIconButton html={page.html} css={page.css} js={page.js} />
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
            {/* <button
              onClick={(e) => {
                e.stopPropagation();
                canvasStore.setActivePage(page.id);
              }}
              className="p-1 hover:bg-bolt-elements-background-depth-2 rounded transition-colors"
              title="Edit"
            >
              <div className="i-ph:pencil text-sm" />
            </button> */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                canvasStore.removePage(page.id);
              }}
              className="p-1 hover:bg-bolt-elements-background-depth-2 rounded transition-colors text-red-900"
              title="Delete"
            >
              <div className="i-ph:x text-lg" />
            </button>
          </div>
        </div>
      )}

      {/* Height Controls Panel */}
      {showHeightControls && (
        <div className="px-3 py-2 bg-bolt-elements-background-depth-1 border-b border-bolt-elements-borderColor">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-bolt-elements-textSecondary">Height:</span>
            <input
              type="number"
              value={Math.round(contentHeight)}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 200;
                setExactHeight(value);
              }}
              className="px-1 py-0.5 text-xs text-white bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded"
              min="200"
              max="1200"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-bolt-elements-textSecondary">px</span>
            <div className="flex gap-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustHeight(-50);
                }}
                className="px-1 py-0.5 text-xs text-white bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded"
                title="Decrease height"
              >
                -50
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  adjustHeight(50);
                }}
                className="px-1 py-0.5 text-xs text-white bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded"
                title="Increase height"
              >
                +50
              </button>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExactHeight(400);
                }}
                className="px-1 py-0.5 text-xs text-white bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded"
              >
                Small
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExactHeight(600);
                }}
                className="px-1 py-0.5 text-xs text-white bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded"
              >
                Medium
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExactHeight(800);
                }}
                className="px-1 py-0.5 text-xs text-white bg-bolt-elements-background-depth-2 hover:bg-bolt-elements-background-depth-3 border border-bolt-elements-borderColor rounded"
              >
                Large
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Content - Google Stitch Style */}
      <div
        className="w-full bg-white relative overflow-hidden"
        style={{
          height: useAutoHeight
            ? `${contentHeight}px`
            : `${page.size.height - (isSelected ? (showHeightControls ? 78 : 48) : 0)}px`,
        }}
      >
        {showCode ? (
          <div className="w-full h-full p-3 bg-gray-900 text-green-400 font-mono text-xs overflow-auto">
            <div className="mb-2 text-yellow-400 font-bold">HTML:</div>
            <pre className="mb-4 whitespace-pre-wrap">{page.html}</pre>

            {page.css && (
              <>
                <div className="mb-2 text-blue-400 font-bold">CSS:</div>
                <pre className="mb-4 whitespace-pre-wrap">{page.css}</pre>
              </>
            )}

            {page.js && (
              <>
                <div className="mb-2 text-purple-400 font-bold">JavaScript:</div>
                <pre className="whitespace-pre-wrap">{page.js}</pre>
              </>
            )}
          </div>
        ) : (
          <>
            <iframe
              ref={iframeRef}
              className="w-full h-full border-none"
              style={{
                height: `${contentHeight}px`,
                pointerEvents: isSelected ? 'none' : 'none', // Always disable iframe interactions (Google Stitch style)
                background: '#ffffff',
              }}
              sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
              title={page.name}
            />
            {/* Overlay to capture clicks and prevent iframe interactions (Google Stitch style) */}
            {!isSelected && (
              <div
                className="absolute inset-0 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={handleCardClick}
              />
            )}
          </>
        )}
      </div>

      {/* Resize Handle - Only show when auto-height is disabled */}
      {!useAutoHeight && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize bg-transparent hover:bg-blue-500/20 transition-colors flex items-center justify-center group"
          onMouseDown={handleResizeStart}
          title="Drag to resize height (Auto-height disabled)"
        >
          <div className="w-12 h-1 bg-gray-400 group-hover:bg-blue-500 rounded transition-colors"></div>
        </div>
      )}

      {/* Full-Screen Code Modal - Google Stitch Style */}
      <Dialog.Root open={showCodeModal} onOpenChange={setShowCodeModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm" />
          <Dialog.Content className="fixed inset-4 md:inset-8 bg-bolt-elements-background-depth-1 rounded-lg shadow-2xl z-50 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
              <div className="flex items-center gap-3">
                <div className="i-ph:code text-xl text-bolt-elements-textPrimary" />
                <Dialog.Title className="text-lg font-semibold text-bolt-elements-textPrimary">
                  {page.name} - Code
                </Dialog.Title>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const fullCode = `${page.html || ''}\n\n/* CSS */\n${page.css || ''}\n\n/* JavaScript */\n${page.js || ''}`;
                    navigator.clipboard.writeText(fullCode);
                  }}
                  className="px-3 py-1.5 text-sm bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4 rounded-md transition-colors text-bolt-elements-textPrimary flex items-center gap-2"
                  title="Copy Code"
                >
                  <div className="i-ph:copy text-base" />
                  Copy code
                </button>
                <Dialog.Close className="p-1.5 hover:bg-bolt-elements-background-depth-3 rounded transition-colors text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary">
                  <div className="i-ph:x text-xl" />
                </Dialog.Close>
              </div>
            </div>

            {/* Modal Content - Code Display */}
            <div className="flex-1 overflow-auto p-4 bg-[#1e1e1e]">
              <div className="space-y-6">
                {/* HTML Section */}
                {page.html && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-[#2d2d2d] rounded-t-md">
                      <div className="i-ph:file-html text-orange-400" />
                      <span className="text-sm font-semibold text-orange-400">HTML</span>
                    </div>
                    <pre className="bg-[#1e1e1e] text-gray-300 p-4 rounded-b-md overflow-x-auto font-mono text-sm border border-[#2d2d2d]">
                      <code>{page.html}</code>
                    </pre>
                  </div>
                )}

                {/* CSS Section */}
                {page.css && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-[#2d2d2d] rounded-t-md">
                      <div className="i-ph:paint-brush text-blue-400" />
                      <span className="text-sm font-semibold text-blue-400">CSS</span>
                    </div>
                    <pre className="bg-[#1e1e1e] text-gray-300 p-4 rounded-b-md overflow-x-auto font-mono text-sm border border-[#2d2d2d]">
                      <code>{page.css}</code>
                    </pre>
                  </div>
                )}

                {/* JavaScript Section */}
                {page.js && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-[#2d2d2d] rounded-t-md">
                      <div className="i-ph:file-js text-yellow-400" />
                      <span className="text-sm font-semibold text-yellow-400">JavaScript</span>
                    </div>
                    <pre className="bg-[#1e1e1e] text-gray-300 p-4 rounded-b-md overflow-x-auto font-mono text-sm border border-[#2d2d2d]">
                      <code>{page.js}</code>
                    </pre>
                  </div>
                )}

                {!page.html && !page.css && !page.js && (
                  <div className="text-center py-12 text-bolt-elements-textSecondary">
                    <div className="i-ph:code-simple text-4xl mb-2 opacity-50" />
                    <p>No code available for this page</p>
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
});

PagePreviewCard.displayName = 'PagePreviewCard';
