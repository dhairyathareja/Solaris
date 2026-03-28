const axios = require('axios');

/**
 * Fetches solar irradiance data (GHI - Global Horizontal Irradiance) for the given coordinates 
 * utilizing the NASA POWER (Prediction of Worldwide Energy Resources) API.
 * The metric used is ALLSKY_SFC_SW_DWN (All Sky Surface Shortwave Downward Irradiance).
 * Averages data over multiple years (2015-2023) and processes it into average monthly statistics.
 */
async function fetchMonthlyGhi(lat, lon) {
  const url = 'https://power.larc.nasa.gov/api/temporal/monthly/point';
  try {
    const response = await axios.get(url, {
      params: {
        parameters: 'ALLSKY_SFC_SW_DWN', // The specific solar energy metric from NASA
        community: 'RE', // Renewable Energy community validation
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

    // Process the temporal dataset: group values by month (YYYYMM format from keys)
    for (const [key, value] of Object.entries(ghiData)) {
      if (key.length !== 6 || value < 0) {
        // Skip invalid data points indicated by negative values (e.g., missing data)
        continue;
      }

      const month = parseInt(key.substring(4, 6), 10);
      if (month >= 1 && month <= 12) {
        monthSums[month] += value;
        monthCounts[month] += 1;
      }
    }

    // Calculate long-term monthly averages
    const monthlyAverages = [];
    for (let m = 1; m <= 12; m++) {
      if (monthCounts[m] > 0) {
        monthlyAverages.push(Math.round((monthSums[m] / monthCounts[m]) * 100) / 100);
      } else {
        // Fallback: Global average approximation if data is missing for that coordinate
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
