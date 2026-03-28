const express = require('express');
const multer = require('multer');
const axios = require('axios');

const { extractTextFromImage } = require('../services/ocr');
const { parseBillText } = require('../services/parser');
const { geocodeAddress } = require('../services/geocode');
const { fetchMonthlyGhi } = require('../services/nasa');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const PERFORMANCE_RATIO = 0.78;
const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://python:5000';

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/analyze-bill', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowed.has(file.mimetype)) {
      return res.status(400).json({ detail: 'Unsupported file type. Use JPG, PNG, WebP or GIF.' });
    }

    const text = await extractTextFromImage(file.buffer);
    const parsed = parseBillText(text);

    return res.json(parsed);
  } catch (error) {
    console.error('analyze-bill error:', error.message);
    return res.status(500).json({ detail: 'Bill analysis failed.' });
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

    if (!isValidMonthlyUnits(payload.monthly_units)) {
      return res.status(400).json({ detail: 'monthly_units must be an array of 12 numbers.' });
    }
    if (!Number.isFinite(Number(payload.tariff_per_unit))) {
      return res.status(400).json({ detail: 'tariff_per_unit must be a number.' });
    }
    if (!payload.address || typeof payload.address !== 'string') {
      return res.status(400).json({ detail: 'address is required.' });
    }
    if (!Number.isFinite(Number(payload.rooftop_sqm))) {
      return res.status(400).json({ detail: 'rooftop_sqm must be a number.' });
    }

    const monthlyUnits = payload.monthly_units.map((v) => Number(v));
    const tariffPerUnit = Number(payload.tariff_per_unit);

    const { lat, lon } = await geocodeAddress(payload.address);
    const ghiMonthly = await fetchMonthlyGhi(lat, lon);

    const annualConsumption = monthlyUnits.reduce((a, b) => a + b, 0);
    const avgGhi = ghiMonthly.reduce((a, b) => a + b, 0) / ghiMonthly.length;

    const pyResponse = await axios.post(`${PYTHON_SERVICE_URL}/compute`, {
      annual_kwh: annualConsumption,
      avg_ghi: avgGhi,
      tariff_per_unit: tariffPerUnit,
    }, { timeout: 15000 });

    const compute = pyResponse.data;
    const monthlyGeneration = ghiMonthly.map((ghi, idx) => {
      const value = compute.system_kwp * ghi * PERFORMANCE_RATIO * DAYS_PER_MONTH[idx];
      return Math.round(value * 10) / 10;
    });

    const annualGeneration = monthlyGeneration.reduce((a, b) => a + b, 0);
    const gridOffsetPct = annualConsumption > 0 ? (annualGeneration / annualConsumption) * 100 : 0;

    return res.json({
      location: { lat, lon, address: payload.address },
      sizing: {
        system_kwp: compute.system_kwp,
        num_panels: compute.num_panels,
        min_area_required_sqm: compute.min_area_required_sqm,
      },
      monthly_generation_kwh: monthlyGeneration,
      monthly_consumption_kwh: monthlyUnits,
      annual_generation_kwh: Math.round(annualGeneration * 10) / 10,
      annual_consumption_kwh: Math.round(annualConsumption * 10) / 10,
      grid_offset_pct: Math.round(gridOffsetPct * 10) / 10,
      ghi_monthly: ghiMonthly,
      financials: {
        capex: compute.capex,
        annual_savings: compute.annual_savings,
        om_cost_per_year: compute.om_cost,
        net_annual_benefit: compute.net_annual,
        payback_years: compute.payback_years,
        npv_25yr: compute.npv,
        irr_pct: compute.irr,
        co2_offset_kg_per_year: compute.co2_offset_kg,
      },
      tariff_per_unit: tariffPerUnit,
      tariff_category: payload.tariff_category || null,
      rooftop_sqm: Number(payload.rooftop_sqm),
    });
  } catch (error) {
    console.error('calculate error:', error.message);
    return res.status(500).json({ detail: error.message || 'Calculation failed.' });
  }
});

module.exports = router;
