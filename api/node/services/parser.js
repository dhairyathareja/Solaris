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
  MSEDCL: ['msedcl', 'maha vitaran', 'mahavitaran', 'mahadiscom', 'mseb', 'maharashtra state electricity'],
  BESCOM: ['bescom', 'bangalore electricity', 'bengaluru electricity'],
  TNEB: ['tneb', 'tangedco', 'tamil nadu electricity'],
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
const YEAR_TOKEN_PATTERN = "(?:'\\d{2}|(?:19|20)\\d{2}|\\d{2})";

function monthTokenToIndex(token) {
  if (!token) return null;
  const key = String(token).toLowerCase().replace(/[^a-z]/g, '');
  return Number.isInteger(MONTH_ALIASES[key]) ? MONTH_ALIASES[key] : null;
}

function toNumber(raw) {
  if (raw == null) return null;
  let normalized = String(raw).trim().replace(/\s+/g, '');
  // Handle OCR values with decimal comma (e.g., 8,43) vs thousands comma (e.g., 4,235).
  if (normalized.includes(',') && !normalized.includes('.')) {
    if (/^\d{1,2},\d{1,2}$/.test(normalized) || /^\d{3,4},\d{1,2}$/.test(normalized)) {
      normalized = normalized.replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else {
    normalized = normalized.replace(/,/g, '');
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function isYearToken(raw) {
  if (raw == null) return false;
  const normalized = String(raw).replace(/,/g, '').trim();
  return /^(19|20)\d{2}$/.test(normalized);
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

function parseMonthIndexFromDateToken(dateToken) {
  if (!dateToken) return null;
  const token = String(dateToken).trim();

  const numericMatch = token.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})$/i);
  if (numericMatch) {
    const month = Number(numericMatch[2]);
    if (month >= 1 && month <= 12) return month - 1;
  }

  const monthTokenMatch = token.match(new RegExp(MONTH_TOKEN_PATTERN, 'i'));
  if (monthTokenMatch) {
    return monthTokenToIndex(monthTokenMatch[1]);
  }

  return null;
}

function detectBillingMonthIndex(text) {
  const fromDateRegex = /(?:from\s*date|fromdate)\s*[:\-]?\s*(\d{1,2}\s*[\/\-.]\s*(?:\d{1,2}|[a-z]{3,9})\s*[\/\-.]\s*\d{2,4})/i;
  const fromDateMatch = text.match(fromDateRegex);
  if (fromDateMatch) {
    const idx = parseMonthIndexFromDateToken(fromDateMatch[1]);
    if (idx !== null) return idx;
  }

  const periodDateRangeRegex = /(?:bill(?:ing)?\s*period|period)\s*[:\-]?\s*(?:from\s+)?(\d{1,2}\s*[\/\-.]\s*(?:\d{1,2}|[a-z]{3,9})\s*[\/\-.]\s*\d{2,4})\s*(?:to|-|–)\s*(\d{1,2}\s*[\/\-.]\s*(?:\d{1,2}|[a-z]{3,9})\s*[\/\-.]\s*\d{2,4})/i;
  const periodDateRangeMatch = text.match(periodDateRangeRegex);
  if (periodDateRangeMatch) {
    const idx = parseMonthIndexFromDateToken(periodDateRangeMatch[1]);
    if (idx !== null) return idx;
  }

  const rangeMatch = text.match(
    new RegExp(
      `(?:bill(?:ing)?\\s*period|period)\\s*[:\\-]?\\s*(?:from\\s+)?${MONTH_TOKEN_PATTERN}(?:\\s*[-/'’]?\\s*${YEAR_TOKEN_PATTERN})?\\s*(?:to|-|–)\\s*${MONTH_TOKEN_PATTERN}`,
      'i',
    ),
  );
  if (rangeMatch) {
    const startMonth = monthTokenToIndex(rangeMatch[1]);
    if (startMonth !== null) return startMonth;
  }

  const fromRegex = new RegExp(`from\\s+${MONTH_TOKEN_PATTERN}(?:\\s*[-/'’]?\\s*${YEAR_TOKEN_PATTERN})?`, 'i');
  const fromMatch = text.match(fromRegex);
  if (fromMatch) {
    const idx = monthTokenToIndex(fromMatch[1]);
    if (idx !== null) return idx;
  }

  const patterns = [
    new RegExp(`(?:bill(?:ing)?\\s*month|for\\s*month|month\\s*of|month)\\s*[:\\-]?\\s*${MONTH_TOKEN_PATTERN}`, 'i'),
    new RegExp(`${MONTH_TOKEN_PATTERN}\\s*[-/]\\s*${YEAR_TOKEN_PATTERN}`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const idx = monthTokenToIndex(match[1]);
    if (idx !== null) return idx;
  }

  return null;
}

function findBilledUnits(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const perLinePatterns = [
    /consumption\s*\(?\s*(?:kwh|kw\.h)\s*\)?\s*[:=\-]?\s*([\d.,]{2,9})/i,
    /([\d.,]{2,9})\s*(?:kwh|kw\.h)\s*(?:consumption)?/i,
  ];

  for (const line of lines) {
    if (!/consumption/i.test(line) || !/(kwh|kw\.h)/i.test(line)) continue;
    for (const pattern of perLinePatterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const value = toNumber(match[1]);
      if (value !== null && value >= 20 && value <= 20000) return value;
    }
  }

  const patterns = [
    /consumption\s*\(?\s*(?:kwh|kw\.h)\s*\)?\s*[:=\-]?\s*([\d.,]{2,9})/i,
    /(?:total\s*)?consumption[^\n]{0,20}(?:kwh|kw\.h)[^\n]{0,16}([\d.,]{2,9})/i,
    /([\d.,]{2,9})[^\n]{0,16}(?:kwh|kw\.h)[^\n]{0,16}consumption/i,
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

  const pickUsageValue = (primaryRaw, secondaryRaw = null) => {
    const candidates = orderedUniqueNumbers([primaryRaw, secondaryRaw]);
    for (const candidate of candidates) {
      if (candidate < 20 || candidate > 20000) continue;
      if (isYearToken(primaryRaw) && secondaryRaw != null && candidate === toNumber(primaryRaw)) continue;
      return candidate;
    }
    return null;
  };

  const patterns = [
    {
      // Captures patterns like: "Jan 2024 356", "Jan: 356", "Jan - 356 units"
      regex: new RegExp(
        `${MONTH_TOKEN_PATTERN}(?:\\s*[-/'’]?\\s*(?:19|20)\\d{2})?\\s*[:\\-]?\\s*([\\d.,]{2,9})\\s*(?:units?|kwh|kw\\.h)?`,
        'gi',
      ),
      monthGroup: 1,
      valueGroups: [2],
    },
    {
      // Captures patterns like: "356 Jan" or "356 kWh Jan"
      regex: new RegExp(`([\\d.,]{2,9})\\s*(?:units?|kwh|kw\\.h)?[^a-z\\d]{0,8}${MONTH_TOKEN_PATTERN}`, 'gi'),
      monthGroup: 2,
      valueGroups: [1],
    },
  ];

  for (const pattern of patterns) {
    // Reverse format "320 Jan" is used as a fallback only when month-first extraction is sparse.
    if (pattern.monthGroup === 2) {
      const detected = map.filter((v) => v != null).length;
      if (detected >= 3) continue;
    }

    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const monthIdx = monthTokenToIndex(match[pattern.monthGroup]);
      if (monthIdx === null) continue;

      const primary = match[pattern.valueGroups[0]];
      const secondary = pattern.valueGroups.length > 1 ? match[pattern.valueGroups[1]] : null;
      const value = pickUsageValue(primary, secondary);
      if (value === null) continue;

      if (map[monthIdx] == null) {
        map[monthIdx] = value;
      }
    }
  }

  const detectedCount = map.filter((v) => v != null).length;
  return detectedCount >= 3 ? map : null;
}

function findTariff(text) {
  const tariffPatterns = [
    /(?:unit\s*rate|rate\s*(?:per\s*unit)?|tariff|rate\s*\/\s*unit)\s*[:=\-₹]?\s*([\d.,]{1,8})/i,
    /(?:energy\s*charge|ec\b)\s*[:=\-]?\s*₹?\s*([\d.,]{1,8})\s*(?:\/\s*(?:unit|kwh)|per\s*unit)?/i,
    /₹\s*([\d.,]{1,8})\s*(?:\/\s*(?:unit|kwh)|per\s*unit)/i,
    /rs\.?\s*([\d.,]{1,8})\s*(?:\/\s*(?:unit|kwh)|per\s*unit)/i,
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
  const compact = lower.replace(/[^a-z]/g, '');
  for (const [name, keywords] of Object.entries(DISCOMS)) {
    if (keywords.some((keyword) => {
      const compactKeyword = keyword.toLowerCase().replace(/[^a-z]/g, '');
      return lower.includes(keyword) || compact.includes(compactKeyword);
    })) {
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
  const billingMonthIndex = detectBillingMonthIndex(ocrText);
  const billedUnits = findBilledUnits(ocrText);

  const monthlyUnits = billedUnits != null
    ? [Math.round(billedUnits * 10) / 10]
    : [];

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
