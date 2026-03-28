from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from forecasting import forecast_consumption
from load_profile import compute_self_consumption
from solar_engine import compute_metrics, validate_rooftop

app = FastAPI(title='SOLARIS Python Compute Service', version='1.0.0')


class ComputeRequest(BaseModel):
    annual_kwh: float
    avg_ghi: float
    tariff_per_unit: float
    self_consumption_ratio: float
    export_ratio: float
    system_kwp_override: Optional[float] = None


class ForecastRequest(BaseModel):
    monthly_units: list[float]


class LoadProfileRequest(BaseModel):
    tariff_category: str


class RooftopValidationRequest(BaseModel):
    num_panels: int
    rooftop_sqm: float


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}


@app.post('/compute')
def compute(payload: ComputeRequest) -> dict:
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
    return forecast_consumption(payload.monthly_units)


@app.post('/load-profile')
def load_profile(payload: LoadProfileRequest) -> dict:
    return compute_self_consumption(payload.tariff_category)


@app.post('/validate-rooftop')
def rooftop_validation(payload: RooftopValidationRequest) -> dict:
    return validate_rooftop(payload.num_panels, payload.rooftop_sqm)
