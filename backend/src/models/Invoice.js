const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  partCode: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  rate: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  type: { type: String, default: '' }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, trim: true, index: true },
  vehicleRegistrationNumber: { type: String, required: true, trim: true, uppercase: true, index: true },
  model: { type: String, default: '' },
  chassisNumber: { type: String, default: '' },
  invoiceDate: { type: Date },
  kilometers: { type: Number },
  jobCardNumber: { type: String, default: '' },
  workshopName: { type: String, default: '' },
  totalAmount: { type: Number, default: 0 },
  components: { type: [componentSchema], default: [] },
  sourceFile: { type: String, default: '' },
  extractionMethod: { type: String, default: 'pdf-text' },
  alerts: [{ type: String }]
}, { timestamps: true });

invoiceSchema.index({ vehicleRegistrationNumber: 1, invoiceDate: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
