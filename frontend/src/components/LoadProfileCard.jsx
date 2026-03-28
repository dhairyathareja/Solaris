function pct(v) {
  return `${(Number(v || 0) * 100).toFixed(1)}%`;
}

function inr(v) {
  return `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;
}

export default function LoadProfileCard({ tariffPerUnit, tariffCategory, loadProfile, financial }) {
  if (!loadProfile || !financial) return null;

  const selfRatio = Number(loadProfile.self_consumption_ratio || 0);
  const exportRatio = Number(loadProfile.export_ratio || 0);

  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Solar Self-Consumption Analysis</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-300">
          <span>Used on-site @ ₹{Number(tariffPerUnit || 0).toFixed(2)}/unit</span>
          <span>{pct(selfRatio)} {'->'} {inr(financial.direct_use_savings)}</span>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${selfRatio * 100}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-300">
          <span>Exported to grid @ ₹2.50/unit</span>
          <span>{pct(exportRatio)} {'->'} {inr(financial.export_savings)}</span>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-blue-500" style={{ width: `${exportRatio * 100}%` }} />
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Based on MNRE {String(tariffCategory || loadProfile.tariff_category || 'domestic')} load profile
      </p>
    </div>
  );
}
