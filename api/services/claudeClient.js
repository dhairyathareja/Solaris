/* File overview: api/services/claudeClient.js
 * Purpose: legacy Claude-Vision extraction helper for bill fields.
 */
const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `Extract from this electricity bill image and return ONLY valid JSON, no preamble:
{
  "monthly_units": [list of up to 12 monthly kWh values, oldest first],
  "sanctioned_load_kw": number or null,
  "tariff_per_unit": number in rupees or null,
  "tariff_category": "domestic" | "commercial" | "industrial" | null,
  "discom_name": string or null,
  "state": string or null
}
If a field is not visible, use null. Return only JSON.`;

const NULL_RESULT = {
  monthly_units: [],
  sanctioned_load_kw: null,
  tariff_per_unit: null,
  tariff_category: null,
  discom_name: null,
  state: null,
};

async function extractBillData(base64Image, mediaType) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY, // defaults to process.env.ANTHROPIC_API_KEY
    });

    // Make an API call to Claude Vision model passing the base64-encoded image of the electricity bill
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: SYSTEM_PROMPT,
            },
          ],
        },
      ],
    });

    let rawText = response.content[0].text.trim();

    // Try to extract JSON from the response (handle markdown code fences)
    if (rawText.startsWith('```')) {
      const lines = rawText.split('\n');
      const jsonLines = [];
      let inside = false;
      for (const line of lines) {
        if (line.startsWith('```') && !inside) {
          inside = true;
          continue;
        } else if (line.startsWith('```') && inside) {
          break;
        } else if (inside) {
          jsonLines.push(line);
        }
      }
      rawText = jsonLines.join('\n');
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      return NULL_RESULT;
    }

    return {
      monthly_units: data.monthly_units || [],
      sanctioned_load_kw: data.sanctioned_load_kw || null,
      tariff_per_unit: data.tariff_per_unit || null,
      tariff_category: data.tariff_category || null,
      discom_name: data.discom_name || null,
      state: data.state || null,
    };
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}

module.exports = { extractBillData };
