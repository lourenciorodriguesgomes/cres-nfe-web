const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT tpo, nome, cfoppadrao, gerconpag, gerconrec, materiapri,
                   clientepad, nota, planoconta, planopagam, vendaloja, caixapadrao
            FROM tpo
            WHERE sql_deleted <> 'T' OR sql_deleted IS NULL
            ORDER BY tpo
        `;
        
        const [rows] = await pool.query(query);
        let linhas = '';
        rows.forEach((r, i) => {
            var tpo = r.tpo || '';
            var nome = (r.nome || '').replace(/'/g, "\'");
            linhas += '<tr data-cod="' + tpo + '" onclick="selecionarLinha(this)" ondblclick="editar(\'' + tpo + '\')">' +
                '<td class="col-ord">' + (i + 1) + '</td>' +
                '<td class="col-tpo">' + tpo + '</td>' +
                '<td class="col-nome">' + (r.nome || '') + '</td>' +
                '<td class="col-cfop">' + (r.cfoppadrao || '') + '</td>' +
                '<td class="col-acoes">' +
                    '<button class="mapa-btn btn-editar" onclick="event.stopPropagation(); editar(\'' + tpo + '\')">✏️</button>' +
                    '<button class="mapa-btn btn-excluir" onclick="event.stopPropagation(); excluir(\'' + tpo + '\', \'' + nome + '\')">🗑️</button>' +
                '</td>' +
            '</tr>';
        });
        if (rows.length === 0) {
            linhas = '<tr><td colspan="5" style="text-align:center;padding:20px;">Nenhum registro encontrado</td></tr>';
        }
       // const html = '<div class="mapa-container">' + pagina inteira
       // Se quiser mais estreito, mude 900px para 800px ou 700px.
        const html = '<div class="mapa-container" style="max-width:900px;">' +
          '<div class="mapa-toolbar">' +
            '<button class="mapa-btn btn-buscar" onclick="tpoAbrirBuscaGeral()">🔎 Busca Geral</button>' +
            '<button class="mapa-btn btn-novo" onclick="abrirNovo()">➕ Novo</button>' +
            '<button class="mapa-btn btn-exportar" onclick="exportarExcel()">📊 Excel</button>' +
            '<button class="mapa-btn btn-imprimir" onclick="imprimir()">🖨️ Imprimir</button>' +
            '<button class="mapa-btn btn-colunas" onclick="toggleColunas()">📋 Colunas</button>' +
            '<button class="mapa-btn btn-sair" onclick="voltarBancos()">🚪 Sair</button>' +
          '</div>' +
          '<div class="mapa-status" id="statusInfo">Total: ' + rows.length + ' registro(s)</div>' +
          '<table class="mapa-table" id="tabelaClientes"><thead><tr>' +
            '<th class="col-ord" onclick="ordenar(0)">Ord</th>' +
            '<th class="col-tpo" onclick="ordenar(1)">TPO</th>' +
            '<th class="col-nome" onclick="ordenar(2)">Nome do TPO</th>' +
            '<th class="col-cfop" onclick="ordenar(3)">CFOP</th>' +
            '<th class="col-acoes" style="width:120px;">Ações</th>' +
          '</tr></thead><tbody id="corpoTabela">' + linhas + '</tbody></table>' +
        '</div>' +
        '<div class="mapa-overlay" id="mapaOverlay" onclick="fecharModais()"></div>' +
        '<div class="mapa-modal-colunas" id="modalColunas">' +
          '<h3>Visibilidade de Colunas</h3>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-ord\', this)"> Ord</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-tpo\', this)"> TPO</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-nome\', this)"> Nome</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-cfop\', this)"> CFOP</label>' +
          '<br><button class="mapa-btn btn-colunas" onclick="fecharModais()">Fechar</button>' +
        '</div>' +
        '<div class="mapa-modal-editar" id="modalEditar">' +
          '<h3 id="tituloModal">Editar TPO</h3>' +
          '<input type="hidden" id="editCodOriginal">' +
          '<label>TPO:</label>' +
          '<input type="text" id="editTpo">' +
          '<label>Nome do TPO:</label>' +
          '<input type="text" id="editNome">' +
          '<label>CFOP:</label>' +
          '<input type="text" id="editCfop">' +
          '<label>Gera Conta a Pagar:</label>' +
          '<select id="editGerConPag">' +
            '<option value="0">Não</option>' +
            '<option value="1">Sim</option>' +
          '</select>' +
          '<label>Gera Conta a Receber:</label>' +
          '<select id="editGerConRec">' +
            '<option value="0">Não</option>' +
            '<option value="1">Sim</option>' +
          '</select>' +
          '<label>Matéria Prima:</label>' +
          '<select id="editMateriaPri">' +
            '<option value="0">Não</option>' +
            '<option value="1">Sim</option>' +
          '</select>' +
          '<label>Cliente Padrão:</label>' +
          '<input type="text" id="editClientePad" placeholder="Código do cliente">' +
          '<label>Nota:</label>' +
          '<input type="text" id="editNota">' +
          '<label>Plano de Contas:</label>' +
          '<input type="text" id="editPlanoConta" placeholder="Código">' +
          '<label>Plano de Pagamento:</label>' +
          '<input type="text" id="editPlanoPagam" placeholder="Código">' +
          '<label>Venda/Loja:</label>' +
          '<input type="text" id="editVendaLoja" placeholder="Código">' +
          '<label>Caixa Padrão:</label>' +
          '<input type="text" id="editCaixa" placeholder="Código">' +
          '<div class="mapa-modal-buttons">' +
            '<button class="mapa-btn btn-buscar" id="btnSalvarModal" onclick="salvarEdicao()">✅ Salvar</button>' +
            '<button class="mapa-btn btn-colunas" onclick="fecharModais()">❌ Cancelar</button>' +
          '</div>' +
        '</div>' +
        '<div id="tpoModalBuscaGeral" style="display:none;position:fixed;top:60px;right:40px;z-index:10001;background:#1e1e2e;border:1px solid #555;border-radius:8px;width:480px;box-shadow:0 8px 30px rgba(0,0,0,0.6);">' +
          '<div id="tpoBuscaGeralHeader" style="background:#2a2a3e;color:#fff;padding:10px 16px;cursor:move;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;user-select:none;">' +
            '<b>🔎 Busca Geral</b>' +
            '<button onclick="tpoFecharBuscaGeral()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">✕</button>' +
          '</div>' +
          '<div style="padding:16px;">' +
            '<input type="text" id="tpoBuscaGeralInput" placeholder="Ex: VENDA;COMPRA ou tpo:00001;nome:VENDA;-DEVOLUCAO" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;box-sizing:border-box;">' +
            '<div style="margin-top:8px;padding:10px;background:#1a1d29;border-radius:6px;font-size:12px;color:#a0c4e8;">' +
              '<b>Como usar:</b><br>' +
              '- Use ; para multiplas palavras<br>' +
              '- Excluir: -DEVOLUCAO<br>' +
              '- Por campo: tpo:00001 nome:VENDA cfop:5102<br>' +
              '- Campos: tpo, nome, cfop<br>' +
              '- Combina: VENDA;cfop:5102;-DEVOLUCAO' +
            '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
              '<button onclick="tpoLimparBusca()" style="background:#444;color:#fff;border:1px solid #888;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Limpar Filtro</button>' +
              '<button onclick="tpoExecutarBuscaGeral()" style="background:#4a6fa5;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Buscar</button>' +
            '</div>' +
          '</div>' +
        '</div>';
        res.send(html);
    } catch (err) {
        console.error('Erro ao buscar TPO:', err);
        res.status(500).send('Erro ao carregar página');
    }
});

router.get('/editar/:cod', async (req, res) => {
    try {
        const cod = req.params.cod;
        const [rows] = await pool.query('SELECT * FROM tpo WHERE tpo = ?', [cod]);
        if (rows.length === 0) {
            return res.json({ registro: null });
        }
        res.json({ registro: rows[0] });
    } catch (err) {
        console.error('Erro ao buscar registro:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/novo', async (req, res) => {
    try {
        const { tpo, nome, cfop, gerconpag, gerconrec, materiapri,
                clientepad, nota, planoconta, planopagam, vendaloja, caixapadrao } = req.body;
        await pool.query(
            'INSERT INTO tpo (tpo, nome, cfop, gerconpag, gerconrec, materiapri, clientepad, nota, planoconta, planopagam, vendaloja, caixapadrao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [tpo, nome, cfop, gerconpag || 0, gerconrec || 0, materiapri || 0, clientepad, nota, planoconta, planopagam, vendaloja, caixapadrao]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao criar:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});



router.put('/editar/:cod', async (req, res) => {
    try {
        const codOriginal = req.params.cod;
        const { tpo, nome, cfoppadrao, gerconpag, gerconrec, materiapri,
                clientepad, nota, planoconta, planopagam, vendaloja, caixapadrao } = req.body;
        await pool.query(
            'UPDATE tpo SET tpo = ?, nome = ?, cfop = ?, gerconpag = ?, gerconrec = ?, materiapri = ?, clientepad = ?, nota = ?, planoconta = ?, planopagam = ?, vendaloja = ?, caixapadrao = ? WHERE tpo = ?',
            [tpo, nome, cfoppadrao, gerconpag || 0, gerconrec || 0, materiapri || 0, clientepad, nota, planoconta, planopagam, vendaloja, caixapadrao, codOriginal]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/excluir/:cod', async (req, res) => {
    try {
        const cod = req.params.cod;
        await pool.query('UPDATE tpo SET sql_deleted = ? WHERE tpo = ?', ['T', cod]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao excluir:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;