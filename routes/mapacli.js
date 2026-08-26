const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');


router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT c.cpf, c.nomecli, c.categoria, ct.categoria AS des_categoria,
                   c.subcategoria, p.desconta AS des_subcategoria
            FROM clientes c
            LEFT JOIN categoria ct ON ct.codigo = c.categoria
            LEFT JOIN planocontas p ON p.subcategoria = c.subcategoria
            ORDER BY c.nomecli
        `;
        const [rows] = await pool.query(query);

        let linhas = '';
        rows.forEach((c, i) => {
            const cpf = c.cpf || '';
            const nome = (c.nomecli || '').replace(/'/g, "\'");
            linhas += '<tr data-cpf="' + cpf + '" onclick="selecionarLinha(this)" ondblclick="editar(\'' + cpf + '\')">' +
                '<td class="col-ord">' + (i + 1) + '</td>' +
                '<td class="col-cpf">' + cpf + '</td>' +
                '<td class="col-nome">' + (c.nomecli || '') + '</td>' +
                '<td class="col-cat">' + (c.categoria || '') + '</td>' +
                '<td class="col-desc-cat">' + (c.des_categoria || '') + '</td>' +
                '<td class="col-sub">' + (c.subcategoria || '') + '</td>' +
                '<td class="col-desc-sub">' + (c.des_subcategoria || '') + '</td>' +
                '<td class="col-acoes">' +
                    '<button class="mapa-btn btn-editar" onclick="event.stopPropagation(); editar(\'' + cpf + '\')">✏️</button>' +
                    '<button class="mapa-btn btn-excluir" onclick="event.stopPropagation(); excluir(\'' + cpf + '\', \'' + nome + '\')">🗑️</button>' +
                '</td>' +
            '</tr>';
        });

        if (rows.length === 0) {
            linhas = '<tr><td colspan="8" style="text-align:center;padding:20px;">Nenhum cliente encontrado</td></tr>';
        }

        const html = '<div class="mapa-container">' +
          '<div class="mapa-toolbar">' +
            '<input type="text" id="buscaGeral" placeholder="Digite para buscar..." oninput="filtrarTabela()">' +
            '<button class="mapa-btn btn-buscar" onclick="buscarGeral()">🔍 Buscar</button>' +
            '<button class="mapa-btn btn-novo" onclick="abrirNovo()">➕ Novo</button>' +
            '<button class="mapa-btn btn-exportar" onclick="exportarExcel()">📊 Excel</button>' +
            '<button class="mapa-btn btn-imprimir" onclick="imprimir()">🖨️ Imprimir</button>' +
            '<button class="mapa-btn btn-colunas" onclick="toggleColunas()">📋 Colunas</button>' +
            '<button class="mapa-btn btn-sair" onclick="voltarBancos()">🚪 Sair</button>' +
          '</div>' +
          '<div class="mapa-status" id="statusInfo">Total: ' + rows.length + ' cliente(s)</div>' +
          '<table class="mapa-table" id="tabelaClientes"><thead><tr>' +
            '<th class="col-ord" onclick="ordenar(0)">Ord</th>' +
            '<th class="col-cpf" onclick="ordenar(1)">CPF/CNPJ</th>' +
            '<th class="col-nome" onclick="ordenar(2)">Nome do Cliente</th>' +
            '<th class="col-cat" onclick="ordenar(3)">Categoria</th>' +
            '<th class="col-desc-cat" onclick="ordenar(4)">Descrição Categoria</th>' +
            '<th class="col-sub" onclick="ordenar(5)">Subcategoria</th>' +
            '<th class="col-desc-sub" onclick="ordenar(6)">Descrição Sub Categoria</th>' +
            '<th class="col-acoes" style="width:120px;">Ações</th>' +
          '</tr></thead><tbody id="corpoTabela">' + linhas + '</tbody></table>' +
        '</div>' +
        '<div class="mapa-overlay" id="mapaOverlay" onclick="fecharModais()"></div>' +
        '<div class="mapa-modal-colunas" id="modalColunas">' +
          '<h3>Visibilidade de Colunas</h3>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-ord\', this)"> Ord</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-cpf\', this)"> CPF/CNPJ</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-nome\', this)"> Nome</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-cat\', this)"> Categoria</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-desc-cat\', this)"> Desc. Categoria</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-sub\', this)"> Subcategoria</label>' +
          '<label><input type="checkbox" checked onchange="toggleColuna(\'col-desc-sub\', this)"> Desc. Subcategoria</label>' +
          '<br><button class="mapa-btn btn-colunas" onclick="fecharModais()">Fechar</button>' +
        '</div>' +
        '<div class="mapa-modal-editar" id="modalEditar">' +
          '<h3 id="tituloModal">Editar Cliente</h3>' +
          '<input type="hidden" id="editCpfOriginal">' +
          '<label>CPF/CNPJ:</label>' +
          '<input type="text" id="editCpf">' +
          '<label>Nome do Cliente:</label>' +
          '<input type="text" id="editNome">' +
          '<label>Categoria:</label>' +
          '<select id="editCategoria"></select>' +
          '<label>Subcategoria:</label>' +
          '<select id="editSubcategoria"></select>' +
          '<div class="mapa-modal-buttons">' +
            '<button class="mapa-btn btn-buscar" onclick="salvarEdicao()">✅ Salvar</button>' +
            '<button class="mapa-btn btn-colunas" onclick="fecharModais()">❌ Cancelar</button>' +
          '</div>' +
        '</div>';

        res.send(html);
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        res.status(500).send('Erro ao carregar página');
    }
});

router.get('/buscar', async (req, res) => {
    try {
        const termo = req.query.q || '';
        const query = `
            SELECT c.cpf, c.nomecli, c.categoria, ct.categoria AS des_categoria,
                   c.subcategoria, p.desconta AS des_subcategoria
            FROM clientes c
            LEFT JOIN categoria ct ON ct.codigo = c.categoria
            LEFT JOIN planocontas p ON p.subcategoria = c.subcategoria
            WHERE c.nomecli LIKE ? OR c.cpf LIKE ? OR ct.categoria LIKE ? OR p.desconta LIKE ?
            ORDER BY c.nomecli
        `;
        const like = '%' + termo + '%';
        const [rows] = await pool.query(query, [like, like, like, like]);
        res.json(rows);
    } catch (err) {
        console.error('Erro na busca:', err);
        res.status(500).json({ error: 'Erro na busca' });
    }
});

router.get('/editar/:cpf', async (req, res) => {
    try {
        const cpf = req.params.cpf;
        const [rows] = await pool.query('SELECT * FROM clientes WHERE cpf = ?', [cpf]);
        const [categorias] = await pool.query('SELECT codigo, categoria FROM categoria ORDER BY categoria');
        const [subcategorias] = await pool.query('SELECT subcategoria, desconta FROM planocontas ORDER BY desconta');
        if (rows.length === 0) {
            return res.json({ cliente: null, categorias, subcategorias });
        }
        res.json({ cliente: rows[0], categorias, subcategorias });
    } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/novo', async (req, res) => {
    try {
        const { cpf, nomecli, categoria, subcategoria } = req.body;
        await pool.query(
            'INSERT INTO clientes (cpf, nomecli, categoria, subcategoria) VALUES (?, ?, ?, ?)',
            [cpf, nomecli, categoria, subcategoria]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao criar:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/editar/:cpf', async (req, res) => {
    try {
        const cpfOriginal = req.params.cpf;
        const { cpf, nomecli, categoria, subcategoria } = req.body;
        await pool.query(
            'UPDATE clientes SET cpf = ?, nomecli = ?, categoria = ?, subcategoria = ? WHERE cpf = ?',
            [cpf, nomecli, categoria, subcategoria, cpfOriginal]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/excluir/:cpf', async (req, res) => {
    try {
        const cpf = req.params.cpf;
        await pool.query('DELETE FROM clientes WHERE cpf = ?', [cpf]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao excluir:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/exportar', async (req, res) => {
    try {
        const query = `
            SELECT c.cpf, c.nomecli, c.categoria, ct.categoria AS des_categoria,
                   c.subcategoria, p.desconta AS des_subcategoria
            FROM clientes c
            LEFT JOIN categoria ct ON ct.codigo = c.categoria
            LEFT JOIN planocontas p ON p.subcategoria = c.subcategoria
            ORDER BY c.nomecli
        `;
        const [rows] = await pool.query(query);
        const headers = ['Ord', 'CPF/CNPJ', 'Nome do Cliente', 'Categoria', 'Desc. Categoria', 'Subcategoria', 'Desc. Subcategoria'];
        let csv = headers.join(';') + '\n';
        rows.forEach((row, i) => {
            csv += [i + 1, row.cpf || '', row.nomecli || '', row.categoria || '', row.des_categoria || '', row.subcategoria || '', row.des_subcategoria || '']
                .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';') + '\n';
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="mapa_clientes.csv"');
        res.send('\uFEFF' + csv);
    } catch (err) {
        console.error('Erro ao exportar:', err);
        res.status(500).send('Erro ao exportar');
    }
});
module.exports = router;
