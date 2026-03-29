/* File overview: api/node/tests/parser.test.js
 * Purpose: regression coverage for OCR month/unit/tariff extraction behavior.
 */
const { parseBillText } = require('../services/parser');

describe('parseBillText', () => {
  test('detects DISCOM and tariff from BSES-like text', () => {
    const text = `BSES Rajdhani Power\nFROM DATE : 20/04/2025\nTO DATE : 19/05/2025\nCONSUMPTION KWH : 450\nTariff: ₹8.20/unit\nCategory: Commercial`;
    const parsed = parseBillText(text);

    expect(parsed.discom_name).toBe('BSES');
    expect(parsed.tariff_per_unit).toBeCloseTo(8.2, 1);
    expect(parsed.tariff_category).toBe('commercial');
    expect(parsed.billing_month_index).toBe(3);
    expect(parsed.billed_units_kwh).toBe(450);
  });

  test('detects DISCOM with OCR spacing noise', () => {
    const text = 'M S E D C L Maharashtra Electricity Bill\nUnits Consumed: 380';
    const parsed = parseBillText(text);

    expect(parsed.discom_name).toBe('MSEDCL');
  });

  test('extracts month from FROM DATE and units from CONSUMPTION KWH', () => {
    const text = 'FROM DATE : 20/04/2025 TO DATE : 19/05/2025 CONSUMPTION KWH : 438';
    const parsed = parseBillText(text);

    expect(parsed.billing_month_index).toBe(3);
    expect(parsed.billed_units_kwh).toBe(438);
    expect(parsed.monthly_units).toEqual([438]);
    expect(parsed.parse_confidence).toBe('medium');
  });

  test('does not infer billing month from a full month-history table without FROM DATE', () => {
    const text = 'Jan 320 Feb 330 Mar 340 Apr 350 May 360 Jun 370 Jul 380 Aug 390 Sep 400 Oct 410 Nov 420 Dec 430';
    const parsed = parseBillText(text);

    expect(parsed.billing_month_index).toBeNull();
    expect(parsed.monthly_units).toEqual([]);
  });

  test('uses billing period start month when from-to months are present', () => {
    const text = 'Billing Period: From Jan 2024 to Feb 2024\nUnits Consumed: 412';
    const parsed = parseBillText(text);

    expect(parsed.billing_month_index).toBe(0);
    expect(parsed.billed_units_kwh).toBeNull();
  });

  test('supports month extraction from FROM DATE with month token', () => {
    const text = 'FROM DATE : 20-Apr-2025 TO DATE : 19-May-2025 CONSUMPTION KWH : 512';
    const parsed = parseBillText(text);

    expect(parsed.billing_month_index).toBe(3);
    expect(parsed.billed_units_kwh).toBe(512);
  });

  test('low confidence when monthly units missing', () => {
    const text = 'Electricity bill rate per unit ₹6.4 domestic category';
    const parsed = parseBillText(text);

    expect(parsed.parse_confidence).toBe('low');
  });

  test('parses tariff with decimal comma format', () => {
    const text = 'FROM DATE : 01/06/2025 TO DATE : 30/06/2025 CONSUMPTION KWH : 410\nTariff: 8,43 / unit';
    const parsed = parseBillText(text);

    expect(parsed.tariff_per_unit).toBeCloseTo(8.43, 2);
  });
});
