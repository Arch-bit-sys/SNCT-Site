const API = "http://192.168.1.236:3000";

const botao = document.getElementById("carregar");
const tabela = document.getElementById("jogadores");
const status = document.getElementById("status");

botao.addEventListener("click", carregarJogadores);

async function carregarJogadores() {
    try {
        status.textContent = "Carregando jogadores...";
        tabela.replaceChildren();

        const resposta = await fetch(
            `${API}/Search/ListarJogadores`
        );

        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const jogadores = await resposta.json();

        for (const jogador of jogadores) {
            const linha = document.createElement("tr");

            const valores = [
                jogador.nome,
                jogador.tipoGabarito,
                jogador.respostas.join(", "),
                jogador.tempo,
                jogador.acertos,
                jogador.nota
            ];

            for (const valor of valores) {
                const celula = document.createElement("td");

                celula.textContent = valor;
                linha.appendChild(celula);
            }

            tabela.appendChild(linha);
        }

        status.textContent =
            `${jogadores.length} jogador(es) encontrado(s).`;

    } catch (erro) {
        status.textContent =
            `Não foi possível consultar a API: ${erro.message}`;

        console.error(erro);
    }
}
