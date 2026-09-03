const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

function fmtValor(v) {
    var n = parseFloat(v) || 0;
    var s = n.toFixed(2);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
}

router.get('/', async (req, res) => {
    try {
        var mquitados = req.query.quitados || '3';
        var mareceber = req.query.receber !== '0';
        var mapagar = req.query.pagar !== '0';
        var mconfirmado = req.query.confirmado !== '0';
        var mprevisao = req.query.previsao !== '0';
        var mvendaloja = req.query.filial || '';

        var today = new Date();
        var year = today.getFullYear();
        var dataIni = req.query.dataini || (year + '-01-01');
        var dataFim = req.query.datafim || (year + '-12-31');

        var nYearPrev = new Date(dataIni).getFullYear() - 1;
        var cPrevYearStart = nYearPrev + '-01-01';
        var cPrevYearEnd = nYearPrev + '-12-31';

        var cDataField = (mquitados === '1') ? 'dtpagto' : 'dtvencim';

        // Carrega filiais
        var [filiais] = await pool.query('SELECT codigo, nome FROM empresasgrupo ORDER BY nome');
        var filiaisOpts = '<option value="">Todas as Filiais</option>';
        filiais.forEach(function(f) {
            filiaisOpts += '<option value="' + (f.codigo || '') + '"' + (mvendaloja === f.codigo ? ' selected' : '') + '>' + (f.nome || '') + '</option>';
        });

        // Carrega genero e categoria
        var [generos] = await pool.query('SELECT codigo, categoria FROM genero');
        var [categorias] = await pool.query('SELECT codigo, categoria FROM categoria');

        function buscaCategoria(cencusto) {
            for (var i = 0; i < generos.length; i++) {
                if (String(generos[i].codigo).trim() === String(cencusto || '').trim()) {
                    var cat = generos[i].categoria;
                    for (var j = 0; j < categorias.length; j++) {
                        if (String(categorias[j].codigo).trim() === String(cat).trim()) {
                            return categorias[j].categoria || '';
                        }
                    }
                }
            }
            return '';
        }

        // ===== Consulta ano anterior =====
        var sqlPrev = "SELECT p.cdcliente, SUM(p.valorpres) AS total_prev " +
            "FROM prestacao p WHERE p.sql_deleted <> 'T' ";
        if (mquitados === '1') {
            sqlPrev += "AND p.dtpagto IS NOT NULL ";
        } else if (mquitados === '2') {
            sqlPrev += "AND p.dtpagto IS NULL ";
        }
        sqlPrev += "AND p." + cDataField + " >= ? AND p." + cDataField + " <= ? ";
        if (mvendaloja) sqlPrev += "AND p.vendaloja = ? ";
        if (mconfirmado && !mprevisao) sqlPrev += "AND p.confprevis = 'C' ";
        else if (mprevisao && !mconfirmado) sqlPrev += "AND p.confprevis = 'P' ";
        if (mareceber && !mapagar) sqlPrev += "AND p.debitocred = 'C' ";
        else if (mapagar && !mareceber) sqlPrev += "AND p.debitocred = 'D' ";
        sqlPrev += "GROUP BY p.cdcliente";

        var paramsPrev = [cPrevYearStart, cPrevYearEnd];
        if (mvendaloja) paramsPrev.push(mvendaloja);

        var [prevRows] = await pool.query(sqlPrev, paramsPrev);
        var hPrevYear = {};
        var nTotAnterior = 0;
        prevRows.forEach(function(r) {
            var key = String(r.cdcliente || '').trim();
            if (key) {
                var val = parseFloat(r.total_prev) || 0;
                hPrevYear[key] = val;
                nTotAnterior += val;
            }
        });

        // ===== Consulta principal =====
        var sql = "SELECT p.cdcliente, c.nomecli, c.cencusto, p." + cDataField + " AS data, " +
            "p.valorpres, p.debitocred, p.confprevis, COALESCE(e.nome,'') AS nome_empresa " +
            "FROM prestacao p " +
            "JOIN clientes c ON p.cdcliente = c.cdcliente " +
            "LEFT JOIN empresasgrupo e ON p.vendaloja = e.codigo " +
            "WHERE p.sql_deleted <> 'T' ";
        if (mquitados === '1') {
            sql += "AND p.dtpagto IS NOT NULL ";
        } else if (mquitados === '2') {
            sql += "AND p.dtpagto IS NULL ";
        }
        sql += "AND p." + cDataField + " BETWEEN ? AND ? ";
        if (mvendaloja) sql += "AND p.vendaloja = ? ";
        if (mconfirmado && !mprevisao) sql += "AND p.confprevis = 'C' ";
        else if (mprevisao && !mconfirmado) sql += "AND p.confprevis = 'P' ";
        if (mareceber && !mapagar) sql += "AND p.debitocred = 'C' ";
        else if (mapagar && !mareceber) sql += "AND p.debitocred = 'D' ";
        sql += "ORDER BY c.nomecli";

        var params = [dataIni, dataFim];
        if (mvendaloja) params.push(mvendaloja);

        var [rows] = await pool.query(sql, params);

        // ===== Processamento — agrupar por cliente =====
        var clientes = [];
        var hIndex = {};
        var aTotMes = [0,0,0,0,0,0,0,0,0,0,0,0];
        var nTotGeral = 0;
        var nomesMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        rows.forEach(function(r) {
            var key = String(r.cdcliente || '').trim();
            if (!key) return;

            var cCencusto = r.cencusto || '';
            var cNomeCat = buscaCategoria(cCencusto);
            var nAnterior = hPrevYear[key] || 0;

            if (!hIndex[key]) {
                clientes.push({
                    ord: clientes.length + 1,
                    cod: key,
                    nome: r.nomecli || '',
                    empresa: r.nome_empresa || '',
                    cencusto: cCencusto,
                    categoria: cNomeCat,
                    anterior: nAnterior,
                    meses: [0,0,0,0,0,0,0,0,0,0,0,0],
                    total: 0
                });
                hIndex[key] = clientes.length - 1;
            }

            var idx = hIndex[key];
            var nValor = parseFloat(r.valorpres) || 0;
            var dataVal = r.data;
            var nMes = 0;
            if (dataVal instanceof Date) {
                nMes = dataVal.getMonth() + 1;
            } else if (typeof dataVal === 'string') {
                var parts = dataVal.split('-');
                if (parts.length >= 2) nMes = parseInt(parts[1]);
            }
            if (nMes >= 1 && nMes <= 12) {
                clientes[idx].meses[nMes - 1] += nValor;
                clientes[idx].total += nValor;
                aTotMes[nMes - 1] += nValor;
                nTotGeral += nValor;
            }
        });

        // ===== Monta HTML da tabela =====
        var linhas = '';
        clientes.forEach(function(c) {
            linhas += '<tr data-cod="' + c.cod + '" style="cursor:pointer;">';
            linhas += '<td class="col-ord">' + c.ord + '</td>';
            linhas += '<td class="col-cod">' + c.cod + '</td>';
            linhas += '<td class="col-nome">' + c.nome + '</td>';
            linhas += '<td class="col-emp">' + c.empresa + '</td>';
            linhas += '<td class="col-cc">' + c.cencusto + '</td>';
            linhas += '<td class="col-cat">' + c.categoria + '</td>';
            linhas += '<td class="col-ant" style="text-align:right;">' + fmtValor(c.anterior) + '</td>';
            for (var m = 0; m < 12; m++) {
                linhas += '<td class="col-mes' + m + '" style="text-align:right;">' + fmtValor(c.meses[m]) + '</td>';
            }
            linhas += '<td class="col-total" style="text-align:right;font-weight:bold;">' + fmtValor(c.total) + '</td>';
            linhas += '</tr>';
        });

        // Linha de totais
        if (clientes.length > 0) {
            linhas += '<tr class="linha-total" style="font-weight:bold;background:#2a2a3e;color:#fff;">';
            linhas += '<td class="col-ord"></td><td class="col-cod"></td><td class="col-nome">TOTAL:</td>';
            linhas += '<td class="col-emp"></td><td class="col-cc"></td><td class="col-cat"></td>';
            linhas += '<td class="col-ant" style="text-align:right;">' + fmtValor(nTotAnterior) + '</td>';
            for (var m = 0; m < 12; m++) {
                linhas += '<td class="col-mes' + m + '" style="text-align:right;">' + fmtValor(aTotMes[m]) + '</td>';
            }
            linhas += '<td class="col-total" style="text-align:right;">' + fmtValor(nTotGeral) + '</td>';
            linhas += '</tr>';
        }

        if (clientes.length === 0) {
            linhas = '<tr><td colspan="20" style="text-align:center;padding:20px;">Nenhum registro encontrado</td></tr>';
        }

        var chkReceber = mareceber ? 'checked' : '';
        var chkPagar = mapagar ? 'checked' : '';
        var chkConfirmado = mconfirmado ? 'checked' : '';
        var chkPrevisao = mprevisao ? 'checked' : '';
        var radQuitados = mquitados;
        var chkQuitados = mquitados === '1' ? 'checked' : '';
        var chkAberto = mquitados === '2' ? 'checked' : '';
        var chkAmbos = mquitados === '3' ? 'checked' : '';

        var html = '<div class="mapa-container" style="max-width:1400px;">' +
          '<div style="display:flex;flex-wrap:wrap;gap:5px;padding:8px;align-items:center;">' +
            '<label style="font-size:13px;">Data Ini:</label>' +
            '<input type="date" id="dfcDataIni" value="' + dataIni + '" style="padding:5px 10px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;" onchange="dfcAplicar()">' +
            '<label style="font-size:13px;">Data Fim:</label>' +
            '<input type="date" id="dfcDataFim" value="' + dataFim + '" style="padding:5px 10px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;" onchange="dfcAplicar()">' +
            '<select id="dfcFilial" style="padding:5px 10px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;" onchange="dfcAplicar()">' + filiaisOpts + '</select>' +
          
            '<select id="dfcFilial" style="padding:5px 10px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;">' + filiaisOpts + '</select>' +
            '<button class="mapa-btn btn-buscar" onclick="dfcAplicar()" style="padding:5px 10px;font-size:12px;">🔄 Atualizar</button>' +
            '<button class="mapa-btn btn-exportar" onclick="dfcExportarExcel()" style="padding:5px 10px;font-size:12px;">📊 Excel</button>' +
            '<button class="mapa-btn btn-imprimir" onclick="dfcImprimir()" style="padding:5px 10px;font-size:12px;">🖨️ Imprimir</button>' +
            '<button class="mapa-btn btn-sair" onclick="dfcVoltar()" style="padding:5px 10px;font-size:12px;">🚪 Sair</button>' +
          '</div>' +

          '<div style="display:flex;gap:12px;padding:4px 8px;font-size:13px;align-items:center;flex-wrap:wrap;">' +
            '<label><input type="checkbox" id="dfcReceber" ' + chkReceber + ' onchange="dfcAplicar()"> Receber</label>' +
            '<label><input type="checkbox" id="dfcPagar" ' + chkPagar + ' onchange="dfcAplicar()"> Pagar</label>' +
            '<label><input type="checkbox" id="dfcConfirmado" ' + chkConfirmado + ' onchange="dfcAplicar()"> Confirmado</label>' +
            '<label><input type="checkbox" id="dfcPrevisao" ' + chkPrevisao + ' onchange="dfcAplicar()"> Previsão</label>' +
            '<label><input type="radio" name="dfcQuitados" value="1" ' + chkQuitados + ' onchange="dfcAplicar()"> Quitados</label>' +
            '<label><input type="radio" name="dfcQuitados" value="2" ' + chkAberto + ' onchange="dfcAplicar()"> Em Aberto</label>' +
            '<label><input type="radio" name="dfcQuitados" value="3" ' + chkAmbos + ' onchange="dfcAplicar()"> Ambos</label>' +
          '</div>' +
          '<div class="mapa-status" id="dfcStatusInfo" style="padding:6px 10px;font-size:13px;">Total: ' + clientes.length + ' cliente(s) | Ano Anterior: R$ ' + fmtValor(nTotAnterior) + ' | Total Geral: R$ ' + fmtValor(nTotGeral) + '</div>' +
          '<div style="overflow-x:auto;">' +
          '<table class="mapa-table" id="dfcTabela" style="min-width:1200px;"><thead><tr>' +
            '<th style="width:40px;" onclick="dfcOrdenar(0)">Ord</th>' +
            '<th style="width:60px;" onclick="dfcOrdenar(1)">Código</th>' +
            '<th style="width:200px;" onclick="dfcOrdenar(2)">Nome do Cliente / Fornecedor</th>' +
            '<th style="width:100px;" onclick="dfcOrdenar(3)">Empresa</th>' +
            '<th style="width:80px;" onclick="dfcOrdenar(4)">C. Custo</th>' +
            '<th style="width:120px;" onclick="dfcOrdenar(5)">Categoria</th>' +
            '<th style="width:90px;text-align:right;" onclick="dfcOrdenar(6)">Anterior</th>';

        for (var m = 0; m < 12; m++) {
            html += '<th style="width:70px;text-align:right;" onclick="dfcOrdenar(' + (7 + m) + ')">' + nomesMes[m] + '</th>';
        }
        html += '<th style="width:90px;text-align:right;" onclick="dfcOrdenar(19)">Total</th>';
        html += '</tr></thead><tbody id="dfcCorpoTabela">' + linhas + '</tbody></table>' +
          '</div>' +
          '<div id="dfcModalBuscaGeral" style="display:none;position:fixed;top:60px;right:40px;z-index:10001;background:#1e1e2e;border:1px solid #555;border-radius:8px;width:480px;box-shadow:0 8px 30px rgba(0,0,0,0.6);">' +
            '<div id="dfcBuscaGeralHeader" style="background:#2a2a3e;color:#fff;padding:10px 16px;cursor:move;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;user-select:none;">' +
              '<b>🔎 Busca Geral</b>' +
              '<button onclick="dfcFecharBuscaGeral()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">✕</button>' +
            '</div>' +
            '<div style="padding:16px;">' +
              '<input type="text" id="dfcBuscaGeralInput" placeholder="Ex: MARIA;AEDU ou >1000;categoria:VENDAS" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;box-sizing:border-box;">' +
              '<div style="margin-top:8px;padding:10px;background:#1a1d29;border-radius:6px;font-size:12px;color:#a0c4e8;">' +
                '<b>Como usar:</b><br>' +
                '- Use ; para múltiplas palavras<br>' +
                '- Excluir: -DEVOLUCAO<br>' +
                '- Por campo: nome:MARIA cod:001 empresa:01 categoria:VENDAS<br>' +
                '- Valores: >1000 <500 >=100 <=2000<br>' +
                '- Range: 100..500<br>' +
                '- Campos: nome, cod, empresa, cc, categoria, ant, total<br>' +
                '- Meses: jan:100 fev:500 mar:>1000' +
              '</div>' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
                '<button onclick="dfcLimparBusca()" style="background:#444;color:#fff;border:1px solid #888;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Limpar</button>' +
                '<button onclick="dfcExecutarBuscaGeral()" style="background:#4a6fa5;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Buscar</button>' +
              '</div>' +
            '</div>' +
          '</div>';

        res.send(html);
    } catch (err) {
        console.error('Erro no DFC:', err);
        res.status(500).send('Erro ao carregar DFC: ' + err.message);
    }
});

module.exports = router;