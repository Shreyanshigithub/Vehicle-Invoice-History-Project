const Invoice = require('../models/Invoice');

async function buildAlerts(invoice) {
  const alerts = [];

  if (
    !invoice.vehicleRegistrationNumber ||
    !invoice.components?.length
  ) {
    return alerts;
  }

  const previous = await Invoice.find({
    vehicleRegistrationNumber:
      invoice.vehicleRegistrationNumber,
    _id: { $ne: invoice._id }
  })
    .sort({ invoiceDate: -1 })
    .lean();

  const currentDate = invoice.invoiceDate
    ? new Date(invoice.invoiceDate)
    : new Date();

  for (const currentItem of invoice.components) {
    const currentName = currentItem.name
      ?.trim()
      .toLowerCase();

    if (!currentName) continue;

    const sameItems = [];

    for (const oldInvoice of previous) {
      for (const oldItem of oldInvoice.components || []) {
        const oldName = oldItem.name
          ?.trim()
          .toLowerCase();

        if (oldName === currentName) {
          const oldDate = oldInvoice.invoiceDate
            ? new Date(oldInvoice.invoiceDate)
            : null;

          const days = oldDate
            ? Math.abs(currentDate - oldDate) / 86400000
            : 9999;

          if (days <= 30) {
            sameItems.push({
              invoiceNumber: oldInvoice.invoiceNumber,
              days: Math.round(days)
            });
          }
        }
      }
    }

    if (sameItems.length) {
      alerts.push(
        `Repeated component: ${currentItem.name} was billed in another invoice within 30 days (${sameItems[0].invoiceNumber}).`
      );
    }
  }

  return alerts;
}

module.exports = { buildAlerts };