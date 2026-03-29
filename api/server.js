/* File overview: api/server.js
 * Purpose: legacy API bootstrap with CORS and route wiring.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRouter = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 8001;

// Setup CORS to accept requests from our frontend Vite server
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Setup JSON parsing middleware to handle standard REST payloads
app.use(express.json());

// Routes defining mapping for endpoints like `/api/calculate` and `/api/analyze-bill`
app.use('/api', analyzeRouter);

// Initialize server connection listener
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
