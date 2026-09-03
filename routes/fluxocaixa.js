const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

function fmtDateBR(dt) {
    if (!dt) return '';
    if (typeof dt === 'string') {
        var p = dt.split(' ')[0].split('-');
        if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0];
    }
    if (dt instanceof Date) {
        var dia = String(dt.getDate()).padStart(2, '0');
        var mes = String(dt.getMonth() + 1).padStart(2, '0');
        return dia + '/' + mes + '/' + dt.getFullYear();
    }
    return '';
}

function fmtDateISO(dt) {
    if (!dt) return '';
    if (typeof dt === 'string') {
        var p = dt.split(' ')[0].split('-');
        if (p.length === 3) return p[0] + '-' + p[1] + '-' + p[2];
    }
    if (dt instanceof Date) {
        var y = dt.getFullYear();
        var m = String(dt.getMonth() + 1).padStart(2, '0');
        var d = String(dt.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }
    return '';
}

function fmtValor(v) {
    var n = parseFloat(v) || 0;
    var s = n.toFixed(2);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
}

router.get('/', async (req, res) => {
    try {
        var deonde = req.query.deonde || '2';
        var disabledAttr = deonde === '1' ? 'disabled' : '';

        var [filiais] = await pool.query('SELECT codigo, nome FROM empresasgrupo ORDER BY nome');
        var filiaisOpts = '<option value="">Todas as Filiais</option>';
        filiais.forEach(function(f) {
            filiaisOpts += '<option value="' + (f.codigo || '') + '">' + (f.nome || '') + '</option>';
        });

                var [rows] = await pool.query(`
            SELECT p.vendaloja, p.planoconta, p.confprevis, p.debitocred,
                   p.tpo, p.cdcliente, p.nomecli, p.ntfiscal,
                   p.dtvencim, p.valorpres, p.dtpagto, p.valorrec, p.numconta,
                   e.nome AS nomeloja
            FROM prestacao p
            LEFT JOIN empresasgrupo e ON e.codigo = p.vendaloja
            WHERE (p.sql_deleted <> 'T' OR p.sql_deleted IS NULL)
            ORDER BY p.dtvencim
        `);

        var linhas = '';
        var nSaldoAcum = 0;
        var nTotalCredito = 0;
        var nTotalDebito = 0;

        rows.forEach(function(r, i) {
            var credito = 0, debito = 0;
            if (r.debitocred === 'C') {
                credito = parseFloat(r.valorpres) || 0;
            } else if (r.debitocred === 'D') {
                debito = parseFloat(r.valorpres) || 0;
            }
            nSaldoAcum += credito - debito;
            nTotalCredito += credito;
            nTotalDebito += debito;

            var conpre = r.confprevis || '';
            if (conpre === 'C') conpre = 'Confirmado';
            else if (conpre === 'P') conpre = 'Previsão';

            var debcred = r.debitocred || '';
            if (debcred === 'C') debcred = 'Crédito';
            else if (debcred === 'D') debcred = 'Débito';

            var dtvenc = fmtDateBR(r.dtvencim);
            var dtpag = fmtDateBR(r.dtpagto);
            var dtvencIso = fmtDateISO(r.dtvencim);
            var dtpagIso = fmtDateISO(r.dtpagto);

            linhas += '<tr data-dtvenc="' + dtvencIso + '" data-dtpag="' + dtpagIso + '" data-dc="' + (r.debitocred || '') + '" data-cp="' + (r.confprevis || '') + '" data-loja="' + (r.vendaloja || '') + '" data-cred="' + credito + '" data-deb="' + debito + '">' +
                '<td class="col-ord">' + (i + 1) + '</td>' +
                '<td class="col-loja">' + (r.nomeloja || r.vendaloja || '') + '</td>' +
                '<td class="col-dtvenc">' + dtvenc + '</td>' +
                '<td class="col-conpre">' + conpre + '</td>' +
                '<td class="col-debcre">' + debcred + '</td>' +
                '<td class="col-oper">' + (r.tpo || '') + '</td>' +
                '<td class="col-cod">' + (r.cdcliente || '') + '</td>' +
                '<td class="col-nome">' + (r.nomecli || '') + '</td>' +
                '<td class="col-dtpag">' + dtpag + '</td>' +
                '<td class="col-cred" style="text-align:right;">' + fmtValor(credito) + '</td>' +
                '<td class="col-deb" style="text-align:right;">' + fmtValor(debito) + '</td>' +
                '<td class="col-saldo" style="text-align:right;">' + fmtValor(nSaldoAcum) + '</td>' +
                '<td class="col-conta" style="display:none;">' + (r.numconta || '') + '</td>' +
            '</tr>';

            });

        var nTotalSaldo = nTotalCredito - nTotalDebito;
        linhas += '<tr class="linha-total" style="font-weight:bold;background:#2a2a3e;color:#fff;">' +
            '<td class="col-ord"></td><td class="col-loja"></td><td class="col-dtvenc"></td>' +
            '<td class="col-conpre"></td><td class="col-debcre"></td><td class="col-oper"></td>' +
            '<td class="col-cod"></td><td class="col-nome">TOTAL:</td><td class="col-dtpag"></td>' +
            '<td class="col-cred" style="text-align:right;">' + fmtValor(nTotalCredito) + '</td>' +
            '<td class="col-deb" style="text-align:right;">' + fmtValor(nTotalDebito) + '</td>' +
            '<td class="col-saldo" style="text-align:right;">' + fmtValor(nTotalSaldo) + '</td>' +
            '<td class="col-conta" style="display:none;"></td>' +
        '</tr>';

        if (rows.length === 0) {
            linhas = '<tr id="linhaVazia"><td colspan="13" style="text-align:center;padding:20px;">Nenhum registro encontrado</td></tr>';
        }

        var today = new Date();
        var firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        var dataIniVal = fmtDateISO(firstDay);
        var dataFimVal = fmtDateISO(today);

        var chkReceber = 'checked';
        var chkPagar = 'checked';
        var chkConfirmado = 'checked';
        var chkPrevisao = '';
        var chkQuitados = deonde === '1' ? 'checked' : '';
        var chkEmAberto = deonde === '1' ? '' : 'checked';

        var titulo = 'Fluxo de Caixa';
        if (deonde === '1') titulo = 'Demonstra Resultado de Fluxo de Caixa';
        else if (deonde === '3') titulo = 'Demonstrativo do Fluxo de Caixa';

        var html = '<div class="mapa-container">' +
          '<div style="display:flex;flex-wrap:wrap;gap:5px;padding:8px;align-items:center;">' +
            '<label style="font-size:13px;">Data Ini:</label>' +
            '<input type="date" id="fcDataIni" value="' + dataIniVal + '" style="padding:4px 8px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;" onchange="fcAplicarFiltros()">' +
            '<label style="font-size:13px;">Data Fim:</label>' +
            '<input type="date" id="fcDataFim" value="' + dataFimVal + '" style="padding:4px 8px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;" onchange="fcAplicarFiltros()">' +
            '<select id="fcTipoData" ' + disabledAttr + ' style="padding:4px 8px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;" onchange="fcAplicarFiltros()">' +
              '<option value="vencimento">Data Vencimento</option>' +
              '<option value="pagamento">Data Pagamento</option>' +
            '</select>' +
            '<select id="fcFilial" style="padding:4px 8px;font-size:13px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;" onchange="fcAplicarFiltros()">' + filiaisOpts + '</select>' +
            '<button class="mapa-btn btn-buscar" onclick="fcAbrirBuscaGeral()" style="padding:4px 10px;font-size:12px;">🔎 Busca Geral</button>' +
            '<button class="mapa-btn btn-exportar" onclick="fcExportarExcel()" style="padding:4px 10px;font-size:12px;">📊 Excel</button>' +
            '<button class="mapa-btn btn-imprimir" onclick="fcImprimir()" style="padding:4px 10px;font-size:12px;">🖨️ Imprimir</button>' +
            '<button class="mapa-btn btn-sair" onclick="fcVoltar()" style="padding:4px 10px;font-size:12px;">🚪 Sair</button>' +
          '</div>' +
          '<div style="display:flex;gap:12px;padding:4px 8px;font-size:13px;align-items:center;flex-wrap:wrap;">' +
            '<label><input type="checkbox" id="fcReceber" ' + chkReceber + ' ' + disabledAttr + ' onchange="fcAplicarFiltros()"> Receber</label>' +
            '<label><input type="checkbox" id="fcPagar" ' + chkPagar + ' ' + disabledAttr + ' onchange="fcAplicarFiltros()"> Pagar</label>' +
            '<label><input type="checkbox" id="fcConfirmado" ' + chkConfirmado + ' ' + disabledAttr + ' onchange="fcAplicarFiltros()"> Confirmado</label>' +
            '<label><input type="checkbox" id="fcPrevisao" ' + chkPrevisao + ' ' + disabledAttr + ' onchange="fcAplicarFiltros()"> Previsão</label>' +
            '<label><input type="checkbox" id="fcQuitados" ' + chkQuitados + ' ' + disabledAttr + ' onchange="fcAplicarFiltros()"> Quitados</label>' +
            '<label><input type="checkbox" id="fcEmAberto" ' + chkEmAberto + ' ' + disabledAttr + ' onchange="fcAplicarFiltros()"> Em Aberto</label>' +
          '</div>' +
          '<div class="mapa-status" id="fcStatusInfo" style="padding:6px 10px;font-size:13px;">Total: ' + rows.length + ' registro(s) | Crédito: R$ ' + fmtValor(nTotalCredito) + ' | Débito: R$ ' + fmtValor(nTotalDebito) + ' | Saldo: R$ ' + fmtValor(nTotalSaldo) + '</div>' +
          '<table class="mapa-table" id="fcTabela"><thead><tr>' +
            '<th class="col-ord" onclick="fcOrdenar(0)" style="width:40px;">Ord</th>' +
            '<th class="col-loja" onclick="fcOrdenar(1)" style="width:60px;">Loja</th>' +
            '<th class="col-dtvenc" onclick="fcOrdenar(2)" style="width:100px;">Data Vencim</th>' +
            '<th class="col-conpre" onclick="fcOrdenar(3)" style="width:90px;">Con/Pre</th>' +
            '<th class="col-debcre" onclick="fcOrdenar(4)" style="width:80px;">Deb/Cre</th>' +
            '<th class="col-oper" onclick="fcOrdenar(5)" style="width:80px;">Operação</th>' +
            '<th class="col-cod" onclick="fcOrdenar(6)" style="width:70px;">Código</th>' +
            '<th class="col-nome" onclick="fcOrdenar(7)">Cliente/Fornecedor</th>' +
            '<th class="col-dtpag" onclick="fcOrdenar(8)" style="width:100px;">Dt Pagto</th>' +
            '<th class="col-cred" onclick="fcOrdenar(9)" style="width:110px;text-align:right;">Crédito</th>' +
            '<th class="col-deb" onclick="fcOrdenar(10)" style="width:110px;text-align:right;">Débito</th>' +
            '<th class="col-saldo" onclick="fcOrdenar(11)" style="width:120px;text-align:right;">Saldo Acumulado</th>' +
            '<th class="col-conta" style="display:none;">Conta</th>' +
          '</tr></thead><tbody id="fcCorpoTabela">' + linhas + '</tbody></table>' +
        '</div>' +
        '<div id="fcModalBuscaGeral" style="display:none;position:fixed;top:60px;right:40px;z-index:10001;background:#1e1e2e;border:1px solid #555;border-radius:8px;width:480px;box-shadow:0 8px 30px rgba(0,0,0,0.6);">' +
          '<div id="fcBuscaGeralHeader" style="background:#2a2a3e;color:#fff;padding:10px 16px;cursor:move;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;user-select:none;">' +
            '<b>🔎 Busca Geral</b>' +
            '<button onclick="fcFecharBuscaGeral()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">✕</button>' +
          '</div>' +
          '<div style="padding:16px;">' +
            '<input type="text" id="fcBuscaGeralInput" placeholder="Ex: MARIA;AEDU ou 01/01/2025..25/01/2025;nome:MARIA;PAGO;-TED" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;box-sizing:border-box;">' +
            '<div style="margin-top:8px;padding:10px;background:#1a1d29;border-radius:6px;font-size:12px;color:#a0c4e8;">' +
              '<b>Como usar:</b><br>' +
              '- Use ; para múltiplas palavras<br>' +
              '- Excluir: -DEVOLUCAO<br>' +
              '- Período: 01/01/2025..25/01/2025<br>' +
              '- Valores: 100..500<br>' +
              '- Operadores: >10 <100 >=10 <=100<br>' +
              '- Por campo: nome:MARIA cod:001 loja:01 oper:VENDA<br>' +
              '- Campos: nome, cod, loja, oper, dtvenc, dtpag, conpre, debcre<br>' +
              '- PAGO ou ABERTO (filtra por pagamento)<br>' +
              '- Combina: 01/01/2025..25/01/2025;nome:MARIA;PAGO;-TED' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
              '<button onclick="fcLimparBusca()" style="background:#444;color:#fff;border:1px solid #888;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Limpar Filtro</button>' +
              '<button onclick="fcExecutarBuscaGeral()" style="background:#4a6fa5;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Buscar</button>' +
            '</div>' +
          '</div>' +
        '</div>';
        res.send(html);
    } catch (err) {
        console.error('Erro ao buscar fluxo de caixa:', err);
        res.status(500).send('Erro ao carregar página: ' + err.message);
    }
});

module.exports = router;