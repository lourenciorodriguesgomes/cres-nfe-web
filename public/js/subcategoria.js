var linhaSelecionada = null;
var ordemAsc = true;
var colunaOrdenada = -1;

function voltarBancos() {
  loadPage('bancos');
}

function filtrarTabela() {
  var termo = document.getElementById('buscaGeral').value.toLowerCase().trim();
  var tbody = document.getElementById('corpoTabela');
  var linhas = tbody.querySelectorAll('tr');
  var visiveis = 0;
  linhas.forEach(function(l) {
    var texto = l.textContent.toLowerCase();
    if (texto.indexOf(termo) !== -1) {
      l.style.display = '';
      visiveis++;
    } else {
      l.style.display = 'none';
    }
  });
  document.getElementById('statusInfo').textContent = 'Total: ' + visiveis + ' registro(s)';
}

function buscarGeral() {
  var termo = document.getElementById('buscaGeral').value.trim();
  if (!termo) {
    loadPage('subcategoria');
    return;
  }
  fetch('/subcategoria/buscar?q=' + encodeURIComponent(termo))
    .then(function(r) { return r.json(); })
    .then(function(data) { renderTabela(data); })
    .catch(function(err) { console.error('Erro:', err); });
}

function renderTabela(registros) {
  var tbody = document.getElementById('corpoTabela');
  document.getElementById('statusInfo').textContent = 'Total: ' + registros.length + ' registro(s)';
  if (!registros.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Nenhum registro encontrado</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < registros.length; i++) {
    var r = registros[i];
    var codconta = r.codconta || '';
    var desconta = (r.desconta || '').replace(/'/g, "\'");
    var tipcon = r.tipconta || '';
    if (tipcon === 'C') tipcon = 'Conta';
    else if (tipcon === 'T') tipcon = 'Título';
    else if (tipcon === 'S') tipcon = 'Soma';
    var grucon = r.gruconta || '';
    if (grucon === 'R') grucon = 'Receita';
    else if (grucon === 'D') grucon = 'Débito';
    html += '<tr data-cod="' + codconta + '" onclick="selecionarLinha(this)" ondblclick="editar(\'' + codconta + '\')">' +
      '<td class="col-ord">' + (i + 1) + '</td>' +
      '<td class="col-cod">' + codconta + '</td>' +
      '<td class="col-desc">' + (r.desconta || '') + '</td>' +
      '<td class="col-grupo">' + tipcon + '</td>' +
      '<td class="col-tipo">' + grucon + '</td>' +
      '<td class="col-sub">' + (r.subcategoria || '') + '</td>' +
      '<td class="col-acoes">' +
        '<button class="mapa-btn btn-editar" onclick="event.stopPropagation(); editar(\'' + codconta + '\')">✏️</button>' +
        '<button class="mapa-btn btn-excluir" onclick="event.stopPropagation(); excluir(\'' + codconta + '\', \'' + desconta + '\')">🗑️</button>' +
      '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
}

function selecionarLinha(tr) {
  if (linhaSelecionada) linhaSelecionada.classList.remove('selecionado');
  tr.classList.add('selecionado');
  linhaSelecionada = tr;
}

function ordenar(col) {
  var tbody = document.getElementById('corpoTabela');
  var linhas = Array.from(tbody.querySelectorAll('tr'));
  ordemAsc = (col === colunaOrdenada) ? !ordemAsc : true;
  colunaOrdenada = col;
  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();
    if (!isNaN(va) && !isNaN(vb)) return ordemAsc ? va - vb : vb - va;
    return ordemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  linhas.forEach(function(l) { tbody.appendChild(l); });
}

function excluir(cod, desconta) {
  if (!confirm('Excluir "' + desconta + '"?\nCódigo: ' + cod)) return;
  fetch('/subcategoria/excluir/' + encodeURIComponent(cod), { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { alert('Excluído!'); loadPage('subcategoria'); }
      else alert('Erro: ' + (data.message || ''));
    })
    .catch(function() { alert('Erro ao excluir'); });
}

function editar(cod) {
  fetch('/subcategoria/editar/' + encodeURIComponent(cod))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) { alert(data.error); return; }
      document.getElementById('editCodOriginal').value = cod;
      document.getElementById('editCod').value = data.registro ? (data.registro.codconta || '') : '';
      document.getElementById('editDesc').value = data.registro ? (data.registro.desconta || '') : '';
      document.getElementById('editSub').value = data.registro ? (data.registro.subcategoria || '') : '';
      if (data.registro) {
        document.getElementById('editGrupo').value = data.registro.tipconta || '';
        document.getElementById('editTipo').value = data.registro.gruconta || '';
      }
      document.getElementById('tituloModal').textContent = 'Editar Plano de Contas';
      document.getElementById('btnSalvarModal').onclick = salvarEdicao;
      abrirModal('modalEditar');
    })
    .catch(function() { alert('Erro ao carregar dados'); });
}

function salvarEdicao() {
  var codOriginal = document.getElementById('editCodOriginal').value;
  var dados = {
    codconta: document.getElementById('editCod').value,
    desconta: document.getElementById('editDesc').value,
    tipconta: document.getElementById('editGrupo').value,
    gruconta: document.getElementById('editTipo').value,
    subcategoria: document.getElementById('editSub').value
  };
  fetch('/subcategoria/editar/' + encodeURIComponent(codOriginal), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { alert('Atualizado!'); fecharModais(); loadPage('subcategoria'); }
      else alert('Erro: ' + (data.message || ''));
    })
    .catch(function() { alert('Erro ao salvar'); });
}

function abrirNovo() {
  document.getElementById('editCodOriginal').value = '';
  document.getElementById('editCod').value = '';
  document.getElementById('editDesc').value = '';
  document.getElementById('editSub').value = '';
  document.getElementById('editGrupo').value = '';
  document.getElementById('editTipo').value = '';
  document.getElementById('tituloModal').textContent = 'Novo Plano de Contas';
  document.getElementById('btnSalvarModal').onclick = salvarNovo;
  abrirModal('modalEditar');
}

function salvarNovo() {
  var dados = {
    codconta: document.getElementById('editCod').value,
    desconta: document.getElementById('editDesc').value,
    tipconta: document.getElementById('editGrupo').value,
    gruconta: document.getElementById('editTipo').value,
    subcategoria: document.getElementById('editSub').value
  };
  fetch('/subcategoria/novo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { alert('Criado!'); fecharModais(); loadPage('subcategoria'); }
      else alert('Erro: ' + (data.message || ''));
    })
    .catch(function() { alert('Erro ao criar'); });
}

function exportarExcel() { window.location.href = '/subcategoria/exportar'; }
function imprimir() { window.print(); }
function toggleColunas() { abrirModal('modalColunas'); }

function toggleColuna(className, checkbox) {
  var cols = document.querySelectorAll('.' + className);
  var th = document.querySelector('th.' + className);
  cols.forEach(function(c) { c.style.display = checkbox.checked ? '' : 'none'; });
  if (th) th.style.display = checkbox.checked ? '' : 'none';
}

function abrirModal(id) {
  document.getElementById('mapaOverlay').style.display = 'block';
  document.getElementById(id).style.display = 'block';
}

function fecharModais() {
  document.getElementById('mapaOverlay').style.display = 'none';
  document.getElementById('modalColunas').style.display = 'none';
  document.getElementById('modalEditar').style.display = 'none';
}

document.addEventListener('keydown', function(e) {
  var busca = document.getElementById('buscaGeral');
  if (busca && document.activeElement !== busca && /^[a-zA-ZÀ-ÿ0-9]$/.test(e.key)) {
    busca.focus();
    busca.value = e.key;
    filtrarTabela();
  }
  if (e.key === 'Escape') fecharModais();
});