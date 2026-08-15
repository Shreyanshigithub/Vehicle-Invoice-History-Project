const fs = require('fs/promises');
const Invoice = require('../models/Invoice');
const { extractText } = require('../services/ocrService');
const { parseInvoiceText } = require('../services/invoiceParser');
const { buildAlerts } = require('../services/historyService');

async function uploadInvoice(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please select an invoice file.' });

    const { text, method } = await extractText(req.file.path);
    const parsed = parseInvoiceText(text);

    if (!parsed.invoiceNumber || !parsed.vehicleRegistrationNumber) {
      return res.status(422).json({
        message: 'The invoice was read, but required fields could not be identified.',
        extractedTextPreview: text.slice(0, 1200)
      });
    }

    const invoice = await Invoice.create({
      ...parsed,
      sourceFile: req.file.originalname,
      extractionMethod: method
    });

    const alerts = await buildAlerts(invoice);
    invoice.alerts = alerts;
    await invoice.save();

    res.status(201).json({ invoice, extractedTextPreview: text.slice(0, 1200) });
  } catch (error) {
    next(error);
  }
}

async function listInvoices(req, res, next) {
  try {
    const { vehicle, search } = req.query;
    const filter = {};
    if (vehicle) filter.vehicleRegistrationNumber = vehicle.toUpperCase();
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { vehicleRegistrationNumber: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }
    const invoices = await Invoice.find(filter).sort({ invoiceDate: -1, createdAt: -1 }).lean();
    res.json(invoices);
  } catch (error) {
    next(error);
  }
}

async function vehicleHistory(req, res, next) {
  try {
    const registrationNumber =
      req.params.registrationNumber
        .trim()
        .toUpperCase();

    const invoices = await Invoice.find({
      vehicleRegistrationNumber: registrationNumber
    })
      .sort({
        invoiceDate: -1,
        createdAt: -1
      })
      .lean();

    const componentMap = new Map();

    invoices.forEach(invoice => {
      (invoice.components || []).forEach(component => {
        if (!component.name) return;

        const key = component.name
          .trim()
          .toLowerCase();

        if (!componentMap.has(key)) {
          componentMap.set(key, []);
        }

        componentMap.get(key).push({
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          price: component.price
        });
      });
    });

    const repeatedComponents = [];

    for (const [component, entries] of componentMap.entries()) {
      if (entries.length < 2) continue;

      const matchingEntries = [];

      for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
          if (
            !entries[i].invoiceDate ||
            !entries[j].invoiceDate
          ) {
            continue;
          }

          const firstDate =
            new Date(entries[i].invoiceDate);

          const secondDate =
            new Date(entries[j].invoiceDate);

          const days =
            Math.abs(firstDate - secondDate) /
            86400000;

          if (days <= 30) {
            matchingEntries.push(entries[i]);
            matchingEntries.push(entries[j]);
          }
        }
      }

      const uniqueEntries = [
        ...new Map(
          matchingEntries.map(entry => [
            entry.invoiceNumber,
            entry
          ])
        ).values()
      ];

      if (uniqueEntries.length > 1) {
        repeatedComponents.push({
          component,
          entries: uniqueEntries
        });
      }
    }

    res.json({
      registrationNumber,
      invoices,
      repeatedComponents
    });
  } catch (error) {
    next(error);
  }
}

async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
    res.json({ message: 'Invoice deleted.' });
  } catch (error) {
    next(error);
  }
}

module.exports = { uploadInvoice, listInvoices, vehicleHistory, deleteInvoice };
