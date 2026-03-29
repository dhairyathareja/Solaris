# File overview: api/python/tests/test_forecasting.py
# Purpose: regression tests for forecast trend and fallback behavior.
from forecasting import forecast_consumption


def test_flat_series_is_stable():
    """Flat historical profile should stay stable with near-zero annual trend."""
    result = forecast_consumption([400] * 12)
    assert result['trend'] == 'stable'
    assert -2 <= result['annual_change_pct'] <= 2
    assert len(result['forecast_monthly_kwh']) == 12


def test_increasing_series_grows():
    """Monotonic growth history should produce increasing trend forecasts."""
    values = [300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410]
    result = forecast_consumption(values)
    assert result['trend'] == 'increasing'
    assert result['forecast_monthly_kwh'][0] > 410


def test_short_series_fallback():
    """Short histories should still return a complete 12-month forecast."""
    result = forecast_consumption([200, 220, 240])
    assert len(result['forecast_monthly_kwh']) == 12
    assert result['forecast_annual_kwh'] > 0
