const { createCanvas, loadImage } = require('canvas');
const PDFDocument = require('pdfkit');
const path = require('path');

exports.createTicketBuffers = async (ticketType, ticketNumber, qrCodeUrl) => {
  try {
    const templatePath = path.join(__dirname, '../templates', `ticket-${ticketType.toLowerCase()}.jpeg`);
    const canvas = createCanvas(1080, 540); // Tamaño estándar del ticket
    const context = canvas.getContext('2d');

    // Cargar la plantilla del ticket
    const template = await loadImage(templatePath);
    context.drawImage(template, 0, 0, canvas.width, canvas.height);

    // Estilo y configuración del texto para el número de boleta
    context.font = 'bold 36px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';

    // Dibujar el número de boleta en la plantilla
    context.fillText(ticketNumber, 920, 280); // Posición ajustada según plantilla
    context.fillStyle = 'white';
    context.fillText(ticketNumber, 550, 480); // Posición secundaria (si es necesario)

    // Dibujar el código QR en el ticket
    const qrImage = await loadImage(qrCodeUrl);
    context.drawImage(qrImage, 850, 320, 180, 180); // Tamaño y posición del QR en la plantilla

    // Generar la imagen JPEG en memoria
    const jpegBuffer = canvas.toBuffer('image/jpeg');

    // Crear un documento PDF y agregar la imagen generada
    const pdfDoc = new PDFDocument({ size: [canvas.width, canvas.height] });
    const pdfBuffers = [];

    return new Promise((resolve, reject) => {
      pdfDoc.on('data', (chunk) => pdfBuffers.push(chunk));
      pdfDoc.on('end', () => {
        const pdfBuffer = Buffer.concat(pdfBuffers);
        resolve({ pdfBuffer, jpegBuffer }); // Resolver con el PDF y la imagen JPEG
      });
      pdfDoc.on('error', (err) => reject(err));

      // Insertar la imagen JPEG generada al PDF
      pdfDoc.image(jpegBuffer, 0, 0, { width: canvas.width, height: canvas.height });
      pdfDoc.end();
    });
  } catch (error) {
    console.error('Error al generar el ticket:', error);
    throw new Error('Error al generar el ticket.');
  }
};
