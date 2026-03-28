const axios = require('axios');

async function geocodeAddress(address) {
  const url = 'https://nominatim.openstreetmap.org/search';
  try {
    const response = await axios.get(url, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
      },
      headers: {
        'User-Agent': 'SOLARIS-Solar-App/1.0',
      },
      timeout: 15000,
    });

    const results = response.data;
    if (!results || results.length === 0) {
      throw new Error(`Could not geocode address: '${address}'. Please provide a more specific address.`);
    }

    const lat = parseFloat(results[0].lat);
    const lon = parseFloat(results[0].lon);
    return [lat, lon];
  } catch (error) {
    if (error.response) {
      throw new Error(`Geocoding API error: ${error.response.statusText}`);
    }
    throw error;
  }
}

module.exports = { geocodeAddress };
