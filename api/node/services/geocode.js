const axios = require('axios');

async function geocodeAddress(address) {
  const response = await axios.get('https://nominatim.openstreetmap.org/search', {
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

  if (!response.data || response.data.length === 0) {
    throw new Error(`Could not geocode address: '${address}'. Please provide a more specific address.`);
  }

  return {
    lat: Number(response.data[0].lat),
    lon: Number(response.data[0].lon),
  };
}

module.exports = { geocodeAddress };
