const express = require('express');
const multer = require('multer');
const axios = require('axios');
const crypto = require('crypto');

const { extractTextFromImage } = require('../services/ocr');
const { parseBillText } = require('../services/parser');
const { geocodeAddress } = require('../services/geocode');
const { fetchMonthlyGhi } = require('../services/nasa');
const { generateReport } = require('../services/reportGenerator');
const { isDbConnected, models } = require('../services/db');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const PERFORMANCE_RATIO = 0.78;
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
const NET_METERING_RATE = 2.5;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_ALIAS_TO_INDEX = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function errorJson(error, detail) {
  return { error, detail };
}

function sendError(res, status, error, detail) {
  return res.status(status).json(errorJson(error, detail));
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function mode(values) {
  if (!values.length) return null;
  const count = new Map();
  for (const val of values) {
    count.set(val, (count.get(val) || 0) + 1);
  }

  let best = null;
  let bestCount = -1;
  for (const [val, c] of count.entries()) {
    if (c > bestCount) {
      best = val;
      bestCount = c;
    }
  }
  return best;
}

function pickFirst(values) {
  return values.length ? values[0] : null;
}

function detectMonthFromFilename(fileName) {
  if (!fileName) return null;
  const value = String(fileName).toLowerCase();

  const textMonthMatch = value.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (textMonthMatch) {
    const token = textMonthMatch[1].toLowerCase();
    if (Number.isInteger(MONTH_ALIAS_TO_INDEX[token])) return MONTH_ALIAS_TO_INDEX[token];
  }

  const mmYyyyMatch = value.match(/\b(0?[1-9]|1[0-2])[-_./](?:19|20)?\d{2}\b/);
  if (mmYyyyMatch) return Number(mmYyyyMatch[1]) - 1;

  const yyyyMmMatch = value.match(/\b(?:19|20)\d{2}[-_./](0?[1-9]|1[0-2])\b/);
  if (yyyyMmMatch) return Number(yyyyMmMatch[1]) - 1;

  return null;
}

function estimateMonthlyUnits(monthValues) {
  const numericValues = monthValues.map((value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  });

  let cleanedValues = [...numericValues];
  const detectedBeforeFilter = cleanedValues.filter((v) => v != null).length;
  if (detectedBeforeFilter >= 3) {
    const known = cleanedValues.filter((v) => v != null);
    const med = median(known);
    const minAllowed = Math.max(20, med * 0.35);
    const maxAllowed = med * 2.5;
    cleanedValues = cleanedValues.map((value) => {
      if (value == null) return null;
      return value >= minAllowed && value <= maxAllowed ? value : null;
    });
  }

  const detectedCount = cleanedValues.filter((v) => v != null).length;
  if (detectedCount === 0) {
    return {
      monthly_units: [],
      months_detected: 0,
      months_estimated: 0,
    };
  }

  const known = cleanedValues.filter((v) => v != null);
  const avg = known.reduce((a, b) => a + b, 0) / known.length;
  const seasonalFactors = [0.96, 0.95, 0.98, 1.02, 1.08, 1.12, 1.1, 1.06, 1.01, 0.99, 0.96, 0.94];

  const monthlyUnits = cleanedValues.map((value, idx) => {
    if (value != null) return round1(value);
    return round1(avg * seasonalFactors[idx]);
  });

  return {
    monthly_units: monthlyUnits,
    months_detected: detectedCount,
    months_estimated: 12 - detectedCount,
  };
}

function toAnnualChangePct(monthlyUnits) {
  if (!Array.isArray(monthlyUnits) || monthlyUnits.length < 2) return 0;
  const first = Number(monthlyUnits[0]);
  const last = Number(monthlyUnits[monthlyUnits.length - 1]);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return 0;
  return ((last - first) * 12 / monthlyUnits.length / first) * 100;
}

async function callPython(endpoint, payload, timeout = 20000) {
  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}${endpoint}`, payload, { timeout });
    return response.data;
  } catch (error) {
    const code = error.code || error.cause?.code;
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      throw new Error('Python compute service is unavailable. Start api/python on port 5000 or set PYTHON_SERVICE_URL.');
    }
    throw error;
  }
}

async function getMonthlyIrradiance(lat, lon) {
  const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;

  if (isDbConnected()) {
    const cached = await models.IrradianceCache.findOne({ lat_lon_key: key }).lean();
    if (cached && Array.isArray(cached.monthly_ghi) && cached.monthly_ghi.length === 12) {
      return cached.monthly_ghi;
    }
  }

  const fresh = await fetchMonthlyGhi(lat, lon);

  if (isDbConnected()) {
    await models.IrradianceCache.findOneAndUpdate(
      { lat_lon_key: key },
      { lat_lon_key: key, monthly_ghi: fresh, fetched_at: new Date() },
      { upsert: true, new: true },
    );
  }

  return fresh;
}

function computeMonthlyGeneration(systemKwp, irradianceMonthly) {
  return irradianceMonthly.map((ghi, idx) => {
    const value = Number(systemKwp) * Number(ghi) * PERFORMANCE_RATIO * DAYS_PER_MONTH[idx];
    return Math.round(value * 10) / 10;
  });
}

function finalizeResponse({
  sessionId,
  payload,
  location,
  irradianceMonthly,
  monthlyUnits,
  forecast,
  loadProfile,
  rooftopCheck,
  compute,
  estimationMethod,
}) {
  const monthlyGen = computeMonthlyGeneration(compute.system_kwp, irradianceMonthly);
  const annualGen = monthlyGen.reduce((a, b) => a + b, 0);
  const annualConsumption = monthlyUnits.reduce((a, b) => a + b, 0);
  const gridOffsetPct = annualConsumption > 0 ? (annualGen / annualConsumption) * 100 : 0;

  return {
    session_id: sessionId,
    location,
    tariff_per_unit: Number(payload.tariff_per_unit),
    tariff_category: payload.tariff_category || null,
    discom_name: payload.discom_name || null,
    state: payload.state || null,
    sanctioned_load_kw: payload.sanctioned_load_kw || null,
    rooftop_sqm: Number(payload.rooftop_sqm),
    estimation_method: estimationMethod || payload.estimation_method || 'direct',
    forecast,
    rooftop_check: rooftopCheck,
    load_profile: loadProfile,
    financial: {
      capex: compute.capex,
      om_cost: compute.om_cost,
      net_annual_benefit: compute.net_annual,
      payback_years: compute.payback_years,
      npv: compute.npv,
      irr: compute.irr,
      co2_offset_kg: compute.co2_offset_kg,
      direct_use_savings: compute.direct_use_savings,
      export_savings: compute.export_savings,
      total_annual_savings: compute.total_annual_savings,
      self_consumption_ratio: compute.self_consumption_ratio,
      export_ratio: compute.export_ratio,
    },
    monthly_gen_kwh: monthlyGen,
    monthly_consumption_kwh: monthlyUnits,
    irradiance_monthly: irradianceMonthly,
    system_kwp: compute.system_kwp,
    num_panels: compute.num_panels,
    annual_gen_kwh: Math.round(annualGen * 10) / 10,
    annual_consumption_kwh: Math.round(annualConsumption * 10) / 10,
    grid_offset_pct: Math.round(gridOffsetPct * 10) / 10,
  };
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/analyze-bill', upload.any(), async (req, res) => {
  try {
    const files = (req.files || []).filter((item) => item.fieldname === 'file' || item.fieldname === 'files');
    if (!files.length) {
      return sendError(res, 400, 'validation_error', 'No file uploaded');
    }

    if (files.length > 12) {
      return sendError(res, 400, 'validation_error', 'Upload up to 12 bill images at a time.');
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    for (const file of files) {
      if (!allowed.has(file.mimetype)) {
        return sendError(res, 400, 'validation_error', 'Unsupported file type. Use JPG, PNG, WebP or GIF.');
      }
    }

    const sessionId = crypto.randomUUID();

    const monthValues = Array(12).fill(null);
    const unassignedUnits = [];
    const tariffValues = [];
    const loadValues = [];
    const categories = [];
    const discoms = [];
    const states = [];
    const extractedMonths = [];

    for (const file of files) {
      const text = await extractTextFromImage(file.buffer);
      const parsed = parseBillText(text);

      const parsedMonthIdx = Number.isInteger(parsed.billing_month_index) ? parsed.billing_month_index : null;
      const fileNameMonthIdx = detectMonthFromFilename(file.originalname);
      const monthIdx = parsedMonthIdx != null
        ? parsedMonthIdx
        : fileNameMonthIdx;
      const monthLabel = monthIdx != null ? MONTHS[monthIdx] : null;
      const billedUnits = Number.isFinite(Number(parsed.billed_units_kwh)) ? Number(parsed.billed_units_kwh) : null;

      extractedMonths.push({
        file_name: file.originalname,
        billing_month: monthLabel,
        month_source: parsedMonthIdx != null ? 'ocr' : fileNameMonthIdx != null ? 'filename' : null,
        units_kwh: billedUnits,
      });

      if (Number.isFinite(Number(parsed.tariff_per_unit))) {
        tariffValues.push(Number(parsed.tariff_per_unit));
      }
      if (Number.isFinite(Number(parsed.sanctioned_load_kw))) {
        loadValues.push(Number(parsed.sanctioned_load_kw));
      }
      if (parsed.tariff_category) categories.push(parsed.tariff_category);
      if (parsed.discom_name) discoms.push(parsed.discom_name);
      if (parsed.state) states.push(parsed.state);

      if (Array.isArray(parsed.monthly_units) && parsed.monthly_units.length === 12) {
        parsed.monthly_units.forEach((value, idx) => {
          const num = Number(value);
          if (!Number.isFinite(num)) return;
          if (monthValues[idx] == null) {
            monthValues[idx] = num;
          }
        });
      }

      if (billedUnits != null) {
        if (monthIdx != null) {
          if (monthValues[monthIdx] == null) {
            monthValues[monthIdx] = billedUnits;
          } else {
            const current = Number(monthValues[monthIdx]);
            const deltaRatio = current > 0 ? Math.abs(current - billedUnits) / current : 0;
            // Only blend when values are close; keep existing if new OCR read looks like an outlier.
            if (deltaRatio <= 0.15) {
              monthValues[monthIdx] = round1((current + billedUnits) / 2);
            }
          }
        } else {
          unassignedUnits.push(billedUnits);
        }
      }
    }

    for (const value of unassignedUnits) {
      const idx = monthValues.findIndex((v) => v == null);
      if (idx === -1) break;
      monthValues[idx] = value;
    }

    const monthlyResult = estimateMonthlyUnits(monthValues);
    const responsePayload = {
      session_id: sessionId,
      monthly_units: monthlyResult.monthly_units,
      sanctioned_load_kw: loadValues.length ? round1(loadValues[0]) : null,
      tariff_per_unit: tariffValues.length ? round1(median(tariffValues)) : null,
      tariff_category: mode(categories),
      discom_name: pickFirst(discoms),
      state: pickFirst(states),
      parse_confidence: monthlyResult.months_detected >= 6 ? 'high' : monthlyResult.months_detected >= 3 ? 'medium' : 'low',
      bills_processed: files.length,
      months_detected: monthlyResult.months_detected,
      months_estimated: monthlyResult.months_estimated,
      extracted_months: extractedMonths,
    };

    if (isDbConnected()) {
      await models.BillExtraction.create({
        session_id: sessionId,
        monthly_units: responsePayload.monthly_units,
        sanctioned_load_kw: responsePayload.sanctioned_load_kw,
        tariff_per_unit: responsePayload.tariff_per_unit,
        tariff_category: responsePayload.tariff_category,
        discom_name: responsePayload.discom_name,
        state: responsePayload.state,
        parse_confidence: responsePayload.parse_confidence,
      });
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error('analyze-bill error:', error.message);
    return sendError(res, 500, 'analysis_error', 'Bill analysis failed.');
  }
});

router.post('/analyze-rooftop', async (req, res) => {
  try {
    const payload = req.body || {};
    const rooftopSqm = Number(payload.rooftop_sqm);

    if (!payload.session_id) {
      return sendError(res, 400, 'validation_error', 'session_id is required.');
    }
    if (!Number.isFinite(rooftopSqm) || rooftopSqm <= 0) {
      return sendError(res, 400, 'validation_error', 'rooftop_sqm must be a positive number.');
    }

    const result = {
      session_id: payload.session_id,
      rooftop_sqm: rooftopSqm,
      estimation_method: payload.estimation_method || 'direct',
    };

    if (isDbConnected()) {
      await models.RooftopInput.create(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('analyze-rooftop error:', error.message);
    return sendError(res, 500, 'analysis_error', 'Rooftop analysis failed.');
  }
});

function isValidMonthlyUnits(values) {
  return Array.isArray(values)
    && values.length === 12
    && values.every((val) => Number.isFinite(Number(val)));
}

router.post('/calculate', async (req, res) => {
  try {
    const payload = req.body || {};
    const sessionId = payload.session_id || crypto.randomUUID();

    if (!isValidMonthlyUnits(payload.monthly_units)) {
      return sendError(res, 400, 'validation_error', 'monthly_units must be an array of 12 numbers.');
    }
    if (!Number.isFinite(Number(payload.tariff_per_unit))) {
      return sendError(res, 400, 'validation_error', 'tariff_per_unit must be a number.');
    }
    if (!payload.address || typeof payload.address !== 'string') {
      return sendError(res, 400, 'validation_error', 'address is required.');
    }
    if (!Number.isFinite(Number(payload.rooftop_sqm))) {
      return sendError(res, 400, 'validation_error', 'rooftop_sqm must be a number.');
    }

    const monthlyUnits = payload.monthly_units.map((v) => Number(v));
    const tariffPerUnit = Number(payload.tariff_per_unit);

    const { lat, lon } = await geocodeAddress(payload.address);
    const ghiMonthly = await getMonthlyIrradiance(lat, lon);
    const avgGhi = ghiMonthly.reduce((a, b) => a + b, 0) / ghiMonthly.length;

    const forecast = await callPython('/forecast', {
      monthly_units: monthlyUnits,
    });

    const loadProfile = await callPython('/load-profile', {
      tariff_category: payload.tariff_category || 'domestic',
    });

    let compute = await callPython('/compute', {
      annual_kwh: Number(forecast.forecast_annual_kwh),
      avg_ghi: avgGhi,
      tariff_per_unit: tariffPerUnit,
      self_consumption_ratio: loadProfile.self_consumption_ratio,
      export_ratio: loadProfile.export_ratio,
    });

    let rooftopCheck = await callPython('/validate-rooftop', {
      num_panels: compute.num_panels,
      rooftop_sqm: Number(payload.rooftop_sqm),
    });

    if (rooftopCheck.status === 'constrained' && Number(rooftopCheck.fitted_kwp) > 0) {
      compute = await callPython('/compute', {
        annual_kwh: Number(forecast.forecast_annual_kwh),
        avg_ghi: avgGhi,
        tariff_per_unit: tariffPerUnit,
        self_consumption_ratio: loadProfile.self_consumption_ratio,
        export_ratio: loadProfile.export_ratio,
        system_kwp_override: Number(rooftopCheck.fitted_kwp),
      });

      rooftopCheck = await callPython('/validate-rooftop', {
        num_panels: compute.num_panels,
        rooftop_sqm: Number(payload.rooftop_sqm),
      });
    }

    const responsePayload = finalizeResponse({
      sessionId,
      payload,
      location: { lat, lon, address: payload.address },
      irradianceMonthly: ghiMonthly,
      monthlyUnits,
      forecast,
      loadProfile,
      rooftopCheck,
      compute,
      estimationMethod: payload.estimation_method,
    });

    if (isDbConnected()) {
      await models.Calculation.create({
        session_id: sessionId,
        system_kwp: responsePayload.system_kwp,
        num_panels: responsePayload.num_panels,
        rooftop_status: responsePayload.rooftop_check?.status,
        area_warning: responsePayload.rooftop_check?.warning || null,
        monthly_gen_kwh: responsePayload.monthly_gen_kwh,
        self_consumption_ratio: responsePayload.load_profile?.self_consumption_ratio,
        export_ratio: responsePayload.load_profile?.export_ratio,
        financial: responsePayload.financial,
        forecast: responsePayload.forecast,
        irradiance_monthly: responsePayload.irradiance_monthly,
      });
    }

    return res.json(responsePayload);
  } catch (error) {
    console.error('calculate error:', error.message);
    return sendError(res, 500, 'calculation_error', error.message || 'Calculation failed.');
  }
});

router.post('/generate-report', async (req, res) => {
  const payload = req.body || {};
  const sessionId = payload.session_id || crypto.randomUUID();

  try {
    const reportText = generateReport(payload);
    const words = reportText.split(/\s+/).filter(Boolean);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullText = '';
    for (const word of words) {
      const token = `${word} `;
      fullText += token;
      res.write(`data: ${token}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }

    res.write('data: [DONE]\n\n');
    res.end();

    if (isDbConnected()) {
      await models.Report.create({
        session_id: sessionId,
        report_text: fullText.trim(),
      });
    }
  } catch (error) {
    console.error('generate-report error:', error.message);
    if (!res.headersSent) {
      return sendError(res, 500, 'report_error', 'Report generation failed.');
    }
    res.write(`data: ${JSON.stringify(errorJson('report_error', 'Report generation failed.'))}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

module.exports = router;
