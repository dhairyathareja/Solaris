import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, Cell,
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  useEffect(() => {
    if (!result) navigate('/');
  }, [result, navigate]);

  if (!result) return null;

  const {
    sizing,
    financials,
    monthly_generation_kwh,
    monthly_consumption_kwh,
    annual_generation_kwh,
    annual_consumption_kwh,
    grid_offset_pct,
    ghi_monthly,
  } = result;

  // Build chart data
  const genVsConsData = MONTHS.map((month, i) => ({
    month,
    generation: Math.round(monthly_generation_kwh?.[i] || 0),
    consumption: Math.round(monthly_consumption_kwh?.[i] || 0),
  }));

  const ghiData = MONTHS.map((month, i) => ({
    month,
    ghi: ghi_monthly?.[i] || 0,
  }));

  const metrics = [
    {
      label: 'System Capacity',
      value: `${sizing?.system_kwp || 0} kWp`,
      icon: '⚡',
      color: 'from-yellow-400 to-amber-500',
    },
    {
      label: 'Number of Panels',
      value: sizing?.num_panels || 0,
      icon: '🔲',
      color: 'from-blue-400 to-blue-600',
    },
    {
      label: 'Annual Generation',
      value: `${(annual_generation_kwh || 0).toLocaleString()} kWh`,
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
      label: 'Annual Savings',
      value: formatInr(financials?.annual_savings),
      icon: '💰',
      color: 'from-solar-400 to-solar-600',
    },
    {
      label: 'Payback Period',
      value: `${financials?.payback_years || '—'} yrs`,
      icon: '⏱️',
      color: 'from-purple-400 to-violet-500',
    },
    {
      label: '25-Year NPV',
      value: formatInr(financials?.npv_25yr),
      icon: '📈',
      color: 'from-pink-400 to-rose-500',
    },
    {
      label: 'IRR',
      value: `${financials?.irr_pct || 0}%`,
      icon: '📊',
      color: 'from-indigo-400 to-indigo-600',
    },
    {
      label: 'CO₂ Offset',
      value: `${(financials?.co2_offset_kg_per_year || 0).toLocaleString()} kg/yr`,
      icon: '🌍',
      color: 'from-emerald-400 to-green-600',
    },
  ];

  const tooltipStyle = {
    background: 'rgba(10, 21, 56, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#e2e8f0',
    fontSize: '13px',
  };

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
        {result.location?.address && (
          <p className="text-slate-400 text-sm">
            📍 {result.location.address} ({result.location.lat.toFixed(3)}, {result.location.lon.toFixed(3)})
          </p>
        )}
      </div>

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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation vs Consumption */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Monthly Generation vs Consumption
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={genVsConsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
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
                  width={50}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => [`${val} kWh`]} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="generation"
                  stroke="#22c55e"
                  strokeWidth={2.5}
                  dot={{ fill: '#22c55e', r: 4 }}
                  activeDot={{ r: 6, fill: '#22c55e' }}
                  name="Solar Generation"
                />
                <Line
                  type="monotone"
                  dataKey="consumption"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                  name="Consumption"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NASA Irradiance */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Monthly NASA Irradiance (kWh/m²/day)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ghiData} barCategoryGap="15%" margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
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
                  contentStyle={tooltipStyle}
                  formatter={(val) => [`${val} kWh/m²/day`, 'GHI']}
                />
                <Bar dataKey="ghi" radius={[6, 6, 0, 0]} name="GHI">
                  {ghiData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${40 + i * 3}, 90%, ${55 + i}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Financial summary bar */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <FinBlock label="CAPEX" value={formatInr(financials?.capex)} />
          <FinBlock label="Annual Savings" value={formatInr(financials?.annual_savings)} highlight />
          <FinBlock label="O&M Cost/yr" value={formatInr(financials?.om_cost_per_year)} />
          <FinBlock label="Net Benefit/yr" value={formatInr(financials?.net_annual_benefit)} highlight />
          <FinBlock label="25-Year NPV" value={formatInr(financials?.npv_25yr)} highlight />
        </div>
      </div>

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
