const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT codconta, desconta, tipconta, gruconta, subcategoria
            FROM planocontas
            WHERE sql_deleted <> 'T' OR sql_deleted IS NULL
            ORDER BY subcategoria
        `;
        const [rows] = await pool.query(query);
        let linhas = '';
        rows.forEach((r, i) => {
            var codconta = r.codconta || '';
            var desconta = (r.desconta || '').replace(/'/g, "\'");
            var tipcon = r.tipconta || '';
            if (tipcon === 'C') tipcon = 'Conta';
            else if (tipcon === 'T') tipcon = 'Título';
            else if (tipcon === 'S') tipcon = 'Soma';
            var grucon = r.gruconta || '';
            if (grucon === 'R') grucon = 'Receita';
            else if (grucon === 'D') grucon = 'Débito';
            linhas += '<tr data-cod="' + codconta + '" onclick="selecionarLinha(this)" ondblclick="editar(\'' + codconta + '\')">' +
                '<td class="col-ord">' + (i + 1) + '</td>' +
                '<td class="col-cod">' + codconta + '</td>' +
                '<td class="col-desc">' + (r.desconta || '') + '</td>' +
                '<td class="col-grupo">' + tipcon + '</td>' +
                '<td class="col-tipo">' + grucon + '</td>' +
                '<td class="col-acoes">' +
                    '<button class="mapa-btn btn-editar" onclick="event.stopPropagation(); editar(\'' + codconta + '\')">✏️</button>' +
                    '<button class="mapa-btn btn-excluir" onclick="event.stopPropagation(); excluir(\'' + codconta + '\', \'' + desconta + '\')">🗑️</button>' +
                '</td>' +
            '</tr>';
        });
        if (rows.length === 0) {
            linhas = '<tr><td colspan="6" style="text-align:center;padding:20px;">Nenhum registro encontrado</td></tr>';
        }
        const html = '<div class="mapa-container">' +
          '<div class="mapa-toolbar">' +
            '<button class="mapa-btn btn-buscar" onclick="pcAbrirBuscaGeral()">🔎 Busca Geral</button>' +
            '<button class="mapa-btn btn-novo" onclick="abrirNovo()">➕ Novo</button>' +
            '<button class="mapa-btn btn-exportar" onclick="exportarExcel()">📊 Excel</button>' +
            '<button class="mapa-btn btn-imprimir" onclick="imprimir()">🖨️ Imprimir</button>' +
            '<button class="mapa-btn btn-colunas" onclick="toggleColunas()">📋 Colunas</button>' +
            '<button class="mapa-btn btn-sair" onclick="voltarBancos()">🚪 Sair</button>' +
          '</div>' +
          '<div class="mapa-status" id="statusInfo">Total: ' + rows.length + ' registro(s)</div>' +
          '<table class="mapa-table" id="tabelaClientes"><thead><tr>' +
            '<th class="col-ord" onclick="ordenar(0)">Ord</th>' +
            '<th class="col-cod" onclick="ordenar(1)">Código</th>' +
            '<th class="col-desc" onclick="ordenar(2)">Descrição do Plano</th>' +
            '<th class="col-grupo" onclick="ordenar(3)">Grupo</th>' +
            '<th class="col-tipo" onclick="ordenar(4)">Tipo</th>' +
            '<th class="col-acoes" style="width:120px;">Ações</th>' +
          '</tr></thead><tbody id="corpoTabela">' + linhas + '</tbody></table>' +
        '</div>' +
        '<div class="mapa-overlay" id="mapaOverlay" onclick="fecharModais()"></div>' +
        '<div class="mapa-modal-colunas" id="modalColunas">' +
          '<h3>Visibilidade de Colunas</h3>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-ord\', this)"> Ord</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-cod\', this)"> Código</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-desc\', this)"> Descrição</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-grupo\', this)"> Grupo</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-tipo\', this)"> Tipo</label>' +
          '<br><button class="mapa-btn btn-colunas" onclick="fecharModais()">Fechar</button>' +
        '</div>' +
        '<div class="mapa-modal-editar" id="modalEditar">' +
          '<h3 id="tituloModal">Editar Plano de Contas</h3>' +
          '<input type="hidden" id="editCodOriginal">' +
          '<label>Código:</label>' +
          '<input type="text" id="editCod">' +
          '<label>Descrição do Plano:</label>' +
          '<input type="text" id="editDesc">' +
          '<label>Grupo:</label>' +
          '<select id="editGrupo">' +
            '<option value="">Selecione...</option>' +
            '<option value="C">Conta</option>' +
            '<option value="T">Título</option>' +
            '<option value="S">Soma</option>' +
          '</select>' +
          '<label>Tipo:</label>' +
          '<select id="editTipo">' +
            '<option value="">Selecione...</option>' +
            '<option value="R">Receita</option>' +
            '<option value="D">Débito</option>' +
          '</select>' +
          '<label>Sub Categoria:</label>' +
          '<input type="text" id="editSub">' +
          '<div class="mapa-modal-buttons">' +
            '<button class="mapa-btn btn-buscar" id="btnSalvarModal" onclick="salvarEdicao()">✅ Salvar</button>' +
            '<button class="mapa-btn btn-colunas" onclick="fecharModais()">❌ Cancelar</button>' +
          '</div>' +
        '</div>' +
        '<div id="pcModalBuscaGeral" style="display:none;position:fixed;top:60px;right:40px;z-index:10001;background:#1e1e2e;border:1px solid #555;border-radius:8px;width:480px;box-shadow:0 8px 30px rgba(0,0,0,0.6);">' +
          '<div id="pcBuscaGeralHeader" style="background:#2a2a3e;color:#fff;padding:10px 16px;cursor:move;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;user-select:none;">' +
            '<b>🔎 Busca Geral</b>' +
            '<button onclick="pcFecharBuscaGeral()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;">✕</button>' +
          '</div>' +
          '<div style="padding:16px;">' +
            '<input type="text" id="pcBuscaGeralInput" placeholder="Ex: RECEITA;DESPESA ou codigo:1.1;DESPESA;-SALARIO" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#fff;box-sizing:border-box;">' +
            '<div style="margin-top:8px;padding:10px;background:#1a1d29;border-radius:6px;font-size:12px;color:#a0c4e8;">' +
              '<b>Como usar:</b><br>' +
              '- Use ; para multiplas palavras<br>' +
              '- Excluir: -DESPESA<br>' +
              '- Por campo: codigo:1.1 desc:RECEITA grupo:Conta tipo:Receita<br>' +
              '- Campos: codigo, desc, grupo, tipo<br>' +
              '- Combina: RECEITA;codigo:1.1;-DESPESA' +
            '</div>' +
          
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">' +
            '<button onclick="pcLimparBusca()" style="background:#444;color:#fff;border:1px solid #888;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Limpar Filtro</button>' +
            '<button onclick="pcExecutarBuscaGeral()" style="background:#4a6fa5;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-size:14px;">Buscar</button>' +
            '</div>' +
            
          '</div>' +
        '</div>';
        res.send(html);
    } catch (err) {
        console.error('Erro ao buscar plano de contas:', err);
        res.status(500).send('Erro ao carregar página');
    }
});

router.get('/buscar', async (req, res) => {
    try {
        const termo = req.query.q || '';
        const query = `
            SELECT codconta, desconta, tipconta, gruconta, subcategoria
            FROM planocontas
            WHERE (sql_deleted <> 'T' OR sql_deleted IS NULL)
            AND (desconta LIKE ? OR codconta LIKE ? OR subcategoria LIKE ?)
            ORDER BY subcategoria
        `;
        const like = '%' + termo + '%';
        const [rows] = await pool.query(query, [like, like, like]);
        res.json(rows);
    } catch (err) {
        console.error('Erro na busca:', err);
        res.status(500).json({ error: 'Erro na busca' });
    }
});

router.get('/editar/:cod', async (req, res) => {
    try {
        const cod = req.params.cod;
        const [rows] = await pool.query('SELECT * FROM planocontas WHERE codconta = ?', [cod]);
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
        const { codconta, desconta, tipconta, gruconta, subcategoria } = req.body;
        await pool.query(
            'INSERT INTO planocontas (codconta, desconta, tipconta, gruconta, subcategoria) VALUES (?, ?, ?, ?, ?)',
            [codconta, desconta, tipconta, gruconta, subcategoria]
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
        const { codconta, desconta, tipconta, gruconta, subcategoria } = req.body;
        await pool.query(
            'UPDATE planocontas SET codconta = ?, desconta = ?, tipconta = ?, gruconta = ?, subcategoria = ? WHERE codconta = ?',
            [codconta, desconta, tipconta, gruconta, subcategoria, codOriginal]
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
        await pool.query('UPDATE planocontas SET sql_deleted = ? WHERE codconta = ?', ['T', cod]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao excluir:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/exportar', async (req, res) => {
    try {
        const query = `
            SELECT codconta, desconta, tipconta, gruconta, subcategoria
            FROM planocontas
            WHERE sql_deleted <> 'T' OR sql_deleted IS NULL
            ORDER BY subcategoria
        `;
        const [rows] = await pool.query(query);
        const headers = ['Ord', 'Código', 'Descrição do Plano', 'Grupo', 'Tipo'];
        let csv = headers.join(';') + '\n';
        rows.forEach((row, i) => {
            var tipcon = row.tipconta || '';
            if (tipcon === 'C') tipcon = 'Conta';
            else if (tipcon === 'T') tipcon = 'Título';
            else if (tipcon === 'S') tipcon = 'Soma';
            var grucon = row.gruconta || '';
            if (grucon === 'R') grucon = 'Receita';
            else if (grucon === 'D') grucon = 'Débito';
            csv += [i + 1, row.codconta || '', row.desconta || '', tipcon, grucon]
                .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';') + '\n';
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="plano_contas.csv"');
        res.send('\uFEFF' + csv);
    } catch (err) {
        console.error('Erro ao exportar:', err);
        res.status(500).send('Erro ao exportar');
    }
});

module.exports = router;