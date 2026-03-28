require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRouter = require('./routes/analyze');
const { connectDb } = require('./services/db');

const app = express();
const PORT = Number(process.env.PORT || 8000);

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

app.use('/api', analyzeRouter);

connectDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Node API listening on ${PORT}`);
});
