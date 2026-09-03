var fcOrdemAsc = true;
var fcColunaOrdenada = -1;
var fcFiltroAtivo = null;

function fcFmtValor(v) {
  var n = parseFloat(v) || 0;
  var s = n.toFixed(2);
  var parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return parts.join(',');
}

function fcVoltar() {
  loadPage('bancos');
}

function fcAplicarFiltros() {
  var dataIni = document.getElementById('fcDataIni').value;
  var dataFim = document.getElementById('fcDataFim').value;
  var tipoData = document.getElementById('fcTipoData').value;
  var filial = document.getElementById('fcFilial').value;

  var chkReceber = document.getElementById('fcReceber').checked;
  var chkPagar = document.getElementById('fcPagar').checked;
  var chkConfirmado = document.getElementById('fcConfirmado').checked;
  var chkPrevisao = document.getElementById('fcPrevisao').checked;
  var chkQuitados = document.getElementById('fcQuitados').checked;
  var chkEmAberto = document.getElementById('fcEmAberto').checked;

  var linhas = document.querySelectorAll('#fcCorpoTabela tr');

  linhas.forEach(function(l) {
    if (l.classList.contains('linha-total')) { l.style.display = 'none'; return; }
    if (l.id === 'linhaVazia') return;
    if (l.cells.length < 2) return;

    var mostrar = true;

    // Filtro de data
    if (dataIni || dataFim) {
      var dataRow = (tipoData === 'pagamento')
        ? l.getAttribute('data-dtpag')
        : l.getAttribute('data-dtvenc');
      if (!dataRow) {
        mostrar = false;
      } else {
        if (dataIni && dataRow < dataIni) mostrar = false;
        if (dataFim && mostrar && dataRow > dataFim) mostrar = false;
      }
    }

    // Filtro de filial
    if (mostrar && filial) {
      var lojaRow = l.getAttribute('data-loja') || '';
      if (lojaRow !== filial) mostrar = false;
    }

    // Filtro DC (Receber/Pagar)
    if (mostrar) {
      var dc = l.getAttribute('data-dc') || '';
      if (dc === 'C' && !chkReceber) mostrar = false;
      if (dc === 'D' && !chkPagar) mostrar = false;
    }

    // Filtro CF (Confirmado/Previsão)
    if (mostrar) {
      var cp = l.getAttribute('data-cp') || '';
      if (cp === 'C' && !chkConfirmado) mostrar = false;
      if (cp === 'P' && !chkPrevisao) mostrar = false;
    }

    // Filtro Quitados/Em Aberto
    if (mostrar) {
      var dtpag = l.getAttribute('data-dtpag') || '';
      if (dtpag && !chkQuitados) mostrar = false;
      if (!dtpag && !chkEmAberto) mostrar = false;
    }

    // Busca Geral
    if (mostrar && fcFiltroAtivo) {
      mostrar = fcExecutarFiltroAvancado(l);
    }

    l.style.display = mostrar ? '' : 'none';
  });

  fcRecalcularSaldos();
}

function fcRecalcularSaldos() {
  var linhas = document.querySelectorAll('#fcCorpoTabela tr');
  var saldo = 0;
  var totalCred = 0;
  var totalDeb = 0;
  var visiveis = 0;

  linhas.forEach(function(l) {
    if (l.classList.contains('linha-total')) return;
    if (l.id === 'linhaVazia') return;
    if (l.cells.length < 2) return;
    if (l.style.display === 'none') return;

    var cred = parseFloat(l.getAttribute('data-cred')) || 0;
    var deb = parseFloat(l.getAttribute('data-deb')) || 0;
    saldo += cred - deb;
    totalCred += cred;
    totalDeb += deb;
    visiveis++;

    if (l.cells[11]) {
      l.cells[11].textContent = fcFmtValor(saldo);
    }
  });

  // Atualiza linha de totais
  var totalRow = document.querySelector('#fcCorpoTabela .linha-total');
  if (totalRow) {
    totalRow.style.display = visiveis > 0 ? '' : 'none';
    if (totalRow.cells[9]) totalRow.cells[9].textContent = fcFmtValor(totalCred);
    if (totalRow.cells[10]) totalRow.cells[10].textContent = fcFmtValor(totalDeb);
    if (totalRow.cells[11]) totalRow.cells[11].textContent = fcFmtValor(saldo);
  }

  // Atualiza status
  var status = document.getElementById('fcStatusInfo');
  if (status) {
    status.innerHTML = 'Total: ' + visiveis + ' registro(s) | Crédito: R$ ' + fcFmtValor(totalCred) + ' | Débito: R$ ' + fcFmtValor(totalDeb) + ' | Saldo: R$ ' + fcFmtValor(saldo);
  }
}

function fcSelecionarLinha(tr) {
  var sel = tr.parentElement.querySelector('.selecionado');
  if (sel) sel.classList.remove('selecionado');
  tr.classList.add('selecionado');
}

function fcOrdenar(col) {
  var tbody = document.getElementById('fcCorpoTabela');
  var totalRow = tbody.querySelector('.linha-total');
  var linhas = Array.from(tbody.querySelectorAll('tr:not(.linha-total)'));
  if (linhas.length === 0) return;
  if (linhas[0].cells.length < 2) return;

  fcOrdemAsc = (col === fcColunaOrdenada) ? !fcOrdemAsc : true;
  fcColunaOrdenada = col;

  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();

    // Valor numérico
    var na = parseFloat(va.replace(/\./g, '').replace(',', '.'));
    var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
      return fcOrdemAsc ? na - nb : nb - na;
    }

    // Data DD/MM/YYYY
    var da = va.split('/');
    var db = vb.split('/');
    if (da.length === 3 && db.length === 3) {
      var d1 = new Date(da[2], da[1] - 1, da[0]);
      var d2 = new Date(db[2], db[1] - 1, db[0]);
      return fcOrdemAsc ? d1 - d2 : d2 - d1;
    }

    return fcOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  linhas.forEach(function(l) { tbody.appendChild(l); });
  if (totalRow) tbody.appendChild(totalRow);

  fcRecalcularSaldos();
}

function fcExportarExcel() {
  var tabela = document.getElementById('fcTabela');
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
  link.download = 'fluxo_caixa.csv';
  link.click();
}

function fcImprimir() {
  window.print();
}

// ===== BUSCA GERAL AVANÇADA =====

function fcAbrirBuscaGeral() {
  var modal = document.getElementById('fcModalBuscaGeral');
  if (!modal) return;
  modal.style.display = 'block';
  setTimeout(function() {
    var inp = document.getElementById('fcBuscaGeralInput');
    if (inp) inp.focus();
  }, 100);
}

function fcFecharBuscaGeral() {
  var modal = document.getElementById('fcModalBuscaGeral');
  if (modal) modal.style.display = 'none';
}

function fcLimparBusca() {
  fcFiltroAtivo = null;
  fcFecharBuscaGeral();
  fcAplicarFiltros();
}

function fcExecutarBuscaGeral() {
  var input = document.getElementById('fcBuscaGeralInput');
  if (!input) return;
  var texto = input.value.trim();
  fcFiltroAtivo = texto ? texto : null;
  fcFecharBuscaGeral();
  fcAplicarFiltros();
}

// col: 0=Ord, 1=Loja, 2=DtVenc, 3=ConPre, 4=DebCre, 5=Oper, 6=Cod, 7=Nome, 8=DtPag, 9=Cred, 10=Deb, 11=Saldo
var fcCampos = {
  nome: 7, cod: 6, loja: 1, oper: 5,
  dtvenc: 2, dtpag: 8, conpre: 3, debcre: 4,
  cred: 9, deb: 10, saldo: 11
};

function fcParseDateBR(str) {
  var p = str.split('/');
  if (p.length === 3) return new Date(p[2], p[1] - 1, p[0]);
  var d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function fcExecutarFiltroAvancado(linha) {
  if (!fcFiltroAtivo) return true;
  var termos = fcFiltroAtivo.split(';');
  for (var t = 0; t < termos.length; t++) {
    var termo = termos[t].trim();
    if (!termo) continue;

    // PAGO / ABERTO
    if (termo.toUpperCase() === 'PAGO') {
      var dtpag = linha.getAttribute('data-dtpag');
      if (!dtpag || dtpag === '') return false;
      continue;
    }
    if (termo.toUpperCase() === 'ABERTO') {
      var dtpag2 = linha.getAttribute('data-dtpag');
      if (dtpag2 && dtpag2 !== '') return false;
      continue;
    }

    // Excluir: -PALAVRA
    if (termo.charAt(0) === '-' && termo.indexOf(':') === -1) {
      var excluir = termo.substring(1).toUpperCase();
      if (linha.textContent.toUpperCase().indexOf(excluir) >= 0) return false;
      continue;
    }

    // Campo específico: campo:valor
    if (termo.indexOf(':') >= 0) {
      var parts = termo.split(':');
      var campo = parts[0].toLowerCase().trim();
      var valor = parts.slice(1).join(':').toUpperCase().trim();
      if (campo.charAt(0) === '-') {
        campo = campo.substring(1);
        var idx = fcCampos[campo];
        if (idx !== undefined) {
          var cellVal = (linha.cells[idx] ? linha.cells[idx].textContent : '').toUpperCase().trim();
          if (cellVal.indexOf(valor) >= 0) return false;
        }
        continue;
      }
      var idx2 = fcCampos[campo];
      if (idx2 !== undefined) {
        var cellVal2 = (linha.cells[idx2] ? linha.cells[idx2].textContent : '').toUpperCase().trim();
        if (cellVal2.indexOf(valor) === -1) return false;
      } else {
        if (linha.textContent.toUpperCase().indexOf(valor) === -1) return false;
      }
      continue;
    }

    // Período de datas: 01/01/2025..25/01/2025
    if (termo.indexOf('..') >= 0 && termo.indexOf('/') >= 0) {
      var partes = termo.split('..');
      var d1 = fcParseDateBR(partes[0].trim());
      var d2 = fcParseDateBR(partes[1].trim());
      if (d1 && d2) {
        var dtvenc = linha.getAttribute('data-dtvenc') ? new Date(linha.getAttribute('data-dtvenc')) : null;
        var dtpagR = linha.getAttribute('data-dtpag') ? new Date(linha.getAttribute('data-dtpag')) : null;
        var dataRow = dtpagR || dtvenc;
        if (!dataRow) return false;
        dataRow.setHours(0, 0, 0, 0);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(23, 59, 59, 999);
        if (dataRow < d1 || dataRow > d2) return false;
      }
      continue;
    }

    // Range de valores: 100..500
    if (termo.indexOf('..') >= 0) {
      var vp = termo.split('..');
      var vmin = parseFloat(vp[0].trim().replace(/\./g, '').replace(',', '.'));
      var vmax = parseFloat(vp[1].trim().replace(/\./g, '').replace(',', '.'));
      if (!isNaN(vmin) && !isNaN(vmax)) {
        var cred = parseFloat(linha.getAttribute('data-cred')) || 0;
        var deb = parseFloat(linha.getAttribute('data-deb')) || 0;
        if ((cred < vmin || cred > vmax) && (deb < vmin || deb > vmax)) return false;
      }
      continue;
    }

    // Operadores: >10 <100 >=10 <=100
    var match = termo.match(/^([><]=?)(.+)$/);
    if (match) {
      var op = match[1];
      var num = parseFloat(match[2].trim().replace(/\./g, '').replace(',', '.'));
      if (!isNaN(num)) {
        var cred2 = parseFloat(linha.getAttribute('data-cred')) || 0;
        var deb2 = parseFloat(linha.getAttribute('data-deb')) || 0;
        var valCheck = cred2 > 0 ? cred2 : deb2;
        if (op === '>' && !(valCheck > num)) return false;
        if (op === '<' && !(valCheck < num)) return false;
        if (op === '>=' && !(valCheck >= num)) return false;
        if (op === '<=' && !(valCheck <= num)) return false;
      }
      continue;
    }

    // Palavra simples
    var palavra = termo.toUpperCase();
    var encontrou = false;
    for (var c = 0; c < linha.cells.length; c++) {
      if (linha.cells[c].style.display === 'none') continue;
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
    var header = document.getElementById('fcBuscaGeralHeader');
    modal = document.getElementById('fcModalBuscaGeral');
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
    fcFecharBuscaGeral();
  }
});

// Aplica filtros iniciais ao carregar
setTimeout(function() { fcAplicarFiltros(); }, 100);