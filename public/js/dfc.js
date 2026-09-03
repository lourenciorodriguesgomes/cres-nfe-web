var dfcOrdemAsc = true;
var dfcColunaOrdenada = -1;
var dfcFiltroAtivo = null;

function dfcFmtValor(v) {
    var n = parseFloat(v) || 0;
    var s = n.toFixed(2);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
}

function dfcVoltar() {
    loadPage('bancos');
}

function dfcAplicar() {
    var dataIni = document.getElementById('dfcDataIni').value;
    var dataFim = document.getElementById('dfcDataFim').value;
    var filial = document.getElementById('dfcFilial').value;
    var receber = document.getElementById('dfcReceber').checked ? '1' : '0';
    var pagar = document.getElementById('dfcPagar').checked ? '1' : '0';
    var confirmado = document.getElementById('dfcConfirmado').checked ? '1' : '0';
    var previsao = document.getElementById('dfcPrevisao').checked ? '1' : '0';
    var quitados = '3';
    var radios = document.getElementsByName('dfcQuitados');
    for (var i = 0; i < radios.length; i++) {
        if (radios[i].checked) quitados = radios[i].value;
    }
    var params = '?dataini=' + encodeURIComponent(dataIni) +
        '&datafim=' + encodeURIComponent(dataFim) +
        '&filial=' + encodeURIComponent(filial) +
        '&receber=' + receber + '&pagar=' + pagar +
        '&confirmado=' + confirmado + '&previsao=' + previsao +
        '&quitados=' + quitados;

    window.location.hash = 'dfc' + params;
    loadPage('dfc');
}


function dfcAplicarBusca() {
    var linhas = document.querySelectorAll('#dfcCorpoTabela tr');
    var visiveis = 0;
    linhas.forEach(function(l) {
        if (l.classList.contains('linha-total')) { l.style.display = 'none'; return; }
        if (l.cells.length < 2) return;
        var mostrar = true;
        if (dfcFiltroAtivo) {
            mostrar = dfcExecutarFiltroAvancado(l);
        }
        l.style.display = mostrar ? '' : 'none';
        if (mostrar) visiveis++;
    });
    dfcRecalcularTotais(visiveis);
}

function dfcRecalcularTotais(visiveis) {
    var linhas = document.querySelectorAll('#dfcCorpoTabela tr');
    var totMes = [0,0,0,0,0,0,0,0,0,0,0,0];
    var totAnt = 0;
    var totGer = 0;
    linhas.forEach(function(l) {
        if (l.classList.contains('linha-total')) return;
        if (l.cells.length < 2) return;
        if (l.style.display === 'none') return;
        var ant = parseFloat(l.cells[6].textContent.replace(/\./g, '').replace(',', '.')) || 0;
        totAnt += ant;
        for (var m = 0; m < 12; m++) {
            var v = parseFloat(l.cells[7 + m].textContent.replace(/\./g, '').replace(',', '.')) || 0;
            totMes[m] += v;
        }
        var tot = parseFloat(l.cells[19].textContent.replace(/\./g, '').replace(',', '.')) || 0;
        totGer += tot;
    });
    var totalRow = document.querySelector('#dfcCorpoTabela .linha-total');
    if (totalRow) {
        totalRow.style.display = visiveis > 0 ? '' : 'none';
        if (totalRow.cells[6]) totalRow.cells[6].textContent = dfcFmtValor(totAnt);
        for (var m = 0; m < 12; m++) {
            if (totalRow.cells[7 + m]) totalRow.cells[7 + m].textContent = dfcFmtValor(totMes[m]);
        }
        if (totalRow.cells[19]) totalRow.cells[19].textContent = dfcFmtValor(totGer);
    }
    var status = document.getElementById('dfcStatusInfo');
    if (status) {
        status.innerHTML = 'Total: ' + visiveis + ' cliente(s) | Ano Anterior: R$ ' + dfcFmtValor(totAnt) + ' | Total Geral: R$ ' + dfcFmtValor(totGer);
    }
}

function dfcOrdenar(col) {
    var tbody = document.getElementById('dfcCorpoTabela');
    var totalRow = tbody.querySelector('.linha-total');
    var linhas = Array.from(tbody.querySelectorAll('tr:not(.linha-total)'));
    if (linhas.length === 0) return;

    dfcOrdemAsc = (col === dfcColunaOrdenada) ? !dfcOrdemAsc : true;
    dfcColunaOrdenada = col;

    linhas.sort(function(a, b) {
        var va = a.cells[col].textContent.trim();
        var vb = b.cells[col].textContent.trim();
        var na = parseFloat(va.replace(/\./g, '').replace(',', '.'));
        var nb = parseFloat(vb.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(na) && !isNaN(nb) && va !== '' && vb !== '') {
            return dfcOrdemAsc ? na - nb : nb - na;
        }
        return dfcOrdemAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    linhas.forEach(function(l) { tbody.appendChild(l); });
    if (totalRow) tbody.appendChild(totalRow);
}

function dfcExportarExcel() {
    var tabela = document.getElementById('dfcTabela');
    var linhas = tabela.querySelectorAll('tbody tr');
    var visiveis = [];
    linhas.forEach(function(l) {
        if (l.style.display !== 'none' && l.cells.length > 1) visiveis.push(l);
    });
    if (visiveis.length === 0) { alert('Nenhum registro para exportar'); return; }

    var nomesMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var headers = ['Ord','Código','Nome do Cliente / Fornecedor','Empresa','C. Custo','Categoria','Anterior'];
    nomesMes.forEach(function(m) { headers.push(m); });
    headers.push('Total');

    var csv = headers.join(';') + '\n';
    visiveis.forEach(function(l) {
        var vals = [];
        for (var i = 0; i < l.cells.length; i++) {
            var v = l.cells[i].textContent.trim();
            vals.push('"' + v.replace(/"/g, '""') + '"');
        }
        csv += vals.join(';') + '\n';
    });

    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'dfc_mensal.csv';
    link.click();
}

function dfcImprimir() {
    window.print();
}

// ===== BUSCA GERAL =====

function dfcAbrirBuscaGeral() {
    var modal = document.getElementById('dfcModalBuscaGeral');
    if (!modal) return;
    modal.style.display = 'block';
    setTimeout(function() {
        var inp = document.getElementById('dfcBuscaGeralInput');
        if (inp) inp.focus();
    }, 100);
}

function dfcFecharBuscaGeral() {
    var modal = document.getElementById('dfcModalBuscaGeral');
    if (modal) modal.style.display = 'none';
}

function dfcLimparBusca() {
    dfcFiltroAtivo = null;
    var inp = document.getElementById('dfcBuscaGeralInput');
    if (inp) inp.value = '';
    dfcFecharBuscaGeral();
    dfcAplicarBusca();
}

function dfcExecutarBuscaGeral() {
    var input = document.getElementById('dfcBuscaGeralInput');
    if (!input) return;
    var texto = input.value.trim();
    dfcFiltroAtivo = texto ? texto : null;
    dfcFecharBuscaGeral();
    dfcAplicarBusca();
}

// 0=Ord, 1=Cod, 2=Nome, 3=Empresa, 4=CC, 5=Categoria, 6=Anterior, 7-18=Jan-Dez, 19=Total
var dfcMesMap = {
    jan: 7, fev: 8, mar: 9, abr: 10, mai: 11, jun: 12,
    jul: 13, ago: 14, set: 15, out: 16, nov: 17, dez: 18
};
var dfcCampos = {
    nome: 2, cod: 1, empresa: 3, cc: 4, categoria: 5,
    ant: 6, total: 19
};

function dfcExecutarFiltroAvancado(linha) {
    if (!dfcFiltroAtivo) return true;
    var termos = dfcFiltroAtivo.split(';');
    for (var t = 0; t < termos.length; t++) {
        var termo = termos[t].trim();
        if (!termo) continue;

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

            // Mês: jan:100
            if (dfcMesMap[campo] !== undefined) {
                var idxM = dfcMesMap[campo];
                var cellM = (linha.cells[idxM] ? linha.cells[idxM].textContent : '0').replace(/\./g, '').replace(',', '.');
                var valM = parseFloat(cellM) || 0;

                // Range
                if (valor.indexOf('..') >= 0) {
                    var vp = valor.split('..');
                    var vmin = parseFloat(vp[0].replace(/\./g, '').replace(',', '.'));
                    var vmax = parseFloat(vp[1].replace(/\./g, '').replace(',', '.'));
                    if (!isNaN(vmin) && !isNaN(vmax)) {
                        if (valM < vmin || valM > vmax) return false;
                    }
                    continue;
                }
                // Operador
                var matchM = valor.match(/^([><]=?)(.+)$/);
                if (matchM) {
                    var opM = matchM[1];
                    var numM = parseFloat(matchM[2].replace(/\./g, '').replace(',', '.'));
                    if (!isNaN(numM)) {
                        if (opM === '>' && !(valM > numM)) return false;
                        if (opM === '<' && !(valM < numM)) return false;
                        if (opM === '>=' && !(valM >= numM)) return false;
                        if (opM === '<=' && !(valM <= numM)) return false;
                    }
                    continue;
                }
                // Valor exato
                var numEx = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
                if (!isNaN(numEx)) {
                    if (valM !== numEx) return false;
                }
                continue;
            }

            // Outros campos
            if (campo.charAt(0) === '-') {
                campo = campo.substring(1);
                var idx = dfcCampos[campo];
                if (idx !== undefined) {
                    var cellVal = (linha.cells[idx] ? linha.cells[idx].textContent : '').toUpperCase().trim();
                    if (cellVal.indexOf(valor) >= 0) return false;
                }
                continue;
            }
            var idx2 = dfcCampos[campo];
            if (idx2 !== undefined) {
                var cellVal2 = (linha.cells[idx2] ? linha.cells[idx2].textContent : '').toUpperCase().trim();
                if (cellVal2.indexOf(valor) === -1) return false;
            }
            continue;
        }

        // Range de valores: 100..500
        if (termo.indexOf('..') >= 0) {
            var vp = termo.split('..');
            var vmin = parseFloat(vp[0].trim().replace(/\./g, '').replace(',', '.'));
            var vmax = parseFloat(vp[1].trim().replace(/\./g, '').replace(',', '.'));
            if (!isNaN(vmin) && !isNaN(vmax)) {
                var tot = parseFloat((linha.cells[19] ? linha.cells[19].textContent : '0').replace(/\./g, '').replace(',', '.')) || 0;
                if (tot < vmin || tot > vmax) return false;
            }
            continue;
        }

        // Operadores: >10 <100 >=10 <=100
        var match = termo.match(/^([><]=?)(.+)$/);
        if (match) {
            var op = match[1];
            var num = parseFloat(match[2].trim().replace(/\./g, '').replace(',', '.'));
            if (!isNaN(num)) {
                var tot2 = parseFloat((linha.cells[19] ? linha.cells[19].textContent : '0').replace(/\./g, '').replace(',', '.')) || 0;
                if (op === '>' && !(tot2 > num)) return false;
                if (op === '<' && !(tot2 < num)) return false;
                if (op === '>=' && !(tot2 >= num)) return false;
                if (op === '<=' && !(tot2 <= num)) return false;
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
        var header = document.getElementById('dfcBuscaGeralHeader');
        modal = document.getElementById('dfcModalBuscaGeral');
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
        dfcFecharBuscaGeral();
    }
});