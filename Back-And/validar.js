// O módulo nativo "fs" permite ler e escrever arquivos.
// Aqui usamos a versão baseada em promessas para poder usar async/await.
const fs = require("fs").promises;
const path = require("path");

// Caminho do arquivo que contém os gabaritos.
const caminhoGabaritos = path.join(__dirname, "dados", "gabaritos.json");

// Esta função valida os dados, encontra o gabarito e calcula a nota.
async function validar(jogador) {
    // Verifica se o nome é uma string e se não está vazio.
    if (typeof jogador.nome !== "string" || jogador.nome.trim() === "") {
        return {
            sucesso: false,
            erro: "O nome deve ser uma string não vazia."
        };
    }

    // Verifica se o tipo de gabarito foi informado.
    if (!jogador.tipoGabarito) {
        return {
            sucesso: false,
            erro: "O tipo de gabarito deve ser informado."
        };
    }

    // Verifica se respostas é uma lista com exatamente três itens.
    if (!Array.isArray(jogador.respostas) || jogador.respostas.length !== 3) {
        return {
            sucesso: false,
            erro: "É necessário informar exatamente três respostas."
        };
    }

    // Verifica se o tempo é um número entre 0 e 10.
    if (typeof jogador.tempo !== "number" || jogador.tempo < 0 || jogador.tempo > 10) {
        return {
            sucesso: false,
            erro: "O tempo deve ser um número entre 0 e 10."
        };
    }

    let gabaritos;

    try {
        // Lê o arquivo JSON como texto.
        const textoGabaritos = await fs.readFile(caminhoGabaritos, "utf8");

        // JSON.parse transforma o texto JSON em um objeto JavaScript.
        gabaritos = JSON.parse(textoGabaritos);
    } catch (erro) {
        return {
            sucesso: false,
            erro: "Não foi possível ler o arquivo de gabaritos."
        };
    }

    // Procura o tipo de gabarito usando a chave recebida.
    const gabarito = gabaritos[jogador.tipoGabarito];

    // Se não houver gabarito, não compara respostas nem calcula a nota.
    if (!gabarito) {
        return {
            sucesso: false,
            erro: "Tipo de gabarito inexistente."
        };
    }

    let acertos = 0;

    // Compara cada resposta recebida com a resposta correta.
    for (let indice = 0; indice < jogador.respostas.length; indice++) {
        if (jogador.respostas[indice] === gabarito[indice]) {
            acertos = acertos + 1;
        }
    }

    // Calcula a nota pela fórmula: 30 * acertos + 10 - tempo.
    const nota = Math.round(30 * acertos + 10 - jogador.tempo);

    // Retorna somente os dados definidos pelo formato do projeto.
    return {
        sucesso: true,
        dados: {
            nome: jogador.nome,
            tipoGabarito: jogador.tipoGabarito,
            respostas: jogador.respostas,
            tempo: jogador.tempo,
            acertos: acertos,
            nota: nota
        }
    };
}

// module.exports disponibiliza a função para outros arquivos usarem.
module.exports = validar;
