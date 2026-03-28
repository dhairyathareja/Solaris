import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PROGRESS_MESSAGES = [
  { text: 'Geocoding address...', icon: '📍' },
  { text: 'Fetching NASA irradiance data...', icon: '🛰️' },
  { text: 'Sizing your solar system...', icon: '☀️' },
  { text: 'Crunching the financials...', icon: '💰' },
];

export default function ConfigureView({ billData, onCalculated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveBillData = billData || location.state?.billData;
  const [address, setAddress] = useState('');
  const [rooftopSqm, setRooftopSqm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progressIdx, setProgressIdx] = useState(0);

  // If no bill data, redirect to upload
  useEffect(() => {
    if (!effectiveBillData) {
      navigate('/');
    }
  }, [effectiveBillData, navigate]);

  // Cycle progress messages while loading
  useEffect(() => {
    if (!loading) return;
    setProgressIdx(0);
    const interval = setInterval(() => {
      setProgressIdx((prev) => {
        if (prev < PROGRESS_MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  if (!effectiveBillData) return null;

  // Pad monthly_units to 12 if needed
  const monthlyUnits = [...(effectiveBillData.monthly_units || [])];
  while (monthlyUnits.length < 12) {
    const avg = monthlyUnits.length > 0
      ? monthlyUnits.reduce((a, b) => a + b, 0) / monthlyUnits.length
      : 200;
    monthlyUnits.push(Math.round(avg));
  }

  const annualKwh = monthlyUnits.reduce((a, b) => a + b, 0);

  const handleCalculate = async () => {
    if (!address.trim()) {
      setError('Please enter your building address.');
      return;
    }
    if (!rooftopSqm || parseFloat(rooftopSqm) <= 0) {
      setError('Please enter a valid rooftop area.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        monthly_units: monthlyUnits,
        tariff_per_unit: effectiveBillData.tariff_per_unit || 8.0,
        tariff_category: effectiveBillData.tariff_category || 'domestic',
        address: address.trim(),
        rooftop_sqm: parseFloat(rooftopSqm),
      };

      const res = await axios.post('/api/calculate', payload);
      onCalculated(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Calculation failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Page title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
          Configure Your{' '}
          <span className="bg-gradient-to-r from-solar-400 to-solar-600 bg-clip-text text-transparent">
            Solar Plan
          </span>
        </h2>
        <p className="text-slate-400">Provide your rooftop details for an accurate estimate</p>
      </div>

      {/* Bill summary (compact, read-only) */}
      <div className="glass-card-light p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Bill Summary</p>
              <p className="text-sm text-white font-semibold">
                {annualKwh.toLocaleString()} kWh/year
                {effectiveBillData.tariff_per_unit && (
                  <span className="text-slate-400 font-normal ml-2">
                    @ ₹{effectiveBillData.tariff_per_unit}/unit
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {effectiveBillData.tariff_category && (
              <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full bg-solar-400/10 text-solar-400 border border-solar-400/20">
                {effectiveBillData.tariff_category}
              </span>
            )}
            {effectiveBillData.discom_name && (
              <span className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 rounded-full bg-white/5 border border-white/10">
                {effectiveBillData.discom_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Configuration form */}
      <div className="glass-card p-8 space-y-6">
        <div>
          <label htmlFor="address-input" className="block text-sm font-semibold text-slate-300 mb-2">
            Building Address
          </label>
          <input
            id="address-input"
            type="text"
            className="input-field"
            placeholder="Building address, City, State"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-slate-600 mt-2">
            We use this to fetch solar irradiance data from NASA for your exact location
          </p>
        </div>

        <div>
          <label htmlFor="rooftop-input" className="block text-sm font-semibold text-slate-300 mb-2">
            Available Rooftop Area (m²)
          </label>
          <input
            id="rooftop-input"
            type="number"
            className="input-field"
            placeholder="e.g. 100"
            min="1"
            step="1"
            value={rooftopSqm}
            onChange={(e) => setRooftopSqm(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-slate-600 mt-2">
            Unshaded, flat rooftop area available for panel installation
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 7.5a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="glass-card-light p-6 text-center space-y-4">
            <div className="spinner mx-auto" />
            <div className="space-y-2">
              {PROGRESS_MESSAGES.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-center gap-2 text-sm transition-all duration-500 ${
                    i < progressIdx
                      ? 'text-green-400'
                      : i === progressIdx
                      ? 'text-solar-400 font-semibold'
                      : 'text-slate-600'
                  }`}
                >
                  <span>
                    {i < progressIdx ? '✓' : msg.icon}
                  </span>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          id="calculate-btn"
          onClick={handleCalculate}
          disabled={loading}
          className="btn-solar w-full flex items-center justify-center gap-3"
        >
          {loading ? (
            'Processing...'
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              </svg>
              Calculate My Solar Plan
            </>
          )}
        </button>
      </div>

      {/* Back link */}
      <div className="text-center mt-6">
        <button onClick={() => navigate('/')} className="btn-ghost text-sm">
          ← Upload a different bill
        </button>
      </div>
    </div>
  );
}
