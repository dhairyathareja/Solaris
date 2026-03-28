import { useState, useCallback } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BillUpload({ onAnalyzed }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, []);

  const onDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const analyzeBill = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/analyze-bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to analyze bill. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.monthly_units?.map((val, i) => ({
    month: MONTHS[i] || `M${i + 1}`,
    units: val,
  })) || [];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Hero section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-solar-400/10 border border-solar-400/20 mb-6">
          <span className="w-2 h-2 rounded-full bg-solar-400 animate-pulse" />
          <span className="text-solar-400 text-sm font-semibold">AI-Powered Analysis</span>
        </div>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 leading-tight">
          Upload Your<br />
          <span className="bg-gradient-to-r from-solar-400 to-solar-600 bg-clip-text text-transparent">
            Electricity Bill
          </span>
        </h2>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Our AI reads your bill instantly — extracting consumption, tariff, and utility details
        </p>
      </div>

      {/* Upload zone */}
      {!result && (
        <div className="space-y-6">
          <div
            id="drop-zone"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => document.getElementById('file-input').click()}
            className={`
              glass-card p-12 text-center cursor-pointer transition-all duration-300
              ${dragActive 
                ? 'border-solar-400 bg-solar-400/5 shadow-lg shadow-solar-400/10' 
                : 'hover:border-white/20 hover:bg-white/[0.02]'
              }
            `}
          >
            <input
              id="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handleFile(e.target.files[0])}
              className="hidden"
            />

            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Bill preview"
                  className="max-h-48 mx-auto rounded-xl shadow-2xl border border-white/10"
                />
                <p className="text-slate-400 text-sm">
                  <span className="text-white font-medium">{file?.name}</span>
                  <span className="mx-2">·</span>
                  {(file?.size / 1024).toFixed(0)} KB
                </p>
                <p className="text-slate-500 text-xs">Click or drop another file to replace</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy-700 to-navy-800 flex items-center justify-center border border-white/10">
                  <svg className="w-10 h-10 text-solar-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">
                    Drop your bill here
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    or <span className="text-solar-400 font-medium">click to browse</span> · JPG, PNG, WebP
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Analyze button */}
          {file && (
            <button
              id="analyze-btn"
              onClick={analyzeBill}
              disabled={loading}
              className="btn-solar w-full text-center flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="spinner !w-5 !h-5 !border-2" />
                  <span>Reading your bill with AI...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Analyse Bill
                </>
              )}
            </button>
          )}

          {error && (
            <div className="glass-card-light p-4 border-red-500/30 text-red-400 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 7.5a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Results card */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Bill Analysis Complete</h3>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoChip label="Tariff" value={result.tariff_per_unit ? `₹${result.tariff_per_unit}/unit` : '—'} />
              <InfoChip label="Category" value={result.tariff_category || '—'} />
              <InfoChip label="DISCOM" value={result.discom_name || '—'} />
              <InfoChip label="State" value={result.state || '—'} />
            </div>

            {result.parse_confidence && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                Parse confidence:
                <span className={`font-semibold ${
                  result.parse_confidence === 'high'
                    ? 'text-green-400'
                    : result.parse_confidence === 'medium'
                    ? 'text-amber-400'
                    : 'text-orange-400'
                }`}>
                  {result.parse_confidence}
                </span>
              </div>
            )}

            {/* Monthly units chart */}
            {chartData.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-400 mb-3">Monthly Consumption (kWh)</p>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <XAxis 
                        dataKey="month" 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fill: '#64748b', fontSize: 11 }} 
                        axisLine={false} 
                        tickLine={false} 
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(10, 21, 56, 0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '10px',
                          color: '#e2e8f0',
                          fontSize: '13px',
                        }}
                        formatter={(val) => [`${val} kWh`, 'Units']}
                      />
                      <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={`hsl(${200 + i * 8}, 70%, 55%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {result.sanctioned_load_kw && (
              <p className="text-sm text-slate-500">
                Sanctioned Load: <span className="text-white font-medium">{result.sanctioned_load_kw} kW</span>
              </p>
            )}
          </div>

          {/* Action */}
          <button
            id="proceed-btn"
            onClick={() => onAnalyzed(result)}
            className="btn-solar w-full flex items-center justify-center gap-2"
          >
            Looks Good
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="glass-card-light p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</p>
      <p className="text-sm font-bold text-white truncate">{value}</p>
    </div>
  );
}
