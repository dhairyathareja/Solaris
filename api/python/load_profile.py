import math

PROFILES = {
    'domestic': [0.02, 0.015, 0.01, 0.01, 0.01, 0.015, 0.03, 0.04, 0.04, 0.035, 0.03, 0.03, 0.03, 0.03, 0.03, 0.035, 0.04, 0.06, 0.08, 0.09, 0.08, 0.07, 0.05, 0.03],
    'commercial': [0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 0.05, 0.07, 0.08, 0.08, 0.08, 0.07, 0.08, 0.08, 0.08, 0.07, 0.05, 0.04, 0.03, 0.02, 0.02, 0.015, 0.01],
    'industrial': [0.042] * 24,
}

SOLAR_CURVE = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.02, 0.06, 0.12, 0.16, 0.18, 0.17, 0.14, 0.10, 0.07, 0.04, 0.02, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]


def _normalize(values: list[float]) -> list[float]:
    total = sum(values)
    if total <= 0:
        return [0.0] * len(values)
    return [v / total for v in values]


def compute_self_consumption(tariff_category: str) -> dict:
    normalized_category = (tariff_category or 'domestic').strip().lower()
    if normalized_category not in PROFILES:
        normalized_category = 'domestic'

    load = _normalize(PROFILES[normalized_category])
    solar = _normalize(SOLAR_CURVE)

    consumed = [min(solar[h], load[h]) for h in range(24)]
    solar_total = max(sum(solar), 1e-9)
    self_consumption_ratio = sum(consumed) / solar_total
    self_consumption_ratio = min(max(self_consumption_ratio, 0.0), 1.0)
    export_ratio = max(0.0, 1.0 - self_consumption_ratio)

    return {
        'self_consumption_ratio': round(self_consumption_ratio, 4),
        'export_ratio': round(export_ratio, 4),
        'tariff_category': normalized_category,
    }
