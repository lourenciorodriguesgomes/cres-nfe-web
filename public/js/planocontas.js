var pcOrdemAsc = true;
var pcColunaOrdenada = -1;
var pcFiltroAtivo = null;

function voltarBancos() {
  loadPage('bancos');
}

function filtrarTabela() {
  var linhas = document.querySelectorAll('#corpoTabela tr');
  var visiveis = 0;

  linhas.forEach(function(l) {
    if (l.cells.length < 2) { l.style.display = 'none'; return; }
    var mostrar = true;

    if (mostrar && pcFiltroAtivo) {
      mostrar = pcExecutarFiltroAvancado(l);
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

  pcOrdemAsc = (col === pcColunaOrdenada) ? !pcOrdemAsc : true;
  pcColunaOrdenada = col;

  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();

    var na = parseFloat(va.replace(/\./g, '').replace(',', '.'));
    var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
      return pcOrdemAsc ? na - nb : nb - na;
    }

    return pcOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
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
  link.download = 'plano_contas.csv';
  link.click();
}

function imprimir() {
  window.print();
}

function abrirNovo() {
  document.getElementById('tituloModal').textContent = 'Novo Plano de Contas';
  document.getElementById('editCodOriginal').value = '';
  document.getElementById('editCod').value = '';
  document.getElementById('editDesc').value = '';
  document.getElementById('editGrupo').value = '';
  document.getElementById('editTipo').value = '';
  document.getElementById('editSub').value = '';
  document.getElementById('modalEditar').style.display = 'block';
  document.getElementById('mapaOverlay').style.display = 'block';
}

function editar(cod) {
  fetch('/planocontas/editar/' + encodeURIComponent(cod))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.registro) { alert('Registro não encontrado'); return; }
      var r = data.registro;
      document.getElementById('tituloModal').textContent = 'Editar Plano de Contas';
      document.getElementById('editCodOriginal').value = cod;
      document.getElementById('editCod').value = r.codconta || '';
      document.getElementById('editDesc').value = r.desconta || '';
      document.getElementById('editGrupo').value = r.tipconta || '';
      document.getElementById('editTipo').value = r.gruconta || '';
      document.getElementById('editSub').value = r.subcategoria || '';
      document.getElementById('modalEditar').style.display = 'block';
      document.getElementById('mapaOverlay').style.display = 'block';
    })
    .catch(function(err) { alert('Erro: ' + err.message); });
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

  if (!dados.codconta || !dados.desconta) {
    alert('Preencha Código e Descrição');
    return;
  }

  var url = codOriginal ? '/planocontas/editar/' + encodeURIComponent(codOriginal) : '/planocontas/novo';
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
        loadPage('categoria');
      } else {
        alert('Erro: ' + (data.message || 'Não foi possível salvar'));
      }
    })
    .catch(function(err) { alert('Erro: ' + err.message); });
}

function excluir(cod, desconta) {
  if (!confirm('Excluir "' + desconta + '"?')) return;
  fetch('/planocontas/excluir/' + encodeURIComponent(cod), { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        loadPage('categoria');
      } else {
        alert('Erro: ' + (data.message || 'Não foi possível excluir'));
      }
    })
    .catch(function(err) { alert('Erro: ' + err.message); });
}

// ===== BUSCA GERAL AVANÇADA =====


// ===== BUSCA GERAL AVANÇADA (Plano de Contas) =====

function pcAbrirBuscaGeral() {
  var modal = document.getElementById('pcModalBuscaGeral');
  if (!modal) return;
  modal.style.display = 'block';
  setTimeout(function() {
    var inp = document.getElementById('pcBuscaGeralInput');
    if (inp) inp.focus();
  }, 100);
}

function pcFecharBuscaGeral() {
  var modal = document.getElementById('pcModalBuscaGeral');
  if (modal) modal.style.display = 'none';
}

function pcLimparBusca() {
  pcFiltroAtivo = null;
  pcFecharBuscaGeral();
  filtrarTabela();
}

function pcExecutarBuscaGeral() {
  var input = document.getElementById('pcBuscaGeralInput');
  if (!input) return;
  var texto = input.value.trim();
  pcFiltroAtivo = texto ? texto : null;
  pcFecharBuscaGeral();
  filtrarTabela();
}

var pcCampos = { codigo: 1, desc: 2, grupo: 3, tipo: 4 };

function pcExecutarFiltroAvancado(linha) {
  if (!pcFiltroAtivo) return true;
  var termos = pcFiltroAtivo.split(';');
  for (var t = 0; t < termos.length; t++) {
    var termo = termos[t].trim();
    if (!termo) continue;

    // Excluir: -PALAVRA
    if (termo.charAt(0) === '-' && termo.indexOf(':') === -1) {
      var excluir = termo.substring(1).toUpperCase();
      if (linha.textContent.toUpperCase().indexOf(excluir) >= 0) return false;
      continue;
    }

    // Campo especifico: campo:valor
    if (termo.indexOf(':') >= 0) {
      var parts = termo.split(':');
      var campo = parts[0].toLowerCase().trim();
      var valor = parts.slice(1).join(':').toUpperCase().trim();
      if (campo.charAt(0) === '-') {
        campo = campo.substring(1);
        var idx = pcCampos[campo];
        if (idx !== undefined) {
          var cellVal = (linha.cells[idx] ? linha.cells[idx].textContent : '').toUpperCase().trim();
          if (cellVal.indexOf(valor) >= 0) return false;
        }
        continue;
      }
      var idx2 = pcCampos[campo];
      if (idx2 !== undefined) {
        var cellVal2 = (linha.cells[idx2] ? linha.cells[idx2].textContent : '').toUpperCase().trim();
        if (cellVal2.indexOf(valor) === -1) return false;
      } else {
        if (linha.textContent.toUpperCase().indexOf(valor) === -1) return false;
      }
      continue;
    }

    // Palavra simples
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
    var header = document.getElementById('pcBuscaGeralHeader');
    modal = document.getElementById('pcModalBuscaGeral');
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


function pcFecharBuscaGeral() {
  var modal = document.getElementById('pcModalBuscaGeral');
  if (modal) modal.style.display = 'none';
}

function pcLimparBusca() {
  pcFiltroAtivo = null;
  pcFecharBuscaGeral();
  filtrarTabela();
}

function pcExecutarBuscaGeral() {
  var input = document.getElementById('pcBuscaGeralInput');
  if (!input) return;
  var texto = input.value.trim();
  pcFiltroAtivo = texto ? texto : null;
  pcFecharBuscaGeral();
  filtrarTabela();
}

var pcCampos = { codigo: 1, desc: 2, grupo: 3, tipo: 4 };

function pcExecutarFiltroAvancado(linha) {
  if (!pcFiltroAtivo) return true;
  var termos = pcFiltroAtivo.split(';');
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
        var idx = pcCampos[campo];
        if (idx !== undefined) {
          var cellVal = (linha.cells[idx] ? linha.cells[idx].textContent : '').toUpperCase().trim();
          if (cellVal.indexOf(valor) >= 0) return false;
        }
        continue;
      }
      var idx2 = pcCampos[campo];
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
    var header = document.getElementById('pcBuscaGeralHeader');
    modal = document.getElementById('pcModalBuscaGeral');
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
    pcFecharBuscaGeral();
  }
});