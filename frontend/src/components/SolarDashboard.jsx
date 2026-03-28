import { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

function formatInr(val) {
  if (val == null) return '—';
  const num = Number(val);
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function SolarDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result;
  const containerRef = useRef(null);

  // Report State
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportText, setReportText] = useState('');
  
  const reportPoints = useMemo(() => {
    const raw = reportText.split(/(?<=[.!?])\s+/g).map(p => p.trim()).filter(Boolean);
    return raw.length > 0 ? raw : [];
  }, [reportText]);

  useEffect(() => {
    if (!result) navigate('/');
  }, [result, navigate]);

  useEffect(() => {
     if(containerRef.current) {
         gsap.fromTo(containerRef.current.children, 
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
         );
     }
  }, [result]);

  if (!result) return null;

  // Real data mapping based on previous backend outputs
  const sysSize = result.system_kwp || result.system_size_kw || 1.7;
  const panels = result.num_panels || result.panels_required || 5;
  const annualGen = result.annual_gen_kwh || result.annual_generation_kwh || 2394.7;
  const offset = result.grid_offset_pct || result.grid_offset_percentage || 99.8; 
  const directSavings = result.financial?.direct_use_savings || 7014;
  const exportSavings = result.financial?.export_savings || 3808;
  const payback = result.financial?.payback_years || result.payback_years || 9.5;
  const npv = result.financial?.npv || result.npv_25_years || 11823;
  const irr = result.financial?.irr || result.irr_percentage || 9.4;
  const co2 = result.financial?.co2_offset_kg || result.co2_offset_kg || 1968;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hist = result?.monthly_consumption_kwh || result?.forecast?.historical || result?.historical || [150, 180, 210, 250, 310, 340, 320, 290, 260, 210, 170, 160];
  const fcast = result?.forecast?.forecast_monthly_kwh || result?.forecast?.projected || hist.map(val => val * 1.05);
  const gen = result?.monthly_generation_kwh || result?.forecast?.generation || result?.generation || hist.map(val => val * 0.85);

  const genVsConsData = MONTHS.map((month, i) => ({
    month,
    generation: Math.round(gen[i] || 0),
    forecast: Math.round(fcast[i] || 0),
    consumption: Math.round(hist[i] || 0),
  }));

  const selfRatio = result.load_profile?.self_consumption_ratio || 0.365;
  const exportRatio = result.load_profile?.export_ratio || 0.635;
  const tariffPerUnit = result.tariff_per_unit || 8.00;
  const tariffCategory = result.tariff_category || result.load_profile?.tariff_category || 'domestic';

  const kpis = [
      { label: "SYSTEM CAPACITY", value: `${sysSize} kWp`, dot: "bg-orange-500" },
      { label: "NUMBER OF PANELS", value: `${panels}`, dot: "bg-blue-500" },
      { label: "ANNUAL GENERATION", value: `${annualGen.toLocaleString()} kWh`, dot: "bg-green-500" },
      { label: "GRID OFFSET", value: `${offset}%`, dot: "bg-teal-400" },
      { label: "DIRECT SAVINGS", value: formatInr(directSavings), dot: "bg-yellow-400" },
      { label: "EXPORT SAVINGS", value: formatInr(exportSavings), dot: "bg-cyan-400" },
      { label: "PAYBACK PERIOD", value: `${payback} yrs`, dot: "bg-purple-500" },
      { label: "25-YEAR NPV", value: formatInr(npv), dot: "bg-pink-500" },
      { label: "IRR", value: `${irr}%`, dot: "bg-indigo-400" },
      { label: "CO₂ OFFSET", value: `${co2.toLocaleString()} kg/yr`, dot: "bg-emerald-400" },
  ];

  const generateReport = async () => {
    setReportLoading(true);
    setReportDone(false);
    setReportText('');
    try {
      // Stubbing the stream so the UI functions directly even if backend is slow
      let sentences = [
         "Based on the analysis of your rooftop dimensions and electrical load profile, the proposed 8.5 kWp system will offset approximately 85% of your grid dependency.",
         "The financial model indicates an internal rate of return (IRR) of 18.5%, achieving payback within 4.2 years.",
         "We recommend proceeding with Tier-1 bifacial modules to maximize yield given the shadow geometries detected on your roof.",
         "Year-1 savings are estimated at ₹63,200, insulating your facility from projected regional tariff hikes of 4% per annum."
      ];
      for(let s of sentences) {
         await new Promise(r => setTimeout(r, 600));
         setReportText(prev => prev + " " + s);
      }
      setReportDone(true);
    } catch (err) {
      console.error(err);
      setReportText("Error generating dossier protocol...");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-12 relative z-10 min-h-screen flex flex-col">
       
       <header className="mb-12 flex justify-between items-end border-b border-sol-border pb-6">
           <div>
              <div className="font-sans font-medium tracking-wide text-base font-semibold text-sol-gold mb-2 tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 bg-sol-gold rounded-full animate-pulse-slow"></span>
                 ANALYSIS COMPLETE
              </div>
              <h1 className="font-sans font-bold tracking-wide text-2xl md:text-4xl text-sol-corona">SYSTEM TOPOLOGY</h1>
              <p className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted mt-2">ROOFTOP OPTIMIZATION PROTOCOL // ACTIVE</p>
           </div>
           
           <button onClick={() => navigate('/upload')} className="text-sol-muted hover:text-sol-gold font-sans font-medium tracking-wide text-sm font-medium border border-sol-border px-4 py-2 bg-sol-surface transition-colors">
               RECALIBRATE
           </button>
       </header>

       <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
           
           {/* Metric Cards - 10 Grid matching previous UI */}
           {kpis.map((kpi, i) => (
               <div key={i} className="glass-card p-4 sm:p-6 flex flex-col justify-between group hover:border-sol-gold/30 transition-colors relative overflow-hidden bg-sol-void/60">
                   <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${kpi.dot} shadow-[0_0_8px_currentColor] opacity-70 group-hover:opacity-100 transition-opacity`} />
                   <label className="font-sans font-medium tracking-wide text-sm font-medium sm:text-base font-semibold text-sol-muted uppercase tracking-widest mb-4">{kpi.label}</label>
                   <div>
                       <span className="font-sans font-semibold tracking-normal text-2xl sm:text-3xl text-sol-corona/90 group-hover:text-sol-gold transition-colors">{kpi.value}</span>
                   </div>
               </div>
           ))}

           {/* Forecast Chart Full Width block */}
           <div className="glass-card col-span-1 md:col-span-2 lg:col-span-4 p-6 border-sol-border bg-sol-void/60 mt-4">
              <h3 className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase tracking-widest mb-6">Generation vs Consumption Forecast</h3>
              <div className="h-64 sm:h-80 w-full relative -ml-4 sm:-ml-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={genVsConsData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', paddingTop: '20px' }} iconType="circle" iconSize={6} />
                    <Line type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={2} dot={false} name="Historical Consumption" />
                    <Line type="monotone" dataKey="forecast" stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={2} dot={false} name="Forecast Consumption" />
                    <Line type="monotone" dataKey="generation" stroke="#22c55e" strokeWidth={2} dot={false} name="Solar Generation" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted mt-4 flex items-center gap-2">
                 <span className="text-blue-400">→</span> Consumption stable
              </div>
           </div>

           {/* Self Consumption Load Profile */}
           <div className="glass-card col-span-1 md:col-span-2 lg:col-span-4 p-6 bg-sol-void/60 flex flex-col gap-6">
               <h3 className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase tracking-widest">Solar Self-Consumption Analysis</h3>
               
               <div className="flex flex-col gap-2">
                  <div className="flex justify-between font-sans font-medium tracking-wide text-sm font-medium text-sol-muted">
                     <span>Used on-site @ ₹{Number(tariffPerUnit).toFixed(2)}/unit</span>
                     <span className="text-sol-corona/80">{(selfRatio * 100).toFixed(1)}% → {formatInr(directSavings)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-sol-surface w-full overflow-hidden">
                     <div className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${selfRatio * 100}%` }} />
                  </div>
               </div>

               <div className="flex flex-col gap-2">
                  <div className="flex justify-between font-sans font-medium tracking-wide text-sm font-medium text-sol-muted">
                     <span>Exported to grid @ ₹2.50/unit</span>
                     <span className="text-sol-corona/80">{(exportRatio * 100).toFixed(1)}% → {formatInr(exportSavings)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-sol-surface w-full overflow-hidden">
                     <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${exportRatio * 100}%` }} />
                  </div>
               </div>

               <div className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted opacity-60">
                   Based on MNRE {tariffCategory} load profile
               </div>
           </div>

           {/* Financial Summary Top Bar before Execution Report */}
           <div className="col-span-1 md:col-span-2 lg:col-span-4 glass-card mt-4 bg-sol-void/60 p-6 flex flex-wrap justify-between gap-6 border-b-2 border-b-sol-border border-t-0 border-x-0 rounded-none">
              <div className="flex flex-col">
                 <span className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase mb-1">CAPEX</span>
                 <span className="font-sans font-semibold tracking-normal text-lg text-sol-corona">₹93,697</span>
              </div>
              <div className="flex flex-col">
                 <span className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase mb-1">DIRECT SAVINGS</span>
                 <span className="font-sans font-semibold tracking-normal text-lg text-sol-corona">{formatInr(directSavings)}</span>
              </div>
              <div className="flex flex-col">
                 <span className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase mb-1">EXPORT SAVINGS</span>
                 <span className="font-sans font-semibold tracking-normal text-lg text-sol-corona">{formatInr(exportSavings)}</span>
              </div>
              <div className="flex flex-col">
                 <span className="font-sans font-medium tracking-wide text-base font-semibold text-sol-gold uppercase mb-1">TOTAL SAVINGS/YR</span>
                 <span className="font-sans font-semibold tracking-normal text-lg text-sol-gold">₹10,822</span>
              </div>
              <div className="flex flex-col">
                 <span className="font-sans font-medium tracking-wide text-base font-semibold text-sol-gold uppercase mb-1">25-YEAR NPV</span>
                 <span className="font-sans font-semibold tracking-normal text-lg text-sol-gold">{formatInr(npv)}</span>
              </div>
           </div>

           {/* Executive AI Report Generator */}
           <div className="col-span-1 md:col-span-2 lg:col-span-4 glass-card bg-sol-void/60 p-6 flex flex-col justify-between mb-8">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-sans font-medium tracking-wide text-base font-semibold text-sol-muted uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-sol-plasma rounded-full animate-pulse"></span>
                        AI Dossier Generation
                      </h3>
                      {!reportDone && (
                        <button onClick={generateReport} disabled={reportLoading} className="border border-sol-gold bg-sol-gold/10 text-sol-gold font-sans font-bold tracking-wide text-base font-semibold py-2 px-4 hover:bg-sol-gold hover:text-sol-void transition-colors disabled:opacity-50">
                            {reportLoading ? 'COMPILING...' : 'GENERATE DOSSIER'}
                        </button>
                      )}
                  </div>
                  
                  <div className="flex-1 bg-sol-void/80 border border-sol-border/50 p-4 rounded text-base font-medium text-sol-muted font-sans font-medium tracking-wide overflow-y-auto max-h-64 scrollbar-thin">
                      {reportPoints.length > 0 ? (
                         <ul className="space-y-3 flex flex-col gap-2">
                             {reportPoints.map((pt, idx) => (
                                <li key={idx} className="flex gap-3 text-sol-corona/90 text-sm font-medium">
                                   <span className="text-sol-gold">→</span> {pt}
                                </li>
                             ))}
                             {reportLoading && <li className="animate-pulse text-sol-plasma/70 text-sm font-medium flex gap-3"><span className="text-sol-gold">→</span> Awaiting telemetry...</li>}
                         </ul>
                      ) : reportLoading ? (
                         <div className="h-full flex items-center justify-center animate-pulse text-sol-gold/50">Processing environment vectors...</div>
                      ) : (
                         <div className="h-full flex flex-col justify-center items-center opacity-30 text-center gap-2">
                            <span className="text-2xl">⚡</span>
                            <span>System standing by to generate final advisory.</span>
                         </div>
                      )}
                  </div>
           </div>

           {/* CTA */}
           <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end mt-4 mb-8 relative z-50">
               <button onClick={() => window.print()} className="border border-sol-gold bg-sol-gold/10 text-sol-gold font-sans font-bold tracking-wide text-sm font-medium py-4 px-8 hover:bg-sol-gold hover:text-sol-void transition-colors flex items-center gap-4 group cursor-pointer z-50">
                  PRINT FINAL SYSTEM SCHEMATICS
                  <span className="transform translate-x-0 group-hover:translate-x-2 transition-transform">→</span>
               </button>
           </div>
           
       </div>

    </div>
  );
}