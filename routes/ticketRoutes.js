const express = require('express');
const { getLastTickets, generateTicket } = require('../controllers/ticketController');

const router = express.Router();

// Ruta para obtener los últimos números de boletas
router.get('/get-last-tickets', getLastTickets);

// Ruta para generar una nueva boleta
router.post('/generate-ticket', generateTicket);

module.exports = router;
