const express = require('express');
const multer = require('multer');
const { extractBillData } = require('../services/claudeClient');
const { geocodeAddress } = require('../services/geocoding');
const { fetchMonthlyGhi } = require('../services/nasaPower');
const {
  sizeSystem,
  computeMonthlyGeneration,
  computeFinancialsBasic,
} = require('../services/solarEngine');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/analyze-bill', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ detail: `Unsupported file type: ${file.mimetype}. Use JPG, PNG, WebP or GIF.` });
    }

    const base64Image = file.buffer.toString('base64');
    const mediaType = file.mimetype;

    const result = await extractBillData(base64Image, mediaType);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: `Bill analysis failed: ${err.message}` });
  }
});

router.post('/calculate', async (req, res) => {
  try {
    const reqData = req.body;
    
    // 1. Geocode address: Convert text address to Lat/Long using OpenStreetMap
    const [lat, lon] = await geocodeAddress(reqData.address);

    // 2. Fetch NASA irradiance data (GHI): Gets 12-month array of averages for specific coordinate
    const ghiMonthly = await fetchMonthlyGhi(lat, lon);

    // 3. Compute annual consumption: Sum all uploaded monthly electricity bill units
    const annualKwh = reqData.monthly_units.reduce((a, b) => a + b, 0);
    const avgGhi = ghiMonthly.reduce((a, b) => a + b, 0) / ghiMonthly.length;

    // 4. Size the system: Calculates kWp rating based on optimal roof sizing formula
    const sizing = sizeSystem(annualKwh, avgGhi);
    const systemKwp = sizing.system_kwp;

    // 5. Compute monthly generation: Applies performance ratios & days-per-month logic to get precise kW output limits
    const monthlyGen = computeMonthlyGeneration(systemKwp, ghiMonthly);
    const annualGen = monthlyGen.reduce((a, b) => a + b, 0);

    // 6. Compute grid offset: Evaluate percentage of traditional electricity offset by solar prediction
    const gridOffsetPct = annualKwh > 0 ? (annualGen / annualKwh) * 100 : 0.0;

    // 7. Compute financials & returns: Evaluate costs, Payback Period, Net Present Value, and Internal Rate of Return
    const financials = computeFinancialsBasic(systemKwp, annualGen, reqData.tariff_per_unit);

    res.json({
      location: { lat, lon, address: reqData.address },
      sizing,
      monthly_generation_kwh: monthlyGen,
      monthly_consumption_kwh: reqData.monthly_units,
      annual_generation_kwh: Math.round(annualGen * 10) / 10,
      annual_consumption_kwh: Math.round(annualKwh * 10) / 10,
      grid_offset_pct: Math.round(gridOffsetPct * 10) / 10,
      ghi_monthly: ghiMonthly,
      financials,
      tariff_per_unit: reqData.tariff_per_unit,
      tariff_category: reqData.tariff_category,
      rooftop_sqm: reqData.rooftop_sqm,
    });

  } catch (err) {
    if (err.message.includes('Could not geocode')) {
       return res.status(400).json({ detail: err.message });
    }
    console.error(err);
    res.status(500).json({ detail: err.message || 'Internal Server Error' });
  }
});

module.exports = router;
