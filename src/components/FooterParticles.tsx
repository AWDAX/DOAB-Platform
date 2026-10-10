import { useEffect, useRef } from 'react';

interface FooterParticlesProps {
  text?: string;
  darkMode?: boolean;
}

export default function FooterParticles({ text = 'DOAB', darkMode = true }: FooterParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let particles: any[] = [];
    let animationFrameId: number | null = null;
    let isVisible = false;
    const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      radius: 130,
      isHovering: false,
      hoverIntensity: 0
    };

    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();

      width = Math.floor(rect.width) || window.innerWidth;
      height = Math.max(100, Math.min(220, Math.floor(width * 0.16)));
      if (width < 600) {
        height = Math.max(110, Math.min(160, Math.floor(width * 0.24)));
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      mouse.radius = Math.max(80, Math.min(150, width * 0.12));
      generateParticles();
    };

    const generateParticles = () => {
      const offscreen = document.createElement('canvas');
      const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;

      offscreen.width = width;
      offscreen.height = height;

      let fontSize = Math.floor(width / (text.length * 0.65));
      fontSize = Math.max(28, Math.min(fontSize, 100));

      offCtx.font = '900 ' + fontSize + 'px "Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#ffffff';

      const textMetrics = offCtx.measureText(text);
      if (textMetrics.width > width * 0.92) {
        const scale = (width * 0.92) / textMetrics.width;
        fontSize = Math.floor(fontSize * scale);
        offCtx.font = '900 ' + fontSize + 'px "Space Grotesk", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      }

      const centerX = width / 2;
      const centerY = height / 2;
      offCtx.fillText(text, centerX, centerY);

      const imgData = offCtx.getImageData(0, 0, width, height).data;
      const newParticles: any[] = [];
      const step = width < 600 ? 3 : (width < 1100 ? 4 : 4);

      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (y * width + x) * 4;
          const alpha = imgData[index + 3];

          if (alpha > 120) {
            const jitterX = (Math.random() - 0.5) * (step * 0.9);
            const jitterY = (Math.random() - 0.5) * (step * 0.9);

            const originX = x + jitterX;
            const originY = y + jitterY;

            const sizeRand = Math.random();
            const radius = sizeRand > 0.85 ? 1.4 : (sizeRand > 0.4 ? 1.0 : 0.7);

            newParticles.push({
              x: originX,
              y: originY,
              originX: originX,
              originY: originY,
              vx: 0,
              vy: 0,
              radius: radius,
              baseAlpha: sizeRand > 0.85 ? 0.85 : (sizeRand > 0.4 ? 0.6 : 0.35),
              currentAlpha: 0,
              color: darkMode ? '255, 255, 255' : '15, 23, 42',
              friction: 0.88 + Math.random() * 0.05,
              ease: 0.08 + Math.random() * 0.04
            });
          }
        }
      }

      particles = newParticles;
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Lerp mouse
      mouse.x += (mouse.targetX - mouse.x) * 0.2;
      mouse.y += (mouse.targetY - mouse.y) * 0.2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!isReducedMotion) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouse.radius && mouse.isHovering) {
            const force = (1 - dist / mouse.radius) * 12;
            const angle = Math.atan2(dy, dx);
            p.vx -= Math.cos(angle) * force;
            p.vy -= Math.sin(angle) * force;
          }

          p.vx += (p.originX - p.x) * p.ease;
          p.vy += (p.originY - p.y) * p.ease;

          p.vx *= p.friction;
          p.vy *= p.friction;

          p.x += p.vx;
          p.y += p.vy;
        }

        p.currentAlpha += (p.baseAlpha - p.currentAlpha) * 0.1;

        ctx.fillStyle = `rgba(${p.color}, ${p.currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isVisible) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) {
        resize();
        animate();
      } else if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    }, { threshold: 0.05 });

    observer.observe(container);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.isHovering = true;
    };

    const handleMouseLeave = () => {
      mouse.targetX = -9999;
      mouse.targetY = -9999;
      mouse.isHovering = false;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', resize);

    return () => {
      observer.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, [text, darkMode]);

  return (
    <div 
      ref={containerRef} 
      className="w-full flex items-center justify-center relative overflow-hidden select-none cursor-default py-4 opacity-85 hover:opacity-100 transition-opacity"
    >
      <canvas 
        ref={canvasRef} 
        className="block mx-auto max-w-full pointer-events-auto cursor-default" 
        aria-label={text}
      />
    </div>
  );
}
