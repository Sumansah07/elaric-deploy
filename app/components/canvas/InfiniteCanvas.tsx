import { memo, useCallback, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { PagePreviewCard } from './PagePreviewCard';
import { useStore } from '@nanostores/react';
import { canvasStore } from '~/lib/stores/canvas';

interface InfiniteCanvasProps {
  className?: string;
}

export const InfiniteCanvas = memo(({ className = '' }: InfiniteCanvasProps) => {
  const pagesMap = useStore(canvasStore.pages);
  const pages = Object.values(pagesMap);
  const [isDragging, setIsDragging] = useState(false);

  const handlePanningStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handlePanningStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleReorganize = useCallback(() => {
    canvasStore.reorganizePages();
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-bolt-elements-background-depth-1 ${className}`}>
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={2}
        limitToBounds={false}
        centerOnInit={false}
        wheel={{ step: 0.05 }}
        panning={{ velocityDisabled: true }}
        onPanningStart={handlePanningStart}
        onPanningStop={handlePanningStop}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 bg-bolt-elements-background-depth-2 rounded-lg p-2 shadow-lg border border-bolt-elements-borderColor">
              <button
                onClick={() => zoomIn()}
                className="p-2 hover:bg-bolt-elements-background-depth-3 rounded transition-colors"
                title="Zoom In"
              >
                <div className="i-ph:plus text-xl" />
              </button>
              <button
                onClick={() => zoomOut()}
                className="p-2 hover:bg-bolt-elements-background-depth-3 rounded transition-colors"
                title="Zoom Out"
              >
                <div className="i-ph:minus text-xl" />
              </button>
              <button
                onClick={() => resetTransform()}
                className="p-2 hover:bg-bolt-elements-background-depth-3 rounded transition-colors"
                title="Reset View"
              >
                <div className="i-ph:arrows-out text-xl" />
              </button>
              <div className="border-t border-bolt-elements-borderColor my-1" />
              <button
                onClick={handleReorganize}
                className="p-2 hover:bg-bolt-elements-background-depth-3 rounded transition-colors"
                title="Reorganize Pages (Fix Overlaps)"
              >
                <div className="i-ph:grid-four text-xl" />
              </button>
            </div>

            {/* Canvas Dot Pattern Background */}
            <div
  className="absolute inset-0 pointer-events-none"
  style={{
    backgroundImage: `
      radial-gradient(circle, rgba(255, 255, 255, 0.09) 1.5px, transparent 1px),
      radial-gradient(circle, rgba(255, 255, 255, 0.05) 1.5px, transparent 1px)
    `,
    backgroundSize: '20px 20px, 100px 100px',
    backgroundPosition: '0 0, 0 0',
  }}
/>

            {/* Transformable Canvas Content */}
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%' }}
            >
              <div className="relative" style={{ width: '5000px', height: '5000px' }}>
                {pages.map((page) => (
                  <PagePreviewCard key={page.id} page={page} isDragging={isDragging} />
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
});

InfiniteCanvas.displayName = 'InfiniteCanvas';
