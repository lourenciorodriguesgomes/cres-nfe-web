const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

// ===== PARSER DO .ENV (sem dependency dotenv) =====
function loadEnv() {
    var envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return {};
    var lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    var env = {};
    lines.forEach(function(line) {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        var idx = line.indexOf('=');
        if (idx < 0) return;
        var key = line.substring(0, idx).trim();
        var val = line.substring(idx + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        env[key] = val;
    });
    return env;
}
var env = loadEnv();

// ===== CARREGA CONTAS DO .ENV =====
function getContas() {
    var contas = [];
    var keys = [
        { id: 'CONSPENA', nome: 'Cons Pena', prefix: 'BANCO_CONSPENA' },
        { id: 'GUANHAES', nome: 'Guanhães', prefix: 'BANCO_GUANHAES' },
        { id: 'INTER', nome: 'Banco Inter', prefix: 'BANCO_INTER' }
    ];
    keys.forEach(function(k) {
        if (env[k.prefix + '_TIPO']) {
            var conta = {
                id: k.id,
                nome: k.nome,
                tipo: env[k.prefix + '_TIPO'],
                client_id: env[k.prefix + '_CLIENT_ID'] || '',
                cert: env[k.prefix + '_CERT'] || '',
                key: env[k.prefix + '_KEY'] || '',
                numero_banco: env[k.prefix + '_NUMERO_BANCO'] || '',
                agencia: env[k.prefix + '_AGENCIA'] || '',
                conta: env[k.prefix + '_CONTA'] || '',
                arquivo: env[k.prefix + '_ARQUIVO'] || k.id.toLowerCase()
            };
            if (k.id === 'INTER') {
                conta.client_secret = env[k.prefix + '_CLIENT_SECRET'] || '';
            }
            contas.push(conta);
        }
    });
    return contas;
}

// ===== HELPER HTTPS COM CERTIFICADO =====
function httpsRequest(opts) {
    return new Promise(function(resolve, reject) {
        var certPath = path.join(__dirname, '..', opts.cert);
        var keyPath = path.join(__dirname, '..', opts.key);

        if (!fs.existsSync(certPath)) { reject(new Error('Certificado não encontrado: ' + certPath)); return; }
        if (!fs.existsSync(keyPath)) { reject(new Error('Chave não encontrada: ' + keyPath)); return; }

        var agent = new https.Agent({
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            rejectUnauthorized: false
        });

        var url = new URL(opts.url);
        var reqPath = url.pathname;
        if (opts.params) reqPath += '?' + querystring.stringify(opts.params);

        var headers = opts.headers || {};
        var bodyData = null;
        if (opts.body) {
            if (typeof opts.body === 'object') {
                bodyData = querystring.stringify(opts.body);
                headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
            } else {
                bodyData = opts.body;
            }
        }

        var reqOpts = {
            hostname: url.hostname,
            port: url.port || 443,
            path: reqPath,
            method: opts.method || 'GET',
            agent: agent,
            headers: headers
        };
        if (bodyData) reqOpts.headers['Content-Length'] = Buffer.byteLength(bodyData);

        var req = https.request(reqOpts, function(res) {
            var data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() {
                if (res.statusCode >= 400) {
                    reject(new Error('HTTP ' + res.statusCode + ': ' + data.substring(0, 500)));
                    return;
                }
                try { resolve(JSON.parse(data)); }
                catch(e) { resolve({ raw: data }); }
            });
        });
        req.on('error', reject);
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

// ===== SICOOB: BUSCAR EXTRATO =====
async function fetchSicoob(conta, mes, ano) {
    // 1. Obter token
    var tokenResp = await httpsRequest({
        url: 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token',
        method: 'POST',
        cert: conta.cert,
        key: conta.key,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: {
            grant_type: 'client_credentials',
            client_id: conta.client_id,
            scope: 'pix.read cco_extrato cco_saldo cco_consulta'
        }
    });
    var token = tokenResp.access_token;
    if (!token) throw new Error('Token SICOOB não obtido');

    // 2. Buscar extrato (se mes=0, busca todos os 12 meses)
    var meses = (mes === 0) ? [1,2,3,4,5,6,7,8,9,10,11,12] : [mes];
    var todasTransacoes = [];


    for (var i = 0; i < meses.length; i++) {
        var mesFmt = String(meses[i]).padStart(2, '0');
        var ultimoDia = new Date(ano, meses[i], 0).getDate();
        var resp = await httpsRequest({
            url: 'https://api.sicoob.com.br/conta-corrente/v4/extrato/' + mesFmt + '/' + ano,
            method: 'GET',
            cert: conta.cert,
            key: conta.key,
            headers: {
                'Authorization': 'Bearer ' + token,
                'client_id': conta.client_id
            },
            params: {
                numeroContaCorrente: conta.conta,
                diaInicial: '01',
                diaFinal: String(ultimoDia).padStart(2, '0')
            }
        });
        var transacoes = (resp.resultado && resp.resultado.transacoes) || [];
        todasTransacoes = todasTransacoes.concat(transacoes);
    }
    return todasTransacoes;
}

// ===== INTER: BUSCAR EXTRATO =====
async function fetchInter(conta, mes, ano) {
    // 1. Obter token
    var tokenResp = await httpsRequest({
        url: 'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
        method: 'POST',
        cert: conta.cert,
        key: conta.key,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: {
            client_id: conta.client_id,
            client_secret: conta.client_secret,
            grant_type: 'client_credentials',
            scope: 'extrato.read'
        }
    });
    var token = tokenResp.access_token;
    if (!token) throw new Error('Token Inter não obtido');

    // 2. Calcular período
    var dataInicio, dataFim;
    if (mes === 0) {
        dataInicio = ano + '-01-01';
        dataFim = ano + '-12-31';
    } else {
        dataInicio = ano + '-' + String(mes).padStart(2, '0') + '-01';
        var ultimoDia = new Date(ano, mes, 0).getDate();
        dataFim = ano + '-' + String(mes).padStart(2, '0') + '-' + String(ultimoDia).padStart(2, '0');
    }

    // 3. Buscar extrato
    var resp = await httpsRequest({
        url: 'https://cdpj.partners.bancointer.com.br/banking/v2/extrato',
        method: 'GET',
        cert: conta.cert,
        key: conta.key,
        headers: {
            'Authorization': 'Bearer ' + token,
            'x-conta-corrente': conta.conta
        },
        params: { dataInicio: dataInicio, dataFim: dataFim }
    });
    return resp.transacoes || [];
}

// ===== SALVAR CSV =====
function saveCSV(conta, transacoes, ano) {
    var csvDir = path.join(__dirname, '..', 'csv');
    if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

    var nomeArquivo = conta.arquivo + '_' + ano + '.csv';
    var caminho = path.join(csvDir, nomeArquivo);
    if (transacoes.length === 0) return caminho;

    var colunas = Object.keys(transacoes[0]);
    var csv = colunas.join(';') + '\n';
    transacoes.forEach(function(t) {
        var linha = colunas.map(function(c) {
            var val = String(t[c] || '');
            return '"' + val.replace(/"/g, '""') + '"';
        });
        csv += linha.join(';') + '\n';
    });
    fs.writeFileSync(caminho, '\uFEFF' + csv, 'utf-8');
    return caminho;
}

// ===== EXTRAIR CPF/CNPJ (igual ExtraiCpfCnpjPix do Harbour) =====
function extraiCpfCnpjPix(texto) {
    if (!texto) return '';
    var digitos = String(texto).replace(/\D/g, '');
    if (digitos.length >= 14) return digitos.substring(0, 14);
    if (digitos.length >= 11) return digitos.substring(0, 11);
    return '';
}

// ===== HELPER: BUSCAR CAMPO COM VÁRIOS NOMES POSSÍVEIS =====
function getField(obj, names) {
    for (var i = 0; i < names.length; i++) {
        if (obj[names[i]] !== undefined && obj[names[i]] !== null) {
            return String(obj[names[i]]);
        }
    }
    return '';
}

// ===== IMPORTAR PARA O BANCO (igual ImportaExtratoSICOOB) =====
async function importarExtrato(conta, transacoes) {
    var total = transacoes.length;
    var importados = 0;
    var duplicados = 0;
    var erros = 0;

    var banco = conta.numero_banco || '';
    var agencia = conta.agencia || '';
    var contaNum = conta.conta || '';

    for (var i = 0; i < transacoes.length; i++) {
        var t = transacoes[i];

        // Mapear campos (tentar múltiplos nomes possíveis)
        var transactionId = getField(t, ['transactionId', 'id', 'codigoTransacao', 'idTransacao']);
        var tipo = getField(t, ['tipo', 'tipoLancamento', 'tipoOperacao']);
        var valor = getField(t, ['valor', 'Valor', 'valorTransacao']);
        var data = getField(t, ['data', 'dataMovimento', 'dataTransacao', 'dataLancamento']).substring(0, 10);
        var dataLote = getField(t, ['dataLote', 'dataLancamento', 'dataTransacao', 'data']).substring(0, 10);
        var descricao = getField(t, ['descricao', 'descLancamento', 'historico', 'titulo']);
        var numeroDocumento = getField(t, ['numeroDocumento', 'numeroDoc', 'documento']);
        var textoCpf = getField(t, ['descInfComplementar', 'informacaoComplementar', 'cpfCnpjCorrentista', 'nomeCorrentista', 'complemento']);

        if (!transactionId) continue;

        // Verificar duplicado (igual ao Harbour)
        var [existing] = await pool.query(
            'SELECT COUNT(*) AS total FROM extrato WHERE transactionId = ?',
            [transactionId]
        );
        if (existing[0].total > 0) { duplicados++; continue; }

        // Extrair CPF/CNPJ
        var cpfCnpj = extraiCpfCnpjPix(textoCpf);

        // Parse valor
        var valorNum = parseFloat(String(valor).replace(/\./g, '').replace(',', '.')) || 0;

        try {
            await pool.query(
                'INSERT INTO extrato (banco, agencia, conta, transactionId, tipo, valor, data, dataLote, descricao, numeroDocumento, descInfComplementar, cpfCnpj) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [banco, agencia, contaNum, transactionId, tipo, valorNum, data, dataLote, descricao, numeroDocumento, '', cpfCnpj]
            );
            importados++;
        } catch(err) {
            erros++;
            console.error('Erro ao inserir transação ' + transactionId + ':', err.message);
        }
    }

    return { total: total, importados: importados, duplicados: duplicados, erros: erros };
}

// ===== ROTA GET: PÁGINA HTML =====
router.get('/', async (req, res) => {
    var contas = getContas();
    if (contas.length === 0) {
        res.send('<div style="padding:40px;text-align:center;color:red;">Nenhuma conta configurada no .env</div>');
        return;
    }

    var contasOpts = '';
    contas.forEach(function(c) {
        contasOpts += '<option value="' + c.id + '">' + c.nome + ' (' + c.tipo.toUpperCase() + ')</option>';
    });

    var today = new Date();
    var anoAtual = today.getFullYear();
    var mesAtual = today.getMonth() + 1;

    var html = '<div class="mapa-container" style="max-width:600px;margin:0 auto;padding:20px;">' +
        '<h2 style="text-align:center;margin-bottom:20px;">Importar Extrato Bancário</h2>' +
        '<div style="background:#2a2a3e;padding:20px;border-radius:8px;border:1px solid #555;">' +
          '<div style="margin-bottom:15px;">' +
            '<label style="display:block;margin-bottom:5px;font-size:14px;">Conta:</label>' +
            '<select id="impConta" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#1e1e2e;color:#fff;box-sizing:border-box;">' + contasOpts + '</select>' +
          '</div>' +
          '<div style="display:flex;gap:15px;margin-bottom:15px;">' +
            '<div style="flex:1;">' +
              '<label style="display:block;margin-bottom:5px;font-size:14px;">Mês:</label>' +
              '<select id="impMes" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#1e1e2e;color:#fff;box-sizing:border-box;">' +
                '<option value="0">Todos os meses</option>' +
                '<option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option>' +
                '<option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option>' +
                '<option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option>' +
                '<option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>' +
              '</select>' +
            '</div>' +
            '<div style="flex:1;">' +
              '<label style="display:block;margin-bottom:5px;font-size:14px;">Ano:</label>' +
              '<input type="number" id="impAno" value="' + anoAtual + '" style="width:100%;padding:8px;font-size:14px;border:1px solid #555;border-radius:4px;background:#1e1e2e;color:#fff;box-sizing:border-box;">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;justify-content:center;margin-top:20px;">' +
            '<button onclick="impProcessar()" style="background:#4a6fa5;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;">Importar Extrato</button>' +
            '<button onclick="impVoltar()" style="background:#555;color:#fff;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:14px;">Voltar</button>' +
          '</div>' +
        '</div>' +
        '<div id="impStatus" style="margin-top:20px;padding:15px;background:#1a1d29;border-radius:6px;font-size:13px;min-height:60px;max-height:300px;overflow-y:auto;border:1px solid #333;">' +
          '<span style="color:#a0c4e8;">Aguardando...</span>' +
        '</div>' +
      '</div>';

    res.send(html);
});

// ===== ROTA POST: PROCESSAR (buscar API + salvar CSV + importar DB) =====
router.post('/processar', async (req, res) => {
    var contaId = req.body.conta_id;
    var mes = parseInt(req.body.mes) || 0;
    var ano = parseInt(req.body.ano) || new Date().getFullYear();

    var contas = getContas();
    var conta = contas.find(function(c) { return c.id === contaId; });
    if (!conta) { res.json({ success: false, message: 'Conta não encontrada' }); return; }

    try {
        // 1. Buscar da API do banco
        var transacoes;
        if (conta.tipo === 'sicoob') {
            transacoes = await fetchSicoob(conta, mes, ano);
        } else if (conta.tipo === 'inter') {
            transacoes = await fetchInter(conta, mes, ano);
        } else {
            res.json({ success: false, message: 'Tipo de banco não suportado' });
            return;
        }

        if (!transacoes || transacoes.length === 0) {
            res.json({ success: true, message: 'Nenhuma transação encontrada', total: 0, importados: 0, duplicados: 0 });
            return;
        }

        // 2. Salvar CSV (igual ao Python)
        var csvPath = saveCSV(conta, transacoes, ano);

        // 3. Importar para o banco (igual ao Harbour ImportaExtratoSICOOB)
        var result = await importarExtrato(conta, transacoes);

        res.json({
            success: true,
            message: 'Importação concluída!',
            total: result.total,
            importados: result.importados,
            duplicados: result.duplicados,
            erros: result.erros,
            csv: csvPath
        });
    } catch (err) {
        console.error('Erro ao importar extrato:', err);
        res.json({ success: false, message: err.message });
    }
});

module.exports = router;