const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();


const mysql = require('mysql2/promise');





const { pool } = require('./config/database');

// Importa as rotas existentes
const bancosRoutes = require('./routes/bancos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// ROTA PARA CATEGORIAS
// ============================================================
app.get('/api/bancos/categorias', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT codigo, categoria FROM categoria ORDER BY codigo'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ error: err.message });
  }
});

// Usa as rotas de bancos
app.use('/api/bancos', bancosRoutes);

// Rota principal para servir o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log('CRES NFe Web rodando em http://localhost:' + PORT);
});