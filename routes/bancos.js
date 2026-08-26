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
    'LEFT JOIN planocontas pc ON TRIM(pc.subcategoria) = TRIM(c.subcategoria) ' +
    'WHERE (c.sql_deleted IS NULL OR c.sql_deleted <> \'T\')'
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
      const existing = aUlt6.find(a => a.ult6 === ult6);
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
      query = "SELECT subcategoria, desconta, tipconta, gruconta FROM planocontas WHERE (sql_deleted IS NULL OR sql_deleted <> 'T') AND substr(subcategoria, 1, 2) = ? ORDER BY subcategoria";
      params = [categoria];
    } else {
      query = "SELECT subcategoria, desconta, tipconta, gruconta FROM planocontas WHERE (sql_deleted IS NULL OR sql_deleted <> 'T') ORDER BY subcategoria";
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
// ROTA: /api/bancos/categorias
// ============================================================
router.get('/categorias', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT codigo, categoria FROM categoria ORDER BY codigo');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// RELATÓRIO TRIMESTRAL
// ============================================================
router.get('/relatorios/trimestral', async (req, res) => {
  try {
    const ano = req.query.ano || new Date().getFullYear();
    const tipo = req.query.tipo || 'todos';

    // 1. Carregar clientes (cpf + cencusto)
    const [cliRows] = await pool.query(
      "SELECT cpf, cencusto FROM clientes WHERE (sql_deleted IS NULL OR sql_deleted <> 'T')"
    );
    const aClientes = cliRows.map(r => ({
      cpf: (r.cpf || '').replace(/\D/g, ''),
      cencusto: (r.cencusto || '').trim()
    }));

    // 2. Carregar genero (cencusto -> categoria)
    const [genRows] = await pool.query('SELECT codigo, categoria FROM genero');
    const aGeneros = genRows.map(r => ({
      codigo: (r.codigo || '').trim(),
      categoria: (r.categoria || '').trim()
    }));

    // 3. Carregar categorias (codigo -> descricao) com TRIM
    const [catRows] = await pool.query('SELECT codigo, categoria FROM categoria');
    const aCategorias = catRows.map(r => ({
      codigo: (r.codigo || '').trim(),
      desc: (r.categoria || '').trim()
    }));

    // 4. Carregar extrato do ano
    let sqlExt = "SELECT data, valor, cpfcnpj, tipo, categoria FROM extrato WHERE YEAR(data) = ?";
    let params = [ano];
    if (tipo && tipo !== 'todos') {
      sqlExt += ' AND tipo = ?';
      params.push(tipo);
    }
    const [extRows] = await pool.query(sqlExt, params);

    // 5. Processar - mesma logica do FiveWin
    const aResumo = {};
    const totais = { tri1: 0, tri2: 0, tri3: 0, tri4: 0, total: 0 };

    extRows.forEach(ext => {
      const dataExt = ext.data;
      if (!dataExt) return;

      const cCpfExtNum = (ext.cpfcnpj || '').replace(/\D/g, '');

      // Encontra cliente
      let cCencusto = '';
      for (let i = 0; i < aClientes.length; i++) {
        if (aClientes[i].cpf === cCpfExtNum && cCpfExtNum !== '') {
          cCencusto = aClientes[i].cencusto;
          break;
        }
      }

      // Categoria: extrato tem prioridade, senao busca via genero
      let cCategoriaCod = (ext.categoria || '').trim();
      if (!cCategoriaCod) {
        for (let i = 0; i < aGeneros.length; i++) {
          if (aGeneros[i].codigo === cCencusto) {
            cCategoriaCod = aGeneros[i].categoria;
            break;
          }
        }
      }

      if (!cCategoriaCod) return;

      // Busca descricao da categoria
      let cCategoriaDesc = cCategoriaCod;
      for (let i = 0; i < aCategorias.length; i++) {
        if (aCategorias[i].codigo === cCategoriaCod) {
          cCategoriaDesc = aCategorias[i].desc;
          break;
        }
      }

      // Trimestre
      const nMes = new Date(dataExt).getMonth() + 1;
      let nTri;
      if (nMes <= 3) nTri = 1;
      else if (nMes <= 6) nTri = 2;
      else if (nMes <= 9) nTri = 3;
      else nTri = 4;

      // Valor: D = negativo
      let nValor = parseFloat(ext.valor) || 0;
      if ((ext.tipo || '').trim() === 'D') nValor = -nValor;

      // Acumula no resumo
      if (!aResumo[cCategoriaCod]) {
        aResumo[cCategoriaCod] = {
          cod: cCategoriaCod,
          desc: cCategoriaDesc,
          tri1: 0, tri2: 0, tri3: 0, tri4: 0, total: 0
        };
      }
      aResumo[cCategoriaCod]['tri' + nTri] += nValor;
      aResumo[cCategoriaCod].total += nValor;

      totais['tri' + nTri] += nValor;
      totais.total += nValor;
    });

    // Ordena por codigo da categoria
    const dados = Object.values(aResumo).sort((a, b) => a.cod.localeCompare(b.cod));
    res.json({ dados, totais });
  } catch (err) {
    console.error('Erro no relatorio trimestral:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EXPORTAR RELATORIO TRIMESTRAL (CSV)
// ============================================================
router.get('/relatorios/trimestral/exportar', async (req, res) => {
  try {
    const ano = req.query.ano || new Date().getFullYear();
    const tipo = req.query.tipo || 'todos';

    const [cliRows] = await pool.query("SELECT cpf, cencusto FROM clientes WHERE (sql_deleted IS NULL OR sql_deleted <> 'T')");
    const aClientes = cliRows.map(r => ({ cpf: (r.cpf || '').replace(/\D/g, ''), cencusto: (r.cencusto || '').trim() }));
    const [genRows] = await pool.query('SELECT codigo, categoria FROM genero');
    const aGeneros = genRows.map(r => ({ codigo: (r.codigo || '').trim(), categoria: (r.categoria || '').trim() }));
    const [catRows] = await pool.query('SELECT codigo, categoria FROM categoria');
    const aCategorias = catRows.map(r => ({ codigo: (r.codigo || '').trim(), desc: (r.categoria || '').trim() }));

    let sqlExt = "SELECT data, valor, cpfcnpj, tipo, categoria FROM extrato WHERE YEAR(data) = ?";
    let params = [ano];
    if (tipo && tipo !== 'todos') { sqlExt += ' AND tipo = ?'; params.push(tipo); }
    const [extRows] = await pool.query(sqlExt, params);

    const aResumo = {};
    const totais = { tri1: 0, tri2: 0, tri3: 0, tri4: 0, total: 0 };

    extRows.forEach(ext => {
      const cCpfExtNum = (ext.cpfcnpj || '').replace(/\D/g, '');
      let cCencusto = '';
      for (let i = 0; i < aClientes.length; i++) {
        if (aClientes[i].cpf === cCpfExtNum && cCpfExtNum !== '') { cCencusto = aClientes[i].cencusto; break; }
      }
      let cCategoriaCod = (ext.categoria || '').trim();
      if (!cCategoriaCod) {
        for (let i = 0; i < aGeneros.length; i++) {
          if (aGeneros[i].codigo === cCencusto) { cCategoriaCod = aGeneros[i].categoria; break; }
        }
      }
      if (!cCategoriaCod) return;
      let cCategoriaDesc = cCategoriaCod;
      for (let i = 0; i < aCategorias.length; i++) {
        if (aCategorias[i].codigo === cCategoriaCod) { cCategoriaDesc = aCategorias[i].desc; break; }
      }
      const nMes = new Date(ext.data).getMonth() + 1;
      let nTri = nMes <= 3 ? 1 : nMes <= 6 ? 2 : nMes <= 9 ? 3 : 4;
      let nValor = parseFloat(ext.valor) || 0;
      if ((ext.tipo || '').trim() === 'D') nValor = -nValor;
      if (!aResumo[cCategoriaCod]) aResumo[cCategoriaCod] = { cod: cCategoriaCod, desc: cCategoriaDesc, tri1: 0, tri2: 0, tri3: 0, tri4: 0, total: 0 };
      aResumo[cCategoriaCod]['tri' + nTri] += nValor;
      aResumo[cCategoriaCod].total += nValor;
      totais['tri' + nTri] += nValor;
      totais.total += nValor;
    });

    const dados = Object.values(aResumo).sort((a, b) => a.cod.localeCompare(b.cod));

    const headers = ['Ord', 'Categoria', '1 Tri', '2 Tri', '3 Tri', '4 Tri', 'Total'];
    let csv = headers.join(';') + '\n';

    dados.forEach((row) => {
      csv += [
        row.cod,
        '"' + row.desc + '"',
        row.tri1.toFixed(2).replace('.', ','),
        row.tri2.toFixed(2).replace('.', ','),
        row.tri3.toFixed(2).replace('.', ','),
        row.tri4.toFixed(2).replace('.', ','),
        row.total.toFixed(2).replace('.', ',')
      ].join(';') + '\n';
    });

    csv += [
      '""',
      '"TOTAL GERAL - ' + ano + '"',
      totais.tri1.toFixed(2).replace('.', ','),
      totais.tri2.toFixed(2).replace('.', ','),
      totais.tri3.toFixed(2).replace('.', ','),
      totais.tri4.toFixed(2).replace('.', ','),
      totais.total.toFixed(2).replace('.', ',')
    ].join(';') + '\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio_trimestral_' + ano + '.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Erro ao exportar relatorio:', err);
    res.status(500).send('Erro ao exportar');
  }
});

// ============================================================
// RELATÓRIO MENSAL
// ============================================================
router.get('/relatorios/mensal', async (req, res) => {
  try {
    const ano = req.query.ano || new Date().getFullYear();
    const tipo = req.query.tipo || 'todos';

    // 1. Carregar clientes (cpf + nome) e montar index de ultimos 6
    const [cliRows] = await pool.query(
      "SELECT cpf, nomecli FROM clientes WHERE (sql_deleted IS NULL OR sql_deleted <> 'T')"
    );
    const aClientes = cliRows.map(r => ({
      cpf: (r.cpf || '').replace(/\D/g, ''),
      nome: (r.nomecli || '').trim()
    }));
    // Index de ultimos 6 digitos
    const aUlt6 = [];
    for (let i = 0; i < aClientes.length; i++) {
      const cpf = aClientes[i].cpf;
      if (cpf.length >= 6) {
        const ult6 = cpf.slice(-6);
        const existing = aUlt6.find(a => a.ult6 === ult6);
        if (!existing) {
          aUlt6.push({ ult6: ult6, cont: 1, idx: i });
        } else {
          existing.cont++;
          existing.idx = -1;
        }
      }
    }

    // 2. Carregar extrato do ano
    let sqlExt = "SELECT data, valor, cpfcnpj, tipo FROM extrato WHERE YEAR(data) = ?";
    let params = [ano];
    if (tipo && tipo !== 'todos') {
      sqlExt += ' AND tipo = ?';
      params.push(tipo);
    }
    const [extRows] = await pool.query(sqlExt, params);

    // 3. Processar com 4 estrategias de busca
    const aResumo = {};
    const totais = { jan:0, fev:0, mar:0, abr:0, mai:0, jun:0, jul:0, ago:0, set:0, out:0, nov:0, dez:0, total:0 };
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

    extRows.forEach(ext => {
      const dataExt = ext.data;
      if (!dataExt) return;

      const cCpfExtNum = (ext.cpfcnpj || '').replace(/\D/g, '');

      // --- 4 ESTRATEGIAS DE BUSCA ---
      let cli = null;
      // 1 - EXATO
      for (let i = 0; i < aClientes.length; i++) {
        if (cCpfExtNum === aClientes[i].cpf) { cli = aClientes[i]; break; }
      }
      // 2 - CONTEM
      if (!cli && cCpfExtNum.length >= 6) {
        for (let i = 0; i < aClientes.length; i++) {
          const cpfCli = aClientes[i].cpf;
          if (cpfCli.length >= 6) {
            if (cpfCli.includes(cCpfExtNum) || cCpfExtNum.includes(cpfCli)) { cli = aClientes[i]; break; }
          }
        }
      }
      // 3 - ULTIMOS 6 DIGITOS (unico)
      if (!cli && cCpfExtNum.length >= 6) {
        const ult6 = cCpfExtNum.slice(-6);
        const entry = aUlt6.find(a => a.ult6 === ult6);
        if (entry && entry.cont === 1) { cli = aClientes[entry.idx]; }
      }
      // 4 - MIOLO (digitos 4 a 9)
      if (!cli && cCpfExtNum.length >= 6) {
        for (let i = 0; i < aClientes.length; i++) {
          const cpfCli = aClientes[i].cpf;
          if (cpfCli.length >= 9) {
            const miolo = cpfCli.slice(3, 9);
            if (cCpfExtNum.includes(miolo) || miolo.includes(cCpfExtNum)) { cli = aClientes[i]; break; }
          }
        }
      }

      let cNome = '';
      if (cli) {
        cNome = cli.nome;
      } else {
        cNome = cCpfExtNum || 'Sem CPF';
      }

      const nMes = new Date(dataExt).getMonth();
      const cMes = meses[nMes];

      // Valor: D = negativo
      let nValor = parseFloat(ext.valor) || 0;
      if ((ext.tipo || '').trim() === 'D') nValor = -nValor;

      // Acumula
      if (!aResumo[cCpfExtNum]) {
        aResumo[cCpfExtNum] = { cpf: cCpfExtNum, nome: cNome,
          jan:0, fev:0, mar:0, abr:0, mai:0, jun:0, jul:0, ago:0, set:0, out:0, nov:0, dez:0, total:0 };
      }
      aResumo[cCpfExtNum][cMes] += nValor;
      aResumo[cCpfExtNum].total += nValor;

      totais[cMes] += nValor;
      totais.total += nValor;
    });

    const dados = Object.values(aResumo).sort((a, b) => a.nome.localeCompare(b.nome));
    res.json({ dados, totais });
  } catch (err) {
    console.error('Erro no relatorio mensal:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// EXPORTAR RELATORIO MENSAL (CSV)
// ============================================================
router.get('/relatorios/mensal/exportar', async (req, res) => {
  try {
    const ano = req.query.ano || new Date().getFullYear();
    const tipo = req.query.tipo || 'todos';

    const [cliRows] = await pool.query("SELECT cpf, nomecli FROM clientes WHERE (sql_deleted IS NULL OR sql_deleted <> 'T')");
    const aClientes = cliRows.map(r => ({ cpf: (r.cpf || '').replace(/\D/g, ''), nome: (r.nomecli || '').trim() }));
    const aUlt6 = [];
    for (let i = 0; i < aClientes.length; i++) {
      const cpf = aClientes[i].cpf;
      if (cpf.length >= 6) {
        const ult6 = cpf.slice(-6);
        const existing = aUlt6.find(a => a.ult6 === ult6);
        if (!existing) { aUlt6.push({ ult6: ult6, cont: 1, idx: i }); }
        else { existing.cont++; existing.idx = -1; }
      }
    }

    let sqlExt = "SELECT data, valor, cpfcnpj, tipo FROM extrato WHERE YEAR(data) = ?";
    let params = [ano];
    if (tipo && tipo !== 'todos') { sqlExt += ' AND tipo = ?'; params.push(tipo); }
    const [extRows] = await pool.query(sqlExt, params);

    const aResumo = {};
    const totais = { jan:0, fev:0, mar:0, abr:0, mai:0, jun:0, jul:0, ago:0, set:0, out:0, nov:0, dez:0, total:0 };
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

    extRows.forEach(ext => {
      const cCpfExtNum = (ext.cpfcnpj || '').replace(/\D/g, '');
      let cli = null;
      for (let i = 0; i < aClientes.length; i++) { if (cCpfExtNum === aClientes[i].cpf) { cli = aClientes[i]; break; } }
      if (!cli && cCpfExtNum.length >= 6) {
        for (let i = 0; i < aClientes.length; i++) {
          const cpfCli = aClientes[i].cpf;
          if (cpfCli.length >= 6) { if (cpfCli.includes(cCpfExtNum) || cCpfExtNum.includes(cpfCli)) { cli = aClientes[i]; break; } }
        }
      }
      if (!cli && cCpfExtNum.length >= 6) {
        const ult6 = cCpfExtNum.slice(-6);
        const entry = aUlt6.find(a => a.ult6 === ult6);
        if (entry && entry.cont === 1) { cli = aClientes[entry.idx]; }
      }
      if (!cli && cCpfExtNum.length >= 6) {
        for (let i = 0; i < aClientes.length; i++) {
          const cpfCli = aClientes[i].cpf;
          if (cpfCli.length >= 9) {
            const miolo = cpfCli.slice(3, 9);
            if (cCpfExtNum.includes(miolo) || miolo.includes(cCpfExtNum)) { cli = aClientes[i]; break; }
          }
        }
      }
      let cNome = cli ? cli.nome : (cCpfExtNum || 'Sem CPF');
      const nMes = new Date(ext.data).getMonth();
      const cMes = meses[nMes];
      let nValor = parseFloat(ext.valor) || 0;
      if ((ext.tipo || '').trim() === 'D') nValor = -nValor;
      if (!aResumo[cCpfExtNum]) aResumo[cCpfExtNum] = { cpf: cCpfExtNum, nome: cNome, jan:0, fev:0, mar:0, abr:0, mai:0, jun:0, jul:0, ago:0, set:0, out:0, nov:0, dez:0, total:0 };
      aResumo[cCpfExtNum][cMes] += nValor;
      aResumo[cCpfExtNum].total += nValor;
      totais[cMes] += nValor;
      totais.total += nValor;
    });

    const dados = Object.values(aResumo).sort((a, b) => a.nome.localeCompare(b.nome));

    const headers = ['Beneficiario', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Total'];
    let csv = headers.join(';') + '\n';

    dados.forEach(row => {
      csv += [
        '"' + row.nome + '"',
        row.jan.toFixed(2).replace('.', ','),
        row.fev.toFixed(2).replace('.', ','),
        row.mar.toFixed(2).replace('.', ','),
        row.abr.toFixed(2).replace('.', ','),
        row.mai.toFixed(2).replace('.', ','),
        row.jun.toFixed(2).replace('.', ','),
        row.jul.toFixed(2).replace('.', ','),
        row.ago.toFixed(2).replace('.', ','),
        row.set.toFixed(2).replace('.', ','),
        row.out.toFixed(2).replace('.', ','),
        row.nov.toFixed(2).replace('.', ','),
        row.dez.toFixed(2).replace('.', ','),
        row.total.toFixed(2).replace('.', ',')
      ].join(';') + '\n';
    });

    csv += [
      '"TOTAL GERAL - ' + ano + '"',
      totais.jan.toFixed(2).replace('.', ','),
      totais.fev.toFixed(2).replace('.', ','),
      totais.mar.toFixed(2).replace('.', ','),
      totais.abr.toFixed(2).replace('.', ','),
      totais.mai.toFixed(2).replace('.', ','),
      totais.jun.toFixed(2).replace('.', ','),
      totais.jul.toFixed(2).replace('.', ','),
      totais.ago.toFixed(2).replace('.', ','),
      totais.set.toFixed(2).replace('.', ','),
      totais.out.toFixed(2).replace('.', ','),
      totais.nov.toFixed(2).replace('.', ','),
      totais.dez.toFixed(2).replace('.', ','),
      totais.total.toFixed(2).replace('.', ',')
    ].join(';') + '\n';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio_mensal_' + ano + '.csv"');
    res.send('\uFEFF' + csv);
  } catch (err) {
    console.error('Erro ao exportar mensal:', err);
    res.status(500).send('Erro ao exportar');
  }
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