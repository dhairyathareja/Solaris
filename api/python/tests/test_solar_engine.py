from solar_engine import compute_metrics, validate_rooftop


def test_size_system_known_case():
    result = compute_metrics(
        annual_kwh=15000,
        avg_ghi=5.5,
        tariff_per_unit=8,
        self_consumption_ratio=0.5,
        export_ratio=0.5,
    )
    assert abs(result['system_kwp'] - 9.57) < 0.3


def test_validate_rooftop_sufficient_and_constrained():
    sufficient = validate_rooftop(num_panels=25, rooftop_sqm=200)
    assert sufficient['status'] == 'sufficient'

    constrained = validate_rooftop(num_panels=60, rooftop_sqm=80)
    assert constrained['status'] == 'constrained'
    assert constrained['max_panels'] >= 0


def test_compute_financials_prefers_higher_self_use():
    base = dict(annual_kwh=12000, avg_ghi=5.2, tariff_per_unit=9)
    high_scr = compute_metrics(**base, self_consumption_ratio=0.7, export_ratio=0.3)
    low_scr = compute_metrics(**base, self_consumption_ratio=0.35, export_ratio=0.65)
    assert high_scr['total_annual_savings'] > low_scr['total_annual_savings']
