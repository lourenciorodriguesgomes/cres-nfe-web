var cliOrdemAsc = true;
var cliColunaOrdenada = -1;

function cliVoltar() {
  loadPage('fluxocaixa');
}

function cliFiltrarTabela() {
  var termo = document.getElementById('cliBuscaGeral').value.toLowerCase().trim();
  var linhas = document.querySelectorAll('#cliCorpoTabela tr');
  var visiveis = 0;
  linhas.forEach(function(l) {
    var texto = l.textContent.toLowerCase();
    if (texto.indexOf(termo) !== -1) { l.style.display = ''; visiveis++; }
    else { l.style.display = 'none'; }
  });
  document.getElementById('cliStatusInfo').textContent = 'Total: ' + visiveis + ' cliente(s)';
}

function cliBuscarGeral() {
  var termo = document.getElementById('cliBuscaGeral').value.trim();
  if (!termo) { loadPage('clientes_fornecedores'); return; }
  fetch('/clientes-fornecedores/buscar?q=' + encodeURIComponent(termo))
    .then(function(r) { return r.json(); })
    .then(function(data) { cliRenderTabela(data); })
    .catch(function(err) { console.error('Erro:', err); });
}

function cliRenderTabela(clientes) {
  var tbody = document.getElementById('cliCorpoTabela');
  document.getElementById('cliStatusInfo').textContent = 'Total: ' + clientes.length + ' cliente(s)';
  if (!clientes.length) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;">Nenhum cliente encontrado</td></tr>';
    return;
  }
  var html = '';
  for (var i = 0; i < clientes.length; i++) {
    var c = clientes[i];
    var cod = c.cdcliente || '';
    var nome = (c.nomecli || '').replace(/'/g, "\'");
    html += '<tr data-id="' + cod + '" onclick="cliSelecionarLinha(this)" ondblclick="cliEditar(\'' + cod + '\')" style="cursor:pointer;">' +
      '<td class="col-ord">' + (i + 1) + '</td>' +
      '<td class="col-cod">' + cod + '</td>' +
      '<td class="col-nome">' + (c.nomecli || '') + '</td>' +
      '<td class="col-end">' + (c.endereco || '') + '</td>' +
      '<td class="col-bairro">' + (c.bairro || '') + '</td>' +
      '<td class="col-cidade">' + (c.cidade || '') + '</td>' +
      '<td class="col-uf">' + (c.estado || '') + '</td>' +
      '<td class="col-tel">' + (c.telefone || '') + '</td>' +
      '<td class="col-cpf">' + (c.cpf || '') + '</td>' +
      '<td class="col-cat">' + (c.cat_nome || c.cat_codigo || '') + '</td>' +
      '<td class="col-acoes">' +
        '<button class="mapa-btn btn-editar" onclick="event.stopPropagation();cliEditar(\'' + cod + '\')">✏️</button>' +
        '<button class="mapa-btn btn-excluir" onclick="event.stopPropagation();cliExcluir(\'' + cod + '\',\'' + nome + '\')">🗑️</button>' +
      '</td>' +
    '</tr>';
  }
  tbody.innerHTML = html;
}

function cliSelecionarLinha(tr) {
  var sel = tr.parentElement.querySelector('.selecionado');
  if (sel) sel.classList.remove('selecionado');
  tr.classList.add('selecionado');
}

function cliOrdenar(col) {
  var tbody = document.getElementById('cliCorpoTabela');
  var linhas = Array.from(tbody.querySelectorAll('tr'));
  if (linhas.length === 0) return;
  cliOrdemAsc = (col === cliColunaOrdenada) ? !cliOrdemAsc : true;
  cliColunaOrdenada = col;
  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();
    if (!isNaN(va) && !isNaN(vb) && va !== '' && vb !== '') {
      return cliOrdemAsc ? parseFloat(va) - parseFloat(vb) : parseFloat(vb) - parseFloat(va);
    }
    return cliOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });
  linhas.forEach(function(l) { tbody.appendChild(l); });
}

function cliEditar(id) {
  fetch('/clientes-fornecedores/editar/' + encodeURIComponent(id))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) { alert(data.error); return; }
      var cli = data.cliente || {};
      document.getElementById('cliEditId').value = id;
      document.getElementById('cli_cdcliente').value = cli.cdcliente || id;
      document.getElementById('cli_cdcliente').readOnly = true;
      document.getElementById('cli_nomecli').value = cli.nomecli || '';
      document.getElementById('cli_endereco').value = cli.endereco || '';
      document.getElementById('cli_bairro').value = cli.bairro || '';
      document.getElementById('cli_cidade').value = cli.cidade || '';
      document.getElementById('cli_estado').value = cli.estado || '';
      document.getElementById('cli_telefone').value = cli.telefone || '';
      document.getElementById('cli_cpf').value = cli.cpf || '';
      var selCat = document.getElementById('cli_categoria');
      var catOpts = '<option value="">Selecione...</option>';
      if (data.categorias) {
        for (var i = 0; i < data.categorias.length; i++) {
          var c = data.categorias[i];
          var sel = cli.categoria == c.codigo ? ' selected' : '';
          catOpts += '<option value="' + c.codigo + '"' + sel + '>' + c.categoria + '</option>';
        }
      }
      selCat.innerHTML = catOpts;
      var selSub = document.getElementById('cli_subcategoria');
      var subOpts = '<option value="">Selecione...</option>';
      if (data.subcategorias) {
        for (var j = 0; j < data.subcategorias.length; j++) {
          var s = data.subcategorias[j];
          var sel2 = cli.subcategoria == s.subcategoria ? ' selected' : '';
          subOpts += '<option value="' + s.subcategoria + '"' + sel2 + '>' + s.desconta + '</option>';
        }
      }
      selSub.innerHTML = subOpts;
      document.getElementById('cliTituloModal').textContent = 'Editar Cliente';
      cliAbrirModais();
    })
    .catch(function() { alert('Erro ao carregar dados'); });
}

function cliAbrirNovo() {
  fetch('/clientes-fornecedores/editar/0')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('cliEditId').value = '';
      document.getElementById('cli_cdcliente').value = '';
      document.getElementById('cli_cdcliente').readOnly = false;
      document.getElementById('cli_nomecli').value = '';
      document.getElementById('cli_endereco').value = '';
      document.getElementById('cli_bairro').value = '';
      document.getElementById('cli_cidade').value = '';
      document.getElementById('cli_estado').value = '';
      document.getElementById('cli_telefone').value = '';
      document.getElementById('cli_cpf').value = '';
      var selCat = document.getElementById('cli_categoria');
      var catOpts = '<option value="">Selecione...</option>';
      if (data.categorias) {
        for (var i = 0; i < data.categorias.length; i++) {
          var c = data.categorias[i];
          catOpts += '<option value="' + c.codigo + '">' + c.categoria + '</option>';
        }
      }
      selCat.innerHTML = catOpts;
      var selSub = document.getElementById('cli_subcategoria');
      var subOpts = '<option value="">Selecione...</option>';
      if (data.subcategorias) {
        for (var j = 0; j < data.subcategorias.length; j++) {
          var s = data.subcategorias[j];
          subOpts += '<option value="' + s.subcategoria + '">' + s.desconta + '</option>';
        }
      }
      selSub.innerHTML = subOpts;
      document.getElementById('cliTituloModal').textContent = 'Novo Cliente';
      cliAbrirModais();
    })
    .catch(function() {
      document.getElementById('cli_categoria').innerHTML = '<option value="">Selecione...</option>';
      document.getElementById('cli_subcategoria').innerHTML = '<option value="">Selecione...</option>';
      document.getElementById('cliTituloModal').textContent = 'Novo Cliente';
      cliAbrirModais();
    });
}

function cliSalvar() {
  var id = document.getElementById('cliEditId').value;
  var dados = {
    cdcliente: document.getElementById('cli_cdcliente').value.trim(),
    nomecli: document.getElementById('cli_nomecli').value.trim(),
    endereco: document.getElementById('cli_endereco').value.trim(),
    bairro: document.getElementById('cli_bairro').value.trim(),
    cidade: document.getElementById('cli_cidade').value.trim(),
    estado: document.getElementById('cli_estado').value.trim(),
    telefone: document.getElementById('cli_telefone').value.trim(),
    cpf: document.getElementById('cli_cpf').value.trim(),
    categoria: document.getElementById('cli_categoria').value,
    subcategoria: document.getElementById('cli_subcategoria').value
  };
  if (id) {
    fetch('/clientes-fornecedores/editar/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) { alert('Atualizado!'); cliFecharModais(); loadPage('clientes_fornecedores'); }
        else alert('Erro: ' + (data.message || ''));
      })
      .catch(function() { alert('Erro ao salvar'); });
  } else {
    fetch('/clientes-fornecedores/novo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success) { alert('Criado!'); cliFecharModais(); loadPage('clientes_fornecedores'); }
        else alert('Erro: ' + (data.message || ''));
      })
      .catch(function() { alert('Erro ao criar'); });
  }
}

function cliExcluir(id, nome) {
  if (!confirm('Excluir "' + nome + '"?')) return;
  fetch('/clientes-fornecedores/excluir/' + encodeURIComponent(id), { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) { loadPage('clientes_fornecedores'); }
      else alert('Erro: ' + (data.message || ''));
    })
    .catch(function() { alert('Erro ao excluir'); });
}

function cliExportarExcel() {
  var tabela = document.getElementById('cliTabela');
  var linhas = tabela.querySelectorAll('tbody tr');
  var visiveis = [];
  linhas.forEach(function(l) {
    if (l.style.display !== 'none' && l.cells.length > 1) {
      visiveis.push(l);
    }
  });
  if (visiveis.length === 0) { alert('Nenhum registro para exportar'); return; }
  var headers = [];
  tabela.querySelectorAll('thead th').forEach(function(th, i) {
    if (i < th.parentNode.cells.length - 1) {
      headers.push(th.textContent.trim());
    }
  });
  var csv = headers.join(';') + '\n';
  visiveis.forEach(function(l) {
    var vals = [];
    for (var i = 0; i < l.cells.length - 1; i++) {
      var v = l.cells[i].textContent.trim();
      vals.push('"' + v.replace(/"/g, '""') + '"');
    }
    csv += vals.join(';') + '\n';
  });
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'clientes.csv';
  link.click();
}

function cliImprimir() {
  window.print();
}

function cliToggleColunas() {
  document.getElementById('cliOverlay').style.display = 'block';
  document.getElementById('cliModalColunas').style.display = 'block';
}

function cliToggleColuna(className, checkbox) {
  var cols = document.querySelectorAll('.' + className);
  var th = document.querySelector('th.' + className);
  cols.forEach(function(c) { c.style.display = checkbox.checked ? '' : 'none'; });
  if (th) th.style.display = checkbox.checked ? '' : 'none';
}

function cliAbrirModais() {
  document.getElementById('cliOverlay').style.display = 'block';
  document.getElementById('cliModalEditar').style.display = 'block';
}

function cliFecharModais() {
  document.getElementById('cliOverlay').style.display = 'none';
  document.getElementById('cliModalColunas').style.display = 'none';
  document.getElementById('cliModalEditar').style.display = 'none';
}

document.addEventListener('keydown', function(e) {
  var busca = document.getElementById('cliBuscaGeral');
  if (busca && document.activeElement !== busca && /^[a-zA-ZÀ-ÿ0-9]$/.test(e.key)) {
    busca.focus();
    busca.value = e.key;
    cliFiltrarTabela();
  }
  if (e.key === 'Escape') cliFecharModais();
});