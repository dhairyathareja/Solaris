import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

export default function ConfigureView() {
  const location = useLocation();
  const navigate = useNavigate();
  const billData = location.state?.billData || null;

  const [address, setAddress] = useState('');
  const [geoResult, setGeoResult] = useState(null);
  
  const [mode, setMode] = useState('direct'); // 'direct', 'calc', 'measure'
  
  const [directArea, setDirectArea] = useState('');
  
  const [calcLen, setCalcLen] = useState('');
  const [calcWid, setCalcLenWid] = useState('');
  const [roofType, setRoofType] = useState('FLAT'); // FLAT (x0.85), PITCHED (x0.45), MIXED (x0.65)
  const [obsTank, setObsTank] = useState(false);
  const [obsStair, setObsStair] = useState(false);
  const [obsAC, setObsAC] = useState('0');
  const [obsSolar, setObsSolar] = useState(false);

  const [calculating, setCalculating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0); // 0=GEOCODING... 1=FETCHING NASA... 2=FORECASTING... 3=SIZING...
  const loadingMessages = [
     "GEOCODING ADDRESS...",
     "FETCHING NASA DATA...",
     "FORECASTING CONSUMPTION...",
     "SIZING YOUR SYSTEM..."
  ];

  // Calculated intermediate usable area
  const [usableArea, setUsableArea] = useState(0);
  const prevAreaRef = useRef(0);
  const areaDisplayRef = useRef(null);

  useEffect(() => {
     let area = 0;
     if (mode === 'direct') {
         area = parseFloat(directArea) || 0;
     } else if (mode === 'calc') {
         const l = parseFloat(calcLen) || 0;
         const w = parseFloat(calcWid) || 0;
         const gross = l * w;
         let mult = 0.85;
         if (roofType === 'PITCHED') mult = 0.45;
         if (roofType === 'MIXED') mult = 0.65;
         
         let obs = 0;
         if (obsTank) obs += 8;
         if (obsStair) obs += 12;
         if (obsSolar) obs += 3;
         obs += (parseInt(obsAC) || 0) * 4; // 8m2 for 2 implies 4 each

         area = Math.max(0, (gross * mult) - obs);
     } else if (mode === 'measure') {
         // Placeholder for the self-measure output
         area = 194; 
     }

     setUsableArea(Math.round(area));
  }, [mode, directArea, calcLen, calcWid, roofType, obsTank, obsStair, obsAC, obsSolar]);

  useEffect(() => {
     // Animate number change
     const obj = { val: prevAreaRef.current };
     gsap.to(obj, {
         val: usableArea,
         duration: 0.8,
         ease: 'power2.out',
         onUpdate: () => {
             if (areaDisplayRef.current) {
                 areaDisplayRef.current.innerText = Math.round(obj.val) + ' m²';
             }
         }
     });
     prevAreaRef.current = usableArea;
  }, [usableArea]);

  const handleCalculate = async () => {
      if (!billData) {
          navigate('/upload');
          return;
      }
      
      setCalculating(true);
      
      for(let i=0; i<loadingMessages.length; i++) {
          setLoadingStep(i);
          await new Promise(r => setTimeout(r, 1200));
      }

      // Mock calculation result since we're just updating UI
      const result = {
         rooftop_check: { status: "ok" }, // "ok" or "constrained"
         system_size_kw: 8.5,
         panels_required: 22,
         annual_generation_kwh: 12500,
         grid_offset_percentage: 85,
         annual_savings_rs: 63200,
         payback_years: 4.2,
         npv_25_years: 1250000,
         irr_percentage: 18.5,
         co2_offset_kg: 8500,
         forecast: {
             trend: "increasing",
             months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
             historical: billData.monthly_consumption,
             projected: billData.monthly_consumption.map(v => v * 1.1),
             generation: billData.monthly_consumption.map(v => v * 0.9 + (Math.random()*100))
         }
      };

      navigate('/results', { state: { result } });
  };

  return (
    <div className="max-w-[640px] mx-auto mt-12 mb-24 flex flex-col gap-8 relative z-10 px-6 sm:px-0">
      
      {/* Read-only strip */}
      {billData && (
          <div className="glass-card border-l-[3px] border-l-sol-gold p-4 flex justify-between items-center text-sol-muted font-sans font-medium tracking-wide text-base font-semibold md:text-base font-medium">
              <span className="truncate pr-4">{billData.discom} • {billData.category} • ₹{billData.tariff_per_unit.toFixed(2)}/unit</span>
              <span className="shrink-0">{billData.monthly_consumption?.filter(m=>m).length} months</span>
          </div>
      )}

      {/* Address */}
      <div>
         <label className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase tracking-widest block mb-4">Building Address</label>
         <div className="relative group">
             <input 
                type="text"
                placeholder="Type address, city, state..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full bg-transparent border-b-2 border-sol-border focus:border-sol-gold text-sol-corona font-sans font-semibold tracking-normal text-lg pb-2 outline-none transition-colors"
             />
             {address.length > 5 && (
                 <div className="absolute right-0 top-0 h-full flex items-center text-sol-gold font-sans font-medium tracking-wide text-sm font-medium opacity-0 animate-fade-in pointer-events-none" style={{animationFillMode: 'forwards'}}>
                     📍 Location matched
                 </div>
             )}
         </div>
      </div>

      {/* Rooftop Area */}
      <div>
          <label className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase tracking-widest block mb-4">Rooftop Area</label>
          <div className="flex gap-2 p-1 glass-card mb-8">
              {[
                { id: 'direct', label: 'DIRECT' },
                { id: 'calc', label: 'GUIDED' }
              ].map(m => (
                  <button 
                     key={m.id}
                     onClick={() => setMode(m.id)}
                     className={`flex-1 py-3 text-sm font-medium font-sans font-bold tracking-wide transition-colors duration-300 ${mode === m.id ? 'bg-sol-gold text-sol-void' : 'text-sol-muted hover:text-sol-corona bg-transparent'}`}
                  >
                     {m.label}
                  </button>
              ))}
          </div>

          <div className="min-h-[240px]">
              {mode === 'direct' && (
                  <div className="animate-fade-in flex flex-col items-center justify-center h-full gap-8">
                      <div className="w-48 relative">
                          <input 
                              type="number"
                              placeholder="0"
                              value={directArea}
                              onChange={e => setDirectArea(e.target.value)}
                              className="w-full bg-transparent border-b-2 border-sol-border focus:border-sol-gold text-sol-corona font-sans font-medium tracking-wide text-5xl pb-2 text-center outline-none transition-colors"
                          />
                          <span className="absolute right-0 bottom-4 text-sol-muted font-sans font-medium tracking-wide transform translate-x-full pl-4">m²</span>
                      </div>
                  </div>
              )}

              {mode === 'calc' && (
                  <div className="animate-fade-in flex flex-col gap-6 glass-card bg-sol-void/80 backdrop-blur-xl p-6 md:p-8 rounded-lg border border-sol-border/50 relative z-20">
                      <div className="flex justify-between items-end gap-4 border-b border-sol-border/50 pb-8">
                          <div className="flex-1 relative z-20">
                              <label className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted block mb-3 uppercase tracking-wider">LENGTH</label>
                              <div className="flex items-end gap-3">
                                  <input type="number" value={calcLen} onChange={e=>setCalcLen(e.target.value)} className="w-full bg-sol-void border border-sol-border focus:border-sol-gold outline-none text-sol-corona font-sans font-medium tracking-wide p-3 text-center text-lg shadow-inner" placeholder="18"/>
                                  <span className="text-sol-muted font-sans font-medium tracking-wide mb-3 text-lg">m</span>
                              </div>
                          </div>
                          <span className="text-sol-muted mb-3 font-sans font-medium tracking-wide text-xl">×</span>
                          <div className="flex-1 relative z-20">
                              <label className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted block mb-3 uppercase tracking-wider">WIDTH</label>
                              <div className="flex items-end gap-3">
                                  <input type="number" value={calcWid} onChange={e=>setCalcLenWid(e.target.value)} className="w-full bg-sol-void border border-sol-border focus:border-sol-gold outline-none text-sol-corona font-sans font-medium tracking-wide p-3 text-center text-lg shadow-inner" placeholder="14"/>
                                  <span className="text-sol-muted font-sans font-medium tracking-wide mb-3 text-lg">m</span>
                              </div>
                          </div>
                      </div>

                      <div className="pt-2 relative z-20">
                          <label className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted block mb-4 uppercase tracking-wider">ROOF TYPE</label>
                          <div className="flex gap-4">
                              {['FLAT', 'PITCHED', 'MIXED'].map(rt => {
                                  const mult = rt === 'FLAT' ? '×0.85' : rt === 'PITCHED' ? '×0.45' : '×0.65';
                                  return (
                                     <div key={rt} onClick={() => setRoofType(rt)} className={`flex-1 border cursor-pointer py-4 px-2 flex flex-col items-center gap-2 transition-all ${roofType === rt ? 'border-sol-gold bg-sol-gold/10 shadow-[0_0_15px_rgba(255,180,0,0.15)]' : 'border-sol-border bg-sol-void/80 hover:bg-sol-surface'}`}>
                                        <span className="font-sans font-bold tracking-wide text-base font-semibold md:text-sm font-medium text-sol-corona">{rt}</span>
                                        <span className="font-sans font-medium tracking-wide text-sol-muted text-sm font-medium md:text-base font-medium">{mult}</span>
                                     </div>
                                  );
                              })}
                          </div>
                      </div>

                      <div className="pt-4 relative z-20">
                          <label className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted block mb-4 uppercase tracking-wider">OBSTRUCTIONS</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4 font-sans font-medium tracking-wide text-base font-medium text-sol-muted px-2">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <input type="checkbox" checked={obsTank} onChange={e=>setObsTank(e.target.checked)} className="accent-sol-gold bg-sol-void border-sol-border rounded flex-shrink-0 w-5 h-5 cursor-pointer" />
                                  <span className="group-hover:text-sol-corona transition-colors">Water tank</span> <span className="text-sol-plasma opacity-80 text-sm font-medium ml-auto pr-4">−8 m²</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <input type="checkbox" checked={obsStair} onChange={e=>setObsStair(e.target.checked)} className="accent-sol-gold bg-sol-void border-sol-border rounded flex-shrink-0 w-5 h-5 cursor-pointer" />
                                  <span className="group-hover:text-sol-corona transition-colors">Stairwell</span> <span className="text-sol-plasma opacity-80 text-sm font-medium ml-auto pr-4">−12 m²</span>
                              </label>
                              <label className="flex items-center gap-3 group">
                                  <span className="whitespace-nowrap group-hover:text-sol-corona transition-colors">AC units <span className="text-base font-semibold">×</span></span>
                                  <input type="number" value={obsAC} onChange={e=>setObsAC(e.target.value)} className="w-12 bg-sol-void border border-sol-border focus:border-sol-gold outline-none text-center p-1.5 text-sol-corona" />
                                  <span className="text-sol-plasma opacity-80 text-sm font-medium ml-auto pr-4">−{(parseInt(obsAC)||0)*4} m²</span>
                              </label>
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <input type="checkbox" checked={obsSolar} onChange={e=>setObsSolar(e.target.checked)} className="accent-sol-gold bg-sol-void border-sol-border rounded flex-shrink-0 w-5 h-5 cursor-pointer" />
                                  <span className="group-hover:text-sol-corona transition-colors">Solar heater</span> <span className="text-sol-plasma opacity-80 text-sm font-medium ml-auto pr-4">−3 m²</span>
                              </label>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          <div className="mt-12 flex flex-col items-center relative z-20">
              <div className="w-full bg-sol-void/90 backdrop-blur-md rounded-lg border border-sol-border/50 p-8 flex flex-col items-center shadow-2xl">
                  <label className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted uppercase tracking-widest mb-2 z-20">USABLE AREA</label>
                  <span ref={areaDisplayRef} className="font-sans font-medium tracking-wide text-6xl md:text-7xl font-medium text-sol-gold drop-shadow-[0_0_15px_rgba(255,180,0,0.4)] z-20 mt-2">0 m²</span>
              </div>
          </div>
      </div>

      <div className="mt-16 flex justify-center relative z-30">
          {!calculating ? (
              <button 
                  onClick={handleCalculate}
                  disabled={usableArea <= 0}
                  className={`w-full max-w-sm border py-5 transition-all duration-300 relative group overflow-hidden backdrop-blur-md ${usableArea > 0 ? 'border-sol-gold hover:shadow-[0_0_24px_rgba(255,180,0,0.3)] bg-sol-void/90 cursor-pointer' : 'border-sol-border bg-sol-void/80 opacity-70 cursor-not-allowed'}`}
              >
                  <div className={`absolute inset-0 bg-sol-gold transform -translate-x-[101%] ${usableArea > 0 ? 'group-hover:translate-x-0' : ''} transition-transform duration-500 ease-power3 z-0`} />
                  <span className={`relative z-10 font-sans font-bold tracking-widest text-base font-medium md:text-base ${usableArea > 0 ? 'text-sol-gold group-hover:text-sol-void drop-shadow-md group-hover:drop-shadow-none' : 'text-sol-muted'}`}>
                     CALCULATE MY SOLAR PLAN →
                  </span>
              </button>
          ) : (
              <div className="h-[62px] w-full max-w-sm flex items-center justify-center gap-4 bg-transparent">
                  <div className="w-5 h-5 rounded-full border-2 border-sol-border border-t-sol-gold animate-spin" />
                  <div className="font-sans font-medium tracking-wide text-sol-muted text-[13px] animate-pulse">
                     {loadingMessages[loadingStep]}
                  </div>
              </div>
          )}
      </div>

    </div>
  );
}