const { generateReport } = require('../services/reportGenerator');

describe('generateReport', () => {
  const payload = {
    tariff_per_unit: 8.2,
    discom_name: 'BESCOM',
    state: 'Karnataka',
    tariff_category: 'commercial',
    system_kwp: 12.5,
    num_panels: 32,
    annual_gen_kwh: 17200,
    grid_offset_pct: 82,
    forecast: {
      trend: 'increasing',
      forecast_annual_kwh: 21000,
      annual_change_pct: 4.3,
    },
    rooftop_check: {
      status: 'constrained',
      fitted_kwp: 10.4,
      warning: 'Rooftop constrained',
    },
    load_profile: {
      self_consumption_ratio: 0.64,
      export_ratio: 0.36,
    },
    financial: {
      capex: 687500,
      direct_use_savings: 90100,
      export_savings: 15400,
      total_annual_savings: 105500,
      payback_years: 6.7,
      npv: 890000,
      irr: 13.2,
      om_cost: 6875,
    },
  };

  test('builds a long report with placeholders filled', () => {
    const report = generateReport(payload);
    expect(report.split(/\s+/).length).toBeGreaterThan(260);
    expect(report.includes('{')).toBe(false);
    expect(report.includes('partial system')).toBe(true);
  });

  test('changes commentary by tariff category', () => {
    const commercial = generateReport(payload);
    const domestic = generateReport({
      ...payload,
      tariff_category: 'domestic',
      load_profile: { self_consumption_ratio: 0.3, export_ratio: 0.7 },
    });

    expect(commercial).not.toEqual(domestic);
  });
});
