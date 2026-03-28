const Finance = require('financejs');
const finance = new Finance();

const PANEL_WATT = 400;
const PANEL_AREA_SQM = 1.7;
const PACKING_EFFICIENCY = 0.80;
const PERFORMANCE_RATIO = 0.78;
const CAPEX_PER_KWP = 55000;
const OM_RATE = 0.01;
const NET_METERING_RATE = 2.50;
const CO2_FACTOR = 0.82;
const DISCOUNT_RATE = 0.08;
const PANEL_LIFETIME_YEARS = 25;

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function sizeSystem(annualKwh, avgGhi) {
  const systemKwp = annualKwh / (avgGhi * PERFORMANCE_RATIO * 365);
  const numPanels = Math.ceil(systemKwp / (PANEL_WATT / 1000));
  const minAreaSqm = (numPanels * PANEL_AREA_SQM) / PACKING_EFFICIENCY;

  return {
    system_kwp: Math.round(systemKwp * 100) / 100,
    num_panels: numPanels,
    min_area_required_sqm: Math.round(minAreaSqm * 10) / 10,
  };
}

function computeMonthlyGeneration(systemKwp, ghiMonthly) {
  const monthlyGen = [];
  for (let m = 0; m < 12; m++) {
    const gen = systemKwp * ghiMonthly[m] * PERFORMANCE_RATIO * DAYS_PER_MONTH[m];
    monthlyGen.push(Math.round(gen * 10) / 10);
  }
  return monthlyGen;
}

// Helper to calc NPV
function calcNPV(rate, initialInvestment, cashFlows) {
    let npv = -initialInvestment;
    for (let i = 0; i < cashFlows.length; i++) {
        npv += cashFlows[i] / Math.pow(1 + rate, i + 1);
    }
    return npv;
}

function computeFinancialsBasic(systemKwp, annualGen, tariffPerUnit) {
  const capex = systemKwp * CAPEX_PER_KWP;
  const annualSavings = annualGen * tariffPerUnit;
  const omCost = capex * OM_RATE;
  const netAnnual = annualSavings - omCost;

  const paybackYears = netAnnual > 0 ? capex / netAnnual : Infinity;

  // 25-year cash flow
  const cashFlows = Array(PANEL_LIFETIME_YEARS).fill(netAnnual);
  
  const npv = calcNPV(DISCOUNT_RATE, capex, cashFlows);
  
  let irrPct = 0;
  try {
      // financejs expects initial investment to be negative and first arg, 
      // followed by cash flows
      irrPct = finance.IRR(-capex, ...cashFlows);
  } catch (e) {
      irrPct = 0;
  }

  const co2OffsetKg = annualGen * CO2_FACTOR;

  return {
    capex: Math.round(capex),
    annual_savings: Math.round(annualSavings),
    om_cost_per_year: Math.round(omCost),
    net_annual_benefit: Math.round(netAnnual),
    payback_years: Math.round(paybackYears * 10) / 10,
    npv_25yr: Math.round(npv),
    irr_pct: Math.round(irrPct * 10) / 10,
    co2_offset_kg_per_year: Math.round(co2OffsetKg),
  };
}

module.exports = {
  sizeSystem,
  computeMonthlyGeneration,
  computeFinancialsBasic,
};
