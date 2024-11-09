const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

const USERS = [
  { username: 'urimuri', password: 'Cocolove2017' }, // Usuario y contraseña de prueba
];

// Endpoint para login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
  }

  // Generar token JWT
  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

module.exports = router;
