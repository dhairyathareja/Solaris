const axios = require('axios');

async function fetchMonthlyGhi(lat, lon) {
  const url = 'https://power.larc.nasa.gov/api/temporal/monthly/point';
  try {
    const response = await axios.get(url, {
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

    const data = response.data;
    const ghiData = data.properties.parameter.ALLSKY_SFC_SW_DWN;

    const monthSums = {};
    const monthCounts = {};
    for (let i = 1; i <= 12; i++) {
      monthSums[i] = 0;
      monthCounts[i] = 0;
    }

    for (const [key, value] of Object.entries(ghiData)) {
      if (key.length !== 6 || value < 0) {
        continue;
      }

      const month = parseInt(key.substring(4, 6), 10);
      if (month >= 1 && month <= 12) {
        monthSums[month] += value;
        monthCounts[month] += 1;
      }
    }

    const monthlyAverages = [];
    for (let m = 1; m <= 12; m++) {
      if (monthCounts[m] > 0) {
        monthlyAverages.push(Math.round((monthSums[m] / monthCounts[m]) * 100) / 100);
      } else {
        const allVals = Object.values(ghiData).filter(v => v > 0);
        let avg = 4.5;
        if (allVals.length > 0) {
          avg = allVals.reduce((a, b) => a + b, 0) / allVals.length;
        }
        monthlyAverages.push(Math.round(avg * 100) / 100);
      }
    }

    return monthlyAverages;
  } catch (error) {
    console.error('NASA POWER API error:', error.message);
    throw error;
  }
}

module.exports = { fetchMonthlyGhi };
