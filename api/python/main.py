from fastapi import FastAPI
from pydantic import BaseModel

from solar_engine import compute_metrics

app = FastAPI(title='SOLARIS Python Compute Service', version='1.0.0')


class ComputeRequest(BaseModel):
    annual_kwh: float
    avg_ghi: float
    tariff_per_unit: float


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}


@app.post('/compute')
def compute(payload: ComputeRequest) -> dict:
    return compute_metrics(
        annual_kwh=payload.annual_kwh,
        avg_ghi=payload.avg_ghi,
        tariff_per_unit=payload.tariff_per_unit,
    )
