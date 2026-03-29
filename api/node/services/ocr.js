/* File overview: api/node/services/ocr.js
 * Purpose: runs Tesseract OCR and returns normalized extracted text.
 */
const { createWorker } = require('tesseract.js');

async function extractTextFromImage(imageBuffer) {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(imageBuffer);
    return (data?.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

module.exports = { extractTextFromImage };
