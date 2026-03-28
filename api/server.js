require('dotenv').config();
const express = require('express');
const cors = require('cors');
const analyzeRouter = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use('/api', analyzeRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
