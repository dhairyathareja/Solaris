const Finance = require('financejs');
const finance = new Finance();

// Configuration Constants
const PANEL_WATT = 400; // Rating of a single solar panel in Watts
const PANEL_AREA_SQM = 1.7; // Area of a single panel in square meters
const PACKING_EFFICIENCY = 0.80; // Usable roof fraction after leaving space for maintenance
const PERFORMANCE_RATIO = 0.78; // System losses (temperature, inverter, dirt) reducing ideal output
const CAPEX_PER_KWP = 55000; // Estimated Capital Expenditure in Rupees per kWp
const OM_RATE = 0.01; // Annual Operations & Maintenance cost as 1% of CAPEX
const NET_METERING_RATE = 2.50; // Rate at which excess energy is sold back to the grid (Rs/kWh)
const CO2_FACTOR = 0.82; // Emission factor: 0.82 kg of CO2 mitigated per kWh of renewable energy
const DISCOUNT_RATE = 0.08; // 8% Discount rate used for NPV (Net Present Value) calculations
const PANEL_LIFETIME_YEARS = 25; // Expected operational lifetime of the solar array

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Calculates the required size of the solar system.
 * Formula for system size: System (kW) = Annual Energy (kWh) / (Avg Irradiance * Performance Ratio * 365 Days)
 */
function sizeSystem(annualKwh, avgGhi) {
  const systemKwp = annualKwh / (avgGhi * PERFORMANCE_RATIO * 365);
  const numPanels = Math.ceil(systemKwp / (PANEL_WATT / 1000));
  // Total minimal physical footprint required considering packing efficiency
  const minAreaSqm = (numPanels * PANEL_AREA_SQM) / PACKING_EFFICIENCY;

  return {
    system_kwp: Math.round(systemKwp * 100) / 100,
    num_panels: numPanels,
    min_area_required_sqm: Math.round(minAreaSqm * 10) / 10,
  };
}

/**
 * Computes estimated monthly generation using NASA Global Horizontal Irradiance (GHI).
 * Formula: Monthly Generation (kWh) = Capacity(kW) * Daily Irradiance(kWh/m2/day) * PR * DaysInMonth
 */
function computeMonthlyGeneration(systemKwp, ghiMonthly) {
  const monthlyGen = [];
  for (let m = 0; m < 12; m++) {
    const gen = systemKwp * ghiMonthly[m] * PERFORMANCE_RATIO * DAYS_PER_MONTH[m];
    monthlyGen.push(Math.round(gen * 10) / 10);
  }
  return monthlyGen;
}

/**
 * Helper to calculate Net Present Value (NPV).
 * Formula: NPV = Sum [ CashFlow_t / (1 + r)^t ] - Initial_Investment
 */
function calcNPV(rate, initialInvestment, cashFlows) {
    let npv = -initialInvestment;
    for (let i = 0; i < cashFlows.length; i++) {
        npv += cashFlows[i] / Math.pow(1 + rate, i + 1);
    }
    return npv;
}

/**
 * Computes ROI, Payback, NPV, and IRR over the 25-year panel lifetime.
 * Uses Net Annual Benefit = (Annual Generation * Unit Tariff) - O&M Cost
 */
function computeFinancialsBasic(systemKwp, annualGen, tariffPerUnit) {
  const capex = systemKwp * CAPEX_PER_KWP;
  const annualSavings = annualGen * tariffPerUnit;
  const omCost = capex * OM_RATE;
  const netAnnual = annualSavings - omCost;

  // Simple payback based on undiscounted net cash flow
  const paybackYears = netAnnual > 0 ? capex / netAnnual : Infinity;

  // 25-year cash flow projection for advanced metrics
  const cashFlows = Array(PANEL_LIFETIME_YEARS).fill(netAnnual);
  
  const npv = calcNPV(DISCOUNT_RATE, capex, cashFlows);
  
  let irrPct = 0;
  try {
      // financejs expects initial investment to be negative and first arg, 
      // followed by cash flows to calculate Internal Rate of Return
      irrPct = finance.IRR(-capex, ...cashFlows);
  } catch (e) {
      irrPct = 0;
  }

  // Calculate environmental impact
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
