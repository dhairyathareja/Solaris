/* File overview: frontend/src/components/Cursor.jsx
 * Purpose: draws and animates the custom pointer for desktop interactions.
 */
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // Check if touch device, if so hide cursor entirely
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Instantly move dot
      gsap.set(dot, { x: mouseX, y: mouseY });
    };

    window.addEventListener('mousemove', onMouseMove);

    const ticker = gsap.ticker.add(() => {
      // Lerp ring
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      gsap.set(ring, { x: ringX, y: ringY });
    });

    const handleHover = (e) => {
      const target = e.target;
      const isClickable = target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[role="button"]');

      if (isClickable) {
        gsap.to(ring, {
          scaleX: 1.5,
          scaleY: 1.5,
          backgroundColor: 'rgba(255, 180, 0, 0.15)',
          duration: 0.3,
          ease: 'power2.out'
        });
      } else {
        gsap.to(ring, {
          scaleX: 1,
          scaleY: 1,
          backgroundColor: 'transparent',
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    window.addEventListener('mouseover', handleHover);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', handleHover);
      gsap.ticker.remove(ticker);
    };
  }, []);

  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  return (
    <>
      <div 
        ref={dotRef}
        className="fixed top-0 left-0 w-[6px] h-[6px] bg-sol-gold rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"
      />
      <div 
        ref={ringRef}
        className="fixed top-0 left-0 w-[40px] h-[40px] border border-sol-gold rounded-full pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-colors duration-300"
      />
    </>
  );
}