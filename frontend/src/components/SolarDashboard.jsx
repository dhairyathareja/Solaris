import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ForecastChart from './ForecastChart';
import RooftopWarningBanner from './RooftopWarningBanner';
import LoadProfileCard from './LoadProfileCard';
import ReportDisplay from './ReportDisplay';

function formatInr(val) {
  if (val == null) return '—';
  const num = Number(val);
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)}L`;
  }
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function SolarDashboard({ result, onRestart }) {
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveResult = result || location.state?.result;

  useEffect(() => {
    if (!effectiveResult) navigate('/');
  }, [effectiveResult, navigate]);

  if (!effectiveResult) return null;

  const {
    financial,
    rooftop_check,
    forecast,
    monthly_gen_kwh,
    annual_gen_kwh,
    grid_offset_pct,
    load_profile,
    tariff_per_unit,
    tariff_category,
    monthly_consumption_kwh,
  } = effectiveResult;

  const metrics = [
    {
      label: 'System Capacity',
      value: `${effectiveResult.system_kwp || 0} kWp`,
      icon: '⚡',
      color: 'from-yellow-400 to-amber-500',
    },
    {
      label: 'Number of Panels',
      value: effectiveResult.num_panels || 0,
      icon: '🔲',
      color: 'from-blue-400 to-blue-600',
    },
    {
      label: 'Annual Generation',
      value: `${(annual_gen_kwh || 0).toLocaleString()} kWh`,
      icon: '☀️',
      color: 'from-green-400 to-emerald-500',
    },
    {
      label: 'Grid Offset',
      value: `${grid_offset_pct || 0}%`,
      icon: '🔌',
      color: 'from-cyan-400 to-teal-500',
    },
    {
      label: 'Direct Savings',
      value: formatInr(financial?.direct_use_savings),
      icon: '💰',
      color: 'from-solar-400 to-solar-600',
    },
    {
      label: 'Export Savings',
      value: formatInr(financial?.export_savings),
      icon: '🔄',
      color: 'from-cyan-400 to-blue-600',
    },
    {
      label: 'Payback Period',
      value: `${financial?.payback_years || '—'} yrs`,
      icon: '⏱️',
      color: 'from-purple-400 to-violet-500',
    },
    {
      label: '25-Year NPV',
      value: formatInr(financial?.npv),
      icon: '📈',
      color: 'from-pink-400 to-rose-500',
    },
    {
      label: 'IRR',
      value: `${financial?.irr || 0}%`,
      icon: '📊',
      color: 'from-indigo-400 to-indigo-600',
    },
    {
      label: 'CO₂ Offset',
      value: `${(financial?.co2_offset_kg || 0).toLocaleString()} kg/yr`,
      icon: '🌍',
      color: 'from-emerald-400 to-green-600',
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/20 mb-4">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm font-semibold">Analysis Complete</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">
          Your{' '}
          <span className="bg-gradient-to-r from-solar-400 to-solar-600 bg-clip-text text-transparent">
            Solar Report
          </span>
        </h2>
        {effectiveResult.location?.address && (
          <p className="text-slate-400 text-sm">
            📍 {effectiveResult.location.address} ({effectiveResult.location.lat.toFixed(3)}, {effectiveResult.location.lon.toFixed(3)})
          </p>
        )}
      </div>

      <RooftopWarningBanner rooftopCheck={rooftop_check} />

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className="glass-card p-5 hover:scale-[1.03] transition-transform duration-300 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{m.icon}</span>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${m.color}`} />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
              {m.label}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-white">{m.value}</p>
          </div>
        ))}
      </div>

      <ForecastChart
        monthlyUnits={monthly_consumption_kwh || effectiveResult.monthly_units || []}
        forecast={forecast}
        monthlyGen={monthly_gen_kwh || []}
      />

      <LoadProfileCard
        tariffPerUnit={tariff_per_unit}
        tariffCategory={tariff_category}
        loadProfile={load_profile}
        financial={financial}
      />

      {/* Financial summary bar */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <FinBlock label="CAPEX" value={formatInr(financial?.capex)} />
          <FinBlock label="Direct Savings" value={formatInr(financial?.direct_use_savings)} highlight />
          <FinBlock label="Export Savings" value={formatInr(financial?.export_savings)} />
          <FinBlock label="Total Savings/yr" value={formatInr(financial?.total_annual_savings)} highlight />
          <FinBlock label="25-Year NPV" value={formatInr(financial?.npv)} highlight />
        </div>
      </div>

      <ReportDisplay calcResult={effectiveResult} />

      {/* Actions */}
      <div className="flex justify-center gap-4 pb-8">
        <button onClick={onRestart} className="btn-ghost px-8">
          ← Start Over
        </button>
      </div>
    </div>
  );
}

function FinBlock({ label, value, highlight }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-solar-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
