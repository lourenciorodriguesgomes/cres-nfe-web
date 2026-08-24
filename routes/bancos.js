const express = require('express');
const router = express.Router();
const { pool, Conectar } = require('../config/database');
const axios = require('axios');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Funcao: extrair apenas digitos do CPF/CNPJ
function soDigitos(str) {
  if (!str) return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 48 && c <= 57) result += str[i];
  }
  return result.trim();
}

// Funcao: carregar clientes em memoria
async function carregarClientes(conn) {
  const [rows] = await (conn || pool).query(
    'SELECT c.cpf, c.nomecli, c.categoria, cat.categoria AS des_categoria, c.subcategoria, pc.desconta AS des_subcategoria ' +
    'FROM clientes c ' +
    'LEFT JOIN categoria cat ON TRIM(cat.codigo) = TRIM(c.categoria) ' +
    'LEFT JOIN planocontas pc ON TRIM(pc.subcategoria) = TRIM(c.subcategoria)'
  );
  const aClientes = rows.map(r => ({
    cpf: soDigitos(r.cpf),
    nomecli: r.nomecli || '',
    categoria: r.categoria || '',
    des_categoria: r.des_categoria || '',
    subcategoria: r.subcategoria || '',
    des_subcategoria: r.des_subcategoria || ''
  }));
  const aUlt6 = [];
  for (let i = 0; i < aClientes.length; i++) {
    const cpf = aClientes[i].cpf;
    if (cpf.length >= 6) {
      const ult6 = cpf.slice(-6);
      const existing = aUlt6.find(a => a[0] === ult6);
      if (!existing) {
        aUlt6.push({ ult6: ult6, cont: 1, idx: i });
      } else {
        existing.cont++;
        existing.idx = -1;
      }
    }
  }
  return { aClientes, aUlt6 };
}

// Funcao: procurar cliente (4 estrategias)
function procurarCliente(cpfExt, aClientes, aUlt6) {
  const cpfExtNum = soDigitos(cpfExt);
  if (!cpfExtNum) return null;
  let cli = null;
  // 1 - CPF/CNPJ EXATO
  for (let i = 0; i < aClientes.length; i++) {
    if (cpfExtNum === aClientes[i].cpf) { cli = aClientes[i]; break; }
  }
  // 2 - CONTEM
  if (!cli && cpfExtNum.length >= 6) {
    for (let i = 0; i < aClientes.length; i++) {
      const cpfCli = aClientes[i].cpf;
      if (cpfCli.length >= 6) {
        if (cpfCli.includes(cpfExtNum) || cpfExtNum.includes(cpfCli)) { cli = aClientes[i]; break; }
      }
    }
  }
  // 3 - ULTIMOS 6 DIGITOS (unico)
  if (!cli && cpfExtNum.length >= 6) {
    const ult6 = cpfExtNum.slice(-6);
    const entry = aUlt6.find(a => a.ult6 === ult6);
    if (entry && entry.cont === 1) { cli = aClientes[entry.idx]; }
  }
  // 4 - MIOLO (digitos 4 a 9)
  if (!cli && cpfExtNum.length >= 6) {
    for (let i = 0; i < aClientes.length; i++) {
      const cpfCli = aClientes[i].cpf;
      if (cpfCli.length >= 9) {
        const miolo = cpfCli.slice(3, 9);
        if (cpfExtNum.includes(miolo) || miolo.includes(cpfExtNum)) { cli = aClientes[i]; break; }
      }
    }
  }
  return cli;
}

// ============================================================
// ROTA: /api/bancos/planocontas
// ============================================================
router.get('/planocontas', async (req, res) => {
  try {
    const categoria = req.query.categoria || '';
    let query, params;
    if (categoria) {
      query = "SELECT subcategoria, desconta, tipconta, gruconta FROM planocontas WHERE sql_deleted <> 'T' AND substr(subcategoria, 1, 2) = ? ORDER BY subcategoria";
      params = [categoria];
    } else {
      query = "SELECT subcategoria, desconta, tipconta, gruconta FROM planocontas WHERE sql_deleted <> 'T' ORDER BY subcategoria";
      params = [];
    }
    const [rows] = await pool.query(query, params);
    const resultado = rows.map(r => ({
      subcategoria: r.subcategoria || '',
      desconta: r.desconta || '',
      tipconta: r.tipconta || '',
      gruconta: r.gruconta || '',
      tipconta_desc: r.tipconta === 'C' ? 'Conta' : r.tipconta === 'T' ? 'Título' : r.tipconta === 'S' ? 'Soma' : '',
      gruconta_desc: r.gruconta === 'R' ? 'Receita' : r.gruconta === 'D' ? 'Débito' : ''
    }));
    res.json(resultado);
  } catch (err) {
    console.error('Erro em /bancos/planocontas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ROTAS: /api/bancos/referencia (CRUD de bancos)
// ============================================================
router.get('/referencia', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT codigo, nomebanco, rasaosocia FROM bancos ORDER BY nomebanco');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/referencia', async (req, res) => {
  const { codigo, nomebanco, rasaosocia } = req.body;
  try {
    await pool.query('INSERT INTO bancos (codigo, nomebanco, rasaosocia) VALUES (?, ?, ?)', [codigo, nomebanco, rasaosocia]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/referencia/:codigo', async (req, res) => {
  const { nomebanco, rasaosocia } = req.body;
  try {
    await pool.query('UPDATE bancos SET nomebanco = ?, rasaosocia = ? WHERE codigo = ?', [nomebanco, rasaosocia, req.params.codigo]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/referencia/:codigo', async (req, res) => {
  try {
    await pool.query('DELETE FROM bancos WHERE codigo = ?', [req.params.codigo]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ROTAS: /api/bancos/contas (CRUD de contas correntes)
// ============================================================
router.get('/contas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT c.banco, b.nomebanco, c.agencia, c.contacorre, c.titular, c.clientid, c.clientsecret, c.certificadopem, c.certificadokey FROM contabco c LEFT JOIN bancos b ON c.banco = b.codigo ORDER BY b.nomebanco'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/contas', async (req, res) => {
  const { banco, agencia, contacorre, titular, clientid, clientsecret, certificadopem, certificadokey } = req.body;
  try {
    await pool.query(
      'INSERT INTO contabco (banco, agencia, contacorre, titular, clientid, clientsecret, certificadopem, certificadokey) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [banco, agencia, contacorre, titular, clientid, clientsecret, certificadopem, certificadokey]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/contas/:banco/:agencia/:conta', async (req, res) => {
  const { titular, clientid, clientsecret, certificadopem, certificadokey } = req.body;
  try {
    await pool.query(
      'UPDATE contabco SET titular = ?, clientid = ?, clientsecret = ?, certificadopem = ?, certificadokey = ? WHERE banco = ? AND agencia = ? AND contacorre = ?',
      [titular, clientid, clientsecret, certificadopem, certificadokey, req.params.banco, req.params.agencia, req.params.conta]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/contas/:banco/:agencia/:conta', async (req, res) => {
  try {
    await pool.query('DELETE FROM contabco WHERE banco = ? AND agencia = ? AND contacorre = ?', [req.params.banco, req.params.agencia, req.params.conta]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ROTA: /api/bancos/extratos
// ============================================================
router.get('/extratos', async (req, res) => {
  const { banco, agencia, conta, dataInicial, dataFinal, tipo, descricao, cpfcnpj, beneficiario, pagina = 1, limite = 50 } = req.query;
  let where = [];
  let params = [];
  if (banco) { where.push('e.banco = ?'); params.push(banco); }
  if (agencia) { where.push('e.agencia = ?'); params.push(agencia); }
  if (conta) { where.push('e.conta = ?'); params.push(conta); }
  if (dataInicial) { where.push('e.data >= ?'); params.push(dataInicial); }
  if (dataFinal) { where.push('e.data <= ?'); params.push(dataFinal); }
  if (tipo) { where.push('e.tipo = ?'); params.push(tipo); }
  if (descricao) { where.push('e.descricao LIKE ?'); params.push('%' + descricao + '%'); }
  if (cpfcnpj) { where.push('e.cpfcnpj = ?'); params.push(cpfcnpj); }
  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (pagina - 1) * limite;
  try {
    const { aClientes, aUlt6 } = await carregarClientes();
    const [rows] = await pool.query(
      'SELECT e.transactionId, e.tipo, e.valor, e.data, e.datalote, e.descricao, ' +
      'e.numerodocumento, e.cpfcnpj, e.banco, e.agencia, e.conta, e.numconta, ' +
      'e.numpresta, e.centrocusto, e.categoria, e.subcategoria, e.dtvencim, e.orcamento, ' +
      'pc.desconta AS des_subcategoria_extrato ' +
      'FROM extrato e ' +
      'LEFT JOIN planocontas pc ON TRIM(pc.subcategoria) = TRIM(e.subcategoria) ' +
      whereClause + ' ORDER BY e.data DESC LIMIT ? OFFSET ?',
      [...params, parseInt(limite), parseInt(offset)]
    );
    let dados = rows.map(e => {
      const cli = procurarCliente(e.cpfcnpj, aClientes, aUlt6);
      let cNomeCli = '', cCategoria = '', cDesCategoria = '', cSubCategoria = '', cDesSubCategoria = '';
      if (cli) {
        cNomeCli = cli.nomecli;
        cCategoria = cli.categoria;
        cDesCategoria = cli.des_categoria;
        cSubCategoria = cli.subcategoria;
        cDesSubCategoria = cli.des_subcategoria;
      }
      if (!cSubCategoria || cSubCategoria.trim() === '') {
        cSubCategoria = e.subcategoria || '';
        cDesSubCategoria = e.des_subcategoria_extrato || '';
      }
      return { ...e, beneficiario: cNomeCli, cli_categoria: cCategoria, desc_categoria: cDesCategoria, cli_subcategoria: cSubCategoria, desc_subcategoria: cDesSubCategoria, competencia: '' };
    });
    if (beneficiario) {
      const termo = beneficiario.toLowerCase().trim();
      dados = dados.filter(item => item.beneficiario && item.beneficiario.toLowerCase().includes(termo));
    }
    const [totais] = await pool.query(
      'SELECT COALESCE(SUM(CASE WHEN tipo = "C" THEN valor ELSE 0 END), 0) AS total_credito, ' +
      'COALESCE(SUM(CASE WHEN tipo = "D" THEN valor ELSE 0 END), 0) AS total_debito, ' +
      'COALESCE(SUM(CASE WHEN tipo = "C" THEN valor ELSE -valor END), 0) AS saldo ' +
      'FROM extrato e ' + whereClause,
      params
    );
    res.json({ dados, totais: totais[0], pagina: parseInt(pagina), limite: parseInt(limite) });
  } catch (err) {
    console.error('Erro em /bancos/extratos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ROTA: /api/bancos/extratos/importar (CSV)
// ============================================================
router.post('/extratos/importar', upload.single('arquivo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const fs = require('fs');
  const csv = fs.readFileSync(req.file.path, 'utf-8');
  const linhas = csv.split('\n').filter(l => l.trim());
  const conn = await Conectar();
  if (!conn) return res.status(500).json({ error: 'Erro de conexao' });
  let importados = 0, duplicados = 0, erros = 0;
  try {
    await conn.beginTransaction();
    for (let i = 1; i < linhas.length; i++) {
      const campos = linhas[i].split(/[;,]/);
      if (campos.length < 5) continue;
      const transactionId = campos[0] ? campos[0].trim() : '';
      const data = campos[1] ? campos[1].trim() : '';
      const valor = parseFloat(campos[2] ? campos[2].replace(',', '.').trim() : '0') || 0;
      const tipo = valor >= 0 ? 'C' : 'D';
      const descricao = campos[3] ? campos[3].trim() : '';
      const cpfcnpj = campos[4] ? campos[4].replace(/\D/g, '') : '';
      const banco = campos[5] ? campos[5].trim() : (req.body.banco || '');
      const agencia = campos[6] ? campos[6].trim() : (req.body.agencia || '');
      const conta = campos[7] ? campos[7].trim() : (req.body.conta || '');
      const [existe] = await conn.query('SELECT transactionId FROM extrato WHERE transactionId = ?', [transactionId]);
      if (existe.length > 0) { duplicados++; continue; }
      try {
        await conn.query('INSERT INTO extrato (transactionId, tipo, valor, data, descricao, cpfcnpj, banco, agencia, conta, datalote) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())', [transactionId, tipo, Math.abs(valor), data, descricao, cpfcnpj, banco, agencia, conta]);
        importados++;
      } catch (e) { erros++; }
    }
    await conn.commit();
    res.json({ success: true, importados, duplicados, erros });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
    fs.unlinkSync(req.file.path);
  }
});

// ============================================================
// ROTA: /api/bancos/conciliacao/automatica
// ============================================================
router.post('/conciliacao/automatica', async (req, res) => {
  const { banco, agencia, conta, dataInicial, dataFinal } = req.body;
  const conn = await Conectar();
  if (!conn) return res.status(500).json({ error: 'Erro de conexao' });
  let conciliados = 0, naoEncontrados = 0;
  try {
    await conn.beginTransaction();
    const [extratos] = await conn.query('SELECT * FROM extrato WHERE banco = ? AND agencia = ? AND conta = ? AND numpresta IS NULL AND data BETWEEN ? AND ?', [banco, agencia, conta, dataInicial, dataFinal]);
    for (const ext of extratos) {
      let query = 'SELECT * FROM prestacao WHERE situacao = ?';
      let params = ['A'];
      if (ext.cpfcnpj) { query += ' AND cnpj = ?'; params.push(ext.cpfcnpj); }
      if (ext.valor) { query += ' AND valorpres = ?'; params.push(ext.valor); }
      query += ' LIMIT 1';
      const [prestacoes] = await conn.query(query, params);
      if (prestacoes.length > 0) {
        const prest = prestacoes[0];
        await conn.query('UPDATE extrato SET numpresta = ?, numconta = ?, centrocusto = ? WHERE transactionId = ?', [prest.numpresta, prest.numconta, prest.centrocust, ext.transactionId]);
        await conn.query('UPDATE prestacao SET situacao = ?, dtpagto = ?, valorrec = ?, integrado = 1 WHERE sql_rowid = ?', ['P', ext.data, ext.valor, prest.sql_rowid]);
        conciliados++;
      } else { naoEncontrados++; }
    }
    await conn.commit();
    res.json({ success: true, totalProcessado: extratos.length, conciliados, naoEncontrados });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ============================================================
// ROTA: /api/bancos/conciliacao/desfazer
// ============================================================
router.post('/conciliacao/desfazer', async (req, res) => {
  const { transactionId } = req.body;
  const conn = await Conectar();
  try {
    await conn.beginTransaction();
    const [extratos] = await conn.query('SELECT * FROM extrato WHERE transactionId = ?', [transactionId]);
    if (extratos.length === 0) return res.status(404).json({ error: 'Extrato nao encontrado' });
    const ext = extratos[0];
    if (ext.numpresta) {
      await conn.query('UPDATE prestacao SET situacao = ?, dtpagto = NULL, valorrec = NULL, integrado = 0 WHERE numpresta = ? AND numconta = ?', ['A', ext.numpresta, ext.numconta]);
    }
    await conn.query('UPDATE extrato SET numpresta = NULL, numconta = NULL, centrocusto = NULL WHERE transactionId = ?', [transactionId]);
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// ============================================================
// ROTAS: /api/bancos/relatorios
// ============================================================
router.get('/relatorios/trimestral', async (req, res) => {
  const ano = req.query.ano || new Date().getFullYear();
  try {
    const [rows] = await pool.query(
      'SELECT cat.codigo AS categoria_cod, cat.categoria AS categoria_desc, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) IN (1,2,3) THEN e.valor ELSE 0 END), 0) AS tri1, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) IN (4,5,6) THEN e.valor ELSE 0 END), 0) AS tri2, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) IN (7,8,9) THEN e.valor ELSE 0 END), 0) AS tri3, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) IN (10,11,12) THEN e.valor ELSE 0 END), 0) AS tri4, ' +
      'COALESCE(SUM(e.valor), 0) AS total ' +
      'FROM categoria cat LEFT JOIN extrato e ON e.categoria = cat.codigo AND YEAR(e.data) = ? ' +
      'GROUP BY cat.codigo, cat.categoria ORDER BY cat.categoria',
      [ano]
    );
    res.json({ ano: parseInt(ano), dados: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/relatorios/mensal', async (req, res) => {
  const ano = req.query.ano || new Date().getFullYear();
  try {
    const [rows] = await pool.query(
      'SELECT e.cpfcnpj, c.nomecli AS beneficiario, e.centrocusto, cat.categoria, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 1 THEN e.valor ELSE 0 END), 0) AS jan, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 2 THEN e.valor ELSE 0 END), 0) AS fev, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 3 THEN e.valor ELSE 0 END), 0) AS mar, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 4 THEN e.valor ELSE 0 END), 0) AS abr, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 5 THEN e.valor ELSE 0 END), 0) AS mai, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 6 THEN e.valor ELSE 0 END), 0) AS jun, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 7 THEN e.valor ELSE 0 END), 0) AS jul, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 8 THEN e.valor ELSE 0 END), 0) AS ago, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 9 THEN e.valor ELSE 0 END), 0) AS mes_set, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 10 THEN e.valor ELSE 0 END), 0) AS mes_out, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 11 THEN e.valor ELSE 0 END), 0) AS nov, ' +
      'COALESCE(SUM(CASE WHEN MONTH(e.data) = 12 THEN e.valor ELSE 0 END), 0) AS dez, ' +
      'COALESCE(SUM(e.valor), 0) AS total ' +
      'FROM extrato e LEFT JOIN clientes c ON e.cpfcnpj = c.cpf ' +
      'LEFT JOIN categoria cat ON e.categoria = cat.codigo ' +
      'WHERE YEAR(e.data) = ? ' +
      'GROUP BY e.cpfcnpj, c.nomecli, e.centrocusto, cat.categoria ORDER BY c.nomecli',
      [ano]
    );
    res.json({ ano: parseInt(ano), dados: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ROTAS: /api/bancos/motivos-devolucao
// ============================================================
router.get('/motivos-devolucao', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT motivo, classifica, descricao FROM motivodevcheque ORDER BY motivo');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/motivos-devolucao', async (req, res) => {
  const { motivo, classifica, descricao } = req.body;
  try {
    await pool.query('INSERT INTO motivodevcheque (motivo, classifica, descricao) VALUES (?, ?, ?)', [motivo, classifica, descricao]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;