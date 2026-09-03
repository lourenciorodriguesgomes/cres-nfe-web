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
const clientesRoutes = require('./routes/clientes-fornecedores');
const prestacoesRoutes = require('./routes/prestacoes');
const tpoRoutes = require('./routes/tpo');
const fluxocaixaRoutes = require('./routes/fluxocaixa');
const dfcRoutes = require('./routes/dfc');
const importarExtratoRoutes = require('./routes/importar_extrato');
const subcategoriaRoutes = require('./routes/subcategoria');
const planocontasRoutes = require('./routes/planocontas');
const loginRoutes = require('./routes/login');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
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
app.use('/clientes-fornecedores', clientesRoutes);
app.use('/prestacoes', prestacoesRoutes);
app.use('/subcategoria', subcategoriaRoutes);
app.use('/tpo', tpoRoutes);
app.use('/fluxocaixa', fluxocaixaRoutes);
app.use('/dfc', dfcRoutes);
app.use('/importar_extrato', importarExtratoRoutes);
app.use('/planocontas', planocontasRoutes);
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


// ===================== CLIENTES / FORNECEDORES =====================

// Listar todos
app.get('/api/clientes-fornecedores', async (req, res) => {
  try {
    const conn = await Conectar();
    const [rows] = await conn.query(
      `SELECT c.cdcliente, c.nomecli, c.endereco, c.bairro,
              c.cidade, c.estado, c.telefone,
              c.cencusto, g.categoria AS cat_codigo,
              g2.categoria AS cat_nome, c.cpf
       FROM clientes c
       LEFT JOIN genero g ON g.codigo = c.cencusto
       LEFT JOIN categoria g2 ON g2.codigo = g.categoria
       ORDER BY c.nomecli`
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// Buscar um por código
app.get('/api/clientes-fornecedores/:id', async (req, res) => {
  try {
    const conn = await Conectar();
    const [rows] = await conn.query(
      `SELECT * FROM clientes WHERE cdcliente = ?`, [req.params.id]
    );
    conn.release();
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

// Criar novo
app.post('/api/clientes-fornecedores', async (req, res) => {
  try {
    const { cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cencusto, cpf } = req.body;
    const conn = await Conectar();
    await conn.query(
      `INSERT INTO clientes (cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cencusto, cpf)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cencusto, cpf]
    );
    conn.release();
    res.json({ success: true, message: 'Cliente cadastrado' });
  } catch (err) {
    console.error('Erro ao cadastrar cliente:', err);
    res.status(500).json({ error: 'Erro ao cadastrar cliente' });
  }
});

// Atualizar
app.put('/api/clientes-fornecedores/:id', async (req, res) => {
  try {
    const { nomecli, endereco, bairro, cidade, estado, telefone, cencusto, cpf } = req.body;
    const conn = await Conectar();
    await conn.query(
      `UPDATE clientes SET nomecli=?, endereco=?, bairro=?, cidade=?, estado=?, telefone=?, cencusto=?, cpf=?
       WHERE cdcliente=?`,
      [nomecli, endereco, bairro, cidade, estado, telefone, cencusto, cpf, req.params.id]
    );
    conn.release();
    res.json({ success: true, message: 'Cliente atualizado' });
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// Excluir
app.delete('/api/clientes-fornecedores/:id', async (req, res) => {
  try {
    const conn = await Conectar();
    await conn.query('DELETE FROM clientes WHERE cdcliente = ?', [req.params.id]);
    conn.release();
    res.json({ success: true, message: 'Cliente excluído' });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    res.status(500).json({ error: 'Erro ao excluir cliente' });
  }
});


// ===================== CLIENTES / FORNECEDORES =====================

app.get('/clientes-fornecedores/listar', async (req, res) => {
  try {
    const conn = await Conectar();
    const [rows] = await conn.query(
      `SELECT c.cdcliente, c.nomecli, c.endereco, c.bairro,
              c.cidade, c.estado, c.telefone, c.cpf,
              c.cencusto, c.categoria AS cat_codigo,
              cat.categoria AS cat_nome,
              c.subcategoria, sub.desconta AS des_subcategoria
       FROM clientes c
       LEFT JOIN categoria cat ON cat.codigo = c.categoria
       LEFT JOIN subcategoria sub ON sub.subcategoria = c.subcategoria
       ORDER BY c.nomecli`
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    res.status(500).json({ error: 'Erro ao consultar dados' });
  }
});

app.get('/clientes-fornecedores/buscar', async (req, res) => {
  try {
    const q = '%' + (req.query.q || '') + '%';
    const conn = await Conectar();
    const [rows] = await conn.query(
      `SELECT c.cdcliente, c.nomecli, c.cpf, c.cencusto,
              c.categoria AS cat_codigo, cat.categoria AS cat_nome,
              c.subcategoria, sub.desconta AS des_subcategoria
       FROM clientes c
       LEFT JOIN categoria cat ON cat.codigo = c.categoria
       LEFT JOIN subcategoria sub ON sub.subcategoria = c.subcategoria
       WHERE c.nomecli LIKE ? OR c.cpf LIKE ? OR c.cidade LIKE ?
       ORDER BY c.nomecli`, [q, q, q]
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar:', err);
    res.status(500).json({ error: 'Erro ao buscar' });
  }
});

app.get('/clientes-fornecedores/editar/:id', async (req, res) => {
  try {
    const conn = await Conectar();
    const [categorias] = await conn.query('SELECT codigo, categoria FROM categoria ORDER BY categoria');
    const [subcategorias] = await conn.query('SELECT subcategoria, desconta FROM subcategoria ORDER BY desconta');
    let cliente = null;
    if (req.params.id !== '0') {
      const [rows] = await conn.query('SELECT * FROM clientes WHERE cdcliente = ?', [req.params.id]);
      cliente = rows[0] || null;
    }
    conn.release();
    res.json({ cliente, categorias, subcategorias });
  } catch (err) {
    console.error('Erro ao editar:', err);
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

app.post('/clientes-fornecedores/novo', async (req, res) => {
  try {
    const { cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria } = req.body;
    const conn = await Conectar();
    await conn.query(
      `INSERT INTO clientes (cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria]
    );
    conn.release();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao criar:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/clientes-fornecedores/editar/:id', async (req, res) => {
  try {
    const { nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria } = req.body;
    const conn = await Conectar();
    await conn.query(
      `UPDATE clientes SET nomecli=?, endereco=?, bairro=?, cidade=?, estado=?, telefone=?, cpf=?, cencusto=?, categoria=?, subcategoria=?
       WHERE cdcliente=?`,
      [nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria, req.params.id]
    );
    conn.release();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/clientes-fornecedores/excluir/:id', async (req, res) => {
  try {
    const conn = await Conectar();
    await conn.query('DELETE FROM clientes WHERE cdcliente = ?', [req.params.id]);
    conn.release();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir:', err);
    res.status(500).json({ error: err.message });
  }
});


// ===================== CLIENTES / FORNECEDORES =====================

app.get('/clientes-fornecedores/listar', async (req, res) => {
  try {
    const conn = await Conectar();
    const [rows] = await conn.query(
      `SELECT c.cdcliente, c.nomecli, c.endereco, c.bairro,
              c.cidade, c.estado, c.telefone, c.cpf,
              c.cencusto, c.categoria AS cat_codigo,
              cat.categoria AS cat_nome,
              c.subcategoria, sub.desconta AS des_subcategoria
       FROM clientes c
       LEFT JOIN categoria cat ON cat.codigo = c.categoria
       LEFT JOIN subcategoria sub ON sub.subcategoria = c.subcategoria
       ORDER BY c.nomecli`
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    res.status(500).json({ error: 'Erro ao consultar dados' });
  }
});

app.get('/clientes-fornecedores/buscar', async (req, res) => {
  try {
    const q = '%' + (req.query.q || '') + '%';
    const conn = await Conectar();
    const [rows] = await conn.query(
      `SELECT c.cdcliente, c.nomecli, c.cpf, c.cencusto,
              c.categoria AS cat_codigo, cat.categoria AS cat_nome,
              c.subcategoria, sub.desconta AS des_subcategoria
       FROM clientes c
       LEFT JOIN categoria cat ON cat.codigo = c.categoria
       LEFT JOIN subcategoria sub ON sub.subcategoria = c.subcategoria
       WHERE c.nomecli LIKE ? OR c.cpf LIKE ? OR c.cidade LIKE ?
       ORDER BY c.nomecli`, [q, q, q]
    );
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar:', err);
    res.status(500).json({ error: 'Erro ao buscar' });
  }
});

app.get('/clientes-fornecedores/editar/:id', async (req, res) => {
  try {
    const conn = await Conectar();
    const [categorias] = await conn.query('SELECT codigo, categoria FROM categoria ORDER BY categoria');
    const [subcategorias] = await conn.query('SELECT subcategoria, desconta FROM subcategoria ORDER BY desconta');
    let cliente = null;
    if (req.params.id !== '0') {
      const [rows] = await conn.query('SELECT * FROM clientes WHERE cdcliente = ?', [req.params.id]);
      cliente = rows[0] || null;
    }
    conn.release();
    res.json({ cliente, categorias, subcategorias });
  } catch (err) {
    console.error('Erro ao editar:', err);
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

app.post('/clientes-fornecedores/novo', async (req, res) => {
  try {
    const { cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria } = req.body;
    const conn = await Conectar();
    await conn.query(
      `INSERT INTO clientes (cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria]
    );
    conn.release();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao criar:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/clientes-fornecedores/editar/:id', async (req, res) => {
  try {
    const { nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria } = req.body;
    const conn = await Conectar();
    await conn.query(
      `UPDATE clientes SET nomecli=?, endereco=?, bairro=?, cidade=?, estado=?, telefone=?, cpf=?, cencusto=?, categoria=?, subcategoria=?
       WHERE cdcliente=?`,
      [nomecli, endereco, bairro, cidade, estado, telefone, cpf, cencusto, categoria, subcategoria, req.params.id]
    );
    conn.release();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/clientes-fornecedores/excluir/:id', async (req, res) => {
  try {
    const conn = await Conectar();
    await conn.query('DELETE FROM clientes WHERE cdcliente = ?', [req.params.id]);
    conn.release();
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir:', err);
    res.status(500).json({ error: err.message });
  }
});




// Inicia o servidor
app.listen(PORT, () => {
  console.log('CRES NFe Web rodando em http://localhost:' + PORT);
});
