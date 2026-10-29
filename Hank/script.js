const API = "https://snct-site.onrender.com";

const botao = document.getElementById("carregar");
const tabela = document.getElementById("jogadores");
const status = document.getElementById("status");

botao.addEventListener("click", carregarJogadores);

async function carregarJogadores() {
    try {
        status.textContent = "Carregando jogadores...";
        status.className = "";
        tabela.replaceChildren();

        const resposta = await fetch(`${API}/Search/ListarJogadores`);

        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const jogadores = await resposta.json();

        // Ordena por nota (maior → menor).
        // Empate: menor tempo primeiro (quem resolveu mais rápido fica à frente).
        // `Number(...) || 0` protege contra `null`/`undefined` vindos da API.
        const nota = (j) => Number(j.nota) || 0;
        const tempo = (j) => Number(j.tempo) || 0;

        jogadores.sort((a, b) => {
            const diffNota = nota(b) - nota(a);
            if (diffNota !== 0) return diffNota;
            return tempo(a) - tempo(b);
        });

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

        status.textContent = `${jogadores.length} jogador(es) encontrado(s).`;

    } catch (erro) {
        status.textContent = `Não foi possível consultar a API: ${erro.message}`;
        status.className = "error";
        console.error(erro);
    }
}