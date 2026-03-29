/* File overview: api/node/services/db.js
 * Purpose: Mongo schemas plus best-effort database connection helpers.
 */
const mongoose = require('mongoose');

let connected = false;

const billExtractionSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true },
  monthly_units: [Number],
  sanctioned_load_kw: Number,
  tariff_per_unit: Number,
  tariff_category: String,
  discom_name: String,
  state: String,
  parse_confidence: String,
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const rooftopInputSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true },
  rooftop_sqm: Number,
  estimation_method: String,
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const calculationSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true },
  system_kwp: Number,
  num_panels: Number,
  rooftop_status: String,
  area_warning: String,
  monthly_gen_kwh: [Number],
  self_consumption_ratio: Number,
  export_ratio: Number,
  financial: mongoose.Schema.Types.Mixed,
  forecast: mongoose.Schema.Types.Mixed,
  irradiance_monthly: [Number],
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

const reportSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true },
  report_text: String,
  generated_at: { type: Date, default: Date.now },
}, { versionKey: false });

const irradianceSchema = new mongoose.Schema({
  lat_lon_key: { type: String, required: true, unique: true, index: true },
  monthly_ghi: [Number],
  fetched_at: { type: Date, default: Date.now },
}, { versionKey: false });

irradianceSchema.index({ fetched_at: 1 }, { expireAfterSeconds: 2592000 });

const BillExtraction = mongoose.models.BillExtraction || mongoose.model('BillExtraction', billExtractionSchema);
const RooftopInput = mongoose.models.RooftopInput || mongoose.model('RooftopInput', rooftopInputSchema);
const Calculation = mongoose.models.Calculation || mongoose.model('Calculation', calculationSchema);
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
const IrradianceCache = mongoose.models.IrradianceCache || mongoose.model('IrradianceCache', irradianceSchema);

async function connectDb() {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not set. Running without persistence.');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    connected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.warn('MongoDB connection failed, continuing without persistence:', error.message);
  }
}

function isDbConnected() {
  return connected;
}

module.exports = {
  connectDb,
  isDbConnected,
  models: {
    BillExtraction,
    RooftopInput,
    Calculation,
    Report,
    IrradianceCache,
  },
};
