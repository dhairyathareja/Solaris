/* File overview: frontend/src/components/ForecastChart.jsx
 * Purpose: visualizes historical, forecast, and generation series on a combined chart.
 */
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad12(values, fallback = 0) {
  const out = Array.isArray(values) ? values.slice(0, 12).map((v) => Number(v || 0)) : [];
  while (out.length < 12) out.push(fallback);
  return out;
}

function trendLabel(trend, pct) {
  const p = Number(pct || 0).toFixed(1);
  if (trend === 'increasing') return `📈 Consumption trending +${p}%/year`;
  if (trend === 'decreasing') return `📉 Consumption trending ${p}%/year`;
  return '➡️ Consumption stable';
}

export default function ForecastChart({ monthlyUnits, forecast, monthlyGen }) {
  const hist = pad12(monthlyUnits);
  const fcast = pad12(forecast?.forecast_monthly_kwh, hist[hist.length - 1] || 0);
  const gen = pad12(monthlyGen);

  const data = MONTHS.map((month, idx) => ({
    month,
    historical: hist[idx],
    forecast: fcast[idx],
    generation: gen[idx],
  }));

  return (
    <div className="glass-card p-6">
      <h3 className="text-base font-medium font-bold uppercase tracking-wider text-slate-400 mb-4">Generation vs Consumption Forecast</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip
              contentStyle={{
                background: 'rgba(10, 21, 56, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#e2e8f0',
                fontSize: '13px',
              }}
              formatter={(val) => [`${Number(val).toFixed(1)} kWh`]}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            <Line type="monotone" dataKey="historical" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Historical Consumption" />
            <Line type="monotone" dataKey="forecast" stroke="#60a5fa" strokeDasharray="5 5" strokeWidth={2.5} dot={false} name="Forecast Consumption" />
            <Line type="monotone" dataKey="generation" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Solar Generation" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-base font-medium text-slate-300 mt-3">{trendLabel(forecast?.trend, forecast?.annual_change_pct)}</p>
    </div>
  );
}
