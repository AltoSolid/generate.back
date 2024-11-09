require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const ticketRoutes = require('./routes/ticketRoutes');
const authRoutes = require('./routes/authRoutes'); // Importar las rutas de autenticación

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Conexión a MongoDB exitosa'))
  .catch((error) => console.error('Error al conectar a MongoDB:', error));

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/tickets', ticketRoutes);
app.use('/api/auth', authRoutes); // Registrar las rutas de autenticación

// Iniciar servidor
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
