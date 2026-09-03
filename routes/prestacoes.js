const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

function formatDateYMD(dateVal) {
  if (!dateVal) return '';
  var d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function apenasNumeros(str) {
  return String(str || '').replace(/[^0-9]/g, '');
}

function matchCpf(cpfExt, aClientes) {
  var cpfExtNum = apenasNumeros(cpfExt);
  if (!cpfExtNum) return null;
  for (var i = 0; i < aClientes.length; i++) {
    var cpfCliNum = apenasNumeros(aClientes[i].cpf);
    if (cpfExtNum === cpfCliNum) return aClientes[i];
    if (cpfExtNum.length >= 6) {
      if (cpfCliNum.indexOf(cpfExtNum) >= 0 || cpfExtNum.indexOf(cpfCliNum) >= 0) return aClientes[i];
    }
    if (cpfExtNum.length >= 6 && cpfCliNum.length >= 6) {
      if (cpfCliNum.slice(-6) === cpfExtNum.slice(-6)) return aClientes[i];
    }
    if (cpfCliNum.length >= 9) {
      var miolo = cpfCliNum.substring(3, 9);
      if (cpfExtNum.indexOf(miolo) >= 0 || miolo.indexOf(cpfExtNum) >= 0) return aClientes[i];
    }
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    const [filiais] = await pool.query('SELECT codigo, nome FROM empresasgrupo');
    var aFiliais = {};
    filiais.forEach(function(f) { aFiliais[f.codigo] = f.nome; });

    const [clientesRows] = await pool.query(
      `SELECT c.cpf, c.nomecli, c.categoria, cat.categoria AS des_categoria,
              c.subcategoria, pc.desconta AS des_subcategoria
       FROM clientes c
       LEFT JOIN categoria cat ON cat.codigo = c.categoria
       LEFT JOIN planocontas pc ON pc.subcategoria = c.subcategoria`
    );

    const [prestRows] = await pool.query(
      `SELECT p.dtvencim, p.debitocred, p.confprevis, p.valorpres, p.cnpj,
              p.cdcliente, p.banco, p.dtpagto, p.valorrec, p.vendaloja,
              p.competencia, p.sql_rowid AS id, p.transactionId
       FROM prestacao p
       WHERE p.sql_deleted <> 'T'
       ORDER BY p.dtvencim`
    );

    var linhas = '';
    for (var i = 0; i < prestRows.length; i++) {
      var p = prestRows[i];
      var cli = matchCpf(p.cnpj, clientesRows);
      var cNomeCli = cli ? (cli.nomecli || '') : '';
      var cCategoria = cli ? (cli.categoria || '') : '';
      var cDesCat = cli ? (cli.des_categoria || '') : '';
      var cSubCat = cli ? (cli.subcategoria || '') : '';
      var cDesSub = cli ? (cli.des_subcategoria || '') : '';
      var cNomeLoja = aFiliais[p.vendaloja] || p.vendaloja || '';

      var cExtDescricao = '', cExtAgencia = '', cExtConta = '', cExtBanco = '';
      var cBanco = p.banco || '';
      if (p.transactionId) {
        var [extRows] = await pool.query(
          `SELECT descricao, agencia, conta, banco FROM extrato
           WHERE id = ? AND IFNULL(sql_deleted,'F') <> 'T'`, [p.transactionId]
        );
        if (extRows.length > 0) {
          cExtDescricao = extRows[0].descricao || '';
          cExtAgencia = extRows[0].agencia || '';
          cExtConta = extRows[0].conta || '';
          cExtBanco = extRows[0].banco || '';
          if (cExtBanco) cBanco = cExtBanco;
        }
      }

      var dtvencRaw = formatDateYMD(p.dtvencim);
      var dtpagRaw = formatDateYMD(p.dtpagto);

      linhas += '<tr data-dtvenc="' + dtvencRaw + '" data-dtpag="' + dtpagRaw + '" onclick="preSelecionarLinha(this)" style="cursor:pointer;">' +
        '<td class="col-ord">' + (i + 1) + '</td>' +
        '<td class="col-loja">' + cNomeLoja + '</td>' +
        '<td class="col-dtvenc">' + (p.dtvencim ? new Date(p.dtvencim).toLocaleDateString('pt-BR') : '') + '</td>' +
        '<td class="col-valor">' + (Number(p.valorpres || 0).toFixed(2)) + '</td>' +
        '<td class="col-dc">' + (p.debitocred || '') + '</td>' +
        '<td class="col-cp">' + (p.confprevis || '') + '</td>' +
        '<td class="col-cpf">' + (p.cnpj || '') + '</td>' +
        '<td class="col-nome">' + cNomeCli + '</td>' +
        '<td class="col-cat">' + cCategoria + '</td>' +
        '<td class="col-desc-cat">' + cDesCat + '</td>' +
        '<td class="col-sub">' + cSubCat + '</td>' +
        '<td class="col-desc-sub">' + cDesSub + '</td>' +
        '<td class="col-dtpag">' + (p.dtpagto ? new Date(p.dtpagto).toLocaleDateString('pt-BR') : '') + '</td>' +
        '<td class="col-valpag">' + (Number(p.valorrec || 0).toFixed(2)) + '</td>' +
        '<td class="col-comp">' + (p.competencia || '') + '</td>' +
        '<td class="col-agencia">' + cExtAgencia + '</td>' +
        '<td class="col-conta">' + cExtConta + '</td>' +
        '<td class="col-banco">' + cBanco + '</td>' +
        '<td class="col-ext-nome">' + cExtDescricao + '</td>' +
      '</tr>';
    }

    if (prestRows.length === 0) {
      linhas = '<tr><td colspan="19" style="text-align:center;padding:20px;">Nenhuma prestação encontrada</td></tr>';
    }

    var html = '<div class="mapa-container">' +
      '<div class="mapa-toolbar">' +
        '<input type="date" id="preDataIni" title="Data Inicial" onchange="preAplicarFiltros()" style="padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;">' +
        '<input type="date" id="preDataFim" title="Data Final" onchange="preAplicarFiltros()" style="padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;">' +
        '<select id="preTipoData" onchange="preAplicarFiltros()" style="padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;">' +
          '<option value="vencimento">Vencimento</option>' +
          '<option value="pagamento">Pagamento</option>' +
        '</select>' +
        '<input type="text" id="preBeneficiario" placeholder="Beneficiário" oninput="preAplicarFiltros()" style="padding:6px 12px;border:1px solid #ccc;border-radius:4px;width:200px;font-size:14px;">' +
       // '<button class="mapa-btn btn-buscar" onclick="preAplicarFiltros()">🔍 Buscar</button>' +
        '<button class="mapa-btn btn-buscar" onclick="preAbrirBuscaGeral()">🔎 Busca Geral</button>' + '<button class="mapa-btn btn-exportar" onclick="preExportarExcel()">📊 Excel</button>' +
        '<button class="mapa-btn btn-imprimir" onclick="preImprimir()">🖨️ Imprimir</button>' +
        '<button class="mapa-btn btn-colunas" onclick="preToggleColunas()">📋 Colunas</button>' +
        '<button class="mapa-btn btn-sair" onclick="preVoltar()">🚪 Sair</button>' +
      '</div>' +
      '<div class="mapa-status" id="preStatusInfo">Total: ' + prestRows.length + ' prestação(ões)</div>' +
      '<table class="mapa-table" id="preTabela"><thead><tr>' +
        '<th class="col-ord" onclick="preOrdenar(0)">Ord</th>' +
        '<th class="col-loja" onclick="preOrdenar(1)">Loja/Polo</th>' +
        '<th class="col-dtvenc" onclick="preOrdenar(2)">Data Ven</th>' +
        '<th class="col-valor" onclick="preOrdenar(3)">Valor</th>' +
        '<th class="col-dc" onclick="preOrdenar(4)">DC</th>' +
        '<th class="col-cp" onclick="preOrdenar(5)">CP</th>' +
        '<th class="col-cpf" onclick="preOrdenar(6)">Cpf/Cnpj</th>' +
        '<th class="col-nome" onclick="preOrdenar(7)">Beneficiário</th>' +
        '<th class="col-cat" onclick="preOrdenar(8)">Cat</th>' +
        '<th class="col-desc-cat" onclick="preOrdenar(9)">Descrição Categoria</th>' +
        '<th class="col-sub" onclick="preOrdenar(10)">Sub Cat</th>' +
        '<th class="col-desc-sub" onclick="preOrdenar(11)">Descrição Subcategoria</th>' +
        '<th class="col-dtpag" onclick="preOrdenar(12)">Dt Pagam</th>' +
        '<th class="col-valpag" onclick="preOrdenar(13)">Val Pago</th>' +
        '<th class="col-comp" onclick="preOrdenar(14)">Comp</th>' +
        '<th class="col-agencia" onclick="preOrdenar(15)">Agência</th>' +
        '<th class="col-conta" onclick="preOrdenar(16)">Conta</th>' +
        '<th class="col-banco" onclick="preOrdenar(17)">Banco</th>' +
        '<th class="col-ext-nome" onclick="preOrdenar(18)">Nome Extrato</th>' +
      '</tr></thead><tbody id="preCorpoTabela">' + linhas + '</tbody></table>' +
      '</div>' +
      '<div class="mapa-overlay" id="preOverlay" onclick="preFecharModais()"></div>' +
      '<div class="mapa-modal-colunas" id="preModalColunas">' +
        '<h3>Visibilidade de Colunas</h3>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-ord\', this)"> Ord</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-loja\', this)"> Loja/Polo</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-dtvenc\', this)"> Data Ven</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-valor\', this)"> Valor</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-dc\', this)"> DC</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-cp\', this)"> CP</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-cpf\', this)"> Cpf/Cnpj</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-nome\', this)"> Beneficiário</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-cat\', this)"> Cat</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-desc-cat\', this)"> Descrição Categoria</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-sub\', this)"> Sub Cat</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-desc-sub\', this)"> Descrição Subcategoria</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-dtpag\', this)"> Dt Pagam</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-valpag\', this)"> Val Pago</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-comp\', this)"> Comp</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-agencia\', this)"> Agência</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-conta\', this)"> Conta</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-banco\', this)"> Banco</label>' +
        '<label><input type="checkbox" checked onchange="preToggleColuna(\'col-ext-nome\', this)"> Nome Extrato</label>' +
        '<br><button class="mapa-btn btn-colunas" onclick="preFecharModais()">Fechar</button>' +
      '</div>';

    html += '<div id="preModalBuscaGeral" style="display:none;position:fixed;top:60px;right:40px;z-index:10001;background:#1e1e2e;border:1px solid #555;border-radius:8px;width:480px;box-shadow:0 8px 30px rgba(0,0,0,0.6);">' +
      '<div id="preBuscaGeralHeader" style="background:#2a2a3e;color:#fff;padding:10px 16px;cursor:move;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;user-select:none;">' +
        '<b>🔎 Busca Geral</b>' +
        '<button onclick="preFecharBuscaGeral()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">✕</button>' +
      '</div>' +
      '<div style="padding:16px;">' +
        '<input type="text" id="preBuscaGeralInput" placeholder="Ex: MARIA;AEDU ou 01/01/2025..25/01/2025;nome:MARIA;PIX;-TED" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;box-sizing:border-box;">' +
        '<div style="margin-top:8px;padding:10px;background:#1a1d29;border-radius:6px;font-size:12px;color:#a0c4e8;">' +
          '<b>Como usar:</b><br>' +
          '- Use ; para multiplas palavras<br>' +
          '- Excluir: -AEDU<br>' +
          '- Periodo: 01/01/2025..25/01/2025<br>' +
          '- Valores: 100..500<br>' +
          '- Operadores: >10 <100 >=10 <=100<br>' +
          '- Por campo: nome:MARIA banco:756 cpf:25606<br>' +
          '- Campos: nome, cpf, categoria, descategoria, subcategoria, dessubcategoria, banco, dc, cp, comp, loja, agencia, conta, extnome, valor, valpag, dtvenc, dtpag<br>' +
          '- PAGO ou ABERTO (filtra por pagamento)<br>' +
          '- Combina: 01/01/2025..25/01/2025;nome:MARIA;PIX;-TED' +
        '</div>' +
               '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
          '<button onclick="preLimparBusca()" style="background:#444;color:#fff;border:1px solid #888;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Limpar Filtro</button>' +
          '<button onclick="preExecutarBuscaGeral()" style="background:#4a6fa5;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Buscar</button>' +
        '</div>' +

          


        
        
      '</div>' +
    '</div>';





    res.send(html);
  } catch (err) {
    console.error('Erro ao consultar prestações:', err);
    res.status(500).send('Erro ao carregar página');
  }
});

module.exports = router;