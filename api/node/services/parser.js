const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'delhi', 'jammu and kashmir', 'ladakh', 'puducherry', 'chandigarh',
  'andaman and nicobar', 'dadra and nagar haveli and daman and diu', 'lakshadweep'
];

function toNumber(raw) {
  if (!raw) return null;
  const normalized = String(raw).replace(/,/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function findMonthlyUnits(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const fromConsumptionLines = [];

  for (const line of lines) {
    if (!/(kwh|units|consumption|energy)/i.test(line)) continue;
    const matches = line.match(/\b\d{1,4}(?:,\d{3})*(?:\.\d+)?\b/g) || [];
    for (const m of matches) {
      const n = toNumber(m);
      if (n !== null && n >= 20 && n <= 5000) {
        fromConsumptionLines.push(n);
      }
    }
  }

  if (fromConsumptionLines.length >= 3) {
    return fromConsumptionLines.slice(0, 12);
  }

  const allMatches = text.match(/\b\d{1,4}(?:,\d{3})*(?:\.\d+)?\b/g) || [];
  const candidates = [];
  for (const m of allMatches) {
    const n = toNumber(m);
    if (n !== null && n >= 20 && n <= 5000) {
      candidates.push(n);
    }
    if (candidates.length === 12) break;
  }

  return candidates;
}

function findTariff(text) {
  const patternA = text.match(/(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (patternA) return toNumber(patternA[1]);

  const patternB = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:\/\s*unit|per\s*unit|rs\/?kwh|₹\/?kwh)/i);
  if (patternB) return toNumber(patternB[1]);

  return null;
}

function findTariffCategory(text) {
  if (/(domestic|residential)/i.test(text)) return 'domestic';
  if (/(commercial|non[-\s]?domestic)/i.test(text)) return 'commercial';
  if (/(industrial|lt[-\s]?industry|ht[-\s]?industry)/i.test(text)) return 'industrial';
  return null;
}

function findSanctionedLoadKw(text) {
  const match = text.match(/(?:sanctioned|connected)\s*load[^\d]{0,30}(\d+(?:\.\d+)?)\s*(kw|kva)/i);
  return match ? toNumber(match[1]) : null;
}

function findDiscomName(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const line = lines.find((entry) => /(discom|distribution|electricity board|power company|power ltd|energy ltd)/i.test(entry));
  if (!line) return null;
  return line.replace(/\s+/g, ' ').slice(0, 80);
}

function findState(text) {
  const lower = text.toLowerCase();
  for (const state of INDIAN_STATES) {
    if (lower.includes(state)) return state;
  }
  return null;
}

function parseBillText(ocrText) {
  const monthlyUnits = findMonthlyUnits(ocrText);

  return {
    monthly_units: monthlyUnits,
    sanctioned_load_kw: findSanctionedLoadKw(ocrText),
    tariff_per_unit: findTariff(ocrText),
    tariff_category: findTariffCategory(ocrText),
    discom_name: findDiscomName(ocrText),
    state: findState(ocrText),
  };
}

module.exports = { parseBillText };
