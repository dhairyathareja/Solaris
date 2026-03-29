/* File overview: api/node/services/nasa.js
 * Purpose: fetches and normalizes monthly irradiance from NASA POWER API.
 */
const axios = require('axios');

async function fetchMonthlyGhi(lat, lon) {
  const response = await axios.get('https://power.larc.nasa.gov/api/temporal/monthly/point', {
    params: {
      parameters: 'ALLSKY_SFC_SW_DWN',
      community: 'RE',
      longitude: lon,
      latitude: lat,
      start: 2015,
      end: 2023,
      format: 'JSON',
    },
    timeout: 30000,
  });

  const payload = response?.data?.properties?.parameter?.ALLSKY_SFC_SW_DWN;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid NASA POWER response.');
  }

  const monthSums = Array(12).fill(0);
  const monthCounts = Array(12).fill(0);

  for (const [key, value] of Object.entries(payload)) {
    if (!/^\d{6}$/.test(key) || typeof value !== 'number' || value < 0) continue;
    const monthIdx = Number(key.slice(4, 6)) - 1;
    if (monthIdx < 0 || monthIdx > 11) continue;
    monthSums[monthIdx] += value;
    monthCounts[monthIdx] += 1;
  }

  const allValues = Object.values(payload).filter((v) => typeof v === 'number' && v >= 0);
  const fallback = allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 4.5;

  return monthSums.map((sum, idx) => {
    const avg = monthCounts[idx] > 0 ? sum / monthCounts[idx] : fallback;
    return Math.round(avg * 100) / 100;
  });
}

module.exports = { fetchMonthlyGhi };
