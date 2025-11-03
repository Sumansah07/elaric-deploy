import { useEffect, useRef } from 'react';

interface BackgroundPathsProps {
  className?: string;
  pathColor?: string;
  pathWidth?: number;
  pathCount?: number;
  duration?: number;
}

export function BackgroundPaths({
  className = '',
  pathColor = 'rgba(139, 92, 246, 0.3)',
  pathWidth = 2,
  pathCount = 5,
  duration = 20,
}: BackgroundPathsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    // Set canvas size
    const resizeCanvas = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Path class
    class Path {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      points: { x: number; y: number }[];
      speed: number;
      opacity: number;
      fadeDirection: number;

      constructor() {
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = Math.random() * (canvas?.height || window.innerHeight);
        this.targetX = Math.random() * (canvas?.width || window.innerWidth);
        this.targetY = Math.random() * (canvas?.height || window.innerHeight);
        this.points = [{ x: this.x, y: this.y }];
        this.speed = 0.5 + Math.random() * 1;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.fadeDirection = Math.random() > 0.5 ? 1 : -1;
      }

      update() {
        // Move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50) {
          // Set new target
          this.targetX = Math.random() * (canvas?.width || window.innerWidth);
          this.targetY = Math.random() * (canvas?.height || window.innerHeight);
        }

        this.x += (dx / distance) * this.speed;
        this.y += (dy / distance) * this.speed;

        // Add current position to points array
        this.points.push({ x: this.x, y: this.y });

        // Keep only last 100 points
        if (this.points.length > 100) {
          this.points.shift();
        }

        // Update opacity
        this.opacity += this.fadeDirection * 0.005;

        if (this.opacity >= 0.7 || this.opacity <= 0.2) {
          this.fadeDirection *= -1;
        }
      }

      draw(context: CanvasRenderingContext2D) {
        if (this.points.length < 2) {
          return;
        }

        context.beginPath();
        context.moveTo(this.points[0].x, this.points[0].y);

        for (let i = 1; i < this.points.length; i++) {
          const point = this.points[i];
          const prevPoint = this.points[i - 1];

          // Create gradient along the path
          const gradient = context.createLinearGradient(prevPoint.x, prevPoint.y, point.x, point.y);

          const alpha = (i / this.points.length) * this.opacity;
          gradient.addColorStop(0, pathColor.replace('0.3', String(alpha * 0.5)));
          gradient.addColorStop(1, pathColor.replace('0.3', String(alpha)));

          context.strokeStyle = gradient;
          context.lineWidth = pathWidth;
          context.lineCap = 'round';
          context.lineJoin = 'round';

          context.lineTo(point.x, point.y);
          context.stroke();
          context.beginPath();
          context.moveTo(point.x, point.y);
        }
      }
    }

    // Create paths
    const paths: Path[] = [];

    for (let i = 0; i < pathCount; i++) {
      paths.push(new Path());
    }

    // Animation loop
    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas?.width || 0, canvas?.height || 0);

      paths.forEach((path) => {
        path.update();
        path.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [pathColor, pathWidth, pathCount, duration]);

  return (
    <canvas ref={canvasRef} className={`fixed inset-0 pointer-events-none z-0 ${className}`} style={{ opacity: 0.6 }} />
  );
}
