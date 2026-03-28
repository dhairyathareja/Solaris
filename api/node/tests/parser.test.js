const { parseBillText } = require('../services/parser');

describe('parseBillText', () => {
  test('detects DISCOM and tariff from BSES-like text', () => {
    const text = `BSES Rajdhani Power\nUnits Consumed: 450\nTariff: ₹8.20/unit\nCategory: Commercial`;
    const parsed = parseBillText(text);

    expect(parsed.discom_name).toBe('BSES');
    expect(parsed.tariff_per_unit).toBeCloseTo(8.2, 1);
    expect(parsed.tariff_category).toBe('commercial');
    expect(parsed.monthly_units.length).toBeGreaterThanOrEqual(1);
  });

  test('extracts monthly values from month labels', () => {
    const text = 'Jan 320 Feb 330 Mar 340 Apr 350 May 360 Jun 370 Jul 380 Aug 390 Sep 400 Oct 410 Nov 420 Dec 430';
    const parsed = parseBillText(text);

    expect(parsed.monthly_units.length).toBe(12);
    expect(parsed.parse_confidence).toBe('medium');
  });

  test('low confidence when monthly units missing', () => {
    const text = 'Electricity bill rate per unit ₹6.4 domestic category';
    const parsed = parseBillText(text);

    expect(parsed.parse_confidence).toBe('low');
  });
});
