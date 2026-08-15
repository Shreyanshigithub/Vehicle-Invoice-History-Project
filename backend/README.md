# Vehicle Invoice History API

A small backend for the invoice automation assessment. It accepts PDF/image invoices, extracts text, maps it into a consistent invoice schema, stores it in MongoDB and exposes vehicle history/repeated-component checks.

## Run

1. Install Node.js 18+ and MongoDB.
2. Copy `.env.example` to `.env`.
3. Run `npm install`.
4. Run `npm run dev`.

API: http://localhost:5000

## Extraction approach

- Text-based PDFs: `pdf-parse`
- PNG/JPG/WEBP images: `tesseract.js`
- Parser: label-based extraction into a stable JSON schema

For a production version, the OCR layer can be swapped with AWS Textract / Google Document AI without changing the API or database layer.
