import math

import numpy_financial as npf

PANEL_WATT = 400
PANEL_AREA_SQM = 1.7
PACKING_EFFICIENCY = 0.80
PERFORMANCE_RATIO = 0.78
CAPEX_PER_KWP = 55000
OM_RATE = 0.01
DISCOUNT_RATE = 0.08
PANEL_LIFETIME_YEARS = 25
CO2_FACTOR = 0.82


def compute_metrics(annual_kwh: float, avg_ghi: float, tariff_per_unit: float) -> dict:
    system_kwp = annual_kwh / (avg_ghi * PERFORMANCE_RATIO * 365)
    num_panels = math.ceil(system_kwp / (PANEL_WATT / 1000))
    min_area = (num_panels * PANEL_AREA_SQM) / PACKING_EFFICIENCY

    annual_generation = system_kwp * avg_ghi * PERFORMANCE_RATIO * 365
    capex = system_kwp * CAPEX_PER_KWP
    annual_savings = annual_generation * tariff_per_unit
    om_cost = capex * OM_RATE
    net_annual = annual_savings - om_cost

    payback_years = capex / net_annual if net_annual > 0 else float('inf')
    cash_flows = [-capex] + [net_annual] * PANEL_LIFETIME_YEARS
    npv = float(npf.npv(DISCOUNT_RATE, cash_flows))

    irr_val = npf.irr(cash_flows)
    irr_pct = float(irr_val * 100) if irr_val is not None and not math.isnan(irr_val) else 0.0

    co2_offset = annual_generation * CO2_FACTOR

    return {
        'system_kwp': round(system_kwp, 2),
        'num_panels': num_panels,
        'min_area_required_sqm': round(min_area, 1),
        'annual_generation_kwh': round(annual_generation, 1),
        'capex': round(capex),
        'annual_savings': round(annual_savings),
        'om_cost': round(om_cost),
        'net_annual': round(net_annual),
        'payback_years': round(payback_years, 1) if math.isfinite(payback_years) else payback_years,
        'npv': round(npv),
        'irr': round(irr_pct, 1),
        'co2_offset_kg': round(co2_offset),
    }
