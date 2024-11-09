const mongoose = require('mongoose');

const TicketNumberSchema = new mongoose.Schema({
  ticketType: { type: String, required: true }, // A, B, C, D
  lastNumber: { type: Number, required: true, default: 0 }, // Último número generado
});

module.exports = mongoose.model('TicketNumber', TicketNumberSchema);
