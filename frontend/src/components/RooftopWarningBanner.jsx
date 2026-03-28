export default function RooftopWarningBanner({ rooftopCheck }) {
  if (!rooftopCheck || rooftopCheck.status !== 'constrained') return null;

  return (
    <div className="w-full p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-100 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="space-y-1">
          <p className="font-semibold">{rooftopCheck.warning}</p>
          <p className="text-xs text-amber-200/80">
            Recommended: {rooftopCheck.min_area_required_sqm} m2 | Your roof: {rooftopCheck.provided_sqm} m2 | Fitted system: {rooftopCheck.fitted_kwp || 0} kWp
          </p>
        </div>
      </div>
    </div>
  );
}
