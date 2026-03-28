import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';

export default function PageTransition({ children }) {
  const location = useLocation();
  const sweepingBar = useRef(null);
  const darkOverlay = useRef(null);
  const wrapper = useRef(null);

  useEffect(() => {
    // Reveal animation when path changes
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Ensure panel starts at top
      gsap.set(darkOverlay.current, { yPercent: 0 });
      gsap.set(sweepingBar.current, { scaleX: 0, transformOrigin: 'left' });

      tl.to(sweepingBar.current, {
        scaleX: 1,
        duration: 0.2,
        ease: 'power2.inOut',
      })
      .to(darkOverlay.current, {
        yPercent: -100,
        duration: 0.6,
        ease: 'power3.inOut',
      }, '+=0.1');

      // Setup sweeping layout entry
      gsap.fromTo(wrapper.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.3 }
      );
    });

    return () => ctx.revert();
  }, [location.pathname]);

  return (
    <>
      <div 
        ref={darkOverlay}
        className="fixed inset-0 bg-sol-void z-[5000] pointer-events-none flex flex-col justify-end"
      >
        <div ref={sweepingBar} className="h-[3px] bg-sol-gold w-full origin-left" />
      </div>

      <div ref={wrapper} className="w-full h-full">
        {children}
      </div>
    </>
  );
}