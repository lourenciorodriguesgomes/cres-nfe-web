const API = '/api';

// Carrega dados do operador logado
fetch('/api/verificar')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (!data.logado) {
      window.location.href = '/login';
      return;
    }
    document.getElementById('operadorInfo').textContent = 'Operador: ' + data.operador.codigo + ' - ' + data.operador.nome;
  })
  .catch(function() {
    window.location.href = '/login';
  });

const pageTitles = {
bancos: 'Bancos', mapacli: 'xxxxxxxxxxMapa de Clientes', contacorrente: 'Conta Corrente', extrato: 'Extrato', conciliacao: 'Conciliação', extratoct: 'Extrato CT', categoria: 'Categoria', subcategoria: 'Sub Categoria', estoque: 'Estoque',
};


document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('pageTitle').textContent = pageTitles[page] || page;
    await loadPage(page);
  });
});

async function loadPage(page) {
  const content = document.getElementById('pageContent');
  var tabMap = {
    'bancos': 'contas', 'contacorrente': 'contas',
    'extrato': 'extratos', 'conciliacao': 'conciliacao',
    'extratoct': 'extrato_ct', 'categoria': 'categoria'
  };
  if (tabMap[page]) {
    content.innerHTML = getBancosPageHTML();
    switchTab(null, tabMap[page]);
    if (tabMap[page] === 'contas') {
      await loadContas();
      await checkDbConnection();
    }
  } else if (page === 'mapacli') {
    content.innerHTML = '<p style="text-align:center;padding:40px;">Carregando...</p>';
    try {
      const resp = await fetch('/mapacli');
      const html = await resp.text();
      content.innerHTML = html;
      const old = document.getElementById('mapacliScript');
      if (old) old.remove();
      const s = document.createElement('script');
      s.id = 'mapacliScript';
      s.src = '/js/mapacli.js';
      document.body.appendChild(s);
    } catch(err) {
      content.innerHTML = '<p style="text-align:center;padding:40px;color:red;">Erro: ' + err.message + '</p>';
    }
  } else if (page === 'subcategoria') {
    content.innerHTML = '<p style="text-align:center;padding:40px;">Carregando...</p>';
    try {
      const resp = await fetch('/subcategoria');
      const html = await resp.text();
      content.innerHTML = html;
      const old = document.getElementById('subcatScript');
      if (old) old.remove();
      const s = document.createElement('script');
      s.id = 'subcatScript';
      s.src = '/js/subcategoria.js';
      document.body.appendChild(s);
    } catch(err) {
      content.innerHTML = '<p style="text-align:center;padding:40px;color:red;">Erro: ' + err.message + '</p>';
    }
  } else {
    content.innerHTML = '<div class="card"><h2 style="color:var(--text-muted);text-align:center;padding:60px 0;">Modulo pendente</h2></div>';
  }
}



function getBancosPageHTML() {
  return '' +
    '<div class="tabs">' +
      '<div class="tab active" onclick="switchTab(event,\'contas\')">Contas Correntes</div>' +
      '<div class="tab" onclick="switchTab(event,\'extratos\')">Extratos</div>' +
      '<div class="tab" onclick="switchTab(event,\'extrato_ct\')">Extrato CT (Centro Custo)</div>' +
      '<div class="tab" onclick="switchTab(event,\'conciliacao\')">Conciliacao</div>' +
      '<div class="tab" onclick="switchTab(event,\'categoria\')">Categoria</div>' +
	  '<div class="tab" onclick="switchTab(event,\'mapacli\')">Mapa de Clientes</div>' +  
      '<div class="tab" onclick="switchTab(event,\'relatorios\')">Relatorios</div>' +
	  '<div class="tab" onclick="switchTab(event,\'motivos\')">Motivos Dev. Cheque</div>' +
    '</div>' +
    '<div id="tab-contas" class="tab-content">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">Contas Correntes</span>' +
          '<button class="btn btn-primary" onclick="openModalConta()">+ Nova Conta</button>' +
        '</div>' +
        '<div class="table-container">' +
          '<table><thead><tr>' +
            '<th>Banco</th><th>Agencia</th><th>Conta</th><th>Titular</th><th>Client ID</th><th>Certificados</th><th>Acoes</th>' +
          '</tr></thead><tbody id="contasTableBody">' +
            '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">Carregando...</td></tr>' +
          '</tbody></table>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="tab-extratos" class="tab-content" style="display:none;">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">Extratos Bancarios - Cadastro</span>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-outline btn-sm" onclick="openImportModal()">Importar CSV</button>' +
            '<button class="btn btn-outline btn-sm" onclick="openApiModal()">Baixar via API</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-row" style="display:flex; gap:10px; align-items:flex-end; flex-wrap:nowrap; margin-bottom:12px;">' +
          '<div class="form-group" style="flex:1; min-width:120px;">' +
            '<label>Data Inicial</label>' +
            '<input type="date" class="form-control" id="filtroDataIni">' +
          '</div>' +
          '<div class="form-group" style="flex:1; min-width:120px;">' +
            '<label>Data Final</label>' +
            '<input type="date" class="form-control" id="filtroDataFim">' +
          '</div>' +
          '<div class="form-group" style="flex:0.8; min-width:80px;">' +
            '<label>Banco</label>' +
            '<input type="text" class="form-control" id="filtroBanco" placeholder="077">' +
          '</div>' +
          '<div class="form-group" style="flex:1.2; min-width:120px;">' +
            '<label>Beneficiario</label>' +
            '<input type="text" class="form-control" id="filtroBeneficiario" placeholder="Nome">' +
          '</div>' +
          '<div class="form-group" style="flex:0.6; min-width:80px;">' +
            '<label>Tipo</label>' +
            '<select class="form-control" id="filtroTipo">' +
              '<option value="">Todos</option>' +
              '<option value="C">Credito</option>' +
              '<option value="D">Debito</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="flex:0.5; min-width:70px;">' +
            '<label>Limite</label>' +
            '<select class="form-control" id="filtroLimite">' +
              '<option value="10">10</option>' +
              '<option value="25">25</option>' +
              '<option value="50" selected>50</option>' +
              '<option value="100">100</option>' +
              '<option value="200">200</option>' +
              '<option value="500">500</option>' +
              '<option value="9999">Todos</option>' +
            '</select>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="loadExtratos()" style="height:38px; padding:0 20px; white-space:nowrap; transform: translateY(-15px);">Filtrar</button>' +
        '</div>' +
        '<div class="stats-grid" style="margin-top:12px;">' +
          '<div class="stat-card"><div class="stat-label">Total Credito</div><div class="stat-value positive" id="totalCredito" style="font-size:18px;">R$ 0,00</div></div>' +
          '<div class="stat-card"><div class="stat-label">Total Debito</div><div class="stat-value negative" id="totalDebito" style="font-size:18px;">R$ 0,00</div></div>' +
          '<div class="stat-card"><div class="stat-label">Saldo</div><div class="stat-value" id="saldoExtrato" style="font-size:18px;">R$ 0,00</div></div>' +
        '</div>' +
        '<div class="table-container" style="margin-top:12px;">' +
          '<table style="font-size:11px;"><thead><tr>' +
            '<th>Ord</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>ID</th><th>Tipo</th><th>Valor</th><th>Data Mov</th><th>Descricao</th><th>N. Doc</th><th>CPF/CNPJ</th><th>Beneficiario</th><th>Desc Compl.</th><th>Orcamento</th>' +
          '</tr></thead><tbody id="extratosTableBody">' +
            '<tr><td colspan="14" style="text-align:center;color:var(--text-muted);">Use os filtros acima</td></tr>' +
          '</tbody></table>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="tab-extrato_ct" class="tab-content" style="display:none;">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">Extrato com Centro de Custo (CT)</span>' +
          '<div style="display:flex;gap:6px;margin-left:auto;">' +
            '<button class="btn btn-outline btn-sm" onclick="abrirBuscaGeralCT()">Busca Geral</button>' +
            '<button class="btn btn-outline btn-sm" onclick="limparBuscaCT()">Limpar</button>' +
            '<button class="btn btn-outline btn-sm" onclick="exportarExtratoCT()">Exportar</button>' +
            '<button class="btn btn-outline btn-sm" onclick="toggleColunasCT()">Colunas</button>' +
            '<button class="btn btn-outline btn-sm" onclick="imprimirExtratoCT()">Imprimir</button>' +
          '</div>' +
        '</div>' +
        '<div class="form-row" style="display:flex; gap:10px; align-items:flex-end; flex-wrap:nowrap; margin-bottom:12px;">' +
          '<div class="form-group" style="flex:1; min-width:120px;">' +
            '<label>Data Inicial</label>' +
            '<input type="date" class="form-control" id="ctDataIni">' +
          '</div>' +
          '<div class="form-group" style="flex:1; min-width:120px;">' +
            '<label>Data Final</label>' +
            '<input type="date" class="form-control" id="ctDataFim">' +
          '</div>' +
          '<div class="form-group" style="flex:0.8; min-width:80px;">' +
            '<label>Banco</label>' +
            '<input type="text" class="form-control" id="ctBanco" placeholder="077">' +
          '</div>' +
          '<div class="form-group" style="flex:1.2; min-width:120px;">' +
            '<label>Beneficiario</label>' +
            '<input type="text" class="form-control" id="ctBenef" placeholder="Nome">' +
          '</div>' +
          '<div class="form-group" style="flex:0.6; min-width:80px;">' +
            '<label>Tipo</label>' +
            '<select class="form-control" id="ctTipo">' +
              '<option value="">Todos</option>' +
              '<option value="C">Credito</option>' +
              '<option value="D">Debito</option>' +
            '</select>' +
          '</div>' +
          '<div class="form-group" style="flex:0.5; min-width:70px;">' +
            '<label>Limite</label>' +
            '<select class="form-control" id="ctLimite">' +
              '<option value="10">10</option>' +
              '<option value="25">25</option>' +
              '<option value="50" selected>50</option>' +
              '<option value="100">100</option>' +
              '<option value="200">200</option>' +
              '<option value="500">500</option>' +
              '<option value="9999">Todos</option>' +
            '</select>' +
          '</div>' +
          '<button class="btn btn-primary" onclick="loadExtratoCT()" style="height:38px; padding:0 20px; white-space:nowrap; transform: translateY(-15px);">Filtrar</button>' +
        '</div>' +
        '<div class="table-container" id="tabelaExtratoCTContainer">' +
          '<table style="font-size:10px;" id="tabelaExtratoCT">' +
            '<thead><tr style="background:#1a1d29;color:#fff;">' +
              '<th data-col="0">Ord</th>' +
              '<th data-col="1">Data Mov</th>' +
              '<th data-col="2">Valor</th>' +
              '<th data-col="3">Descricao</th>' +
              '<th data-col="4">Tipo</th>' +
              '<th data-col="5">CPF/CNPJ</th>' +
              '<th data-col="6">Beneficiario</th>' +
              '<th data-col="7">Cat</th>' +
              '<th data-col="8">Desc. Categoria</th>' +
              '<th data-col="9">Sub Cat</th>' +
              '<th data-col="10">Desc. Subcategoria</th>' +
              '<th data-col="11">Compet</th>' +
              '<th data-col="12">Banco</th>' +
              '<th data-col="13">Agencia</th>' +
              '<th data-col="14">Conta</th>' +
              '<th data-col="15">Val</th>' +
              '<th data-col="16">ID</th>' +
              '<th data-col="17" style="min-width:60px;">Acoes</th>' +
            '</tr></thead>' +
            '<tbody id="extratoCTTableBody">' +
              '<tr><td colspan="18" style="text-align:center;color:var(--text-muted);">Use os filtros acima</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="tab-conciliacao" class="tab-content" style="display:none;">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">Conciliacao Bancaria</span>' +
          '<button class="btn btn-success" onclick="runConciliacao()">Conciliacao Automatica</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Banco</label><input type="text" class="form-control" id="concBanco" placeholder="077"></div>' +
          '<div class="form-group"><label>Agencia</label><input type="text" class="form-control" id="concAgencia"></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>Conta</label><input type="text" class="form-control" id="concConta"></div>' +
          '<div class="form-group"><label>Periodo</label><div style="display:flex;gap:8px;"><input type="date" class="form-control" id="concDataIni"><input type="date" class="form-control" id="concDataFim"></div></div>' +
        '</div>' +
        '<div id="conciliacaoResultado" style="margin-top:12px;"></div>' +
      '</div>' +
    '</div>' +
    '<div id="tab-categoria" class="tab-content" style="display:none;">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">Mapa de Categorias x Plano de Contas</span>' +
          '<div style="display:flex;gap:8px;">' +
            '<button class="btn btn-primary btn-sm" onclick="openModalCategoria()">+ Nova</button>' +
            '<button class="btn btn-outline btn-sm" onclick="toggleAllCategorias()">Exibir/Ocultar Sub</button>' +
            '<button class="btn btn-outline btn-sm" onclick="exportarCategoriasExcel()">Exportar</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-container">' +
          '<table id="categoriaTable" style="font-size:12px;">' +
            '<thead><tr>' +
              '<th style="width:30px;text-align:center;">&nbsp;</th>' +
              '<th style="width:80px;">Codigo</th>' +
              '<th>Categoria / Plano de Contas</th>' +
              '<th style="width:70px;text-align:center;">Tipo</th>' +
              '<th style="width:70px;text-align:center;">Grupo</th>' +
            '</tr></thead><tbody id="categoriaTableBody">' +
              '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Carregando...</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>' +
	'<div id="tab-mapacli" class="tab-content" style="display:none;">' +
  '<div id="mapacliContainer"><p style="text-align:center;padding:40px;">Carregando Mapa de Clientes...</p></div>' +
  '</div>' +
    '<div id="tab-relatorios" class="tab-content" style="display:none;">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">Resumo Trimestral por Categoria</span>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input type="number" class="form-control" id="anoRelatorio" style="width:100px;" value="' + new Date().getFullYear() + '">' +
            '<button class="btn btn-primary btn-sm" onclick="loadRelatorioTrimestral()">Trimestre</button>' +
            '<button class="btn btn-outline btn-sm" onclick="loadRelatorioMensal()">Mensal</button>' +
          '</div>' +
        '</div>' +
        '<div class="table-container" id="relatorioContainer">' +
          '<p style="text-align:center;color:var(--text-muted);padding:40px;">Selecione o ano e clique em Gerar</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="tab-motivos" class="tab-content" style="display:none;">' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">Motivos de Devolucao de Cheque</span>' +
          '<button class="btn btn-primary btn-sm" onclick="openModalMotivo()">+ Novo</button>' +
        '</div>' +
        '<div class="table-container">' +
          '<table><thead><tr><th>Motivo</th><th>Classificacao</th><th>Descricao</th></tr></thead><tbody id="motivosTableBody">' +
            '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Carregando...</td></tr>' +
          '</tbody></table>' +
        '</div>' +
      '</div>' +
    '</div>';
}
// ============================================================
// FUNCAO AUXILIAR: safeJson
// ============================================================
async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Resposta nao-JSON (primeiros 200 chars):', text.substring(0, 200));
    throw new Error('Resposta invalida do servidor (nao e JSON)');
  }
}


async function loadMapaCliTab() {
  var container = document.getElementById('mapacliContainer');
  if (!container) return;
  container.innerHTML = '<p style="text-align:center;padding:40px;">Carregando...</p>';
  try {
    const resp = await fetch('/mapacli');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const html = await resp.text();
    container.innerHTML = html;
    var old = document.getElementById('mapacliScript');
    if (old) old.remove();
    var s = document.createElement('script');
    s.id = 'mapacliScript';
    s.src = '/js/mapacli.js';
    document.body.appendChild(s);
  } catch(err) {
    container.innerHTML = '<p style="text-align:center;padding:40px;color:red;">Erro: ' + err.message + '</p>';
  }
}

// ============================================================
// SWITCH DE ABAS
// ============================================================
function switchTab(e, tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (e && e.target) e.target.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  var el = document.getElementById('tab-' + tab);
  if (el) el.style.display = 'block';
  if (tab === 'motivos') loadMotivos();
  if (tab === 'categoria') loadCategorias();
  if (tab === 'mapacli') loadMapaCliTab();
}

// ============================================================
// CONEXAO DB
// ============================================================
async function checkDbConnection() {
  try {
    const r = await fetch(API + '/bancos/referencia?limit=1');
    if (r.ok) {
      const el = document.getElementById('dbStatus');
      if (el) { el.textContent = 'Conectado'; el.classList.add('connected'); }
    }
  } catch (e) {
    const el = document.getElementById('dbStatus');
    if (el) el.textContent = 'Erro de conexao';
  }
}
// ============================================================
// CONTAS CORRENTES
// ============================================================
async function loadContas() {
  try {
    const res = await fetch(API + '/bancos/contas');
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const data = await safeJson(res);
    const tbody = document.getElementById('contasTableBody');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">Nenhuma conta</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(c =>
      '<tr>' +
        '<td>' + (c.banco || '') + ' - ' + (c.nomebanco || '') + '</td>' +
        '<td>' + (c.agencia || '') + '</td>' +
        '<td>' + (c.contacorre || '') + '</td>' +
        '<td>' + (c.titular || '') + '</td>' +
        '<td>' + (c.clientid ? 'Sim' : 'Nao') + '</td>' +
        '<td>' + (c.certificadopem ? 'Sim' : 'Nao') + '</td>' +
        '<td><button class="btn btn-danger btn-sm" onclick="deleteConta(\'' + c.banco + '\',\'' + c.agencia + '\',\'' + c.contacorre + '\')">Excluir</button></td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
function openModalConta() {
  document.getElementById('modalTitle').textContent = 'Nova Conta';
  document.getElementById('modalBody').innerHTML =
    '<div class="form-row">' +
      '<div class="form-group"><label>Banco</label><input type="text" class="form-control" id="ctBanco"></div>' +
      '<div class="form-group"><label>Agencia</label><input type="text" class="form-control" id="ctAgencia"></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Conta</label><input type="text" class="form-control" id="ctConta"></div>' +
      '<div class="form-group"><label>Titular</label><input type="text" class="form-control" id="ctTitular"></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Client ID</label><input type="text" class="form-control" id="ctClientId"></div>' +
      '<div class="form-group"><label>Client Secret</label><input type="password" class="form-control" id="ctClientSecret"></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Cert PEM</label><input type="text" class="form-control" id="ctCertPem"></div>' +
      '<div class="form-group"><label>Cert KEY</label><input type="text" class="form-control" id="ctCertKey"></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="saveConta()">Salvar</button>' +
    '</div>';
  document.getElementById('modalOverlay').style.display = 'flex';
}
async function saveConta() {
  const data = {
    banco: val('ctBanco'), agencia: val('ctAgencia'), contacorre: val('ctConta'),
    titular: val('ctTitular'), clientid: val('ctClientId'), clientsecret: val('ctClientSecret'),
    certificadopem: val('ctCertPem'), certificadokey: val('ctCertKey')
  };
  try {
    const res = await fetch(API + '/bancos/contas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast('Conta salva!'); closeModal(); await loadContas();
    } else {
      const err = await safeJson(res);
      showToast('Erro: ' + err.error, 'error');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
async function deleteConta(banco, agencia, conta) {
  if (!confirm('Excluir?')) return;
  try {
    await fetch(API + '/bancos/contas/' + banco + '/' + agencia + '/' + conta, { method: 'DELETE' });
    showToast('Excluida'); await loadContas();
  } catch (err) {
    showToast('Erro', 'error');
  }
}
// ============================================================
// EXTRATOS
// ============================================================
async function loadExtratos() {
  const params = new URLSearchParams();
  const di = val('filtroDataIni'), df = val('filtroDataFim'), banco = val('filtroBanco');
  const tipo = val('filtroTipo'), beneficiario = val('filtroBeneficiario');
  const limite = val('filtroLimite') || 50;

  if (di) params.append('dataInicial', di);
  if (df) params.append('dataFinal', df);
  if (banco) params.append('banco', banco);
  if (tipo) params.append('tipo', tipo);
  if (beneficiario) params.append('beneficiario', beneficiario);
  if (limite) params.append('limite', limite);

  try {
    const res = await fetch(API + '/bancos/extratos?' + params.toString());
    if (!res.ok) {
      showToast('Erro HTTP ' + res.status, 'error');
      return;
    }

    const data = await safeJson(res);
    const dados = data?.dados || [];

    let totalCredito = 0;
    let totalDebito = 0;

    dados.forEach(e => {
      const valor = parseFloat(e.valor) || 0;
      if (e.tipo === 'C') {
        totalCredito += valor;
      } else if (e.tipo === 'D') {
        totalDebito += Math.abs(valor); // débito sempre positivo
      }
    });

    document.getElementById('totalCredito').textContent = formatMoney(totalCredito);
    document.getElementById('totalDebito').textContent = formatMoney(totalDebito);
    document.getElementById('saldoExtrato').textContent = formatMoney(totalCredito - totalDebito);

    const tbody = document.getElementById('extratosTableBody');

    if (dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--text-muted);">Nenhum extrato</td></tr>';
      return;
    }

    tbody.innerHTML = dados.map((e, i) =>
      `<tr style="font-size:11px;">
        <td>${i + 1}</td>
        <td>${e.banco || ''}</td>
        <td>${e.agencia || ''}</td>
        <td>${e.conta || ''}</td>
        <td style="font-size:9px;color:var(--text-muted);">${(e.transactionId || '').substring(0, 12)}</td>
        <td><span class="badge ${e.tipo === 'C' ? 'badge-success' : 'badge-danger'}" style="font-size:10px;">${e.tipo || ''}</span></td>
        <td style="font-weight:600;color:${e.tipo === 'C' ? 'var(--success)' : 'var(--danger)'}">${formatMoney(e.valor)}</td>
        <td>${formatDate(e.data)}</td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${e.descricao || ''}</td>
        <td>${e.numerodocumento || ''}</td>
        <td style="font-size:10px;">${e.cpfcnpj || ''}</td>
        <td>${e.beneficiario || ''}</td>
        <td style="font-size:10px;">${e.descInfcomplementar || ''}</td>
        <td>${formatMoney(e.orcamento)}</td>
      </tr>`
    ).join('');

    // Adicionar ordenação aos cabeçalhos (apenas uma vez)
    const ths = document.querySelectorAll('#tab-extratos thead th');
    ths.forEach((th, i) => {
      th.style.cursor = 'pointer';
      th.onclick = () => ordenarExtrato(i);
    });

  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

	
// ============================================================
// EXTRATO CT - VARIAVEIS GLOBAIS
// ============================================================
var dadosOriginaisCT = null;
var dadosExibidosCT = [];
var colunasVisiveisCT = new Array(18).fill(true);
colunasVisiveisCT[15] = false;
colunasVisiveisCT[16] = false;
var categoriasCache = null;
var categoriasDisponivel = true;
var subCategoriasCache = {};
// ============================================================
// EXTRATO CT - CARREGAR DADOS
// ============================================================
async function loadExtratoCT() {
  const params = new URLSearchParams();
  const di = val('ctDataIni'), df = val('ctDataFim'), banco = val('ctBanco');
  const beneficiario = val('ctBenef'), tipo = val('ctTipo');
  const limite = val('ctLimite') || 50;
  if (di) params.append('dataInicial', di);
  if (df) params.append('dataFinal', df);
  if (banco) params.append('banco', banco);
  if (beneficiario) params.append('beneficiario', beneficiario);
  if (tipo) params.append('tipo', tipo);
  if (limite) params.append('limite', limite);
  try {
    const res = await fetch(API + '/bancos/extratos?' + params.toString());
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const data = await safeJson(res);
    const tbody = document.getElementById('extratoCTTableBody');
    if (!data.dados || data.dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="18" style="text-align:center;color:var(--text-muted);">Nenhum extrato</td></tr>';
      dadosOriginaisCT = [];
      dadosExibidosCT = [];
      aplicarVisibilidadeColunasCT();
      return;
    }
    let dadosFiltrados = data.dados;
    if (beneficiario) {
      const busca = beneficiario.toUpperCase();
      dadosFiltrados = dadosFiltrados.filter(function(e) {
        return (e.beneficiario || '').toUpperCase().indexOf(busca) >= 0;
      });
    }
    if (tipo) {
      dadosFiltrados = dadosFiltrados.filter(function(e) {
        return (e.tipo || '') === tipo;
      });
    }
    if (banco) {
      dadosFiltrados = dadosFiltrados.filter(function(e) {
        return (e.banco || '') === banco;
      });
    }
    if (di) {
      const dataIni = new Date(di);
      dataIni.setHours(0, 0, 0, 0);
      dadosFiltrados = dadosFiltrados.filter(function(e) {
        const d = new Date(e.data);
        return d >= dataIni;
      });
    }
    if (df) {
      const dataFim = new Date(df);
      dataFim.setHours(23, 59, 59, 999);
      dadosFiltrados = dadosFiltrados.filter(function(e) {
        const d = new Date(e.data);
        return d <= dataFim;
      });
    }
    if (limite && limite !== 9999) {
      dadosFiltrados = dadosFiltrados.slice(0, parseInt(limite));
    }
    dadosOriginaisCT = data.dados;
    dadosExibidosCT = dadosFiltrados;
    try {
      const saved = localStorage.getItem('alteracoesCT');
      if (saved) {
        const savedData = JSON.parse(saved);
        for (let i = 0; i < dadosExibidosCT.length; i++) {
          const reg = dadosExibidosCT[i];
          for (let j = 0; j < savedData.length; j++) {
            if (reg.transactionId === savedData[j].transactionId) {
              reg.cpfcnpj = savedData[j].cpfcnpj;
              reg.beneficiario = savedData[j].beneficiario;
              reg.cli_categoria = savedData[j].cli_categoria;
              reg.cli_subcategoria = savedData[j].cli_subcategoria;
              reg.competencia = savedData[j].competencia;
              break;
            }
          }
        }
      }
    } catch (e) {
      localStorage.removeItem('alteracoesCT');
    }
    if (categoriasCache === null && categoriasDisponivel) {
      try {
        const catRes = await fetch(API + '/bancos/categorias');
        if (catRes.ok) {
          categoriasCache = await catRes.json();
          categoriasDisponivel = true;
        } else {
          categoriasDisponivel = false;
        }
      } catch (e) {
        categoriasDisponivel = false;
      }
    }
    renderExtratoCTFiltrado(dadosExibidosCT);
    showToast('Dados carregados! (' + dadosExibidosCT.length + ' registros)');
  } catch (err) {
    showToast('Erro ao carregar extratos: ' + err.message, 'error');
  }
}





// ============================================================
// RENDERIZAR TABELA EXTRATO CT
// ============================================================
function renderExtratoCTFiltrado(dados) {
  var tbody = document.getElementById('extratoCTTableBody');
  if (!dados || dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="18" style="text-align:center;color:var(--text-muted);">Nenhum registro encontrado</td></tr>';
    aplicarVisibilidadeColunasCT();
    return;
  }
  var html = '';
  for (var i = 0; i < dados.length; i++) {
    var e = dados[i];
    var cat = e.cli_categoria || '';
    var subCat = e.cli_subcategoria || '';
    html += '<tr style="font-size:10px;">' +
      '<td data-col="0">' + (i + 1) + '</td>' +
      '<td data-col="1">' + formatDate(e.data) + '</td>' +
      '<td data-col="2" style="font-weight:600;color:' + (e.tipo === 'C' ? 'var(--success)' : 'var(--danger)') + '">' + formatMoney(e.valor) + '</td>' +
      '<td data-col="3" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">' + (e.descricao || '') + '</td>' +
      '<td data-col="4"><span class="badge ' + (e.tipo === 'C' ? 'badge-success' : 'badge-danger') + '" style="font-size:9px;">' + (e.tipo || '') + '</span></td>' +
      '<td data-col="5" style="font-size:9px;">' + (e.cpfcnpj || '') + '</td>' +
      '<td data-col="6">' + (e.beneficiario || '') + '</td>' +
      '<td data-col="7" style="font-size:9px;">' + cat + '</td>' +
      '<td data-col="8" style="font-size:9px;">' + (e.desc_categoria || '') + '</td>' +
      '<td data-col="9" style="font-size:9px;">' + subCat + '</td>' +
      '<td data-col="10" style="font-size:9px;">' + (e.desc_subcategoria || '') + '</td>' +
      '<td data-col="11" style="font-size:9px;">' + (e.competencia || '') + '</td>' +
      '<td data-col="12">' + (e.banco || '') + '</td>' +
      '<td data-col="13">' + (e.agencia || '') + '</td>' +
      '<td data-col="14">' + (e.conta || '') + '</td>' +
      '<td data-col="15" style="font-size:9px;">' + (e.numpresta ? 'S' : 'N') + '</td>' +
      '<td data-col="16" style="font-size:8px;color:var(--text-muted);">' + (e.transactionId || '').substring(0, 10) + '</td>' +
      '<td data-col="17" style="text-align:center;">' +
        '<button class="btn btn-primary btn-sm" onclick="abrirEdicaoCT(\'' + e.transactionId + '\')" style="padding:2px 8px;font-size:9px;">Editar</button>' +
      '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
  aplicarVisibilidadeColunasCT();
}
// ============================================================
// VISIBILIDADE DE COLUNAS
// ============================================================
function aplicarVisibilidadeColunasCT() {
  var allCells = document.querySelectorAll('#tabelaExtratoCT [data-col]');
  allCells.forEach(function(cell) {
    var idx = parseInt(cell.getAttribute('data-col'));
    if (colunasVisiveisCT[idx]) {
      cell.style.display = '';
    } else {
      cell.style.display = 'none';
    }
  });
}
function toggleColunasCT() {
  var modalBody = document.getElementById('modalBody');
  var nomesColunas = [
    'Ord', 'Data Mov', 'Valor', 'Descricao', 'Tipo',
    'CPF/CNPJ', 'Beneficiario', 'Cat', 'Desc. Categoria',
    'Sub Cat', 'Desc. Subcategoria', 'Compet',
    'Banco', 'Agencia', 'Conta', 'Val', 'ID', 'Acoes'
  ];
  var html = '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
    '<button class="btn btn-sm btn-outline" onclick="selecionarTodasColunas(true)">Selecionar todos</button>' +
    '<button class="btn btn-sm btn-outline" onclick="selecionarTodasColunas(false)">Desmarcar todos</button>' +
  '</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-height:350px;overflow-y:auto;padding-right:4px;">';
  for (var i = 0; i < nomesColunas.length; i++) {
    var checked = colunasVisiveisCT[i] ? 'checked' : '';
    html += '<label style="display:flex;align-items:center;gap:4px;font-size:13px;cursor:pointer;">' +
      '<input type="checkbox" ' + checked + ' data-col="' + i + '" onchange="toggleColunaCT(this)"> ' +
      nomesColunas[i] +
    '</label>';
  }
  html += '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
      '<button class="btn btn-outline" onclick="closeModal()">Fechar</button>' +
    '</div>';
  document.getElementById('modalTitle').textContent = 'Selecionar Colunas';
  modalBody.innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function toggleColunaCT(checkbox) {
  var idx = parseInt(checkbox.getAttribute('data-col'));
  colunasVisiveisCT[idx] = checkbox.checked;
  aplicarVisibilidadeColunasCT();
}
function selecionarTodasColunas(selecionar) {
  for (var i = 0; i < colunasVisiveisCT.length; i++) {
    colunasVisiveisCT[i] = selecionar;
  }
  var checkboxes = document.querySelectorAll('#modalBody input[type="checkbox"][data-col]');
  checkboxes.forEach(function(cb) {
    cb.checked = selecionar;
  });
  aplicarVisibilidadeColunasCT();
}
// ============================================================
// EXPORTAR EXTRATO CT
// ============================================================
function exportarExtratoCT() {
  if (!dadosExibidosCT || dadosExibidosCT.length === 0) {
    showToast('Nao ha dados para exportar', 'error');
    return;
  }
  var headers = [
    'Ord', 'Data Mov', 'Valor', 'Descricao', 'Tipo',
    'CPF/CNPJ', 'Beneficiario', 'Cat', 'Desc. Categoria',
    'Sub Cat', 'Desc. Subcategoria', 'Compet',
    'Banco', 'Agencia', 'Conta', 'Val', 'ID'
  ];
  var rows = [];
  rows.push(headers.join(';'));
  dadosExibidosCT.forEach(function(e, i) {
    var linha = [
      (i + 1),
      formatDate(e.data),
      formatMoney(e.valor).replace('R$ ', '').replace(/\./g, ',').replace(',', '.'),
      (e.descricao || '').replace(/;/g, ','),
      (e.tipo || ''),
      (e.cpfcnpj || ''),
      (e.beneficiario || '').replace(/;/g, ','),
      (e.cli_categoria || ''),
      (e.desc_categoria || '').replace(/;/g, ','),
      (e.cli_subcategoria || ''),
      (e.desc_subcategoria || '').replace(/;/g, ','),
      (e.competencia || ''),
      (e.banco || ''),
      (e.agencia || ''),
      (e.conta || ''),
      (e.numpresta ? 'S' : 'N'),
      (e.transactionId || '').substring(0, 10)
    ];
    rows.push(linha.join(';'));
  });
  var csv = rows.join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ExtratoCT.csv';
  link.click();
  showToast('Exportado com sucesso!');
}
// ============================================================
// IMPRIMIR EXTRATO CT
// ============================================================
function imprimirExtratoCT() {
  if (!dadosExibidosCT || dadosExibidosCT.length === 0) {
    showToast('Nao ha dados para imprimir', 'error');
    return;
  }
  var style = document.createElement('style');
  style.id = 'printStyleCT';
  style.textContent =
    '@media print {' +
      'body * { visibility: hidden; }' +
      '#tabelaExtratoCTContainer, #tabelaExtratoCTContainer * { visibility: visible; }' +
      '#tabelaExtratoCTContainer { position: absolute; left: 0; top: 0; width: 100%; }' +
      '.no-print { display: none !important; }' +
      'h2.print-title { visibility: visible !important; text-align:center; margin-bottom:10px; }' +
      'p.print-footer { visibility: visible !important; text-align:center; margin-top:15px; font-size:10px; }' +
    '}';
  document.head.appendChild(style);
  var container = document.getElementById('tabelaExtratoCTContainer');
  var titulo = document.createElement('h2');
  titulo.className = 'print-title';
  titulo.textContent = 'Extrato com Centro de Custo (CT)';
  titulo.style.textAlign = 'center';
  titulo.style.marginBottom = '10px';
  container.insertBefore(titulo, container.firstChild);
  var footer = document.createElement('p');
  footer.className = 'print-footer';
  footer.textContent = 'Gerado em: ' + new Date().toLocaleString('pt-BR');
  footer.style.textAlign = 'center';
  footer.style.marginTop = '15px';
  footer.style.fontSize = '10px';
  container.appendChild(footer);
  window.print();
  setTimeout(function() {
    var styleEl = document.getElementById('printStyleCT');
    if (styleEl) styleEl.remove();
    if (titulo) titulo.remove();
    if (footer) footer.remove();
  }, 500);
}
// ============================================================
// EDICAO - ABRIR MODAL (com indicadores de tamanho maximo)
// ============================================================
function abrirEdicaoCT(transactionId) {
  var registro = null;
  for (var i = 0; i < dadosExibidosCT.length; i++) {
    if (dadosExibidosCT[i].transactionId === transactionId) {
      registro = dadosExibidosCT[i];
      break;
    }
  }
  if (!registro) {
    showToast('Registro nao encontrado', 'error');
    return;
  }
  document.getElementById('modalTitle').textContent = 'Editar Cliente / CT';
  var html = '<div style="max-height:60vh;overflow-y:auto;padding-right:4px;">';
  html += '<div class="form-group">' +
    '<label>CNPJ / CPF <span style="font-size:11px;color:var(--text-muted);">(maximo 14 caracteres)</span></label>' +
    '<input type="text" class="form-control" id="editCpfCnpj" maxlength="14" value="' + (registro.cpfcnpj || '') + '">' +
  '</div>';
  html += '<div class="form-group">' +
    '<label>Nome do Cliente <span style="font-size:11px;color:var(--text-muted);">(maximo 40 caracteres)</span></label>' +
    '<input type="text" class="form-control" id="editNome" maxlength="40" value="' + (registro.beneficiario || '').replace(/"/g, '&quot;') + '">' +
  '</div>';
  html += '<div class="form-group">' +
    '<label>Categoria <span style="font-size:11px;color:var(--text-muted);">(maximo 2 caracteres)</span></label>' +
    '<div style="display:flex;gap:4px;">' +
      '<input type="text" class="form-control" id="editCategoria" maxlength="2" value="' + (registro.cli_categoria || '') + '" style="flex:1;">' +
      '<button class="btn btn-outline btn-sm" onclick="abrirBrowseCategorias()" style="height:38px;width:38px;font-size:16px;" title="Buscar categoria">🔍</button>' +
    '</div>' +
  '</div>';
  html += '<div class="form-group">' +
    '<label>Sub Categoria <span style="font-size:11px;color:var(--text-muted);">(maximo 4 caracteres)</span></label>' +
    '<div style="display:flex;gap:4px;">' +
      '<input type="text" class="form-control" id="editSubCategoria" maxlength="4" value="' + (registro.cli_subcategoria || '') + '" style="flex:1;">' +
      '<button class="btn btn-outline btn-sm" onclick="abrirBrowseSubCategorias()" style="height:38px;width:38px;font-size:16px;" title="Buscar subcategoria">🔍</button>' +
    '</div>' +
  '</div>';
  html += '<div class="form-group">' +
    '<label>Competencia <span style="font-size:11px;color:var(--text-muted);">(maximo 5 caracteres)</span></label>' +
    '<input type="text" class="form-control" id="editCompetencia" maxlength="5" value="' + (registro.competencia || '') + '">' +
  '</div>';
  html += '<input type="hidden" id="editTransactionId" value="' + transactionId + '">';
  html += '</div>';
  html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
    '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="salvarEdicaoCT()">Salvar</button>' +
  '</div>';
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
}
// ============================================================
// BROWSE DE CATEGORIAS
// ============================================================
function abrirBrowseCategorias() {
  if (!categoriasDisponivel) {
    showToast('A lista de categorias nao esta disponivel. Digite o codigo manualmente.', 'error');
    return;
  }
  if (categoriasCache && categoriasCache.length > 0) {
    exibirBrowseCategorias(categoriasCache);
    return;
  }
  showToast('Carregando categorias...');
  fetch(API + '/bancos/categorias')
    .then(function(res) {
      if (!res.ok) {
        categoriasDisponivel = false;
        throw new Error('API indisponivel (status ' + res.status + ')');
      }
      return res.json();
    })
    .then(function(data) {
      if (!data || data.length === 0) {
        showToast('Nenhuma categoria cadastrada', 'error');
        return;
      }
      categoriasCache = data;
      categoriasDisponivel = true;
      exibirBrowseCategorias(data);
    })
    .catch(function(err) {
      categoriasDisponivel = false;
      showToast('Erro ao carregar categorias: ' + err.message, 'error');
    });
}
function exibirBrowseCategorias(lista) {
  var modalBody = document.getElementById('modalBody');
  var html = '<div style="max-height:50vh;overflow-y:auto;">' +
    '<table style="width:100%;font-size:13px;border-collapse:collapse;">' +
    '<thead><tr style="background:#1a1d29;color:#fff;">' +
    '<th>Codigo</th><th>Descricao</th><th style="width:60px;">Selecionar</th>' +
    '</tr></thead><tbody>';
  lista.forEach(function(cat) {
    var codigo = (cat.codigo || '').trim();
    var nome = (cat.categoria || '').trim();
    html += '<tr>' +
      '<td>' + codigo + '</td>' +
      '<td>' + nome + '</td>' +
      '<td><button class="btn btn-primary btn-sm" onclick="selecionarCategoria(\'' + codigo + '\', \'' + nome.replace(/'/g, "\'") + '\')" style="padding:2px 8px;">Selecionar</button></td>' +
    '</tr>';
  });
  html += '</tbody></table></div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
      '<button class="btn btn-outline" onclick="fecharBrowseCategorias()">Fechar</button>' +
    '</div>';
  document.getElementById('modalTitle').textContent = 'Selecionar Categoria';
  modalBody.innerHTML = html;
}
function fecharBrowseCategorias() {
  document.getElementById('modalTitle').textContent = 'Editar Cliente / CT';
  var transactionId = document.getElementById('editTransactionId').value;
  if (transactionId) {
    abrirEdicaoCT(transactionId);
  } else {
    closeModal();
  }
}
function selecionarCategoria(codigo, nome) {
  var campo = document.getElementById('editCategoria');
  if (campo) campo.value = codigo;
  var campoSub = document.getElementById('editSubCategoria');
  if (campoSub) campoSub.value = '';
  fecharBrowseCategorias();
  showToast('Categoria selecionada: ' + codigo + ' - ' + nome);
}
// ============================================================
// FUNCOES AUXILIARES DE TRADUCAO E NORMALIZACAO
// ============================================================
function traduzTipConta(cod) {
  cod = String(cod || '').trim().toUpperCase();
  if (cod === 'C') return 'Conta';
  if (cod === 'T') return 'Titulo';
  if (cod === 'S') return 'Soma';
  return cod;
}
function traduzGruConta(cod) {
  cod = String(cod || '').trim().toUpperCase();
  if (cod === 'R') return 'Receita';
  if (cod === 'D') return 'Debito';
  return cod;
}
function normalizarSubCat(item) {
  return {
    subcategoria: String(item.subcategoria || item.codigo || item.subcat || '').trim(),
    desconta: String(item.desconta || item.descricao || item.plano || item.categoria || '').trim(),
    tipconta: String(item.tipconta || item.tipo || '').trim(),
    gruconta: String(item.gruconta || item.grupo || '').trim(),
    tipconta_desc: item.tipconta_desc || traduzTipConta(item.tipconta || item.tipo || ''),
    gruconta_desc: item.gruconta_desc || traduzGruConta(item.gruconta || item.grupo || '')
  };
}
// ============================================================
// BROWSE DE SUBCATEGORIAS — dados da tabela planocontas
// ============================================================
function abrirBrowseSubCategorias() {
  var categoria = val('editCategoria');
  if (!categoria || !categoria.trim()) {
    showToast('Selecione uma Categoria primeiro', 'error');
    return;
  }
  categoria = categoria.trim();
  if (subCategoriasCache[categoria] && subCategoriasCache[categoria].length > 0) {
    exibirBrowseSubCategorias(subCategoriasCache[categoria], categoria);
    return;
  }
  var rotas = [
    API + '/bancos/planocontas?categoria=' + encodeURIComponent(categoria),
    API + '/bancos/categorias/' + encodeURIComponent(categoria) + '/subcategorias',
    API + '/bancos/subcategorias?categoria=' + encodeURIComponent(categoria),
    API + '/bancos/subcategorias/' + encodeURIComponent(categoria),
    API + '/bancos/subcategorias?cat=' + encodeURIComponent(categoria),
    API + '/bancos/subcategorias?codigo=' + encodeURIComponent(categoria)
  ];
  showToast('Carregando subcategorias...');
  function tentarRota(idx) {
    if (idx >= rotas.length) {
      tentarBuscarTodasPlanoContas(categoria);
      return;
    }
    fetch(rotas[idx])
      .then(function(res) {
        if (!res.ok) throw new Error('status ' + res.status);
        return res.json();
      })
      .then(function(data) {
        if (data && data.length > 0) {
          var normalizado = data.map(function(item) {
            return normalizarSubCat(item);
          });
          var filtradas = normalizado.filter(function(item) {
            return String(item.subcategoria || '').substring(0, 2) === categoria;
          });
          if (filtradas.length === 0) filtradas = normalizado;
          subCategoriasCache[categoria] = filtradas;
          exibirBrowseSubCategorias(filtradas, categoria);
        } else {
          tentarRota(idx + 1);
        }
      })
      .catch(function(err) {
        tentarRota(idx + 1);
      });
  }
  tentarRota(0);
}
function tentarBuscarTodasPlanoContas(categoria) {
  fetch(API + '/bancos/planocontas')
    .then(function(res) {
      if (!res.ok) throw new Error('status ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (!data || data.length === 0) {
        mostrarErroSubCategoria(categoria);
        return;
      }
      var normalizado = data.map(function(item) {
        return normalizarSubCat(item);
      });
      var filtradas = normalizado.filter(function(item) {
        return String(item.subcategoria || '').substring(0, 2) === categoria;
      });
      if (filtradas.length > 0) {
        subCategoriasCache[categoria] = filtradas;
        exibirBrowseSubCategorias(filtradas, categoria);
      } else {
        mostrarErroSubCategoria(categoria);
      }
    })
    .catch(function(err) {
      mostrarErroSubCategoria(categoria);
    });
}
function exibirBrowseSubCategorias(lista, categoriaPai) {
  var modalBody = document.getElementById('modalBody');
  var html = '<div class="form-group" style="margin-bottom:10px;">' +
    '<input type="text" class="form-control" id="filtroSubCatBrowse" placeholder="Filtrar por codigo ou descricao..." oninput="filtrarBrowseSubCategorias()" style="font-size:13px;">' +
  '</div>';
  if (!lista || lista.length === 0) {
    html += '<div style="text-align:center;padding:30px 20px;">' +
      '<p style="color:var(--text-muted);font-size:13px;">' +
        'Nenhuma subcategoria encontrada para a categoria <b>' + categoriaPai + '</b>.<br>' +
        'Verifique se a tabela <b>planocontas</b> possui registros com substr(subcategoria,1,2) = \'' + categoriaPai + '\'.' +
      '</p>' +
    '</div>';
  } else {
    html += '<div style="max-height:45vh;overflow-y:auto;" id="containerBrowseSubCat">';
    html += '<table style="width:100%;font-size:12px;border-collapse:collapse;" id="tabelaBrowseSubCat">';
    html += '<thead><tr style="background:#1a1d29;color:#fff;position:sticky;top:0;">' +
      '<th style="width:40px;">Ord</th>' +
      '<th style="width:70px;">Sub Cat</th>' +
      '<th>Descricao do Plano</th>' +
      '<th style="width:80px;text-align:center;">Tipo</th>' +
      '<th style="width:80px;text-align:center;">Grupo</th>' +
      '<th style="width:60px;">Sel</th>' +
    '</tr></thead><tbody>';
    lista.forEach(function(sub, idx) {
      var codigo    = String(sub.subcategoria || '').trim();
      var descricao = String(sub.desconta || '').trim();
      var tipoDesc  = String(sub.tipconta_desc || traduzTipConta(sub.tipconta) || '').trim();
      var grupoDesc = String(sub.gruconta_desc || traduzGruConta(sub.gruconta) || '').trim();
      var grupoCor = sub.gruconta === 'R' ? 'badge-success' : sub.gruconta === 'D' ? 'badge-danger' : '';
      var grupoHtml = grupoCor ? '<span class="badge ' + grupoCor + '" style="font-size:10px;">' + grupoDesc + '</span>' : grupoDesc;
      html += '<tr data-idx="' + idx + '" style="cursor:pointer;" ' +
        'ondblclick="selecionarSubCategoria(\'' + codigo.replace(/'/g, "\'") + '\', \'' + descricao.replace(/'/g, "\'") + '\')">' +
        '<td style="text-align:center;color:var(--text-muted);">' + (idx + 1) + '</td>' +
        '<td style="font-weight:600;">' + codigo + '</td>' +
        '<td>' + descricao + '</td>' +
        '<td style="text-align:center;font-size:11px;">' + tipoDesc + '</td>' +
        '<td style="text-align:center;">' + grupoHtml + '</td>' +
        '<td style="text-align:center;">' +
          '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();selecionarSubCategoria(\'' +
            codigo.replace(/'/g, "\'") + '\', \'' + descricao.replace(/'/g, "\'") + '\')" ' +
            'style="padding:2px 8px;font-size:10px;">OK</button>' +
        '</td>' +
      '</tr>';
    });
    html += '</tbody></table></div>';
  }
  html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
    '<button class="btn btn-outline" onclick="fecharBrowseSubCategorias()">Voltar</button>' +
  '</div>';
  document.getElementById('modalTitle').textContent = 'Subcategorias — Cat: ' + categoriaPai + ' (' + (lista ? lista.length : 0) + ' regs)';
  modalBody.innerHTML = html;
  setTimeout(function() {
    var inp = document.getElementById('filtroSubCatBrowse');
    if (inp) inp.focus();
  }, 100);
}
function filtrarBrowseSubCategorias() {
  var filtro = (document.getElementById('filtroSubCatBrowse').value || '').toUpperCase().trim();
  var tbody = document.querySelector('#tabelaBrowseSubCat tbody');
  if (!tbody) return;
  var linhas = tbody.querySelectorAll('tr');
  linhas.forEach(function(tr) {
    var texto = tr.textContent.toUpperCase();
    if (!filtro || texto.indexOf(filtro) >= 0) {
      tr.style.display = '';
    } else {
      tr.style.display = 'none';
    }
  });
}
function fecharBrowseSubCategorias() {
  document.getElementById('modalTitle').textContent = 'Editar Cliente / CT';
  var transactionId = document.getElementById('editTransactionId').value;
  if (transactionId) {
    abrirEdicaoCT(transactionId);
  } else {
    closeModal();
  }
}
function selecionarSubCategoria(codigo, descricao) {
  var campo = document.getElementById('editSubCategoria');
  if (campo) campo.value = codigo;
  var transactionId = document.getElementById('editTransactionId').value;
  for (var i = 0; i < dadosExibidosCT.length; i++) {
    if (dadosExibidosCT[i].transactionId === transactionId) {
      dadosExibidosCT[i].desc_subcategoria = descricao;
      break;
    }
  }
  fecharBrowseSubCategorias();
  showToast('Subcategoria selecionada: ' + codigo + ' - ' + descricao);
}
function mostrarErroSubCategoria(categoria) {
  var modalBody = document.getElementById('modalBody');
  var html = '<div style="text-align:center;padding:20px;">' +
    '<div style="font-size:48px;margin-bottom:10px;">🔍</div>' +
    '<h3 style="color:var(--text-muted);margin-bottom:8px;">Subcategorias nao encontradas</h3>' +
    '<p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">' +
      'Nao foi possivel carregar subcategorias para a categoria <b>' + categoria + '</b>.<br>' +
      'Verifique se o backend possui a rota <code>/api/bancos/planocontas?categoria=' + categoria + '</code>' +
    '</p>' +
    '<div style="background:#1a1d29;border-radius:6px;padding:12px;text-align:left;font-size:11px;color:#a0c4e8;margin-bottom:16px;">' +
      '<b>O que verificar:</b><br>' +
      '1. O endpoint <code>/api/bancos/planocontas</code> existe no backend?<br>' +
      '2. A tabela <b>planocontas</b> tem registros com substr(subcategoria,1,2) = \'' + categoria + '\'?<br>' +
      '3. SQL de teste:<br>' +
      '<code style="display:block;margin-top:4px;padding:8px;background:#0d1f33;border-radius:4px;font-size:10px;">' +
        'SELECT subcategoria, desconta, tipconta, gruconta FROM planocontas WHERE sql_deleted &lt;&gt; \'T\' AND substr(subcategoria,1,2) = \'' + categoria + '\' ORDER BY subcategoria' +
      '</code>' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:center;">' +
      '<button class="btn btn-outline" onclick="fecharBrowseSubCategorias()">Voltar</button>' +
    '</div>' +
  '</div>';
  document.getElementById('modalTitle').textContent = 'Subcategoria — Nao Encontrada';
  modalBody.innerHTML = html;
}
// ============================================================
// SALVAR EDICAO
// ============================================================
async function salvarEdicaoCT() {
  var transactionId = document.getElementById('editTransactionId').value;
  if (!transactionId) {
    showToast('ID da transacao nao encontrado', 'error');
    return;
  }
  var cpfcnpj = document.getElementById('editCpfCnpj').value.trim();
  var beneficiario = document.getElementById('editNome').value.trim();
  var categoria = document.getElementById('editCategoria').value.trim();
  var subcategoria = document.getElementById('editSubCategoria').value.trim();
  var competencia = document.getElementById('editCompetencia').value.trim();
  if (cpfcnpj && cpfcnpj.length > 14) {
    showToast('CNPJ/CPF deve ter no maximo 14 caracteres', 'error');
    return;
  }
  if (categoria) {
    if (categoria.length !== 2) {
      showToast('Categoria deve ter exatamente 2 caracteres', 'error');
      return;
    }
    if (categoriasDisponivel && categoriasCache) {
      var existe = categoriasCache.some(function(c) {
        return (c.codigo || '').trim() === categoria;
      });
      if (!existe) {
        showToast('Categoria "' + categoria + '" nao encontrada na tabela', 'error');
        return;
      }
    }
  }
  if (subcategoria && subcategoria.length > 4) {
    showToast('Subcategoria deve ter no maximo 4 caracteres', 'error');
    return;
  }
  if (competencia && competencia.length > 5) {
    showToast('Competencia deve ter no maximo 5 caracteres', 'error');
    return;
  }
  var dadosAtualizados = {
    transactionId: transactionId,
    cpfcnpj: cpfcnpj,
    beneficiario: beneficiario,
    cli_categoria: categoria,
    cli_subcategoria: subcategoria,
    competencia: competencia
  };
  var encontrado = false;
  for (var i = 0; i < dadosExibidosCT.length; i++) {
    if (dadosExibidosCT[i].transactionId === transactionId) {
      dadosExibidosCT[i].cpfcnpj = dadosAtualizados.cpfcnpj;
      dadosExibidosCT[i].beneficiario = dadosAtualizados.beneficiario;
      dadosExibidosCT[i].cli_categoria = dadosAtualizados.cli_categoria;
      dadosExibidosCT[i].cli_subcategoria = dadosAtualizados.cli_subcategoria;
      dadosExibidosCT[i].competencia = dadosAtualizados.competencia;
      encontrado = true;
      break;
    }
  }
  if (!encontrado) {
    showToast('Registro nao encontrado na lista atual', 'error');
    return;
  }
  try {
    var savedData = [];
    var saved = localStorage.getItem('alteracoesCT');
    if (saved) {
      savedData = JSON.parse(saved);
    }
    savedData = savedData.filter(function(item) {
      return item.transactionId !== transactionId;
    });
    savedData.push(dadosAtualizados);
    localStorage.setItem('alteracoesCT', JSON.stringify(savedData));
  } catch (e) {
    showToast('Erro ao salvar localmente', 'error');
    return;
  }
  renderExtratoCTFiltrado(dadosExibidosCT);
  closeModal();
  showToast('Dados atualizados localmente!');
}
// ============================================================
// LIMPAR FILTRO
// ============================================================
function limparBuscaCT() {
  if (dadosOriginaisCT && dadosOriginaisCT.length > 0) {
    dadosExibidosCT = dadosOriginaisCT.slice();
    renderExtratoCTFiltrado(dadosExibidosCT);
    showToast('Filtro removido - ' + dadosOriginaisCT.length + ' registros');
  }
  closeModal();
}
// ============================================================
// IMPORT / API / CONCILIACAO / RELATORIOS / MOTIVOS
// ============================================================
function openImportModal() {
  document.getElementById('modalTitle').textContent = 'Importar Extrato (CSV)';
  document.getElementById('modalBody').innerHTML =
    '<div class="form-group"><label>Arquivo CSV</label><input type="file" class="form-control" id="csvFile" accept=".csv,.txt"></div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Banco</label><input type="text" class="form-control" id="csvBanco" placeholder="077"></div>' +
      '<div class="form-group"><label>Agencia</label><input type="text" class="form-control" id="csvAgencia"></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="uploadCSV()">Importar</button>' +
    '</div>';
  document.getElementById('modalOverlay').style.display = 'flex';
}
async function uploadCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) { showToast('Selecione um arquivo', 'error'); return; }
  const formData = new FormData();
  formData.append('arquivo', file);
  formData.append('banco', val('csvBanco'));
  formData.append('agencia', val('csvAgencia'));
  try {
    const res = await fetch(API + '/bancos/extratos/importar', { method: 'POST', body: formData });
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const data = await safeJson(res);
    if (data.success) {
      showToast('Importados: ' + data.importados + ' | Duplicados: ' + data.duplicados + ' | Erros: ' + data.erros);
      closeModal();
    } else {
      showToast('Erro: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
function openApiModal() {
  document.getElementById('modalTitle').textContent = 'Baixar via API';
  document.getElementById('modalBody').innerHTML =
    '<div class="form-row">' +
      '<div class="form-group"><label>Banco</label><input type="text" class="form-control" id="apiBanco" placeholder="077 ou 756"></div>' +
      '<div class="form-group"><label>Agencia</label><input type="text" class="form-control" id="apiAgencia"></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Conta</label><input type="text" class="form-control" id="apiConta"></div>' +
      '<div class="form-group"><label>Periodo</label><div style="display:flex;gap:8px;"><input type="date" class="form-control" id="apiDataIni"><input type="date" class="form-control" id="apiDataFim"></div></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="downloadExtratoApi()">Baixar</button>' +
    '</div>';
  document.getElementById('modalOverlay').style.display = 'flex';
}
async function downloadExtratoApi() {
  const banco = val('apiBanco');
  const data = {
    contaBanco: banco, contaAgencia: val('apiAgencia'),
    contaCorrente: val('apiConta'), dataInicial: val('apiDataIni'), dataFinal: val('apiDataFim')
  };
  const endpoint = banco === '077' ? 'banco-inter' : banco === '756' ? 'sicoob' : '';
  if (!endpoint) { showToast('Banco nao suportado', 'error'); return; }
  try {
    const res = await fetch(API + '/bancos/extratos/' + endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const result = await safeJson(res);
    if (result.success) {
      showToast(result.importados + ' transacoes importadas!'); closeModal();
    } else {
      showToast('Erro: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
async function runConciliacao() {
  const data = {
    banco: val('concBanco'), agencia: val('concAgencia'), conta: val('concConta'),
    dataInicial: val('concDataIni'), dataFinal: val('concDataFim')
  };
  try {
    const res = await fetch(API + '/bancos/conciliacao/automatica', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const result = await safeJson(res);
    if (result.success) {
      document.getElementById('conciliacaoResultado').innerHTML =
        '<div class="stats-grid">' +
          '<div class="stat-card"><div class="stat-label">Processado</div><div class="stat-value">' + result.totalProcessado + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Conciliados</div><div class="stat-value positive">' + result.conciliados + '</div></div>' +
          '<div class="stat-card"><div class="stat-label">Nao Encontrados</div><div class="stat-value negative">' + result.naoEncontrados + '</div></div>' +
        '</div>';
      showToast('Conciliacao: ' + result.conciliados + ' de ' + result.totalProcessado);
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
async function loadRelatorioTrimestral() {
  const ano = val('anoRelatorio');
  try {
    const res = await fetch(API + '/bancos/relatorios/trimestral?ano=' + ano);
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const data = await safeJson(res);
    const container = document.getElementById('relatorioContainer');
    if (!data.dados || data.dados.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">Sem dados</p>';
      return;
    }
    let html = '<table><thead><tr>' +
      '<th>Ord</th><th>Categoria</th>' +
      '<th style="text-align:right">1 Tri</th><th style="text-align:right">2 Tri</th>' +
      '<th style="text-align:right">3 Tri</th><th style="text-align:right">4 Tri</th>' +
      '<th style="text-align:right">Total</th>' +
    '</tr></thead><tbody>';
    data.dados.forEach((d, i) => {
      html += '<tr>' +
        '<td>' + (i + 1) + '</td>' +
        '<td>' + (d.categoria_desc || '') + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri1) + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri2) + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri3) + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri4) + '</td>' +
        '<td style="text-align:right;font-weight:700">' + formatMoney(d.total) + '</td>' +
      '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}


async function loadRelatorioTrimestral() {
  const ano = val('anoRelatorio');
  const tipoEl = document.getElementById('relTipoFilter');
  const tipo = tipoEl ? tipoEl.value : 'todos';
  
  const params = new URLSearchParams();
  params.append('ano', ano);
  if (tipo && tipo !== 'todos') params.append('tipo', tipo);
  
  try {
    const res = await fetch(API + '/bancos/relatorios/trimestral?' + params.toString());
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const data = await safeJson(res);
    const container = document.getElementById('relatorioContainer');
    
    let html = '<div class="relatorio-toolbar" style="display:flex;gap:8px;margin-bottom:15px;align-items:center;flex-wrap:wrap;">' +
      '<label style="font-weight:bold;font-size:13px;">Tipo:</label>' +
      '<select id="relTipoFilter" onchange="loadRelatorioTrimestral()" style="padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:13px;">' +
        '<option value="todos"' + (tipo === 'todos' ? ' selected' : '') + '>Todos</option>' +
        '<option value="D"' + (tipo === 'D' ? ' selected' : '') + '>Debito</option>' +
        '<option value="C"' + (tipo === 'C' ? ' selected' : '') + '>Credito</option>' +
      '</select>' +
      '<button class="mapa-btn" onclick="imprimirRelatorio()" style="padding:6px 12px;cursor:pointer;">Imprimir</button>' +
      '<button class="mapa-btn" onclick="exportarRelatorio()" style="padding:6px 12px;cursor:pointer;">Exportar Excel</button>' +
    '</div>';
    
    if (!data.dados || data.dados.length === 0) {
      html += '<p style="text-align:center;color:var(--text-muted);padding:40px;">Sem dados para ' + ano + '</p>';
      container.innerHTML = html;
      return;
    }
    
    const totais = data.totais || { tri1: 0, tri2: 0, tri3: 0, tri4: 0, total: 0 };
    
    html += '<table class="mapa-table" id="tabelaRelatorio"><thead><tr>' +
      '<th style="cursor:pointer;user-select:none;" onclick="ordenarRelatorio(0)">Ord</th>' +
      '<th style="cursor:pointer;user-select:none;" onclick="ordenarRelatorio(1)">Categoria</th>' +
      '<th style="cursor:pointer;user-select:none;text-align:right" onclick="ordenarRelatorio(2)">1 Tri</th>' +
      '<th style="cursor:pointer;user-select:none;text-align:right" onclick="ordenarRelatorio(3)">2 Tri</th>' +
      '<th style="cursor:pointer;user-select:none;text-align:right" onclick="ordenarRelatorio(4)">3 Tri</th>' +
      '<th style="cursor:pointer;user-select:none;text-align:right" onclick="ordenarRelatorio(5)">4 Tri</th>' +
      '<th style="cursor:pointer;user-select:none;text-align:right" onclick="ordenarRelatorio(6)">Total</th>' +
    '</tr></thead><tbody id="relatorioBody">';
    
    data.dados.forEach((d) => {
      html += '<tr>' +
        '<td style="text-align:center">' + (d.cod || '') + '</td>' +
        '<td>' + (d.desc || '') + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri1) + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri2) + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri3) + '</td>' +
        '<td style="text-align:right">' + formatMoney(d.tri4) + '</td>' +
        '<td style="text-align:right;font-weight:700">' + formatMoney(d.total) + '</td>' +
      '</tr>';
    });
    
    html += '<tr style="font-weight:700;background:#34495e;color:white;">' +
      '<td colspan="2" style="text-align:right">TOTAL GERAL - ' + ano + '</td>' +
      '<td style="text-align:right">' + formatMoney(totais.tri1) + '</td>' +
      '<td style="text-align:right">' + formatMoney(totais.tri2) + '</td>' +
      '<td style="text-align:right">' + formatMoney(totais.tri3) + '</td>' +
      '<td style="text-align:right">' + formatMoney(totais.tri4) + '</td>' +
      '<td style="text-align:right">' + formatMoney(totais.total) + '</td>' +
    '</tr>';
    
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

// Variaveis de ordenacao do relatorio
var ordemAscRel = true;
var colunaOrdenadaRel = -1;

function ordenarRelatorio(col) {
  var tbody = document.getElementById('relatorioBody');
  if (!tbody) return;
  
  // Pega todas as linhas exceto a ultima (total geral)
  var linhas = Array.from(tbody.querySelectorAll('tr'));
  var linhaTotal = linhas.pop();
  
  if (linhas.length === 0) return;
  
  ordemAscRel = (col === colunaOrdenadaRel) ? !ordemAscRel : true;
  colunaOrdenadaRel = col;
  
  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();
    
    // Colunas numericas (2 a 6)
    if (col >= 2 && col <= 6) {
      var na = parseFloat(va.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      return ordemAscRel ? na - nb : nb - na;
    }
    
    // Coluna 0 (Ord) - numerico
    if (col === 0) {
      return ordemAscRel ? va.localeCompare(vb, undefined, { numeric: true }) : vb.localeCompare(va, undefined, { numeric: true });
    }
    
    // Coluna 1 (Categoria) - texto
    return ordemAscRel ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  
  // Reinsere as linhas ordenadas + linha de total
  linhas.forEach(function(l) { tbody.appendChild(l); });
  tbody.appendChild(linhaTotal);
}

function imprimirRelatorio() {
  window.print();
}

function exportarRelatorio() {
  const ano = val('anoRelatorio') || '';
  const tipoEl = document.getElementById('relTipoFilter');
  const tipo = tipoEl ? tipoEl.value : 'todos';
  window.location.href = API + '/bancos/relatorios/trimestral/exportar?ano=' + encodeURIComponent(ano) + '&tipo=' + encodeURIComponent(tipo);
}



function imprimirRelatorio() {
  window.print();
}

function exportarRelatorio() {
  const ano = val('anoRelatorio') || '';
  const tipoEl = document.getElementById('relTipoFilter');
  const tipo = tipoEl ? tipoEl.value : 'todos';
  window.location.href = API + '/bancos/relatorios/trimestral/exportar?ano=' + encodeURIComponent(ano) + '&tipo=' + encodeURIComponent(tipo);
}

function imprimirRelatorio() {
  window.print();
}

function exportarRelatorio() {
  const ano = val('anoRelatorio') || '';
  const tipoEl = document.getElementById('relTipoFilter');
  const tipo = tipoEl ? tipoEl.value : 'todos';
  window.location.href = API + '/bancos/relatorios/trimestral/exportar?ano=' + encodeURIComponent(ano) + '&tipo=' + encodeURIComponent(tipo);
}





function imprimirRelatorio() {
  window.print();
}

function exportarRelatorio() {
  const ano = val('anoRelatorio') || '';
  const tipoEl = document.getElementById('relTipoFilter');
  const tipo = tipoEl ? tipoEl.value : 'todos';
  window.location.href = API + '/bancos/relatorios/trimestral/exportar?ano=' + encodeURIComponent(ano) + '&tipo=' + encodeURIComponent(tipo);
}


async function loadRelatorioMensal() {
  const ano = val('anoRelatorio');
  const tipoEl = document.getElementById('relTipoFilterMensal');
  const tipo = tipoEl ? tipoEl.value : 'todos';

  const params = new URLSearchParams();
  params.append('ano', ano);
  if (tipo && tipo !== 'todos') params.append('tipo', tipo);

  try {
    const res = await fetch(API + '/bancos/relatorios/mensal?' + params.toString());
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const data = await safeJson(res);
    const container = document.getElementById('relatorioContainer');

    let html = '<h2 style="margin:0 0 15px 0;color:var(--text-primary);">Resumo Mensal por Beneficiario - ' + ano + '</h2>';

    html += '<div class="relatorio-toolbar" style="display:flex;gap:8px;margin-bottom:15px;align-items:center;flex-wrap:wrap;">' +
      '<label style="font-weight:bold;font-size:13px;">Tipo:</label>' +
      '<select id="relTipoFilterMensal" onchange="loadRelatorioMensal()" style="padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:13px;">' +
        '<option value="todos"' + (tipo === 'todos' ? ' selected' : '') + '>Todos</option>' +
        '<option value="D"' + (tipo === 'D' ? ' selected' : '') + '>Debito</option>' +
        '<option value="C"' + (tipo === 'C' ? ' selected' : '') + '>Credito</option>' +
      '</select>' +
      '<button class="mapa-btn" onclick="imprimirRelatorio()" style="padding:7px 16px;cursor:pointer;background:#27ae60;color:white;border:none;border-radius:5px;font-size:13px;font-weight:bold;">Imprimir</button>' +
      '<button class="mapa-btn" onclick="exportarRelatorioMensal()" style="padding:7px 16px;cursor:pointer;background:#2980b9;color:white;border:none;border-radius:5px;font-size:13px;font-weight:bold;">Exportar Excel</button>' +
    '</div>';

    if (!data.dados || data.dados.length === 0) {
      html += '<p style="text-align:center;color:var(--text-muted);padding:40px;">Sem dados para ' + ano + '</p>';
      container.innerHTML = html;
      return;
    }

    const t = data.totais || {};
    const meses = [
      { key: 'jan', label: 'Jan' }, { key: 'fev', label: 'Fev' },
      { key: 'mar', label: 'Mar' }, { key: 'abr', label: 'Abr' },
      { key: 'mai', label: 'Mai' }, { key: 'jun', label: 'Jun' },
      { key: 'jul', label: 'Jul' }, { key: 'ago', label: 'Ago' },
      { key: 'set', label: 'Set' }, { key: 'out', label: 'Out' },
      { key: 'nov', label: 'Nov' }, { key: 'dez', label: 'Dez' }
    ];

    html += '<table class="mapa-table" id="tabelaRelatorio" style="font-size:12px;"><thead><tr>' +
      '<th style="cursor:pointer;user-select:none;" onclick="ordenarRelatorioMensal(0)">Beneficiario</th>';
    meses.forEach((m, i) => {
      html += '<th style="cursor:pointer;user-select:none;text-align:right" onclick="ordenarRelatorioMensal(' + (i + 1) + ')">' + m.label + '</th>';
    });
    html += '<th style="cursor:pointer;user-select:none;text-align:right" onclick="ordenarRelatorioMensal(13)">Total</th>';
    html += '</tr></thead><tbody id="relatorioBody">';

    data.dados.forEach(d => {
      html += '<tr><td>' + (d.nome || '') + '</td>';
      meses.forEach(m => {
        html += '<td style="text-align:right">' + formatMoney(d[m.key]) + '</td>';
      });
      html += '<td style="text-align:right;font-weight:700">' + formatMoney(d.total) + '</td></tr>';
    });

    // TOTAL GERAL
    html += '<tr style="font-weight:700;background:#34495e;color:white;">' +
      '<td>TOTAL GERAL - ' + ano + '</td>';
    meses.forEach(m => {
      html += '<td style="text-align:right">' + formatMoney(t[m.key] || 0) + '</td>';
    });
    html += '<td style="text-align:right">' + formatMoney(t.total || 0) + '</td>';
    html += '</tr></tbody></table>';
    container.innerHTML = html;
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}

var ordemAscRelMensal = true;
var colunaOrdenadaRelMensal = -1;

function ordenarRelatorioMensal(col) {
  var tbody = document.getElementById('relatorioBody');
  if (!tbody) return;
  var linhas = Array.from(tbody.querySelectorAll('tr'));
  var linhaTotal = linhas.pop();
  if (linhas.length === 0) return;
  ordemAscRelMensal = (col === colunaOrdenadaRelMensal) ? !ordemAscRelMensal : true;
  colunaOrdenadaRelMensal = col;
  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();
    if (col === 0) {
      return ordemAscRelMensal ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    var na = parseFloat(va.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
    var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
    return ordemAscRelMensal ? na - nb : nb - na;
  });
  linhas.forEach(function(l) { tbody.appendChild(l); });
  tbody.appendChild(linhaTotal);
}

function exportarRelatorioMensal() {
  const ano = val('anoRelatorio') || '';
  const tipoEl = document.getElementById('relTipoFilterMensal');
  const tipo = tipoEl ? tipoEl.value : 'todos';
  window.location.href = API + '/bancos/relatorios/mensal/exportar?ano=' + encodeURIComponent(ano) + '&tipo=' + encodeURIComponent(tipo);
}





var ordemAscRelMensal = true;
var colunaOrdenadaRelMensal = -1;

function ordenarRelatorioMensal(col) {
  var tbody = document.getElementById('relatorioBody');
  if (!tbody) return;

  var linhas = Array.from(tbody.querySelectorAll('tr'));
  var linhaTotal = linhas.pop();
  if (linhas.length === 0) return;

  ordemAscRelMensal = (col === colunaOrdenadaRelMensal) ? !ordemAscRelMensal : true;
  colunaOrdenadaRelMensal = col;

  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();

    // Coluna 0 (Beneficiario) - texto
    if (col === 0) {
      return ordemAscRelMensal ? va.localeCompare(vb) : vb.localeCompare(va);
    }

    // Colunas numericas (1 a 13)
    var na = parseFloat(va.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
    var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
    return ordemAscRelMensal ? na - nb : nb - na;
  });

  linhas.forEach(function(l) { tbody.appendChild(l); });
  tbody.appendChild(linhaTotal);
}

function exportarRelatorioMensal() {
  const ano = val('anoRelatorio') || '';
  const tipoEl = document.getElementById('relTipoFilterMensal');
  const tipo = tipoEl ? tipoEl.value : 'todos';
  window.location.href = API + '/bancos/relatorios/mensal/exportar?ano=' + encodeURIComponent(ano) + '&tipo=' + encodeURIComponent(tipo);
}



async function loadMotivos() {
  try {
    const res = await fetch(API + '/bancos/motivos-devolucao');
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    const data = await safeJson(res);
    const tbody = document.getElementById('motivosTableBody');
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">Nenhum motivo</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(m =>
      '<tr>' +
        '<td>' + m.motivo + '</td>' +
        '<td>' + (m.classifica || '') + '</td>' +
        '<td>' + (m.descricao || '') + '</td>' +
      '</tr>'
    ).join('');
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
function openModalMotivo() {
  document.getElementById('modalTitle').textContent = 'Novo Motivo';
  document.getElementById('modalBody').innerHTML =
    '<div class="form-group"><label>Motivo</label><input type="text" class="form-control" id="mtMotivo"></div>' +
    '<div class="form-group"><label>Classificacao</label><input type="text" class="form-control" id="mtClassifica"></div>' +
    '<div class="form-group"><label>Descricao</label><input type="text" class="form-control" id="mtDescricao"></div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="saveMotivo()">Salvar</button>' +
    '</div>';
  document.getElementById('modalOverlay').style.display = 'flex';
}
async function saveMotivo() {
  const data = { motivo: val('mtMotivo'), classifica: val('mtClassifica'), descricao: val('mtDescricao') };
  try {
    await fetch(API + '/bancos/motivos-devolucao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    showToast('Motivo cadastrado!'); closeModal(); await loadMotivos();
  } catch (err) {
    showToast('Erro', 'error');
  }
}
// ============================================================
// CATEGORIAS — ABA 5 (com subcategorias e fallback)
// ============================================================
var aCats = [];
var lExpandidaGlobal = false;
async function loadCategorias() {
  try {
    var res = await fetch(API + '/bancos/categorias');
    if (!res.ok) { showToast('Erro HTTP ' + res.status, 'error'); return; }
    var data = await safeJson(res);
    if (!data || data.length === 0) {
      document.getElementById('categoriaTableBody').innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Nenhuma categoria</td></tr>';
      return;
    }
    aCats = [];
    for (var i = 0; i < data.length; i++) {
      aCats.push({
        codigo: String(data[i].codigo || '').trim(),
        nome: String(data[i].categoria || '').trim().toUpperCase(),
        expandida: false,
        subcategorias: null
      });
    }
    lExpandidaGlobal = false;
    renderCategorias();
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
// ============================================================
// montaArraySubCat — COM FALLBACK DE MULTIPLAS ROTAS
// ============================================================
async function montaArraySubCat(codigoCat) {
  // 1) Tenta cache
  if (subCategoriasCache[codigoCat] && subCategoriasCache[codigoCat].length > 0) {
    return subCategoriasCache[codigoCat];
  }
  // 2) Tenta múltiplas rotas
  var rotas = [
    API + '/bancos/planocontas?categoria=' + encodeURIComponent(codigoCat),
    API + '/bancos/categorias/' + encodeURIComponent(codigoCat) + '/subcategorias',
    API + '/bancos/subcategorias?categoria=' + encodeURIComponent(codigoCat),
    API + '/bancos/subcategorias/' + encodeURIComponent(codigoCat)
  ];
  for (var i = 0; i < rotas.length; i++) {
    try {
      var res = await fetch(rotas[i]);
      if (!res.ok) continue;
      var data = await safeJson(res);
      if (data && data.length > 0) {
        var normalizado = data.map(function(item) {
          return normalizarSubCat(item);
        });
        var filtradas = normalizado.filter(function(item) {
          return String(item.subcategoria || '').substring(0, 2) === codigoCat;
        });
        if (filtradas.length === 0) filtradas = normalizado;
        subCategoriasCache[codigoCat] = filtradas;
        return filtradas;
      }
    } catch (e) {
      // continua para próxima rota
    }
  }
  // 3) Último recurso: busca todas e filtra local
  try {
    var resAll = await fetch(API + '/bancos/planocontas');
    if (resAll.ok) {
      var dataAll = await safeJson(resAll);
      if (dataAll && dataAll.length > 0) {
        var normAll = dataAll.map(function(item) {
          return normalizarSubCat(item);
        });
        var filtradasAll = normAll.filter(function(item) {
          return String(item.subcategoria || '').substring(0, 2) === codigoCat;
        });
        subCategoriasCache[codigoCat] = filtradasAll;
        return filtradasAll;
      }
    }
  } catch (e) {
    // sem opções
  }
  return [];
}
// ============================================================
// renderCategorias — COM 5 COLUNAS (Tipo e Grupo)
// ============================================================
function renderCategorias() {
  var tbody = document.getElementById('categoriaTableBody');
  var html = '';
  for (var i = 0; i < aCats.length; i++) {
    var cat = aCats[i];
    var seta = cat.expandida ? '\u25BC' : '\u25B6';
    var bgCat = cat.expandida ? 'background:#1a3a5c;color:#fff;' : '';
    var bgSub = 'background:#0d1f33;color:#a0c4e8;';
    html += '<tr style="' + bgCat + 'cursor:pointer;" onclick="clickNaSeta(' + i + ')">' +
      '<td style="text-align:center;font-weight:bold;font-size:14px;">' + seta + '</td>' +
      '<td>' + cat.codigo + '</td>' +
      '<td style="font-weight:600;">' + cat.nome + '</td>' +
      '<td></td>' +
      '<td></td>' +
      '</tr>';
    if (cat.expandida && cat.subcategorias && cat.subcategorias.length > 0) {
      for (var s = 0; s < cat.subcategorias.length; s++) {
        var sub = cat.subcategorias[s];
        var subCod  = String(sub.subcategoria || sub.codigo || '').trim();
        var subDesc = String(sub.desconta || sub.descricao || sub.categoria || '').trim();
        var subTipo = String(sub.tipconta_desc || traduzTipConta(sub.tipconta) || '').trim();
        var subGrup = String(sub.gruconta_desc || traduzGruConta(sub.gruconta) || '').trim();
        var grupoCor = sub.gruconta === 'R' ? 'badge-success' : sub.gruconta === 'D' ? 'badge-danger' : '';
        var grupoHtml = grupoCor ? '<span class="badge ' + grupoCor + '" style="font-size:10px;">' + subGrup + '</span>' : subGrup;
        html += '<tr style="' + bgSub + '">' +
          '<td></td>' +
          '<td style="padding-left:20px;font-size:11px;font-weight:600;">' + subCod + '</td>' +
          '<td style="padding-left:20px;font-size:11px;">' + subDesc + '</td>' +
          '<td style="text-align:center;font-size:11px;">' + subTipo + '</td>' +
          '<td style="text-align:center;">' + grupoHtml + '</td>' +
          '</tr>';
      }
    } else if (cat.expandida && (!cat.subcategorias || cat.subcategorias.length === 0)) {
      html += '<tr style="' + bgSub + '">' +
        '<td></td><td></td>' +
        '<td style="padding-left:20px;font-size:11px;color:var(--text-muted);">— sem subcategorias —</td>' +
        '<td></td><td></td>' +
        '</tr>';
    }
  }
  if (!html) {
    html = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Nenhuma categoria</td></tr>';
  }
  tbody.innerHTML = html;
}
async function clickNaSeta(idx) {
  var cat = aCats[idx];
  if (!cat) return;
  if (!cat.expandida && !cat.subcategorias) {
    cat.subcategorias = await montaArraySubCat(cat.codigo);
  }
  cat.expandida = !cat.expandida;
  renderCategorias();
}
async function toggleAllCategorias() {
  lExpandidaGlobal = !lExpandidaGlobal;
  if (lExpandidaGlobal) {
    for (var i = 0; i < aCats.length; i++) {
      if (!aCats[i].subcategorias) {
        aCats[i].subcategorias = await montaArraySubCat(aCats[i].codigo);
      }
      aCats[i].expandida = true;
    }
  } else {
    for (var j = 0; j < aCats.length; j++) {
      aCats[j].expandida = false;
    }
  }
  renderCategorias();
  showToast(lExpandidaGlobal ? 'Subcategorias exibidas' : 'Subcategorias ocultas');
}
function openModalCategoria() {
  document.getElementById('modalTitle').textContent = 'Nova Categoria';
  document.getElementById('modalBody').innerHTML =
    '<div class="form-row">' +
      '<div class="form-group"><label>Codigo <span style="font-size:11px;color:var(--text-muted);">(maximo 2 caracteres)</span></label><input type="text" class="form-control" id="catCodigo" maxlength="2"></div>' +
      '<div class="form-group"><label>Categoria <span style="font-size:11px;color:var(--text-muted);">(maximo 40 caracteres)</span></label><input type="text" class="form-control" id="catNome" maxlength="40"></div>' +
    '</div>' +
    '<div class="form-group" style="margin-top:8px;"><label>Plano de Contas (subcategoria) <span style="font-size:11px;color:var(--text-muted);">(opcional)</span></label>' +
      '<input type="text" class="form-control" id="catPlanoContas" placeholder="Opcional">' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="saveCategoria()">Salvar</button>' +
    '</div>';
  document.getElementById('modalOverlay').style.display = 'flex';
}
async function saveCategoria() {
  var data = { codigo: val('catCodigo'), categoria: val('catNome'), planoContas: val('catPlanoContas') };
  try {
    var res = await fetch(API + '/bancos/categorias', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    if (res.ok) {
      showToast('Categoria salva!'); closeModal(); await loadCategorias();
    } else {
      var err = await safeJson(res);
      showToast('Erro: ' + (err.error || 'desconhecido'), 'error');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
async function deleteCategoria(codigo) {
  if (!confirm('Excluir categoria ' + codigo + '?')) return;
  try {
    var res = await fetch(API + '/bancos/categorias/' + encodeURIComponent(codigo), { method: 'DELETE' });
    if (res.ok) {
      showToast('Categoria excluida'); await loadCategorias();
    } else {
      showToast('Erro ao excluir', 'error');
    }
  } catch (err) {
    showToast('Erro: ' + err.message, 'error');
  }
}
function exportarCategoriasExcel() {
  var rows = [];
  for (var i = 0; i < aCats.length; i++) {
    var cat = aCats[i];
    rows.push({ Codigo: cat.codigo, Categoria: cat.nome, Tipo: 'Principal' });
    if (cat.expandida && cat.subcategorias) {
      for (var s = 0; s < cat.subcategorias.length; s++) {
        var sub = cat.subcategorias[s];
        rows.push({ Codigo: sub.subcategoria || sub.codigo || '', Categoria: sub.desconta || sub.descricao || sub.categoria || '', Tipo: 'Subcategoria' });
      }
    }
  }
  if (rows.length === 0) { showToast('Nada para exportar', 'error'); return; }
  var headers = Object.keys(rows[0]);
  var csvLines = [headers.join(';')];
  for (var r = 0; r < rows.length; r++) {
    var line = [];
    for (var h = 0; h < headers.length; h++) {
      line.push('"' + (rows[r][headers[h]] || '') + '"');
    }
    csvLines.push(line.join(';'));
  }
  var csv = csvLines.join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'Categorias.csv';
  link.click();
  showToast('Exportado!');
}
// ============================================================
// FUNCOES UTILITARIAS
// ============================================================
function val(id) {
  return document.getElementById(id) ? document.getElementById(id).value : '';
}
function formatMoney(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR');
}
function showToast(msg, type) {
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}
// ============================================================
// BUSCA GERAL CT
// ============================================================
function abrirBuscaGeralCT() {
  if (dadosOriginaisCT === null || dadosOriginaisCT.length === 0) {
    showToast('Carregue os extratos primeiro', 'error');
    return;
  }
  document.getElementById('modalTitle').textContent = 'Busca Geral';
  document.getElementById('modalBody').innerHTML =
    '<div class="form-group">' +
      '<label>Digite a busca (use ; para multiplas palavras)</label>' +
      '<input type="text" class="form-control" id="buscaGeralInput" placeholder="Ex: SAMUEL; AEDU  ou  01/01/2025..25/01/2025;nome:MARIA;PIX;-TED" style="font-size:14px;">' +
    '</div>' +
    '<div style="margin-top:8px;padding:10px;background:#1a1d29;border-radius:6px;font-size:12px;color:#a0c4e8;">' +
      '<b>Como usar:</b><br>' +
      '- Use ; para multiplas palavras<br>' +
      '- Excluir: -AEDU<br>' +
      '- Periodo: 01/01/2025..25/01/2025<br>' +
      '- Valores: 100..500<br>' +
      '- Operadores: >10  <100  >=10  <=100<br>' +
      '- Por campo: nome:MARIA  banco:756  cpf:25606<br>' +
      '- Campos: nome, cpf, categoria, descategoria, subcategoria, dessubcategoria, banco, dc, cp, comp<br>' +
      '- PAGO ou ABERTO (filtra por competencia)<br>' +
      '- Combina: 01/01/2025..25/01/2025;nome:MARIA;PIX;-TED' +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
      '<button class="btn btn-outline" onclick="limparBuscaCT()">Limpar Filtro</button>' +
      '<button class="btn btn-outline" onclick="closeModal()">Cancelar</button>' +
      '<button class="btn btn-primary" onclick="executarBuscaGeralCT()">Buscar</button>' +
    '</div>';
  document.getElementById('modalOverlay').style.display = 'flex';
  setTimeout(function() {
    var inp = document.getElementById('buscaGeralInput');
    if (inp) inp.focus();
  }, 100);
}
function executarBuscaGeralCT() {
  var cBusca = val('buscaGeralInput');
  if (!cBusca || !cBusca.trim()) { closeModal(); return; }
  var aTokens = cBusca.toUpperCase().split(';');
  var aNova = [];
  for (var nI = 0; nI < dadosOriginaisCT.length; nI++) {
    var e = dadosOriginaisCT[nI];
    var lOk = true;
    for (var nT = 0; nT < aTokens.length; nT++) {
      var cToken = aTokens[nT].trim();
      if (!cToken) continue;
      var lNeg = false;
      if (cToken.charAt(0) === '-') { lNeg = true; cToken = cToken.substring(1); }
      if (cToken.indexOf('..') >= 0 && cToken.indexOf('/') >= 0) {
        var dIniTok = parseDataBR(cToken.substring(0, 10));
        var dFimTok = parseDataBR(cToken.substring(13, 23));
        var dRow = new Date(e.data);
        if (dRow >= dIniTok && dRow <= dFimTok) { if (lNeg) { lOk = false; break; } }
        else { if (!lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken.indexOf('..') >= 0 && cToken.indexOf('/') < 0) {
        var posPonto = cToken.indexOf('..');
        var nMinTok = parseFloat(cToken.substring(0, posPonto)) || 0;
        var nMaxTok = parseFloat(cToken.substring(posPonto + 2)) || 0;
        var nValorLinha = parseFloat(e.valor) || 0;
        if (nValorLinha >= nMinTok && nValorLinha <= nMaxTok) { if (lNeg) { lOk = false; break; } }
        else { if (!lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken.substring(0, 2) === '>=') {
        var nValorLinha = parseFloat(e.valor) || 0;
        if (!(nValorLinha >= parseFloat(cToken.substring(2)))) { if (!lNeg) { lOk = false; break; } }
        else { if (lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken.substring(0, 2) === '<=') {
        var nValorLinha = parseFloat(e.valor) || 0;
        if (!(nValorLinha <= parseFloat(cToken.substring(2)))) { if (!lNeg) { lOk = false; break; } }
        else { if (lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken.charAt(0) === '>') {
        var nValorLinha = parseFloat(e.valor) || 0;
        if (!(nValorLinha > parseFloat(cToken.substring(1)))) { if (!lNeg) { lOk = false; break; } }
        else { if (lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken.charAt(0) === '<') {
        var nValorLinha = parseFloat(e.valor) || 0;
        if (!(nValorLinha < parseFloat(cToken.substring(1)))) { if (!lNeg) { lOk = false; break; } }
        else { if (lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken === 'PAGO') {
        if (!e.competencia || !String(e.competencia).trim()) { if (!lNeg) { lOk = false; break; } }
        else { if (lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken === 'ABERTO') {
        if (e.competencia && String(e.competencia).trim()) { if (!lNeg) { lOk = false; break; } }
        else { if (lNeg) { lOk = false; break; } }
        continue;
      }
      if (cToken.indexOf(':') >= 0) {
        var posDoisPontos = cToken.indexOf(':');
        var cCampo = cToken.substring(0, posDoisPontos).trim();
        var cValor = cToken.substring(posDoisPontos + 1).trim();
        var cConteudo = '';
        switch (cCampo) {
          case 'NOME': cConteudo = String(e.beneficiario || ''); break;
          case 'CPF': cConteudo = String(e.cpfcnpj || ''); break;
          case 'CATEGORIA': cConteudo = String(e.cli_categoria || ''); break;
          case 'DESCATEGORIA': cConteudo = String(e.desc_categoria || ''); break;
          case 'SUBCATEGORIA': cConteudo = String(e.cli_subcategoria || ''); break;
          case 'DESSUBCATEGORIA': cConteudo = String(e.desc_subcategoria || ''); break;
          case 'BANCO': cConteudo = String(e.banco || ''); break;
          case 'AGENCIA': cConteudo = String(e.agencia || ''); break;
          case 'CONTA': cConteudo = String(e.conta || ''); break;
          case 'DC': cConteudo = String(e.descricao || '').toUpperCase().trim(); break;
          case 'CP': cConteudo = String(e.tipo || '').toUpperCase().trim(); break;
          case 'COMP': cConteudo = String(e.competencia || ''); break;
          default: cConteudo = '';
        }
        cConteudo = String(cConteudo).toUpperCase();
        cValor = cValor.toUpperCase();
        if (cCampo === 'DC' || cCampo === 'CP') {
          if (lNeg) { if (cConteudo === cValor) { lOk = false; break; } }
          else { if (cConteudo !== cValor) { lOk = false; break; } }
        } else {
          if (lNeg) { if (cConteudo.indexOf(cValor) >= 0) { lOk = false; break; } }
          else { if (cConteudo.indexOf(cValor) < 0) { lOk = false; break; } }
        }
        continue;
      }
      var cLinha = [
        String(e.transactionId || ''), formatDate(e.data), String(e.valor || ''),
        String(e.descricao || ''), String(e.tipo || ''), String(e.cpfcnpj || ''),
        String(e.beneficiario || ''), String(e.cli_categoria || ''),
        String(e.desc_categoria || ''), String(e.cli_subcategoria || ''),
        String(e.desc_subcategoria || ''), String(e.competencia || ''),
        String(e.banco || ''), String(e.agencia || ''), String(e.conta || ''),
        String(e.numpresta ? 'S' : 'N')
      ].join(' ').toUpperCase();
      if (lNeg) { if (matchGoogle(cToken, cLinha)) { lOk = false; break; } }
      else { if (!matchGoogle(cToken, cLinha)) { lOk = false; break; } }
    }
    if (lOk) aNova.push(e);
  }
  dadosExibidosCT = aNova;
  renderExtratoCTFiltrado(aNova);
  closeModal();
  showToast(aNova.length + ' registro(s) encontrado(s)');
}
function matchGoogle(token, texto) {
  token = token.trim().toUpperCase();
  texto = texto.toUpperCase();
  if (!token) return true;
  var partes = token.split(/\s+/);
  for (var i = 0; i < partes.length; i++) {
    if (partes[i] && texto.indexOf(partes[i]) < 0) return false;
  }
  return true;
}

var ordemAscExtrato = true;
var colunaOrdenadaExtrato = -1;

function ordenarExtrato(col) {
  var tbody = document.getElementById('extratosTableBody');
  if (!tbody) return;
  var linhas = Array.from(tbody.querySelectorAll('tr'));
  if (linhas.length === 0 || (linhas[0] && linhas[0].cells.length < 2)) return;

  ordemAscExtrato = (col === colunaOrdenadaExtrato) ? !ordemAscExtrato : true;
  colunaOrdenadaExtrato = col;

  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();

    // Coluna Data (7) - formato dd/mm/yyyy
    if (col === 7) {
      var pA = va.split('/'), pB = vb.split('/');
      if (pA.length === 3 && pB.length === 3) {
        var dA = new Date(pA[2], pA[1] - 1, pA[0]);
        var dB = new Date(pB[2], pB[1] - 1, pB[0]);
        return ordemAscExtrato ? dA - dB : dB - dA;
      }
    }

    // Colunas Valor (6) e Orçamento (13) - formato R$ X.XXX,XX
    if (col === 6 || col === 13) {
      var na = parseFloat(va.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
      return ordemAscExtrato ? na - nb : nb - na;
    }

    // Outras colunas - numérico ou texto
    if (!isNaN(va) && !isNaN(vb) && va !== '' && vb !== '') {
      return ordemAscExtrato ? parseFloat(va) - parseFloat(vb) : parseFloat(vb) - parseFloat(va);
    }
    return ordemAscExtrato ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  // Renumerar coluna Ordem
  linhas.forEach(function(l, i) {
    if (l.cells[0]) l.cells[0].textContent = i + 1;
  });

  linhas.forEach(function(l) { tbody.appendChild(l); });
}

function toggleBancosSub() {
  var sub = document.getElementById('bancosSubmenu');
  if (sub) sub.classList.toggle('open');
}


function toggleBancosSubmenu(header) {
  var items = document.getElementById('bancosSubmenu');
  header.classList.toggle('collapsed');
  items.classList.toggle('collapsed');
}

function parseDataBR(str) {
  if (!str || str.length < 8) return new Date(1900, 0, 1);
  var partes = str.trim().split('/');
  if (partes.length === 3) return new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
  return new Date(1900, 0, 1);
}


function logout() {
  fetch('/api/logout')
    .then(function() { window.location.href = '/login'; })
    .catch(function() { window.location.href = '/login'; });
}

function sair() { logout(); }



function sair() {
  if (confirm('Sair?')) window.close();
}
window.addEventListener('DOMContentLoaded', function() { loadPage('bancos'); });