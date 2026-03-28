import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { CanvasProvider } from './context/CanvasContext';
import Cursor from './components/Cursor';
import PageTransition from './components/PageTransition';
import SolarCanvas from './components/SolarCanvas';

import LandingPage from './pages/LandingPage';
import BillUpload from './components/BillUpload';
import ConfigureView from './components/ConfigureView';
import SolarDashboard from './components/SolarDashboard';

gsap.registerPlugin(ScrollTrigger);

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <CanvasProvider>
      <div className="no-print">
        <Cursor />
      </div>
      <div className="no-print">
        <SolarCanvas />
      </div>
      
      {/* Absolute Header Overlay */}
      <header className="no-print fixed top-0 left-0 w-full z-[100] px-8 py-6 mix-blend-difference pointer-events-none">
        <div className="flex justify-between items-center max-w-screen-2xl mx-auto">
          <div className="pointer-events-auto cursor-pointer" onClick={() => navigate('/')}>
            <span className="font-sans font-bold tracking-wide text-sol-gold tracking-[0.3em] font-bold text-base font-medium">SOLARIS</span>
          </div>
          <nav className="pointer-events-auto flex gap-8">
            {/* Removed UPLOAD BILLS and DEMO from navbar as requested */}
          </nav>
        </div>
      </header>

      <PageTransition>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<BillUpload />} />
          <Route path="/configure" element={<ConfigureView />} />
          <Route path="/results" element={<SolarDashboard />} />
        </Routes>
      </PageTransition>
    </CanvasProvider>
  );
}

export default App;