const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.post('/login', async (req, res) => {
    try {
        const { codigo, senha } = req.body;
        if (!codigo || !senha) {
            return res.json({ success: false, message: 'Código e senha obrigatórios' });
        }

        const [rows] = await pool.query(
            'SELECT codigo, item02, senha FROM pessoal WHERE codigo = ?',
            [codigo]
        );

        if (rows.length === 0) {
            return res.json({ success: false, message: 'Operador não encontrado' });
        }

        const operador = rows[0];
        const nome = operador.item02 || '';
        const senhaBanco = operador.senha || '';

        if (!nome) {
            return res.json({ success: false, message: 'Operador sem nome cadastrado' });
        }

        // Valida a senha digitada contra o campo "senha" da tabela
        if (senha !== senhaBanco) {
            return res.json({ success: false, message: 'Senha incorreta' });
        }

        req.session.operador = {
            codigo: operador.codigo,
            nome: nome
        };

        res.json({ success: true, operador: { codigo: operador.codigo, nome: nome } });
    } catch (err) {
        console.error('Erro no login:', err);
        res.status(500).json({ success: false, message: 'Erro interno' });
    }
});

router.get('/buscar-operador', async (req, res) => {
    try {
        const codigo = req.query.codigo;
        if (!codigo) return res.json({});

        const [rows] = await pool.query(
            'SELECT codigo, item02 FROM pessoal WHERE codigo = ?',
            [codigo]
        );

        if (rows.length === 0) {
            return res.json({});
        }

        res.json({ nome: rows[0].item02 || '' });
    } catch (err) {
        console.error('Erro ao buscar operador:', err);
        res.json({});
    }
});

router.get('/verificar', (req, res) => {
    if (req.session && req.session.operador) {
        res.json({ logado: true, operador: req.session.operador });
    } else {
        res.json({ logado: false });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(function() {
        res.redirect('/login');
    });
});

module.exports = router;