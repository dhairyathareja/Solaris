const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  'delhi', 'jammu and kashmir', 'ladakh', 'puducherry', 'chandigarh',
  'andaman and nicobar', 'dadra and nagar haveli and daman and diu', 'lakshadweep',
];

const DISCOMS = {
  BSES: ['bses', 'rajdhani', 'yamuna'],
  MSEDCL: ['msedcl', 'mahavitaran', 'maharashtra state electricity'],
  BESCOM: ['bescom', 'bangalore electricity'],
  TNEB: ['tneb', 'tangedco', 'tamil nadu'],
  UPPCL: ['uppcl', 'uttar pradesh power'],
  JVVNL: ['jvvnl', 'jaipur vidyut'],
  TSSPDCL: ['tsspdcl', 'telangana'],
  DHBVN: ['dhbvn', 'dakshin haryana'],
  WBSEDCL: ['wbsedcl', 'west bengal'],
};

const CATEGORY_KEYWORDS = {
  commercial: ['commercial', 'lts', 'hts', 'shop', 'office', 'non-domestic'],
  industrial: ['industrial', 'hv', 'ht supply', 'factory', 'manufacturing'],
  domestic: ['domestic', 'residential', 'lmv', 'household'],
};

const MONTH_ALIASES = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const MONTH_TOKEN_PATTERN = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function monthTokenToIndex(token) {
  if (!token) return null;
  const key = String(token).toLowerCase().replace(/[^a-z]/g, '');
  return Number.isInteger(MONTH_ALIASES[key]) ? MONTH_ALIASES[key] : null;
}

function toNumber(raw) {
  if (raw == null) return null;
  const normalized = String(raw).replace(/,/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function orderedUniqueNumbers(candidates) {
  const seen = new Set();
  const values = [];
  for (const candidate of candidates) {
    const n = toNumber(candidate);
    if (n === null) continue;
    const key = String(Math.round(n * 100));
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(n);
  }
  return values;
}

function detectBillingMonthIndex(text) {
  const patterns = [
    new RegExp(`(?:bill(?:ing)?\\s*(?:month|period)|for\\s*month|month)\\s*[:\\-]?\\s*${MONTH_TOKEN_PATTERN}`, 'i'),
    new RegExp(`(?:from|to)\\s+${MONTH_TOKEN_PATTERN}\\s+\\d{2,4}`, 'i'),
    new RegExp(`${MONTH_TOKEN_PATTERN}\\s*[-/]\\s*\\d{2,4}`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const idx = monthTokenToIndex(match[1]);
    if (idx !== null) return idx;
  }

  const fallback = text.match(new RegExp(MONTH_TOKEN_PATTERN, 'i'));
  return fallback ? monthTokenToIndex(fallback[1]) : null;
}

function findBilledUnits(text) {
  const patterns = [
    /(?:units\s*consumed|total\s*units|energy\s*consumed|monthly\s*consumption)\s*[:\-]?\s*([\d,]{2,7}(?:\.\d+)?)/i,
    /(?:consumption|kwh)\s*[:\-]?\s*([\d,]{2,7}(?:\.\d+)?)/i,
    /([\d,]{2,7}(?:\.\d+)?)\s*(?:units|kwh|kw\.h)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = toNumber(match[1]);
    if (value !== null && value >= 20 && value <= 20000) return value;
  }

  return null;
}

function findMonthlyHistoryMap(text) {
  const map = Array(12).fill(null);
  const regex = new RegExp(`${MONTH_TOKEN_PATTERN}[^\\d]{0,14}([\\d,]{2,7}(?:\\.\\d+)?)`, 'gi');
  let match;

  while ((match = regex.exec(text)) !== null) {
    const monthIdx = monthTokenToIndex(match[1]);
    const value = toNumber(match[2]);
    if (monthIdx === null || value === null) continue;
    if (value < 20 || value > 20000) continue;
    map[monthIdx] = value;
  }

  const detectedCount = map.filter((v) => v != null).length;
  return detectedCount >= 3 ? map : null;
}

function findTariff(text) {
  const tariffPatterns = [
    /rate\s*(?:per\s*unit)?\s*[:\-₹]?\s*([\d.]+)/i,
    /(?:energy\s*charge|unit\s*rate|tariff)\s*[:\-]?\s*₹?\s*([\d.]+)/i,
    /₹\s*([\d.]+)\s*(?:\/\s*(?:unit|kwh))/i,
    /rs\.?\s*([\d.]+)\s*(?:\/\s*(?:unit|kwh))/i,
  ];

  for (const pattern of tariffPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = toNumber(match[1]);
    if (value !== null && value > 0 && value <= 50) return value;
  }
  return null;
}

function findSanctionedLoadKw(text) {
  const loadPatterns = [
    /sanctioned\s*load\s*[:\-]?\s*([\d.]+)\s*(?:kw|kva)/i,
    /contract\s*demand\s*[:\-]?\s*([\d.]+)/i,
    /connected\s*load\s*[:\-]?\s*([\d.]+)/i,
  ];

  for (const pattern of loadPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = toNumber(match[1]);
    if (value !== null && value > 0) return value;
  }
  return null;
}

function findDiscomName(text) {
  const lower = text.toLowerCase();
  for (const [name, keywords] of Object.entries(DISCOMS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return name;
    }
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const generic = lines.find((entry) => /(discom|distribution|electricity board|power company|power ltd)/i.test(entry));
  return generic ? generic.replace(/\s+/g, ' ').slice(0, 80) : null;
}

function findTariffCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }
  return null;
}

function findState(text) {
  const lower = text.toLowerCase();
  for (const state of INDIAN_STATES) {
    if (lower.includes(state)) return state;
  }
  return null;
}

function getParseConfidence(parsed) {
  const hasUnits = Number.isFinite(Number(parsed.billed_units_kwh));
  const hasMonth = Number.isInteger(parsed.billing_month_index);
  const hasTariff = parsed.tariff_per_unit != null;
  const hasCategory = parsed.tariff_category != null;

  if (hasUnits && hasMonth && hasTariff && hasCategory) return 'high';
  if (hasUnits && hasMonth) return 'medium';
  if (hasUnits) return 'low';
  return 'low';
}

function parseBillText(ocrText) {
  const monthlyHistoryMap = findMonthlyHistoryMap(ocrText);
  const billingMonthIndex = detectBillingMonthIndex(ocrText);
  const billedUnits = findBilledUnits(ocrText);

  let monthlyUnits = [];
  if (monthlyHistoryMap) {
    monthlyUnits = monthlyHistoryMap.map((val) => (val == null ? null : Math.round(val * 10) / 10));
  } else if (billedUnits != null) {
    monthlyUnits = [Math.round(billedUnits * 10) / 10];
  }

  const parsed = {
    monthly_units: monthlyUnits,
    billing_month_index: billingMonthIndex,
    billed_units_kwh: billedUnits != null ? Math.round(billedUnits * 10) / 10 : null,
    sanctioned_load_kw: findSanctionedLoadKw(ocrText),
    tariff_per_unit: findTariff(ocrText),
    tariff_category: findTariffCategory(ocrText),
    discom_name: findDiscomName(ocrText),
    state: findState(ocrText),
  };

  return {
    ...parsed,
    parse_confidence: getParseConfidence(parsed),
  };
}

module.exports = { parseBillText };
