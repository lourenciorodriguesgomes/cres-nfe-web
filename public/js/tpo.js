var tpoOrdemAsc = true;
var tpoColunaOrdenada = -1;
var tpoFiltroAtivo = null;

function voltarBancos() {
  loadPage('bancos');
}

function filtrarTabela() {
  var linhas = document.querySelectorAll('#corpoTabela tr');
  var visiveis = 0;

  linhas.forEach(function(l) {
    if (l.cells.length < 2) { l.style.display = 'none'; return; }
    var mostrar = true;

    if (mostrar && tpoFiltroAtivo) {
      mostrar = tpoExecutarFiltroAvancado(l);
    }

    l.style.display = mostrar ? '' : 'none';
    if (mostrar) visiveis++;
  });

  var status = document.getElementById('statusInfo');
  if (status) status.textContent = 'Total: ' + visiveis + ' registro(s)';
}

function selecionarLinha(tr) {
  var sel = tr.parentElement.querySelector('.selecionado');
  if (sel) sel.classList.remove('selecionado');
  tr.classList.add('selecionado');
}

function ordenar(col) {
  var tbody = document.getElementById('corpoTabela');
  var linhas = Array.from(tbody.querySelectorAll('tr'));
  if (linhas.length === 0) return;
  if (linhas[0].cells.length < 2) return;

  tpoOrdemAsc = (col === tpoColunaOrdenada) ? !tpoOrdemAsc : true;
  tpoColunaOrdenada = col;

  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();

    var na = parseFloat(va.replace(/\./g, '').replace(',', '.'));
    var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
      return tpoOrdemAsc ? na - nb : nb - na;
    }

    return tpoOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  linhas.forEach(function(l) { tbody.appendChild(l); });
}

function toggleColunas() {
  document.getElementById('mapaOverlay').style.display = 'block';
  document.getElementById('modalColunas').style.display = 'block';
}

function toggleColuna(className, checkbox) {
  var cols = document.querySelectorAll('.' + className);
  var th = document.querySelector('th.' + className);
  cols.forEach(function(c) { c.style.display = checkbox.checked ? '' : 'none'; });
  if (th) th.style.display = checkbox.checked ? '' : 'none';
}

function fecharModais() {
  document.getElementById('mapaOverlay').style.display = 'none';
  document.getElementById('modalColunas').style.display = 'none';
  var modalEdit = document.getElementById('modalEditar');
  if (modalEdit) modalEdit.style.display = 'none';
}

function exportarExcel() {
  var tabela = document.getElementById('tabelaClientes');
  var linhas = tabela.querySelectorAll('tbody tr');
  var visiveis = [];
  linhas.forEach(function(l) {
    if (l.style.display !== 'none' && l.cells.length > 1) visiveis.push(l);
  });
  if (visiveis.length === 0) { alert('Nenhum registro para exportar'); return; }

  var headers = [];
  tabela.querySelectorAll('thead th').forEach(function(th) {
    if (th.style.display !== 'none') headers.push(th.textContent.trim());
  });

  var csv = headers.join(';') + '\n';
  visiveis.forEach(function(l) {
    var vals = [];
    for (var i = 0; i < l.cells.length; i++) {
      if (l.cells[i].style.display !== 'none') {
        var v = l.cells[i].textContent.trim();
        vals.push('"' + v.replace(/"/g, '""') + '"');
      }
    }
    csv += vals.join(';') + '\n';
  });

  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'tpo.csv';
  link.click();
}

function imprimir() {
  window.print();
}

function abrirNovo() {
  document.getElementById('tituloModal').textContent = 'Novo TPO';
  document.getElementById('editCodOriginal').value = '';
  document.getElementById('editTpo').value = '';
  document.getElementById('editNome').value = '';
  document.getElementById('editCfop').value = '';
  document.getElementById('editGerConPag').value = '0';
  document.getElementById('editGerConRec').value = '0';
  document.getElementById('editMateriaPri').value = '0';
  document.getElementById('editClientePad').value = '';
  document.getElementById('editNota').value = '';
  document.getElementById('editPlanoConta').value = '';
  document.getElementById('editPlanoPagam').value = '';
  document.getElementById('editVendaLoja').value = '';
  document.getElementById('editCaixa').value = '';
  document.getElementById('editTpo').disabled = false;
  document.getElementById('modalEditar').style.display = 'block';
  document.getElementById('mapaOverlay').style.display = 'block';
}

function editar(cod) {
  fetch('/tpo/editar/' + encodeURIComponent(cod))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.registro) { alert('Registro não encontrado'); return; }
      var r = data.registro;
      document.getElementById('tituloModal').textContent = 'Editar TPO';
      document.getElementById('editCodOriginal').value = cod;
      document.getElementById('editTpo').value = r.tpo || '';
      document.getElementById('editNome').value = r.nome || '';
      document.getElementById('editCfop').value = r.cfoppadrao || '';
      document.getElementById('editGerConPag').value = String(r.gerconpag || 0);
      document.getElementById('editGerConRec').value = String(r.gerconrec || 0);
      document.getElementById('editMateriaPri').value = String(r.materiapri || 0);
      document.getElementById('editClientePad').value = r.clientepad || '';
      document.getElementById('editNota').value = r.nota || '';
      document.getElementById('editPlanoConta').value = r.planoconta || '';
      document.getElementById('editPlanoPagam').value = r.planopagam || '';
      document.getElementById('editVendaLoja').value = r.vendaloja || '';
      document.getElementById('editCaixa').value = r.caixapadrao || '';
      document.getElementById('editTpo').disabled = true;
      document.getElementById('modalEditar').style.display = 'block';
      document.getElementById('mapaOverlay').style.display = 'block';
    })
    .catch(function(err) { alert('Erro: ' + err.message); });
}

function salvarEdicao() {
  var codOriginal = document.getElementById('editCodOriginal').value;
  var dados = {
    tpo: document.getElementById('editTpo').value,
    nome: document.getElementById('editNome').value,
    cfoppadrao: document.getElementById('editCfop').value,
    gerconpag: parseInt(document.getElementById('editGerConPag').value) || 0,
    gerconrec: parseInt(document.getElementById('editGerConRec').value) || 0,
    materiapri: parseInt(document.getElementById('editMateriaPri').value) || 0,
    clientepad: document.getElementById('editClientePad').value,
    nota: document.getElementById('editNota').value,
    planoconta: document.getElementById('editPlanoConta').value,
    planopagam: document.getElementById('editPlanoPagam').value,
    vendaloja: document.getElementById('editVendaLoja').value,
    caixapadrao: document.getElementById('editCaixa').value
  };

  if (!dados.tpo || !dados.nome) {
    alert('Preencha TPO e Nome');
    return;
  }

  var url = codOriginal ? '/tpo/editar/' + encodeURIComponent(codOriginal) : '/tpo/novo';
  var method = codOriginal ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        fecharModais();
        loadPage('tpo');
      } else {
        alert('Erro: ' + (data.message || 'Não foi possível salvar'));
      }
    })
    .catch(function(err) { alert('Erro: ' + err.message); });
}


function salvarEdicao() {
  var codOriginal = document.getElementById('editCodOriginal').value;
  var dados = {
    tpo: document.getElementById('editTpo').value,
    nome: document.getElementById('editNome').value,
    cfop: document.getElementById('editCfop').value,
    gerconpag: parseInt(document.getElementById('editGerConPag').value) || 0,
    gerconrec: parseInt(document.getElementById('editGerConRec').value) || 0,
    materiapri: parseInt(document.getElementById('editMateriaPri').value) || 0,
    clientepad: document.getElementById('editClientePad').value,
    nota: document.getElementById('editNota').value,
    planoconta: document.getElementById('editPlanoConta').value,
    planopagam: document.getElementById('editPlanoPagam').value,
    vendaloja: document.getElementById('editVendaLoja').value,
    caixapadrao: document.getElementById('editCaixa').value
  };

  if (!dados.tpo || !dados.nome) {
    alert('Preencha TPO e Nome');
    return;
  }

  var url = codOriginal ? '/tpo/editar/' + encodeURIComponent(codOriginal) : '/tpo/novo';
  var method = codOriginal ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        fecharModais();
        loadPage('tpo');
      } else {
        alert('Erro: ' + (data.message || 'Não foi possível salvar'));
      }
    })
    .catch(function(err) { alert('Erro: ' + err.message); });
}

function excluir(cod, nome) {
  if (!confirm('Excluir "' + nome + '"?')) return;
  fetch('/tpo/excluir/' + encodeURIComponent(cod), { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        loadPage('tpo');
      } else {
        alert('Erro: ' + (data.message || 'Não foi possível excluir'));
      }
    })
    .catch(function(err) { alert('Erro: ' + err.message); });
}

// ===== BUSCA GERAL AVANÇADA =====

function tpoAbrirBuscaGeral() {
  var modal = document.getElementById('tpoModalBuscaGeral');
  if (!modal) return;
  modal.style.display = 'block';
  setTimeout(function() {
    var inp = document.getElementById('tpoBuscaGeralInput');
    if (inp) inp.focus();
  }, 100);
}

function tpoFecharBuscaGeral() {
  var modal = document.getElementById('tpoModalBuscaGeral');
  if (modal) modal.style.display = 'none';
}

function tpoLimparBusca() {
  tpoFiltroAtivo = null;
  tpoFecharBuscaGeral();
  filtrarTabela();
}

function tpoExecutarBuscaGeral() {
  var input = document.getElementById('tpoBuscaGeralInput');
  if (!input) return;
  var texto = input.value.trim();
  tpoFiltroAtivo = texto ? texto : null;
  tpoFecharBuscaGeral();
  filtrarTabela();
}

// col: 0=Ord, 1=TPO, 2=Nome, 3=CFOP
var tpoCampos = { tpo: 1, nome: 2, cfop: 3 };

function tpoExecutarFiltroAvancado(linha) {
  if (!tpoFiltroAtivo) return true;
  var termos = tpoFiltroAtivo.split(';');
  for (var t = 0; t < termos.length; t++) {
    var termo = termos[t].trim();
    if (!termo) continue;

    if (termo.charAt(0) === '-' && termo.indexOf(':') === -1) {
      var excluir = termo.substring(1).toUpperCase();
      if (linha.textContent.toUpperCase().indexOf(excluir) >= 0) return false;
      continue;
    }

    if (termo.indexOf(':') >= 0) {
      var parts = termo.split(':');
      var campo = parts[0].toLowerCase().trim();
      var valor = parts.slice(1).join(':').toUpperCase().trim();
      if (campo.charAt(0) === '-') {
        campo = campo.substring(1);
        var idx = tpoCampos[campo];
        if (idx !== undefined) {
          var cellVal = (linha.cells[idx] ? linha.cells[idx].textContent : '').toUpperCase().trim();
          if (cellVal.indexOf(valor) >= 0) return false;
        }
        continue;
      }
      var idx2 = tpoCampos[campo];
      if (idx2 !== undefined) {
        var cellVal2 = (linha.cells[idx2] ? linha.cells[idx2].textContent : '').toUpperCase().trim();
        if (cellVal2.indexOf(valor) === -1) return false;
      } else {
        if (linha.textContent.toUpperCase().indexOf(valor) === -1) return false;
      }
      continue;
    }

    var palavra = termo.toUpperCase();
    var encontrou = false;
    for (var c = 0; c < linha.cells.length; c++) {
      if (linha.cells[c].textContent.toUpperCase().indexOf(palavra) >= 0) {
        encontrou = true;
        break;
      }
    }
    if (!encontrou) return false;
  }
  return true;
}

// ===== DRAG DO MODAL =====
(function() {
  var isDragging = false;
  var offsetX = 0, offsetY = 0;
  var modal = null;
  document.addEventListener('mousedown', function(e) {
    var header = document.getElementById('tpoBuscaGeralHeader');
    modal = document.getElementById('tpoModalBuscaGeral');
    if (header && modal && header.contains(e.target)) {
      isDragging = true;
      var rect = modal.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    }
  });
  document.addEventListener('mousemove', function(e) {
    if (isDragging && modal) {
      modal.style.left = (e.clientX - offsetX) + 'px';
      modal.style.top = (e.clientY - offsetY) + 'px';
      modal.style.right = 'auto';
    }
  });
  document.addEventListener('mouseup', function() { isDragging = false; });
})();

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    fecharModais();
    tpoFecharBuscaGeral();
  }
});