import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef();

  useEffect(() => {
    // Setup animations
    const ctx = gsap.context(() => {
        // Hero title animation
        const titleText = new SplitType('.hero-title', { types: 'chars' });
        gsap.from(titleText.chars, {
            y: 40,
            opacity: 0,
            duration: 0.8,
            stagger: 0.05,
            ease: 'power3.out',
            delay: 0.8 // wait for page transition
        });

        // Subtitle animation
        const subText = new SplitType('.hero-subtitle', { types: 'words' });
        gsap.from(subText.words, {
            clipPath: 'inset(100% 0 0 0)',
            y: 20,
            opacity: 0,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power3.out',
            delay: 1.2
        });

        // Action button
        gsap.from('.hero-cta', {
            opacity: 0,
            scale: 0.9,
            duration: 0.8,
            delay: 1.8
        });

        // Scroll reveals
        gsap.utils.toArray('.reveal-up').forEach((elem) => {
            gsap.from(elem, {
                y: 40,
                opacity: 0,
                duration: 0.8,
                stagger: 0.06,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: elem,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                }
            });
        });

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="w-full relative z-[1]">
      <section ref={heroRef} className="h-screen flex items-center px-12 md:px-24">
        <div className="max-w-3xl">
          <h1 className="hero-title text-sol-gold text-5xl md:text-7xl font-sans font-bold tracking-wide tracking-[0.3em] mb-8">
            SOLARIS
          </h1>
          <h2 className="hero-subtitle text-3xl md:text-5xl font-sans font-bold tracking-wide text-sol-corona leading-tight mb-6">
            UPLOAD YOUR BILLS.<br/>OWN YOUR ENERGY<br/>FUTURE.
          </h2>
          <p className="text-xl text-sol-muted mb-12 max-w-xl">
            Photograph any Indian electricity bill.<br/>We read the data. You get the plan.
          </p>
          <button 
            onClick={() => navigate('/upload')}
            className="hero-cta relative overflow-hidden group border border-sol-gold px-8 py-4 bg-transparent text-sol-gold hover:text-sol-void transition-colors duration-300"
          >
            <div className="absolute inset-0 bg-sol-gold transform -translate-x-[101%] group-hover:translate-x-0 transition-transform duration-500 ease-power3 z-0" />
            <span className="relative z-10 font-sans font-bold tracking-wide text-base font-medium tracking-widest">
              BEGIN ANALYSIS →
            </span>
          </button>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-sol-deep/80 backdrop-blur-md border-y border-sol-border py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="reveal-up border-l border-sol-border pl-6">
                <div className="font-sans font-medium tracking-wide text-3xl text-sol-gold mb-2">26,70,712+</div>
                <div className="text-sm font-medium font-sans font-bold tracking-wider text-sol-muted">Unique Portal Visitors</div>
            </div>
            <div className="reveal-up border-l border-sol-border pl-6" style={{animationDelay: '0.1s'}}>
                <div className="font-sans font-medium tracking-wide text-3xl text-sol-gold mb-2">Multiple Bills</div>
                <div className="text-sm font-medium font-sans font-bold tracking-wider text-sol-muted">Accepted Per Session</div>
            </div>
            <div className="reveal-up border-l border-sol-border pl-6" style={{animationDelay: '0.2s'}}>
                <div className="font-sans font-medium tracking-wide text-3xl text-sol-gold mb-2">₹0</div>
                <div className="text-sm font-medium font-sans font-bold tracking-wider text-sol-muted">Cost to Use</div>
            </div>
            <div className="reveal-up border-l border-sol-border pl-6" style={{animationDelay: '0.3s'}}>
                <div className="font-sans font-medium tracking-wide text-3xl text-sol-gold mb-2">NASA Satellite</div>
                <div className="text-sm font-medium font-sans font-bold tracking-wider text-sol-muted">Real Irradiance Data</div>
            </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-32 px-6 max-w-7xl mx-auto relative">
        <h3 className="text-3xl font-sans font-bold tracking-wide text-sol-corona mb-24 reveal-up tracking-widest text-center">HOW IT WORKS</h3>
        
        <div className="grid md:grid-cols-3 gap-16">
            <div className="reveal-up glass-card p-8">
                <div className="text-sol-gold font-sans font-medium tracking-wide text-xl mb-4">01</div>
                <h4 className="font-sans font-bold tracking-wide text-lg text-sol-corona mb-4">Upload Dataset</h4>
                <p className="text-sol-muted">Upload one or more electricity bill photos — any DISCOM, any format, Hindi or English.</p>
            </div>
            <div className="reveal-up glass-card p-8" style={{animationDelay: '0.2s'}}>
                <div className="text-sol-gold font-sans font-medium tracking-wide text-xl mb-4">02</div>
                <h4 className="font-sans font-bold tracking-wide text-lg text-sol-corona mb-4">Estimate Area</h4>
                <p className="text-sol-muted">Enter your address and estimate your rooftop area using our guided calculator.</p>
            </div>
            <div className="reveal-up glass-card p-8" style={{animationDelay: '0.4s'}}>
                <div className="text-sol-gold font-sans font-medium tracking-wide text-xl mb-4">03</div>
                <h4 className="font-sans font-bold tracking-wide text-lg text-sol-corona mb-4">Generate Plan</h4>
                <p className="text-sol-muted">Receive your complete 25-year solar feasibility plan in under 2 minutes.</p>
            </div>
        </div>
      </section>
      
      {/* Comparison Table */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <h3 className="text-3xl font-sans font-bold tracking-wide text-sol-corona mb-6 reveal-up tracking-widest text-center">WHY SOLARIS</h3>
        <p className="text-center text-sol-muted max-w-2xl mx-auto mb-16 reveal-up">
          Moving away from guesswork and manual typing, SOLARIS revolutionizes solar planning in India. 
          By reading your actual electricity bills using advanced Vision AI and cross-referencing precise longitude/latitude coordinates with NASA's Satellite Irradiance endpoints, you get an unparalleled, institutional-grade feasibility report in minutes—for free.
        </p>
        <div className="glass-card overflow-hidden reveal-up">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-sol-border bg-sol-surface">
                        <th className="p-6 font-sans font-bold tracking-wide text-sm font-medium text-sol-muted w-1/3">Feature</th>
                        <th className="p-6 font-sans font-bold tracking-wide text-sm font-medium text-sol-muted w-1/3">Other Competitors</th>
                        <th className="p-6 font-sans font-bold tracking-wide text-sm font-medium text-sol-gold w-1/3">SOLARIS</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-sol-border text-base font-medium">
                    <tr className="hover:bg-sol-surface/50 transition-colors">
                        <td className="p-6 text-sol-muted">Input method</td>
                        <td className="p-6">Manual Form (₹ amount)</td>
                        <td className="p-6 text-sol-gold font-medium">Bill photos → Direct OCR</td>
                    </tr>
                    <tr className="hover:bg-sol-surface/50 transition-colors">
                        <td className="p-6 text-sol-muted">Consumption data</td>
                        <td className="p-6">Single month estimate</td>
                        <td className="p-6 text-sol-gold font-medium">12 months real kWh extraction</td>
                    </tr>
                    <tr className="hover:bg-sol-surface/50 transition-colors">
                        <td className="p-6 text-sol-muted">Multiple bills</td>
                        <td className="p-6 text-red-500">Not Supported</td>
                        <td className="p-6 text-sol-gold font-medium">✅ Up to 12 images processed parallelly</td>
                    </tr>
                    <tr className="hover:bg-sol-surface/50 transition-colors">
                        <td className="p-6 text-sol-muted">Irradiance source</td>
                        <td className="p-6">State/Pincode Averages</td>
                        <td className="p-6 text-sol-gold font-medium">NASA satellite, exact Lat/Lon targeting</td>
                    </tr>
                    <tr className="hover:bg-sol-surface/50 transition-colors">
                        <td className="p-6 text-sol-muted">Report & Delivery</td>
                        <td className="p-6">Delayed PDF via Email</td>
                        <td className="p-6 text-sol-gold font-medium">Live-streamed Dashboard, No login needed</td>
                    </tr>
                </tbody>
            </table>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-sol-border bg-sol-deep/50 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
                <h2 className="font-sans font-bold tracking-wide text-sol-gold text-xl tracking-[0.2em] mb-2">SOLARIS</h2>
                <p className="text-sol-muted text-sm font-medium font-sans font-medium tracking-wide">© {new Date().getFullYear()} Solaris. Intelligent Solar Feasibility.</p>
            </div>
            <div className="flex gap-6 text-sm font-medium font-sans font-medium tracking-wide text-sol-muted">
                <a href="#" className="hover:text-sol-gold transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-sol-gold transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-sol-gold transition-colors">Open Source</a>
            </div>
        </div>
      </footer>
    </div>
  );
}