const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://python:5000';
const NET_METERING_RATE = 2.5;

const DEMO_BUILDINGS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'demo_buildings.json'), 'utf8'),
);

function errorJson(error, detail) {
  return { error, detail };
}

function sendError(res, status, error, detail) {
  return res.status(status).json(errorJson(error, detail));
}

function toAnnualChangePct(monthlyUnits) {
  if (!Array.isArray(monthlyUnits) || monthlyUnits.length < 2) return 0;
  const first = Number(monthlyUnits[0]);
  const last = Number(monthlyUnits[monthlyUnits.length - 1]);
  if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return 0;
  return ((last - first) * 12 / monthlyUnits.length / first) * 100;
}

function localForecast(monthlyUnits) {
  const base = monthlyUnits.map((v) => Number(v));
  const annual = base.reduce((a, b) => a + b, 0);
  const annualChangePct = toAnnualChangePct(base);
  let trend = 'stable';
  if (annualChangePct > 2) trend = 'increasing';
  if (annualChangePct < -2) trend = 'decreasing';
  return {
    forecast_monthly_kwh: base,
    forecast_annual_kwh: annual,
    trend,
    annual_change_pct: Math.round(annualChangePct * 100) / 100,
    model: 'demo_static',
  };
}

async function callPython(endpoint, payload, timeout = 20000) {
  const response = await axios.post(`${PYTHON_SERVICE_URL}${endpoint}`, payload, { timeout });
  return response.data;
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

router.post('/analyze-bill', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return sendError(res, 400, 'validation_error', 'No file uploaded');
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(file.mimetype)) {
      return sendError(res, 400, 'validation_error', 'Unsupported file type. Use JPG, PNG, WebP or GIF.');
    }

    const text = await extractTextFromImage(file.buffer);
    const parsed = parseBillText(text);
    const sessionId = crypto.randomUUID();

    if (isDbConnected()) {
      await models.BillExtraction.create({
        session_id: sessionId,
        monthly_units: parsed.monthly_units,
        sanctioned_load_kw: parsed.sanctioned_load_kw,
        tariff_per_unit: parsed.tariff_per_unit,
        tariff_category: parsed.tariff_category,
        discom_name: parsed.discom_name,
        state: parsed.state,
        parse_confidence: parsed.parse_confidence,
      });
    }

    return res.json({ session_id: sessionId, ...parsed });
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

router.get('/demo/:buildingId', async (req, res) => {
  try {
    const demo = DEMO_BUILDINGS.find((item) => item.id === req.params.buildingId);
    if (!demo) {
      return sendError(res, 404, 'not_found', 'Demo building not found.');
    }

    const sessionId = crypto.randomUUID();
    const monthlyUnits = demo.bill_data.monthly_units;
    const forecast = localForecast(monthlyUnits);
    const loadProfile = await callPython('/load-profile', {
      tariff_category: demo.bill_data.tariff_category,
    });
    const avgGhi = demo.irradiance_monthly.reduce((a, b) => a + b, 0) / demo.irradiance_monthly.length;

    let compute = await callPython('/compute', {
      annual_kwh: Number(forecast.forecast_annual_kwh),
      avg_ghi: avgGhi,
      tariff_per_unit: demo.bill_data.tariff_per_unit,
      self_consumption_ratio: loadProfile.self_consumption_ratio,
      export_ratio: loadProfile.export_ratio,
    });

    let rooftopCheck = await callPython('/validate-rooftop', {
      num_panels: compute.num_panels,
      rooftop_sqm: Number(demo.rooftop.rooftop_sqm),
    });

    if (rooftopCheck.status === 'constrained' && Number(rooftopCheck.fitted_kwp) > 0) {
      compute = await callPython('/compute', {
        annual_kwh: Number(forecast.forecast_annual_kwh),
        avg_ghi: avgGhi,
        tariff_per_unit: demo.bill_data.tariff_per_unit,
        self_consumption_ratio: loadProfile.self_consumption_ratio,
        export_ratio: loadProfile.export_ratio,
        system_kwp_override: Number(rooftopCheck.fitted_kwp),
      });

      rooftopCheck = await callPython('/validate-rooftop', {
        num_panels: compute.num_panels,
        rooftop_sqm: Number(demo.rooftop.rooftop_sqm),
      });
    }

    const payload = {
      ...demo.bill_data,
      tariff_per_unit: demo.bill_data.tariff_per_unit,
      tariff_category: demo.bill_data.tariff_category,
      rooftop_sqm: demo.rooftop.rooftop_sqm,
      estimation_method: demo.rooftop.estimation_method,
      address: demo.label,
      discom_name: demo.bill_data.discom_name,
      state: demo.bill_data.state,
      sanctioned_load_kw: demo.bill_data.sanctioned_load_kw,
    };

    const responsePayload = finalizeResponse({
      sessionId,
      payload,
      location: { lat: demo.lat, lon: demo.lon, address: demo.label },
      irradianceMonthly: demo.irradiance_monthly,
      monthlyUnits,
      forecast,
      loadProfile,
      rooftopCheck,
      compute,
      estimationMethod: demo.rooftop.estimation_method,
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
    console.error('demo error:', error.message);
    return sendError(res, 500, 'demo_error', 'Demo simulation failed.');
  }
});

module.exports = router;
