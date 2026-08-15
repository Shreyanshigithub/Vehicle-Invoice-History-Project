const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

const execFileAsync = promisify(execFile);

async function extractFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await pdfParse(buffer);
  return { text: result.text || '', method: 'pdf-text' };
}

async function extractFromImage(filePath) {
  const { data } = await Tesseract.recognize(filePath, 'eng', { logger: () => {} });
  return { text: data.text || '', method: 'tesseract-ocr' };
}

async function extractText(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.pdf') return extractFromPdf(filePath);
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) return extractFromImage(filePath);

  // Small fallback for environments that already have pdftotext installed.
  if (extension === '.pdf') {
    const { stdout } = await execFileAsync('pdftotext', [filePath, '-']);
    return { text: stdout, method: 'pdftotext' };
  }
  throw new Error('Only PDF, PNG, JPG and WEBP files are supported.');
}

module.exports = { extractText };
