import { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import BillUpload from './components/BillUpload';
import RooftopEstimator from './components/RooftopEstimator';
import ConfigureView from './components/ConfigureView';
import SolarDashboard from './components/SolarDashboard';
import DemoSwitcher from './components/DemoSwitcher';

function App() {
  const [billData, setBillData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [rooftopInput, setRooftopInput] = useState(null);
  const [calcResult, setCalcResult] = useState(null);
  const [activeDemoId, setActiveDemoId] = useState(null);
  const navigate = useNavigate();

  const handleBillAnalyzed = (data) => {
    const { session_id: session, ...rest } = data || {};
    setBillData(rest);
    setSessionId(session || null);
    setRooftopInput(null);
    navigate('/rooftop', { state: { billData: rest, sessionId: session } });
  };

  const handleRooftopEstimated = (data) => {
    setRooftopInput(data);
    navigate('/configure', { state: { billData, rooftopInput: data, sessionId } });
  };

  const handleCalculated = (result) => {
    setCalcResult(result);
    setActiveDemoId(null);
    navigate('/results', { state: { result } });
  };

  const handleDemoLoaded = (result) => {
    setCalcResult(result);
    setBillData(null);
    setRooftopInput(null);
    setSessionId(result.session_id || null);
    navigate('/results', { state: { result } });
  };

  const handleRestart = () => {
    setBillData(null);
    setSessionId(null);
    setRooftopInput(null);
    setCalcResult(null);
    setActiveDemoId(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={handleRestart} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-solar-400 to-solar-600 flex items-center justify-center shadow-lg shadow-solar-400/20 group-hover:shadow-solar-400/40 transition-shadow">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#060d24">
                <circle cx="12" cy="12" r="5" />
                <g stroke="#060d24" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="1" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="23" />
                  <line x1="1" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="23" y2="12" />
                  <line x1="4.2" y1="4.2" x2="6.3" y2="6.3" />
                  <line x1="17.7" y1="17.7" x2="19.8" y2="19.8" />
                  <line x1="4.2" y1="19.8" x2="6.3" y2="17.7" />
                  <line x1="17.7" y1="6.3" x2="19.8" y2="4.2" />
                </g>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-solar-400 transition-colors">
                SOLARIS
              </h1>
              <p className="text-xs text-slate-500 font-medium">AI Solar Platform</p>
            </div>
          </button>

          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <StepDot label="Upload" active={!billData} />
            <StepLine />
            <StepDot label="Rooftop" active={billData && !rooftopInput && !calcResult} />
            <StepLine />
            <StepDot label="Configure" active={billData && rooftopInput && !calcResult} />
            <StepLine />
            <StepDot label="Results" active={!!calcResult} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <DemoSwitcher onDemoLoaded={handleDemoLoaded} activeDemoId={activeDemoId} setActiveDemoId={setActiveDemoId} />
        <Routes>
          <Route path="/" element={<BillUpload onAnalyzed={handleBillAnalyzed} />} />
          <Route
            path="/rooftop"
            element={<RooftopEstimator sessionId={sessionId} initialValue={rooftopInput?.rooftop_sqm} onEstimated={handleRooftopEstimated} />}
          />
          <Route
            path="/configure"
            element={<ConfigureView billData={billData} rooftopInput={rooftopInput} sessionId={sessionId} onCalculated={handleCalculated} />}
          />
          <Route path="/results" element={<SolarDashboard result={calcResult} onRestart={handleRestart} />} />
        </Routes>
      </main>
    </div>
  );
}

function StepDot({ label, active }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
        active 
          ? 'bg-solar-400 shadow-lg shadow-solar-400/40 scale-125' 
          : 'bg-slate-700'
      }`} />
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
        active ? 'text-solar-400' : 'text-slate-600'
      }`}>
        {label}
      </span>
    </div>
  );
}

function StepLine() {
  return <div className="w-12 h-px bg-slate-700 mt-[-12px]" />;
}

export default App;
