const Ticket = require('../models/Ticket');
const TicketNumber = require('../models/TicketNumber');
const { createTicketBuffers } = require('../utils/ticketUtils');
const QRCode = require('qrcode');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ORGANIZER_EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// Obtener los últimos números de boletas
exports.getLastTickets = async (req, res) => {
  try {
    const tickets = await TicketNumber.find();
    const ticketDetails = await Ticket.find().sort({ _id: -1 }).limit(4); // Últimos tickets generados
    const ticketTypes = ['A', 'B', 'C', 'D'];
    const formattedTickets = {};

    ticketTypes.forEach((type) => {
      const ticket = tickets.find((t) => t.ticketType === type);
      const ticketDetail = ticketDetails.find((td) => td.ticketType === type);

      formattedTickets[type] = ticket
        ? {
          number: `${ticket.ticketType}${String(ticket.lastNumber).padStart(3, '0')}`,
          name: ticketDetail ? ticketDetail.name : 'Sin nombre',
        }
        : { number: `${type}---`, name: 'Sin generar' };
    });

    res.json(formattedTickets);
  } catch (error) {
    console.error('Error al obtener los números de boletas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener los números de boletas' });
  }
};

// Generar una nueva boleta (o múltiples boletas)
exports.generateTicket = async (req, res) => {
  const { name, email, phone, identification, ticketType, numberOfTickets = 1 } = req.body;

  if (numberOfTickets < 1 || numberOfTickets > 5) {
    return res.status(400).json({ success: false, message: 'El número de boletas debe estar entre 1 y 5.' });
  }

  try {
    // Obtener y actualizar el último número de boleta
    let ticketNumberRecord = await TicketNumber.findOne({ ticketType });
    if (!ticketNumberRecord) {
      ticketNumberRecord = new TicketNumber({ ticketType, lastNumber: 0 });
    }

    const generatedTickets = [];
    const pdfBuffers = [];

    for (let i = 0; i < numberOfTickets; i++) {
      ticketNumberRecord.lastNumber += 1;
      const currentTicketNumber = `${ticketType}${String(ticketNumberRecord.lastNumber).padStart(3, '0')}`;
      const uniqueCode = crypto.createHash('sha256').update(currentTicketNumber + Date.now().toString()).digest('hex');

      const qrData = JSON.stringify({ ticketId: currentTicketNumber, name, uniqueCode });
      const qrCodeUrl = await QRCode.toDataURL(qrData);

      const { pdfBuffer } = await createTicketBuffers(ticketType, currentTicketNumber, qrCodeUrl);
      pdfBuffers.push({ pdfBuffer, ticketNumber: currentTicketNumber, uniqueCode });

      const ticket = new Ticket({
        name,
        email,
        phone,
        identification,
        ticketType,
        ticketId: currentTicketNumber,
        hash: uniqueCode,
        remainingUses: ticketType === 'A' ? 1 : 2,
        scanDates: [],
        generationTime: new Date(),
      });

      await ticket.save();
      generatedTickets.push(currentTicketNumber);
    }

    await ticketNumberRecord.save();
    console.log(`Boletas generadas: ${generatedTickets.join(', ')}`);

    // Preparar correos
    try {
      // Enviar correo al cliente
      await transporter.sendMail({
        from: process.env.ORGANIZER_EMAIL,
        to: email,
        subject: 'FESTIVAL COREANO 2024 - Tiquetes',
        html: `
          <p><strong>안녕하세요! Hola ${name} ¡Muchas gracias por confiar en nosotros!</strong></p>
          <p>Adjunto a este correo encontrará los tiquetes comprados en PDF.</p>

          <p>Recuerda sus tiquetes son únicos e intransferibles y es responsabilidad del cliente la privacidad de los mismos.<br>
          Debes presentar este tiquete en la entrada del festival.</p>

          <p>Atentamente,</p>
          <p>
            Centro Cultural Coreano<br>
            <a href="http://www.coreacolombia.com">www.coreacolombia.com</a><br>
            Nit: 901032792-0<br>
            Carrera 53 #5b-09<br>
            Instagram: <a href="https://instagram.com/coreacolombia">@coreacolombia</a><br>
            Móvil: 3118266816
          </p>

          <p><strong>Política de Privacidad de Datos Personales:</strong></p>
          <p>
            En el Centro Cultural Coreano, respetamos y protegemos la privacidad de nuestros clientes. 
            Los datos personales que recopilamos al momento de la compra de tiquetes para nuestros eventos, tales como nombre, número de identificación, correo electrónico y número de teléfono, 
            son usados exclusivamente para gestionar su participación, enviar confirmaciones, y brindar información relevante sobre el evento. 
          </p>

          <p><strong>Aviso sobre el uso de tiquetes:</strong></p>
          <p>
            El tiquete generado es de uso estrictamente personal e intransferible. Compartir o permitir que otra persona acceda al código QR o información del tiquete 
            es responsabilidad exclusiva del cliente. En caso de que un tercero no autorizado use el tiquete para ingresar al festival, el Centro Cultural Coreano no se hará responsable 
            y el cliente titular del tiquete podría no tener acceso al evento. Por lo tanto, recomendamos mantener el tiquete seguro y evitar compartirlo en cualquier medio digital o físico.
          </p>
        `,
        attachments: pdfBuffers.map(({ pdfBuffer, ticketNumber }) => ({
          filename: `boleta-${ticketNumber}.pdf`,
          content: pdfBuffer,
        })),
      });

      console.log(`Correo enviado al cliente: ${email}`);

      // Enviar correo al organizador
      const organizerHtml = `
        <p><strong>Tiquete(s) generado(s)</strong></p>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono/celular:</strong> ${phone}</p>
        <p><strong>Número de identificación:</strong> ${identification}</p>
        <p><strong>Detalles de la(s) boleta(s) generada(s):</strong></p>
        ${pdfBuffers
          .map(
            ({ ticketNumber, uniqueCode }) => `
              <p>- <strong>Tiquete No:</strong> ${ticketNumber} | <strong>Firma digital:</strong> ${uniqueCode}</p>
            `
          )
          .join('')}
      `;

      await transporter.sendMail({
        from: process.env.ORGANIZER_EMAIL,
        to: process.env.ORGANIZER_EMAIL,
        subject: `Nuevos tiquetes generados: ${generatedTickets.join(', ')}`,
        html: organizerHtml,
        attachments: pdfBuffers.map(({ pdfBuffer, ticketNumber }) => ({
          filename: `boleta-${ticketNumber}.pdf`,
          content: pdfBuffer,
        })),
      });

      console.log('Correo enviado al organizador');
      res.json({ success: true, ticketNumbers: generatedTickets });
    } catch (emailError) {
      console.error(`Error al enviar correos: ${emailError.message}`);
      res.status(500).json({ success: false, message: 'Error al enviar correos' });
    }
  } catch (error) {
    console.error('Error al generar la(s) boleta(s):', error);
    res.status(500).json({ success: false, message: 'Error al generar la(s) boleta(s)' });
  }
};
