import math

import numpy as np


def _safe_float_list(values):
    clean = []
    for value in values:
        number = float(value)
        if math.isnan(number) or math.isinf(number):
            continue
        clean.append(max(number, 0.0))
    return clean


def _trend_label(annual_change_pct: float) -> str:
    if annual_change_pct > 2:
        return 'increasing'
    if annual_change_pct < -2:
        return 'decreasing'
    return 'stable'


def forecast_consumption(monthly_units: list[float]) -> dict:
    values = _safe_float_list(monthly_units)
    n = len(values)

    if n == 0:
        values = [0.0] * 12
        n = 12

    if n < 3:
        avg = float(np.mean(values)) if values else 0.0
        forecast = [round(avg, 1)] * 12
        return {
            'forecast_monthly_kwh': forecast,
            'forecast_annual_kwh': round(sum(forecast), 1),
            'trend': 'stable',
            'annual_change_pct': 0.0,
            'model': 'linear_trend_seasonal',
        }

    indices = np.arange(n)
    slope, intercept = np.polyfit(indices, np.array(values), 1)
    mean_units = float(np.mean(values))
    annual_change_pct = (slope * 12 / mean_units * 100) if mean_units > 0 else 0.0

    if n < 6:
        forecast = []
        for j in range(n, n + 12):
            trend_proj = intercept + slope * j
            forecast.append(round(max(float(trend_proj), 0.0), 1))
        return {
            'forecast_monthly_kwh': forecast,
            'forecast_annual_kwh': round(sum(forecast), 1),
            'trend': _trend_label(annual_change_pct),
            'annual_change_pct': round(float(annual_change_pct), 2),
            'model': 'linear_trend_seasonal',
        }

    trend_vals = [intercept + slope * i for i in range(n)]
    seasonal_indices = []
    for i, actual in enumerate(values):
        base = max(float(trend_vals[i]), 1.0)
        seasonal_indices.append(actual / base)

    month_buckets = [[] for _ in range(12)]
    for i, seasonal in enumerate(seasonal_indices):
        month_buckets[i % 12].append(seasonal)

    avg_seasonal = []
    for bucket in month_buckets:
        if bucket:
            avg_seasonal.append(float(np.mean(bucket)))
        else:
            avg_seasonal.append(1.0)

    forecast = []
    for j in range(n, n + 12):
        trend_proj = intercept + slope * j
        month_idx = j % 12
        value = max(float(trend_proj) * avg_seasonal[month_idx], 0.0)
        forecast.append(round(value, 1))

    return {
        'forecast_monthly_kwh': forecast,
        'forecast_annual_kwh': round(sum(forecast), 1),
        'trend': _trend_label(annual_change_pct),
        'annual_change_pct': round(float(annual_change_pct), 2),
        'model': 'linear_trend_seasonal',
    }
