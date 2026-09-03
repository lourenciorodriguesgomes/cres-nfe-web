const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT c.cdcliente, c.nomecli, c.endereco, c.bairro,
                   c.cidade, c.estado, c.telefone, c.cpf,
                   c.cencusto, c.categoria AS cat_codigo,
                   ct.categoria AS cat_nome,
                   c.subcategoria, p.desconta AS des_subcategoria
            FROM clientes c
            LEFT JOIN categoria ct ON ct.codigo = c.categoria
            LEFT JOIN planocontas p ON p.subcategoria = c.subcategoria
            ORDER BY c.nomecli
        `;
        const [rows] = await pool.query(query);
        let linhas = '';
        rows.forEach((c, i) => {
            const cod = c.cdcliente || '';
            const nome = (c.nomecli || '').replace(/'/g, "\'");
            linhas += '<tr data-id="' + cod + '" onclick="cliSelecionarLinha(this)" ondblclick="cliEditar(\'' + cod + '\')" style="cursor:pointer;">' +
                '<td class="col-ord">' + (i + 1) + '</td>' +
                '<td class="col-cod">' + cod + '</td>' +
                '<td class="col-nome">' + (c.nomecli || '') + '</td>' +
                '<td class="col-end">' + (c.endereco || '') + '</td>' +
                '<td class="col-bairro">' + (c.bairro || '') + '</td>' +
                '<td class="col-cidade">' + (c.cidade || '') + '</td>' +
                '<td class="col-uf">' + (c.estado || '') + '</td>' +
                '<td class="col-tel">' + (c.telefone || '') + '</td>' +
                '<td class="col-cpf">' + (c.cpf || '') + '</td>' +
                '<td class="col-cat">' + (c.cat_nome || c.cat_codigo || '') + '</td>' +
                '<td class="col-acoes">' +
                    '<button class="mapa-btn btn-editar" onclick="event.stopPropagation(); cliEditar(\'' + cod + '\')">✏️</button>' +
                    '<button class="mapa-btn btn-excluir" onclick="event.stopPropagation(); cliExcluir(\'' + cod + '\', \'' + nome + '\')">🗑️</button>' +
                '</td>' +
            '</tr>';
        });
        if (rows.length === 0) {
            linhas = '<tr><td colspan="11" style="text-align:center;padding:20px;">Nenhum cliente encontrado</td></tr>';
        }
        const html = '<div class="mapa-container">' +
          '<div class="mapa-toolbar">' +
            '<input type="text" id="cliBuscaGeral" placeholder="Digite para buscar..." oninput="cliFiltrarTabela()">' +
            '<button class="mapa-btn btn-buscar" onclick="cliBuscarGeral()">🔍 Buscar</button>' +
            '<button class="mapa-btn btn-novo" onclick="cliAbrirNovo()">➕ Novo</button>' +
            '<button class="mapa-btn btn-exportar" onclick="cliExportarExcel()">📊 Excel</button>' +
            '<button class="mapa-btn btn-imprimir" onclick="cliImprimir()">🖨️ Imprimir</button>' +
            '<button class="mapa-btn btn-colunas" onclick="cliToggleColunas()">📋 Colunas</button>' +
            '<button class="mapa-btn btn-sair" onclick="cliVoltar()">🚪 Sair</button>' +
          '</div>' +
          '<div class="mapa-status" id="cliStatusInfo">Total: ' + rows.length + ' cliente(s)</div>' +
          '<table class="mapa-table" id="cliTabela"><thead><tr>' +
            '<th class="col-ord" onclick="cliOrdenar(0)">Ord</th>' +
            '<th class="col-cod" onclick="cliOrdenar(1)">Código</th>' +
            '<th class="col-nome" onclick="cliOrdenar(2)">Nome do Cliente</th>' +
            '<th class="col-end" onclick="cliOrdenar(3)">Endereço</th>' +
            '<th class="col-bairro" onclick="cliOrdenar(4)">Bairro</th>' +
            '<th class="col-cidade" onclick="cliOrdenar(5)">Cidade</th>' +
            '<th class="col-uf" onclick="cliOrdenar(6)">UF</th>' +
            '<th class="col-tel" onclick="cliOrdenar(7)">Telefone</th>' +
            '<th class="col-cpf" onclick="cliOrdenar(8)">CPF/CNPJ</th>' +
            '<th class="col-cat" onclick="cliOrdenar(9)">Categoria</th>' +
            '<th class="col-acoes" style="width:120px;">Ações</th>' +
          '</tr></thead><tbody id="cliCorpoTabela">' + linhas + '</tbody></table>' +
        '</div>' +
        '<div class="mapa-overlay" id="cliOverlay" onclick="cliFecharModais()"></div>' +
        '<div class="mapa-modal-colunas" id="cliModalColunas">' +
          '<h3>Visibilidade de Colunas</h3>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-ord\', this)"> Ord</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-cod\', this)"> Código</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-nome\', this)"> Nome</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-end\', this)"> Endereço</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-bairro\', this)"> Bairro</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-cidade\', this)"> Cidade</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-uf\', this)"> UF</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-tel\', this)"> Telefone</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-cpf\', this)"> CPF/CNPJ</label>' +
          '<label><input type="checkbox" checked onchange="cliToggleColuna(\'col-cat\', this)"> Categoria</label>' +
          '<br><button class="mapa-btn btn-colunas" onclick="cliFecharModais()">Fechar</button>' +
        '</div>' +
        '<div class="mapa-modal-editar" id="cliModalEditar">' +
          '<h3 id="cliTituloModal">Editar Cliente</h3>' +
          '<input type="hidden" id="cliEditId">' +
          '<label>Código:</label>' +
          '<input type="text" id="cli_cdcliente">' +
          '<label>Nome / Razão Social:</label>' +
          '<input type="text" id="cli_nomecli">' +
          '<label>Endereço:</label>' +
          '<input type="text" id="cli_endereco">' +
          '<label>Bairro:</label>' +
          '<input type="text" id="cli_bairro">' +
          '<label>Cidade:</label>' +
          '<input type="text" id="cli_cidade">' +
          '<label>UF:</label>' +
          '<input type="text" id="cli_estado" maxlength="2">' +
          '<label>Telefone:</label>' +
          '<input type="text" id="cli_telefone">' +
          '<label>CPF / CNPJ:</label>' +
          '<input type="text" id="cli_cpf">' +
          '<label>Categoria:</label>' +
          '<select id="cli_categoria"></select>' +
          '<label>Subcategoria:</label>' +
          '<select id="cli_subcategoria"></select>' +
          '<div class="mapa-modal-buttons">' +
            '<button class="mapa-btn btn-buscar" onclick="cliSalvar()">✅ Salvar</button>' +
            '<button class="mapa-btn btn-colunas" onclick="cliFecharModais()">❌ Cancelar</button>' +
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
            SELECT c.cdcliente, c.nomecli, c.endereco, c.bairro,
                   c.cidade, c.estado, c.telefone, c.cpf,
                   c.cencusto, c.categoria AS cat_codigo,
                   ct.categoria AS cat_nome,
                   c.subcategoria, p.desconta AS des_subcategoria
            FROM clientes c
            LEFT JOIN categoria ct ON ct.codigo = c.categoria
            LEFT JOIN planocontas p ON p.subcategoria = c.subcategoria
            WHERE c.nomecli LIKE ? OR c.cpf LIKE ? OR c.cidade LIKE ? OR ct.categoria LIKE ?
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

router.get('/editar/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const [categorias] = await pool.query('SELECT codigo, categoria FROM categoria ORDER BY categoria');
        const [subcategorias] = await pool.query('SELECT subcategoria, desconta FROM planocontas ORDER BY desconta');
        if (id === '0') {
            return res.json({ cliente: null, categorias, subcategorias });
        }
        const [rows] = await pool.query('SELECT * FROM clientes WHERE cdcliente = ?', [id]);
        res.json({ cliente: rows[0] || null, categorias, subcategorias });
    } catch (err) {
        console.error('Erro ao buscar cliente:', err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/novo', async (req, res) => {
    try {
        const { cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, categoria, subcategoria } = req.body;
        await pool.query(
            'INSERT INTO clientes (cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, categoria, subcategoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [cdcliente, nomecli, endereco, bairro, cidade, estado, telefone, cpf, categoria, subcategoria]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao criar:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/editar/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { nomecli, endereco, bairro, cidade, estado, telefone, cpf, categoria, subcategoria } = req.body;
        await pool.query(
            'UPDATE clientes SET nomecli=?, endereco=?, bairro=?, cidade=?, estado=?, telefone=?, cpf=?, categoria=?, subcategoria=? WHERE cdcliente=?',
            [nomecli, endereco, bairro, cidade, estado, telefone, cpf, categoria, subcategoria, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao salvar:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.delete('/excluir/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM clientes WHERE cdcliente = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Erro ao excluir:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/exportar', async (req, res) => {
    try {
        const query = `
            SELECT c.cdcliente, c.nomecli, c.endereco, c.bairro,
                   c.cidade, c.estado, c.telefone, c.cpf,
                   ct.categoria AS cat_nome
            FROM clientes c
            LEFT JOIN categoria ct ON ct.codigo = c.categoria
            ORDER BY c.nomecli
        `;
        const [rows] = await pool.query(query);
        const headers = ['Ord', 'Código', 'Nome', 'Endereço', 'Bairro', 'Cidade', 'UF', 'Telefone', 'CPF/CNPJ', 'Categoria'];
        let csv = headers.join(';') + '\n';
        rows.forEach((row, i) => {
            csv += [i + 1, row.cdcliente || '', row.nomecli || '', row.endereco || '', row.bairro || '', row.cidade || '', row.estado || '', row.telefone || '', row.cpf || '', row.cat_nome || '']
                .map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';') + '\n';
        });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="clientes.csv"');
        res.send('\uFEFF' + csv);
    } catch (err) {
        console.error('Erro ao exportar:', err);
        res.status(500).send('Erro ao exportar');
    }
});

module.exports = router;