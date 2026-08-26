const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const mysql = require('mysql2/promise');
const { pool } = require('./config/database');

// Importa as rotas
const bancosRoutes = require('./routes/bancos');
const mapacliRoutes = require('./routes/mapacli');
const subcategoriaRoutes = require('./routes/subcategoria');
const loginRoutes = require('./routes/login');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'cres-nfe-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

// ============================================================
// ROTAS PÚBLICAS (não precisam de login)
// ============================================================
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.use('/api', loginRoutes);

// ============================================================
// MIDDLEWARE — bloqueia acesso sem login
// ============================================================
app.use(function(req, res, next) {
  if (req.path === '/login' || req.path === '/api/login' || req.path === '/api/logout' || req.path === '/api/buscar-operador') {
    return next();
  }
  if (req.session && req.session.operador) {
    return next();
  }
  return res.redirect('/login');
});

// ============================================================
// ROTAS PROTEGIDAS (precisam de login)
// ============================================================
app.use('/mapacli', mapacliRoutes);
app.use('/subcategoria', subcategoriaRoutes);

// Rota para categorias
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

// Rotas de bancos
app.use('/api/bancos', bancosRoutes);

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log('CRES NFe Web rodando em http://localhost:' + PORT);
});
