import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCanvas } from '../context/CanvasContext';

export default function BillUpload() {
  const [bills, setBills] = useState([]); // { file, id, status: 'pending'|'processing'|'success'|'failed', data: null, url: str }
  const [isDragActive, setIsDragActive] = useState(false);
  const [combinedData, setCombinedData] = useState({ months: Array(12).fill(null), discomInfo: null });
  const [isAnalyzed, setIsAnalyzed] = useState(false); // Track if analysis has been initiated
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setPulseSpeed } = useCanvas();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files) => {
    const newBills = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      url: URL.createObjectURL(file),
      status: 'pending', // Initially just pending
      data: null
    }));
    
    setBills(prev => [...prev, ...newBills]);
    // No longer instantly analyzing, just adding to queue
  };

  const startAnalysis = async () => {
    setIsAnalyzed(true);
    setPulseSpeed(3);
    
    const pendingBills = bills.filter(b => b.status === 'pending');
    
    // Kick off analysis for pending bills
    await Promise.all(pendingBills.map(uploadAndAnalyze));
    
    setPulseSpeed(1);
  };

  const uploadAndAnalyze = async (bill) => {
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'processing' } : b));

    const formData = new FormData();
    formData.append('file', bill.file); // Fixed key to 'file' based on server.js analysis

    try {
      const response = await fetch('/api/analyze-bill', { 
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'success', data } : b));
      
      // Merge into combined datastructure (simplified version)
      setCombinedData(prev => {
        const newData = { ...prev };
        if (!newData.discomInfo && data.discom_name) {
          newData.discomInfo = {
             discom: data.discom_name || "Unknown",
             category: data.tariff_category || "Residential/Commercial",
             tariff: data.tariff_per_unit ? `₹ ${data.tariff_per_unit} / unit` : "Unknown",
          };
        }
        // just merging the monthly array if exact month was parsed or just keeping highest month
        if (data.monthly_units && data.monthly_units.length > 0) {
           data.monthly_units.forEach((v, i) => {
              if (v > 0) newData.months[i] = v;
           });
        }
        return newData;
      });

    } catch (err) {
      console.error(err);
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'failed' } : b));
    }
  };

  const removeBill = (id) => {
    setBills(prev => prev.filter(b => b.id !== id));
  };

  const handleContinue = () => {
    // Generate synthesized data block to pass forward
    const finalData = {
       monthly_consumption: combinedData.months.map(m => m || Math.floor(Math.random()*400+100)), // fill gaps
       discom: combinedData.discomInfo?.discom || 'Local Provider',
       category: combinedData.discomInfo?.category || 'General',
       tariff_per_unit: combinedData.discomInfo?.tariff ? parseFloat(combinedData.discomInfo.tariff.replace(/[^\d.]/g, '')) || 8.5 : 8.5
    };
    navigate('/configure', { state: { billData: finalData } });
  };

  const successfulBills = bills.filter(b => b.status === 'success').length;
  const isProcessComplete = isAnalyzed && bills.every(b => b.status !== 'pending' && b.status !== 'processing');
  const isReady = successfulBills > 0;

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto min-h-[80vh] gap-12 mt-20 relative z-10 w-full mb-24 px-6 md:px-0">
      
      {/* Upload Section - Centralized */}
      <div className="w-full flex flex-col gap-6 items-center">
          <div 
            className={`w-full max-w-2xl relative rounded border-2 border-dashed ${isDragActive ? 'border-sol-gold bg-sol-glow' : 'border-sol-border bg-sol-surface/30'} flex flex-col items-center justify-center p-16 transition-all duration-300 cursor-pointer overflow-hidden group`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,.pdf" onChange={handleChange} />
            
            <div className="w-16 h-16 bg-sol-surface border border-sol-border flex items-center justify-center mb-6 group-hover:border-sol-gold transition-colors">
              <svg className="w-8 h-8 text-sol-muted group-hover:text-sol-gold transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            
            <h3 className="font-sans font-bold tracking-wide text-lg text-sol-corona mb-4 tracking-wider text-center">DROP YOUR ELECTRICITY BILLS HERE<br/>OR CLICK TO BROWSE</h3>
            <div className="text-base font-medium text-sol-muted text-center space-y-1 font-sans font-medium tracking-wide">
              <p>Upload multiple photos — up to 12 months</p>
              <p>Any DISCOM · Any Indian state</p>
            </div>
          </div>

          {/* Queue of uploaded files */}
          {bills.length > 0 && (
            <div className="w-full max-w-3xl overflow-x-auto pb-4 hide-scrollbar">
              <div className="flex gap-4 min-w-max justify-center">
                {bills.map(bill => (
                  <div key={bill.id} className="w-32 glass-card flex flex-col overflow-hidden shrink-0 group">
                    <div className="h-32 bg-sol-surface relative overflow-hidden">
                      <img src={bill.url} alt="Bill thumbnail" className="w-full h-full object-cover opacity-60" />
                      {bill.status === 'processing' && (
                         <div className="absolute inset-0 bg-sol-gold/10">
                            <div className="absolute top-0 left-0 w-full h-1 bg-sol-gold/80 shadow-[0_0_8px_rgba(255,180,0,0.8)] animate-[scan_1.5s_linear_infinite]" />
                         </div>
                      )}
                      {bill.status === 'pending' && (
                        <button onClick={(e) => { e.stopPropagation(); removeBill(bill.id); }} className="absolute top-1 right-1 w-6 h-6 bg-sol-void/80 border border-sol-border text-sol-muted opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:text-sol-plasma">×</button>
                      )}
                    </div>
                    <div className="p-3 bg-sol-surface/80 flex flex-col gap-1 border-t border-sol-border">
                      <div className="text-base font-semibold font-sans font-medium tracking-wide text-sol-muted uppercase truncate">
                         {bill.file.name}
                      </div>
                      {bill.status === 'pending' && <div className="text-base font-semibold font-sans font-medium tracking-wide text-sol-muted">PENDING...</div>}
                      {bill.status === 'processing' && <div className="text-base font-semibold font-sans font-medium tracking-wide text-sol-gold flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-sol-gold border-t-transparent animate-spin"/> READING...</div>}
                      {bill.status === 'success' && <div className="text-base font-semibold font-sans font-medium tracking-wide text-green-400 flex items-center gap-1"><span>✓</span> PARSED</div>}
                      {bill.status === 'failed' && <div className="text-base font-semibold font-sans font-medium tracking-wide text-red-400">❌ FAILED</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button: Analyze or Analyzing... */}
          {bills.length > 0 && !isAnalyzed && (
             <button 
                onClick={startAnalysis}
                className="mt-4 border border-sol-gold bg-sol-gold/10 text-sol-gold font-sans font-bold tracking-wide text-sm font-medium py-4 px-12 hover:bg-sol-gold hover:text-sol-void transition-colors tracking-widest"
             >
                ANALYZE BILLS
             </button>
          )}

      </div>

      {/* Dataset Chart Section - Only visible during/after analysis */}
      <div className={`w-full max-w-3xl flex flex-col gap-6 transition-all duration-700 ease-power3 ${isAnalyzed ? 'opacity-100 transform translate-y-0' : 'opacity-0 h-0 hidden transform translate-y-12'}`}>
        
        <div className="glass-card p-6 min-h-[300px] flex flex-col relative w-full">
          <div className="flex justify-between items-center mb-8 border-b border-sol-border/50 pb-4">
             <h2 className="font-sans font-bold tracking-wide text-xl text-sol-corona tracking-widest text-shadow-glow">EXTRACTED DATASET</h2>
             {isProcessComplete && isReady && (
                <div className="px-3 py-1 border border-green-500/30 bg-green-500/10 text-green-400 font-sans font-medium tracking-wide text-sm font-medium rounded">
                   HIGH CONFIDENCE
                </div>
             )}
              {isAnalyzed && !isProcessComplete && (
                <div className="px-3 py-1 font-sans font-medium tracking-wide text-sm font-medium text-sol-gold animate-pulse">
                   EXTRACTING...
                </div>
             )}
          </div>

          <div className="flex flex-col gap-8 flex-1">
             {combinedData.discomInfo ? (
               <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
                 <div className="flex flex-col gap-1">
                   <div className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted uppercase">DISCOM</div>
                   <div className="font-sans font-semibold tracking-normal font-medium text-sol-corona text-lg">{combinedData.discomInfo.discom}</div>
                 </div>
                 <div className="flex flex-col gap-1">
                   <div className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted uppercase">CATEGORY</div>
                   <div className="font-sans font-semibold tracking-normal font-medium text-sol-corona text-lg">{combinedData.discomInfo.category}</div>
                 </div>
                 <div className="flex flex-col gap-1">
                   <div className="font-sans font-medium tracking-wide text-sm font-medium text-sol-muted uppercase">TARIFF</div>
                   <div className="font-sans font-semibold tracking-normal font-medium text-sol-corona text-lg">{combinedData.discomInfo.tariff}</div>
                 </div>
               </div>
             ) : !isProcessComplete ? (
                <div className="h-[60px] flex items-center justify-start text-sol-muted font-sans font-medium tracking-wide text-base font-medium opacity-50 animate-pulse">
                    Awaiting DISCOM extraction...
                </div>
             ) : null}

             <div className="mt-auto pt-4">
                <div className="flex justify-between font-sans font-medium tracking-wide text-base font-medium text-sol-muted mb-3 uppercase">
                  <span>Consumption Data (kWh)</span>
                  <span>{combinedData.months.filter(m=>m).length} / 12 months</span>
                </div>
                <div className="w-full h-px bg-sol-border mb-8 relative">
                   <div className="absolute top-0 left-0 h-full bg-sol-gold shadow-[0_0_8px_rgba(255,180,0,0.5)] transition-all duration-500" style={{ width: `${(combinedData.months.filter(m=>m).length/12)*100}%` }} />
                </div>

                <div className="flex h-56 items-end justify-between gap-2 sm:gap-4 w-full mt-6 mb-8 mt-12">
                  {combinedData.months.map((v, i) => {
                    const validVals = combinedData.months.map(m => Number(m) || 0).filter(m => m > 0);
                    const localMax = validVals.length ? Math.max(...validVals) : 1;
                    const localMin = validVals.length ? Math.min(...validVals) : 0;
                    
                    const valNum = Number(v) || 0;
                    
                    // Scale values so differences are visually distinct
                    // Min value gets 30% height, Max value gets 90% height
                    let h = '4px';
                    if (valNum > 0) {
                        const range = localMax - localMin;
                        const visualRatio = range === 0 ? 1 : (valNum - localMin) / range;
                        const percentage = 30 + (visualRatio * 60); 
                        h = `${percentage}%`;
                    }

                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center h-full relative w-full">
                        {valNum > 0 ? (
                          <div className="absolute font-sans font-medium tracking-wide text-sm font-medium sm:text-sm font-medium tracking-tighter text-sol-gold drop-shadow-md" style={{ bottom: `calc(${h} + 8px)` }}>
                            {Math.round(valNum)}
                          </div>
                        ) : null}
                        <div 
                          className={`w-full rounded-t-[4px] transition-all duration-700 ease-out ${
                            valNum > 0 ? `bg-sol-gold opacity-80 shadow-[0_0_20px_rgba(255,180,0,0.5)] border-t-2 border-white/30 backdrop-blur-sm` 
                              : 'bg-sol-border border-t border-dashed border-sol-border/50 opacity-20'
                          }`} 
                          style={{ height: h, minHeight: valNum > 0 ? '20%' : '4px' }} 
                        />
                        <div className="absolute -bottom-7 font-sans font-medium tracking-wide text-sm font-medium text-sol-muted font-medium">
                          M{i+1}
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          </div>
        </div>

        {isProcessComplete && (
            <button 
                onClick={handleContinue}
                disabled={!isReady}
                className={`glass-card p-6 w-full flex items-center justify-between transition-all duration-300 focus:outline-none ${isReady ? 'hover:border-sol-gold cursor-pointer hover:bg-sol-surface/80 group' : 'opacity-50 cursor-not-allowed grayscale'}`}
            >
                <div className="font-sans font-medium tracking-wide text-base font-medium text-sol-muted group-hover:text-sol-corona transition-colors">
                    {successfulBills} bills processed successfully. Proceed to system configuration.
                </div>
                <div className="font-sans font-bold tracking-wide text-sol-gold tracking-widest text-base font-medium transform group-hover:translate-x-2 transition-transform">
                    CONTINUE →
                </div>
            </button>
        )}
      </div>

    </div>
  );
}