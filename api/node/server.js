/* File overview: api/node/server.js
 * Purpose: primary Node API bootstrap with CORS, DB init, and route registration.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRouter = require('./routes/analyze');
const { connectDb } = require('./services/db');

const app = express();
const PORT = Number(process.env.PORT || 8000);

const configuredOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://43.205.98.214,https://43.205.98.214')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.set('trust proxy', 1);

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser tools and internal reverse-proxy requests without Origin header.
    if (!origin) return callback(null, true);
    if (configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.use('/api', analyzeRouter);

connectDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node API listening on ${PORT}`);
});
