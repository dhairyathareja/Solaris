/* File overview: api/services/geocoding.js
 * Purpose: legacy geocoding helper backed by OpenStreetMap Nominatim.
 */
const axios = require('axios');

/**
 * Converts a plain text address into Latitude and Longitude coordinates.
 * Connects to OpenStreetMap's Nominatim public API.
 */
async function geocodeAddress(address) {
  const url = 'https://nominatim.openstreetmap.org/search';
  try {
    const response = await axios.get(url, {
      params: {
        q: address,
        format: 'json',
        limit: 1, // Only fetch the top most relevant result
      },
      headers: {
        'User-Agent': 'SOLARIS-Solar-App/1.0', // Custom User-Agent to respect OSM's acceptable use policy
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
