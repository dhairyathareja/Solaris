# File overview: api/python/main.py
# Purpose: exposes compute, forecast, and validation endpoints for Node API orchestration.
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

# Import compute modules used by this API façade.
from forecasting import forecast_consumption
from load_profile import compute_self_consumption
from solar_engine import compute_metrics, validate_rooftop

# Single FastAPI app exposing compute primitives for the Node API.
app = FastAPI(title='SOLARIS Python Compute Service', version='1.0.0')


class ComputeRequest(BaseModel):
    """Payload for system sizing and financial compute endpoint."""
    annual_kwh: float
    avg_ghi: float
    tariff_per_unit: float
    self_consumption_ratio: float
    export_ratio: float
    system_kwp_override: Optional[float] = None


class ForecastRequest(BaseModel):
    """Payload for monthly demand forecasting endpoint."""
    monthly_units: list[float]


class LoadProfileRequest(BaseModel):
    """Payload selecting consumption profile category."""
    tariff_category: str


class RooftopValidationRequest(BaseModel):
    """Payload for rooftop feasibility checks."""
    num_panels: int
    rooftop_sqm: float


@app.get('/health')
def health() -> dict:
    """Health probe used by docker/nginx checks."""
    return {'status': 'ok'}


@app.post('/compute')
def compute(payload: ComputeRequest) -> dict:
    """Computes sizing, generation, and financial metrics for a given scenario."""
    return compute_metrics(
        annual_kwh=payload.annual_kwh,
        avg_ghi=payload.avg_ghi,
        tariff_per_unit=payload.tariff_per_unit,
        self_consumption_ratio=payload.self_consumption_ratio,
        export_ratio=payload.export_ratio,
        system_kwp_override=payload.system_kwp_override,
    )


@app.post('/forecast')
def forecast(payload: ForecastRequest) -> dict:
    """Forecasts next 12 months from provided monthly consumption history."""
    return forecast_consumption(payload.monthly_units)


@app.post('/load-profile')
def load_profile(payload: LoadProfileRequest) -> dict:
    """Returns self-consumption/export ratios for tariff category archetypes."""
    return compute_self_consumption(payload.tariff_category)


@app.post('/validate-rooftop')
def rooftop_validation(payload: RooftopValidationRequest) -> dict:
    """Validates whether proposed panel count can fit on available rooftop area."""
    return validate_rooftop(payload.num_panels, payload.rooftop_sqm)
