var linhaSelecionada = null;
var ordemAsc = true;
var colunaOrdenada = -1;
var dadosOriginais = [];

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
  document.getElementById('statusInfo').textContent = 'Total: ' + visiveis + ' cliente(s)';
}

function buscarGeral() {
  var termo = document.getElementById('buscaGeral').value.trim();
  if (!termo) {
    loadPage('mapacli');
    return;
  }
  fetch('/mapacli/buscar?q=' + encodeURIComponent(termo))
    .then(function(r) { return r.json(); })
    .then(function(data) { renderTabela(data); })
    .catch(function(err) { console.error('Erro:', err); });
}

function renderTabela(clientes) {
  var tbody = document.getElementById('corpoTabela');
  document.getElementById('statusInfo').textContent = 'Total: ' + clientes.length + ' cliente(s)';
  if (!clientes.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">Nenhum cliente encontrado</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < clientes.length; i++) {
    var c = clientes[i];
    var cpf = c.cpf || '';
    var nome = (c.nomecli || '').replace(/'/g, "\'");
    html += '<tr data-cpf="' + cpf + '" onclick="selecionarLinha(this)" ondblclick="editar(\'' + cpf + '\')">' +
      '<td class="col-ord">' + (i + 1) + '</td>' +
      '<td class="col-cpf">' + cpf + '</td>' +
      '<td class="col-nome">' + (c.nomecli || '') + '</td>' +
      '<td class="col-cat">' + (c.categoria || '') + '</td>' +
      '<td class="col-desc-cat">' + (c.des_categoria || '') + '</td>' +
      '<td class="col-sub">' + (c.subcategoria || '') + '</td>' +
      '<td class="col-desc-sub">' + (c.des_subcategoria || '') + '</td>' +
      '<td class="col-acoes">' +
        '<button class="mapa-btn btn-editar" onclick="event.stopPropagation(); editar(\'' + cpf + '\')">✏️</button>' +
        '<button class="mapa-btn btn-excluir" onclick="event.stopPropagation(); excluir(\'' + cpf + '\', \'' + nome + '\')">🗑️</button>' +
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

function excluir(cpf, nome) {
  if (!confirm('Excluir "' + nome + '"?\nCPF: ' + cpf)) return;
  fetch('/mapacli/excluir/' + encodeURIComponent(cpf), { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { alert('Excluído!'); loadPage('mapacli'); }
      else alert('Erro: ' + (data.message || ''));
    })
    .catch(function() { alert('Erro ao excluir'); });
}

function editar(cpf) {
  fetch('/mapacli/editar/' + encodeURIComponent(cpf))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) { alert(data.error); return; }
      document.getElementById('editCpfOriginal').value = cpf;
      document.getElementById('editCpf').value = data.cliente ? (data.cliente.cpf || '') : '';
      document.getElementById('editNome').value = data.cliente ? (data.cliente.nomecli || '') : '';
      var selCat = document.getElementById('editCategoria');
      var catOptions = '<option value="">Selecione...</option>';
      if (data.categorias) {
        for (var i = 0; i < data.categorias.length; i++) {
          var c = data.categorias[i];
          var sel = data.cliente && c.codigo == data.cliente.categoria ? 'selected' : '';
          catOptions += '<option value="' + c.codigo + '" ' + sel + '>' + c.categoria + '</option>';
        }
      }
      selCat.innerHTML = catOptions;
      var selSub = document.getElementById('editSubcategoria');
      var subOptions = '<option value="">Selecione...</option>';
      if (data.subcategorias) {
        for (var j = 0; j < data.subcategorias.length; j++) {
          var s = data.subcategorias[j];
          var sel2 = data.cliente && s.subcategoria == data.cliente.subcategoria ? 'selected' : '';
          subOptions += '<option value="' + s.subcategoria + '" ' + sel2 + '>' + s.desconta + '</option>';
        }
      }
      selSub.innerHTML = subOptions;
      document.getElementById('tituloModal').textContent = 'Editar Cliente';
      document.getElementById('btnSalvarModal').onclick = salvarEdicao;
      abrirModal('modalEditar');
    })
    .catch(function() { alert('Erro ao carregar dados'); });
}

function salvarEdicao() {
  var cpfOriginal = document.getElementById('editCpfOriginal').value;
  var dados = {
    cpf: document.getElementById('editCpf').value,
    nomecli: document.getElementById('editNome').value,
    categoria: document.getElementById('editCategoria').value,
    subcategoria: document.getElementById('editSubcategoria').value
  };
  fetch('/mapacli/editar/' + encodeURIComponent(cpfOriginal), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { alert('Atualizado!'); fecharModais(); loadPage('mapacli'); }
      else alert('Erro: ' + (data.message || ''));
    })
    .catch(function() { alert('Erro ao salvar'); });
}

function abrirNovo() {
  fetch('/mapacli/editar/0')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('editCpfOriginal').value = '';
      document.getElementById('editCpf').value = '';
      document.getElementById('editNome').value = '';
      var selCat = document.getElementById('editCategoria');
      var catOptions = '<option value="">Selecione...</option>';
      if (data.categorias) {
        for (var i = 0; i < data.categorias.length; i++) {
          var c = data.categorias[i];
          catOptions += '<option value="' + c.codigo + '">' + c.categoria + '</option>';
        }
      }
      selCat.innerHTML = catOptions;
      var selSub = document.getElementById('editSubcategoria');
      var subOptions = '<option value="">Selecione...</option>';
      if (data.subcategorias) {
        for (var j = 0; j < data.subcategorias.length; j++) {
          var s = data.subcategorias[j];
          subOptions += '<option value="' + s.subcategoria + '">' + s.desconta + '</option>';
        }
      }
      selSub.innerHTML = subOptions;
      document.getElementById('tituloModal').textContent = 'Novo Cliente';
      document.getElementById('btnSalvarModal').onclick = salvarNovo;
      abrirModal('modalEditar');
    })
    .catch(function() {
      document.getElementById('editCategoria').innerHTML = '<option value="">Selecione...</option>';
      document.getElementById('editSubcategoria').innerHTML = '<option value="">Selecione...</option>';
      document.getElementById('tituloModal').textContent = 'Novo Cliente';
      document.getElementById('btnSalvarModal').onclick = salvarNovo;
      abrirModal('modalEditar');
    });
}

function salvarNovo() {
  var dados = {
    cpf: document.getElementById('editCpf').value,
    nomecli: document.getElementById('editNome').value,
    categoria: document.getElementById('editCategoria').value,
    subcategoria: document.getElementById('editSubcategoria').value
  };
  fetch('/mapacli/novo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { alert('Criado!'); fecharModais(); loadPage('mapacli'); }
      else alert('Erro: ' + (data.message || ''));
    })
    .catch(function() { alert('Erro ao criar'); });
}

function exportarExcel() { window.location.href = '/mapacli/exportar'; }
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