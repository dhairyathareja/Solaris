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

function findMonthlyUnits(text) {
  const matches = [];
  const patterns = [
    /(?:units consumed|consumption|kWh)\s*[:\-]?\s*(\d{2,5})/gi,
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-:\/]+(\d{2,5})/gi,
    /(\d{3,5})\s*(?:units|kwh|kw\.h)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      matches.push(match[1]);
    }
  }

  const block = text.match(/(?:units consumed|consumption|kWh)[\s\S]{0,350}/i);
  if (block) {
    const nums = block[0].match(/\b\d{3,5}\b/g) || [];
    if (nums.length >= 6) {
      matches.push(...nums.slice(0, 12));
    }
  }

  const parsed = orderedUniqueNumbers(matches)
    .filter((n) => n >= 100 && n <= 9999)
    .slice(0, 12);

  return parsed;
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
  const monthlyCount = Array.isArray(parsed.monthly_units) ? parsed.monthly_units.length : 0;
  if (monthlyCount < 3) return 'low';

  const hasTariff = parsed.tariff_per_unit != null;
  const hasCategory = parsed.tariff_category != null;
  if (hasTariff && hasCategory) return 'high';
  return 'medium';
}

function parseBillText(ocrText) {
  const parsed = {
    monthly_units: findMonthlyUnits(ocrText),
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
