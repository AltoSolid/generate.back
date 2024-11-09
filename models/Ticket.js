const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  identification: { type: String, required: true, match: /^[0-9]+$/ },
  ticketType: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  ticketId: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  generationTime: { type: Date, default: Date.now },
  remainingUses: { type: Number, required: true },
  scanDates: { type: [Date], default: [] },
});

module.exports = mongoose.model('Ticket', ticketSchema);