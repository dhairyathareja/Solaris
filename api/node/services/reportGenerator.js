/* File overview: api/node/services/reportGenerator.js
 * Purpose: builds human-readable investment/advisory narrative from computed metrics.
 */
function inr(value) {
  const num = Number(value || 0);
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

function lakh(value) {
  const num = Number(value || 0);
  return `₹${(num / 100000).toFixed(1)} lakh`;
}

function wordyRecommendation(paybackYears) {
  if (!Number.isFinite(paybackYears)) return 'worth evaluating';
  if (paybackYears <= 5) return 'strongly recommended';
  if (paybackYears <= 8) return 'recommended';
  return 'worth evaluating';
}

function loadProfileComment(tariffCategory, selfConsumptionRatio) {
  const category = String(tariffCategory || 'domestic').toLowerCase();
  if (category === 'commercial') {
    return 'your daytime load aligns well with solar production - this is ideal';
  }
  if (category === 'industrial') {
    return 'your 24-hour load absorbs solar steadily';
  }
  if (selfConsumptionRatio < 0.55) {
    return 'a significant portion is exported at the lower buyback rate - consider adding a battery to increase self-use';
  }
  return 'shifting discretionary loads to 10 AM-3 PM can further improve self-use';
}

function generateReport(payload) {
  const forecast = payload.forecast || {};
  const rooftopCheck = payload.rooftop_check || {};
  const loadProfile = payload.load_profile || {};
  const financial = payload.financial || {};

  const annualKwh = Number(forecast.forecast_annual_kwh || payload.annual_consumption_kwh || 0);
  const annualGen = Number(payload.annual_gen_kwh || payload.annual_generation_kwh || 0);
  const selfRatio = Number(loadProfile.self_consumption_ratio || financial.self_consumption_ratio || 0);
  const exportRatio = Number(loadProfile.export_ratio || financial.export_ratio || 0);
  const directGen = annualGen * selfRatio;

  const rooftopSentence = rooftopCheck.status === 'constrained'
    ? `can fit a partial ${Number(rooftopCheck.fitted_kwp || 0).toFixed(1)} kWp system due to space constraints`
    : 'has sufficient space for the full system';

  const recommendation = wordyRecommendation(Number(financial.payback_years));
  const trend = forecast.trend || 'stable';
  const trendPct = Number(forecast.annual_change_pct || 0).toFixed(1);
  const tariff = Number(payload.tariff_per_unit || 0).toFixed(2);
  const discom = payload.discom_name || 'your DISCOM';
  const state = payload.state || 'your state';
  const category = payload.tariff_category || loadProfile.tariff_category || 'domestic';

  const constrainedRisk = rooftopCheck.status === 'constrained'
    ? `Your rooftop area limits this to a partial system - the shortfall means you will still draw approximately ${(100 - Number(payload.grid_offset_pct || 0)).toFixed(0)}% of your electricity from the grid.`
    : 'Your rooftop has sufficient area for the proposed system size, reducing design risk during execution.';

  const report = `
Recommendation:
Based on your ${trend} electricity consumption of ${Math.round(annualKwh)} kWh per year at ₹${tariff} per unit from ${discom} (${state}), installing a ${Number(payload.system_kwp || 0).toFixed(1)} kWp solar system is ${recommendation}. Your rooftop ${rooftopSentence}. This recommendation is based on projected demand and practical roof constraints rather than only historical averages.

Capacity Summary:
The design uses ${payload.num_panels || 0} solar panels and is expected to generate around ${Math.round(annualGen)} kWh per year, covering approximately ${Number(payload.grid_offset_pct || 0).toFixed(0)}% of your forecast annual demand. Your consumption trend is ${trend} at ${trendPct}% per year, so this sizing aligns with likely near-term usage, not just last year readings.

Financial Highlights:
Estimated installed cost is ${lakh(financial.capex)}. Of annual generation, about ${(selfRatio * 100).toFixed(0)}% (${Math.round(directGen)} kWh) is consumed on-site, saving roughly ${inr(financial.direct_use_savings)} per year at retail tariff. The remaining ${(exportRatio * 100).toFixed(0)}% is exported to the grid, earning about ${inr(financial.export_savings)} at ₹2.50 per unit. Total annual savings are ${inr(financial.total_annual_savings)} with estimated payback of ${Number(financial.payback_years || 0).toFixed(1)} years. Long-term indicators remain healthy with NPV near ${lakh(financial.npv)} and IRR around ${Number(financial.irr || 0).toFixed(1)}%.

Key Risks:
${constrainedRisk} Actual generation can vary due to shading, dust, and inverter performance, so annual O&M budgeting of around ${inr(financial.om_cost)} is recommended. Net metering and operational approval timelines can differ by DISCOM, so include schedule buffer in implementation plans.

Self-Consumption Insight:
As a ${category} consumer, ${loadProfileComment(category, selfRatio)}. Improving daytime energy shifting can materially increase direct solar use and improve financial returns because exported energy is compensated at a lower rate than retail consumption offset.

Recommended Next Step:
Request quotations from at least three MNRE-empanelled installers and ask each for shadow analysis plus a conservative generation estimate. Start DISCOM net metering application early with ${discom}. With an estimated ${Number(financial.payback_years || 0).toFixed(1)}-year payback and long-lived asset performance, this project compares favorably with many low-risk investment options.
`.trim();

  return report;
}

module.exports = { generateReport };
