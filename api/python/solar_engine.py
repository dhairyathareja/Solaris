# File overview: api/python/solar_engine.py
# Purpose: computes sizing, generation, and financial outputs for solar scenarios.
import math
from typing import Optional

import numpy_financial as npf

# Core engineering/economic constants used in deterministic calculations.
PANEL_WATT = 400
PANEL_AREA_SQM = 1.7
PACKING_EFFICIENCY = 0.80
PERFORMANCE_RATIO = 0.78
CAPEX_PER_KWP = 55000
OM_RATE = 0.01
DISCOUNT_RATE = 0.08
PANEL_LIFETIME_YEARS = 25
CO2_FACTOR = 0.82
NET_METERING_RATE = 2.50


def compute_metrics(
    annual_kwh: float,
    avg_ghi: float,
    tariff_per_unit: float,
    self_consumption_ratio: float,
    export_ratio: float,
    system_kwp_override: Optional[float] = None,
) -> dict:
    """Compute system size, generation, savings, and investment metrics."""
    # Base system size from annual demand and location irradiance.
    base_kwp = annual_kwh / (avg_ghi * PERFORMANCE_RATIO * 365)
    # Allow rooftop-constrained override when provided by caller.
    system_kwp = float(system_kwp_override) if system_kwp_override is not None else base_kwp
    system_kwp = max(system_kwp, 0.0)
    num_panels = math.ceil(system_kwp / (PANEL_WATT / 1000))
    min_area = (num_panels * PANEL_AREA_SQM) / PACKING_EFFICIENCY

    # Annual generation estimate from capacity, irradiance, and performance ratio.
    annual_generation = system_kwp * avg_ghi * PERFORMANCE_RATIO * 365
    capex = system_kwp * CAPEX_PER_KWP

    # Clamp and normalize ratios so direct-use + export remains coherent.
    self_consumption_ratio = min(max(float(self_consumption_ratio), 0.0), 1.0)
    export_ratio = min(max(float(export_ratio), 0.0), 1.0)
    ratio_sum = self_consumption_ratio + export_ratio
    if ratio_sum > 0:
        self_consumption_ratio = self_consumption_ratio / ratio_sum
        export_ratio = export_ratio / ratio_sum

    # Split monetization into direct offset and exported energy credit.
    direct_use_savings = annual_generation * self_consumption_ratio * tariff_per_unit
    export_savings = annual_generation * export_ratio * NET_METERING_RATE
    total_annual_savings = direct_use_savings + export_savings

    # O&M is modeled as a fixed CAPEX percentage.
    om_cost = capex * OM_RATE
    net_annual = total_annual_savings - om_cost

    # Compute investment KPIs over panel lifetime.
    payback_years = capex / net_annual if net_annual > 0 else float('inf')
    cash_flows = [-capex] + [net_annual] * PANEL_LIFETIME_YEARS
    npv = float(npf.npv(DISCOUNT_RATE, cash_flows))

    irr_val = npf.irr(cash_flows)
    irr_pct = float(irr_val * 100) if irr_val is not None and not math.isnan(irr_val) else 0.0

    # Environmental benefit estimate based on grid emission factor.
    co2_offset = annual_generation * CO2_FACTOR

    return {
        'system_kwp': round(system_kwp, 2),
        'num_panels': num_panels,
        'min_area_required_sqm': round(min_area, 1),
        'annual_generation_kwh': round(annual_generation, 1),
        'capex': round(capex),
        'direct_use_savings': round(direct_use_savings),
        'export_savings': round(export_savings),
        'total_annual_savings': round(total_annual_savings),
        'om_cost': round(om_cost),
        'net_annual': round(net_annual),
        'payback_years': round(payback_years, 1) if math.isfinite(payback_years) else payback_years,
        'npv': round(npv),
        'irr': round(irr_pct, 1),
        'co2_offset_kg': round(co2_offset),
        'self_consumption_ratio': round(self_consumption_ratio, 4),
        'export_ratio': round(export_ratio, 4),
    }


def validate_rooftop(num_panels: int, rooftop_sqm: float) -> dict:
    """Check whether required panel footprint fits on provided rooftop area."""
    min_area = (num_panels * PANEL_AREA_SQM) / PACKING_EFFICIENCY
    provided = max(float(rooftop_sqm), 0.0)

    # Full-fit case: rooftop is sufficient for target panel count.
    if provided >= min_area:
        return {
            'status': 'sufficient',
            'min_area_required_sqm': round(min_area, 1),
            'provided_sqm': round(provided, 1),
            'warning': None,
        }

    # Constrained case: compute max feasible panels and equivalent kWp.
    max_panels = math.floor((provided * PACKING_EFFICIENCY) / PANEL_AREA_SQM)
    max_panels = max(max_panels, 0)
    fitted_kwp = max_panels * (PANEL_WATT / 1000)
    warning = (
        f'Your {provided:.0f} m2 rooftop fits {max_panels} panels ({fitted_kwp:.1f} kWp). '
        f'Full demand offset needs {min_area:.0f} m2. '
        'System sized to available area - partial offset only.'
    )
    return {
        'status': 'constrained',
        'min_area_required_sqm': round(min_area, 1),
        'provided_sqm': round(provided, 1),
        'warning': warning,
        'max_panels': max_panels,
        'fitted_kwp': round(fitted_kwp, 2),
    }
