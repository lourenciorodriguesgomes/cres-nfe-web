function impVoltar() {
    loadPage('contacorrente');
}

function impProcessar() {
    var conta = document.getElementById('impConta').value;
    var mes = document.getElementById('impMes').value;
    var ano = document.getElementById('impAno').value;

    if (!conta || !ano) {
        alert('Selecione a conta e informe o ano');
        return;
    }

    var status = document.getElementById('impStatus');
    status.innerHTML = '<span style="color:#ffd700;">Buscando extrato e importando... Aguarde, isso pode levar alguns segundos.</span>';

    fetch('/importar_extrato/processar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            conta_id: conta,
            mes: mes,
            ano: ano
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            status.innerHTML =
                '<div style="color:#4CAF50;font-size:15px;font-weight:bold;margin-bottom:10px;">' + data.message + '</div>' +
                '<div style="color:#a0c4e8;">Total de transações: ' + data.total + '</div>' +
                '<div style="color:#4CAF50;">Importados: ' + data.importados + '</div>' +
                '<div style="color:#ffaa00;">Duplicados (ignorados): ' + data.duplicados + '</div>' +
                (data.erros > 0 ? '<div style="color:#f44336;">Erros: ' + data.erros + '</div>' : '') +
                (data.csv ? '<div style="color:#888;margin-top:8px;font-size:12px;">CSV salvo: ' + data.csv + '</div>' : '');
        } else {
            status.innerHTML = '<div style="color:#f44336;">Erro: ' + data.message + '</div>';
        }
    })
    .catch(function(err) {
        status.innerHTML = '<div style="color:#f44336;">Erro: ' + err.message + '</div>';
    });
}