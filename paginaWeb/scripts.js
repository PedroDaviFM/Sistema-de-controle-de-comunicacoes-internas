document.addEventListener('DOMContentLoaded', () => {
    const formularioCi = document.getElementById('formularioCi');
    const corpoTabelaCi = document.querySelector('#tabelaCi tbody');
    const mensagemSemCi = document.getElementById('mensagemSemCi');
    const buscaInput = document.getElementById('buscaInput');

    // Função para buscar e renderizar as CIs
    async function buscarCis() {
        try {
            const resposta = await fetch('/api/cis');
            const cis = await resposta.json();
            renderizarCis(cis);
        } catch (erro) {
            console.error('Erro ao buscar CIs:', erro);
            alert('Erro ao carregar as CIs. Tente novamente mais tarde.');
        }
    }

    // Função para renderizar as CIs na tabela
    function renderizarCis(cis) {
        corpoTabelaCi.innerHTML = ''; // Limpa a tabela
        if (cis.length === 0) {
            mensagemSemCi.style.display = 'block';
            tabelaCi.style.display = 'none';
            return;
        } else {
            mensagemSemCi.style.display = 'none';
            tabelaCi.style.display = 'table';
        }

        cis.forEach(ci => {
            const linha = corpoTabelaCi.insertRow();
            linha.dataset.id = ci.id; // Armazena o ID no atributo de dados da linha

            const classeStatus = ci.lida ? 'status-lida' : 'status-pendente';
            const textoStatus = ci.lida ? 'Lida' : 'Pendente';

            const caminhoArquivo = ci.arquivoCi ? `<a href="${ci.arquivoCi}" target="_blank">Ver Arquivo</a>` : 'N/A';

            linha.innerHTML = `
                <td>${ci.numeroCi}</td>
                <td>${ci.remetente}</td>
                <td>${ci.destinatario}</td>
                <td>${ci.assunto}</td>
                <td>${new Date(ci.dataRecebimento).toLocaleDateString('pt-BR')}</td>
                <td>${caminhoArquivo}</td>
                <td class="${classeStatus}">${textoStatus}</td>
                <td>
                    <button class="action-button read" onclick="alternarStatusLida('${ci.id}', ${ci.lida})">
                        ${ci.lida ? 'Desmarcar Lida' : 'Marcar como Lida'}
                    </button>
                    <button class="action-button delete" onclick="excluirCi('${ci.id}')">Excluir</button>
                </td>
            `;
        });
    }

    // Função para adicionar uma nova CI
    formularioCi.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dadosFormulario = new FormData();
        dadosFormulario.append('numeroCi', document.getElementById('numeroCi').value);
        dadosFormulario.append('dataRecebimento', document.getElementById('dataRecebimento').value);
        dadosFormulario.append('remetente', document.getElementById('remetente').value);
        dadosFormulario.append('destinatario', document.getElementById('destinatario').value);
        dadosFormulario.append('assunto', document.getElementById('assunto').value);

        const arquivoCi = document.getElementById('arquivoCi').files[0];
        if (arquivoCi) {
            dadosFormulario.append('arquivoCi', arquivoCi);
        }

        try {
            const resposta = await fetch('/api/cis', {
                method: 'POST',
                body: dadosFormulario,
            });

            if (resposta.ok) {
                formularioCi.reset();
                buscarCis();
            } else {
                const dadosErro = await resposta.json();
                alert(`Erro ao adicionar CI: ${dadosErro.mensagem || 'Verifique os dados.'}`);
            }
        } catch (erro) {
            console.error('Erro ao adicionar CI:', erro);
            alert('Erro de comunicação com o servidor.');
        }
    });

    // Função para marcar/desmarcar CI como lida
    window.alternarStatusLida = async (id, statusAtual) => {
        try {
            const resposta = await fetch(`/api/cis/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lida: !statusAtual }),
            });

            if (resposta.ok) {
                buscarCis();
            } else {
                alert('Erro ao atualizar status da CI.');
            }
        } catch (erro) {
            console.error('Erro ao atualizar status:', erro);
            alert('Erro de comunicação com o servidor.');
        }
    };

    // Função para deletar CI
    window.excluirCi = async (id) => {
        if (!confirm('Tem certeza que deseja excluir esta CI?')) {
            return;
        }
        try {
            const resposta = await fetch(`/api/cis/${id}`, {
                method: 'DELETE',
            });

            if (resposta.ok) {
                buscarCis();
            } else {
                alert('Erro ao excluir CI.');
            }
        } catch (erro) {
            console.error('Erro ao excluir CI:', erro);
            alert('Erro de comunicação com o servidor.');
        }
    };

    // Função de Pesquisa
    window.filtrarCis = async () => {
        const termoBusca = buscaInput.value.toLowerCase();
        try {
            const resposta = await fetch('/api/cis');
            let cis = await resposta.json();

            const cisFiltradas = cis.filter(ci =>
                ci.numeroCi.toLowerCase().includes(termoBusca) ||
                ci.remetente.toLowerCase().includes(termoBusca) ||
                ci.destinatario.toLowerCase().includes(termoBusca) ||
                ci.assunto.toLowerCase().includes(termoBusca)
            );
            renderizarCis(cisFiltradas);
        } catch (erro) {
            console.error('Erro ao filtrar CIs:', erro);
        }
    };

    // Carrega as CIs ao iniciar a página
    buscarCis();
});