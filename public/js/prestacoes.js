var preOrdemAsc = true;
var preColunaOrdenada = -1;
var preFiltroAtivo = null;

// Cria modal, substitui Busca Geral por botao, remove Buscar, adiciona DC e CF
(function() {
  var modalHtml = '<div id="preModalBuscaGeral" style="display:none;position:fixed;top:60px;right:40px;z-index:10001;background:#1e1e2e;border:1px solid #555;border-radius:8px;width:480px;box-shadow:0 8px 30px rgba(0,0,0,0.6);">';
  modalHtml += '<div id="preBuscaGeralHeader" style="background:#2a2a3e;color:#fff;padding:10px 16px;cursor:move;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;user-select:none;">';
  modalHtml += '<b>Busca Geral</b>';
  modalHtml += '<button onclick="preFecharBuscaGeral()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">X</button>';
  modalHtml += '</div>';
  modalHtml += '<div style="padding:16px;">';
  modalHtml += '<input type="text" id="preBuscaGeralInput" placeholder="Ex: MARIA;AEDU ou 01/01/2025..25/01/2025;nome:MARIA;PIX;-TED" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;box-sizing:border-box;">';
  modalHtml += '<div style="margin-top:8px;padding:10px;background:#1a1d29;border-radius:6px;font-size:12px;color:#a0c4e8;">';
  modalHtml += '<b>Como usar:</b><br>';
  modalHtml += '- Use ; para multiplas palavras<br>';
  modalHtml += '- Excluir: -AEDU<br>';
  modalHtml += '- Periodo: 01/01/2025..25/01/2025<br>';
  modalHtml += '- Valores: 100..500<br>';
  modalHtml += '- Operadores: >10 <100 >=10 <=100<br>';
  modalHtml += '- Por campo: nome:MARIA banco:756 cpf:25606<br>';
  modalHtml += '- Campos: nome, cpf, categoria, descategoria, subcategoria, dessubcategoria, banco, dc, cp, comp, loja, agencia, conta, extnome, valor, valpag, dtvenc, dtpag<br>';
  modalHtml += '- PAGO ou ABERTO (filtra por pagamento)<br>';
  modalHtml += '- Combina: 01/01/2025..25/01/2025;nome:MARIA;PIX;-TED';
  modalHtml += '</div>';
  modalHtml += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">';
  modalHtml += '<button class="btn btn-outline" onclick="preLimparBusca()">Limpar</button>';
  modalHtml += '<button class="btn btn-primary" onclick="preExecutarBuscaGeral()">Buscar</button>';
  modalHtml += '</div>';
  modalHtml += '</div>';
  modalHtml += '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Reduz tamanho dos elementos da toolbar para caber em uma linha
    var toolbar = document.querySelector('.mapa-toolbar');
    if (toolbar) {
      toolbar.style.flexWrap = 'nowrap';
      toolbar.style.gap = '5px';
      var elementos = toolbar.querySelectorAll('input, select, button');
      elementos.forEach(function(el) {
        el.style.padding = '5px 10px';
        el.style.fontSize = '14px';
        el.style.marginRight = '2px';
      });
      var benef = document.getElementById('preBeneficiario');
      if (benef) benef.style.width = '155px';
    }

  setTimeout(function() {
    // Substitui o input preBuscaGeral por um botao
    var input = document.getElementById('preBuscaGeral');
    if (input) {
      var btn = document.createElement('button');
      btn.className = 'mapa-btn btn-buscar';
      btn.textContent = 'Busca Geral';
      btn.style.cursor = 'pointer';
      btn.onclick = function() { preAbrirBuscaGeral(); };
      input.parentNode.replaceChild(btn, input);
    }

    // Remove o botao Buscar
    var botoes = document.querySelectorAll('#preTabela');
    var toolbar = document.querySelector('.mapa-toolbar');
    if (toolbar) {
      var btns = toolbar.querySelectorAll('button');
      btns.forEach(function(b) {
        if (b.textContent.trim() === 'Buscar') b.remove();
      });
    }

    // Adiciona DC e CP antes do Beneficiario
    var benef = document.getElementById('preBeneficiario');
    if (benef && benef.parentNode) {
      // DC
      var dc = document.createElement('select');
      dc.id = 'preFiltroDC';
      dc.style.cssText = 'padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;';
      dc.onchange = function() { preAplicarFiltros(); };
      dc.innerHTML = '<option value="">DC</option><option value="D">D</option><option value="C">C</option>';
      benef.parentNode.insertBefore(dc, benef);

      // CP
      var cf = document.createElement('select');
      cf.id = 'preFiltroCF';
      cf.style.cssText = 'padding:6px 12px;border:1px solid #ccc;border-radius:4px;font-size:14px;';
      cf.onchange = function() { preAplicarFiltros(); };
      cf.innerHTML = '<option value="">CP: </option><option value="S">C</option><option value="P">P</option>';
      benef.parentNode.insertBefore(cf, benef);
    }
  }, 200);
})();

function preVoltar() {
  loadPage('bancos');
}

function preAplicarFiltros() {
  var dataIni = document.getElementById('preDataIni').value;
  var dataFim = document.getElementById('preDataFim').value;
  var tipoData = document.getElementById('preTipoData').value;
  var beneficiario = '';
  var benefEl = document.getElementById('preBeneficiario');
  if (benefEl) beneficiario = benefEl.value.toLowerCase().trim();

  var dcFiltro = '';
  var dcEl = document.getElementById('preFiltroDC');
  if (dcEl) dcFiltro = dcEl.value;

  var cfFiltro = '';
  var cfEl = document.getElementById('preFiltroCF');
  if (cfEl) cfFiltro = cfEl.value;

  var linhas = document.querySelectorAll('#preCorpoTabela tr');
  var visiveis = 0;

  linhas.forEach(function(l) {
    if (l.cells.length < 2) { l.style.display = 'none'; return; }
    var mostrar = true;

    if (dataIni || dataFim) {
      var dataRow = tipoData === 'pagamento'
        ? l.getAttribute('data-dtpag')
        : l.getAttribute('data-dtvenc');
      if (!dataRow) {
        mostrar = false;
      } else {
        if (dataIni && dataRow < dataIni) mostrar = false;
        if (dataFim && mostrar && dataRow > dataFim) mostrar = false;
      }
    }

    // Filtro DC (coluna 4)
    if (mostrar && dcFiltro) {
      var dcCell = l.cells[4] ? l.cells[4].textContent.trim() : '';
      if (dcCell !== dcFiltro) mostrar = false;
    }

    // Filtro CF (coluna 5)
    if (mostrar && cfFiltro) {
      var cfCell = l.cells[5] ? l.cells[5].textContent.trim() : '';
      if (cfCell !== cfFiltro) mostrar = false;
    }

    if (mostrar && beneficiario) {
      var nomeCell = l.querySelector('.col-nome');
      var nome = nomeCell ? nomeCell.textContent.toLowerCase().trim() : '';
      if (nome.indexOf(beneficiario) === -1) mostrar = false;
    }

    if (mostrar && preFiltroAtivo) {
      mostrar = preExecutarFiltroAvancado(l);
    }

    l.style.display = mostrar ? '' : 'none';
    if (mostrar) visiveis++;
  });

  var status = document.getElementById('preStatusInfo');
  if (status) status.textContent = 'Total: ' + visiveis + ' prestação(ões)';
}

function preFiltrarTabela() {
  preAplicarFiltros();
}

function preSelecionarLinha(tr) {
  var sel = tr.parentElement.querySelector('.selecionado');
  if (sel) sel.classList.remove('selecionado');
  tr.classList.add('selecionado');
}

function preOrdenar(col) {
  var tbody = document.getElementById('preCorpoTabela');
  var linhas = Array.from(tbody.querySelectorAll('tr'));
  if (linhas.length === 0) return;
  if (linhas[0].cells.length < 2) return;

  preOrdemAsc = (col === preColunaOrdenada) ? !preOrdemAsc : true;
  preColunaOrdenada = col;

  linhas.sort(function(a, b) {
    var va = a.cells[col].textContent.trim();
    var vb = b.cells[col].textContent.trim();

    var na = parseFloat(va.replace(/\./g, '').replace(',', '.'));
    var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
      return preOrdemAsc ? na - nb : nb - na;
    }

    var da = va.split('/');
    var db = vb.split('/');
    if (da.length === 3 && db.length === 3) {
      var d1 = new Date(da[2], da[1] - 1, da[0]);
      var d2 = new Date(db[2], db[1] - 1, db[0]);
      return preOrdemAsc ? d1 - d2 : d2 - d1;
    }

    return preOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  linhas.forEach(function(l) { tbody.appendChild(l); });
}

function preExportarExcel() {
  var tabela = document.getElementById('preTabela');
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
  link.download = 'prestacoes.csv';
  link.click();
}

function preImprimir() {
  window.print();
}

function preToggleColunas() {
  document.getElementById('preOverlay').style.display = 'block';
  document.getElementById('preModalColunas').style.display = 'block';
}

function preToggleColuna(className, checkbox) {
  var cols = document.querySelectorAll('.' + className);
  var th = document.querySelector('th.' + className);
  cols.forEach(function(c) { c.style.display = checkbox.checked ? '' : 'none'; });
  if (th) th.style.display = checkbox.checked ? '' : 'none';
}

function preFecharModais() {
  document.getElementById('preOverlay').style.display = 'none';
  document.getElementById('preModalColunas').style.display = 'none';
}

// ===== BUSCA GERAL AVANÇADA =====

function preAbrirBuscaGeral() {
  var modal = document.getElementById('preModalBuscaGeral');
  if (!modal) return;
  modal.style.display = 'block';
  setTimeout(function() {
    var inp = document.getElementById('preBuscaGeralInput');
    if (inp) inp.focus();
  }, 100);
}

function preFecharBuscaGeral() {
  var modal = document.getElementById('preModalBuscaGeral');
  if (modal) modal.style.display = 'none';
}

function preLimparBusca() {
  preFiltroAtivo = null;
  preFecharBuscaGeral();
  preAplicarFiltros();
}

function preExecutarBuscaGeral() {
  var input = document.getElementById('preBuscaGeralInput');
  if (!input) return;
  var texto = input.value.trim();
  preFiltroAtivo = texto ? texto : null;
  preFecharBuscaGeral();
  preAplicarFiltros();
}

var preCampos = {
  nome: 7, cpf: 6, categoria: 8, descategoria: 9,
  subcategoria: 10, dessubcategoria: 11, banco: 17, dc: 4, cp: 5,
  comp: 14, loja: 1, agencia: 15, conta: 16, extnome: 18,
  valor: 3, valpag: 13, dtvenc: 2, dtpag: 12
};

function preParseDateBR(str) {
  var p = str.split('/');
  if (p.length === 3) return new Date(p[2], p[1] - 1, p[0]);
  var d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function preExecutarFiltroAvancado(linha) {
  if (!preFiltroAtivo) return true;
  var termos = preFiltroAtivo.split(';');
  for (var t = 0; t < termos.length; t++) {
    var termo = termos[t].trim();
    if (!termo) continue;

    if (termo.charAt(0) === '-' && termo.indexOf(':') === -1) {
      var excluir = termo.substring(1).toUpperCase();
      if (linha.textContent.toUpperCase().indexOf(excluir) >= 0) return false;
      continue;
    }

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

    if (termo.indexOf(':') >= 0) {
      var parts = termo.split(':');
      var campo = parts[0].toLowerCase().trim();
      var valor = parts.slice(1).join(':').toUpperCase().trim();
      if (campo.charAt(0) === '-') {
        campo = campo.substring(1);
        var idx = preCampos[campo];
        if (idx !== undefined) {
          var cellVal = (linha.cells[idx] ? linha.cells[idx].textContent : '').toUpperCase().trim();
          if (cellVal.indexOf(valor) >= 0) return false;
        }
        continue;
      }
      var idx2 = preCampos[campo];
      if (idx2 !== undefined) {
        var cellVal2 = (linha.cells[idx2] ? linha.cells[idx2].textContent : '').toUpperCase().trim();
        if (cellVal2.indexOf(valor) === -1) return false;
      } else {
        if (linha.textContent.toUpperCase().indexOf(valor) === -1) return false;
      }
      continue;
    }

    if (termo.indexOf('..') >= 0 && termo.indexOf('/') >= 0) {
      var partes = termo.split('..');
      var d1 = preParseDateBR(partes[0].trim());
      var d2 = preParseDateBR(partes[1].trim());
      if (d1 && d2) {
        var dtvenc = linha.getAttribute('data-dtvenc') ? new Date(linha.getAttribute('data-dtvenc')) : null;
        var dtpagR = linha.getAttribute('data-dtpag') ? new Date(linha.getAttribute('data-dtpag')) : null;
        var dataRow = dtvenc || dtpagR;
        if (!dataRow) return false;
        dataRow.setHours(0, 0, 0, 0);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(23, 59, 59, 999);
        if (dataRow < d1 || dataRow > d2) return false;
      }
      continue;
    }

    if (termo.indexOf('..') >= 0) {
      var vp = termo.split('..');
      var vmin = parseFloat(vp[0].trim().replace(/\./g, '').replace(',', '.'));
      var vmax = parseFloat(vp[1].trim().replace(/\./g, '').replace(',', '.'));
      if (!isNaN(vmin) && !isNaN(vmax)) {
        var valorCel = parseFloat((linha.cells[3] ? linha.cells[3].textContent : '0').replace(/\./g, '').replace(',', '.'));
        if (isNaN(valorCel) || valorCel < vmin || valorCel > vmax) return false;
      }
      continue;
    }

    var match = termo.match(/^([><]=?)(.+)$/);
    if (match) {
      var op = match[1];
      var num = parseFloat(match[2].trim().replace(/\./g, '').replace(',', '.'));
      if (!isNaN(num)) {
        var valorCel2 = parseFloat((linha.cells[3] ? linha.cells[3].textContent : '0').replace(/\./g, '').replace(',', '.'));
        if (isNaN(valorCel2)) return false;
        if (op === '>' && !(valorCel2 > num)) return false;
        if (op === '<' && !(valorCel2 < num)) return false;
        if (op === '>=' && !(valorCel2 >= num)) return false;
        if (op === '<=' && !(valorCel2 <= num)) return false;
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
    var header = document.getElementById('preBuscaGeralHeader');
    modal = document.getElementById('preModalBuscaGeral');
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

  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
})();

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    preFecharModais();
    preFecharBuscaGeral();
  }
});