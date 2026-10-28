// Importa o módulo nativo para ler e escrever arquivos.
const fs = require("fs").promises;
const path = require("path");

// Arquivo que contém os jogadores cadastrados.
const caminhoJogadores = path.join(__dirname, "dados", "jogadores.json");
console.log("Caminho usado:", caminhoJogadores);
// Lê o arquivo e devolve a lista de jogadores.
async function lerJogadores() {
    try {
        const textoJogadores = await fs.readFile(caminhoJogadores, "utf8");
        return JSON.parse(textoJogadores);
    } catch (erro) {
        // Se o arquivo não existir, ele é criado com uma lista vazia.
        if (erro.code === "ENOENT") {
            await fs.writeFile(caminhoJogadores, "[]", "utf8");
            return [];
        }

        throw erro;
    }
}

// Executa a operação "buscar" ou "excluir" para o nome informado.
async function consultar(operacao, nome) {
    if (operacao !== "buscar" && operacao !== "excluir") {
        return {
            sucesso: false,
            erro: "Operação inválida."
        };
    }

    let jogadores;

    try {
        jogadores = await lerJogadores();
    } catch (erro) {
        return {
            sucesso: false,
            erro: "Não foi possível ler o arquivo de jogadores."
        };
    }

    let indiceEncontrado = -1;

    // Procura o jogador pelo nome.
    for (let indice = 0; indice < jogadores.length; indice++) {
        if (jogadores[indice].nome === nome) {
            indiceEncontrado = indice;
            break;
        }
    }

    if (indiceEncontrado === -1) {
        return {
            sucesso: false,
            erro: "Jogador não encontrado."
        };
    }

    if (operacao === "buscar") {
        return {
            sucesso: true,
            jogador: jogadores[indiceEncontrado]
        };
    }

    // Remove um item da lista quando a operação for "excluir".
    jogadores.splice(indiceEncontrado, 1);

    try {
        const textoAtualizado = JSON.stringify(jogadores, null, 2);
        await fs.writeFile(caminhoJogadores, textoAtualizado, "utf8");
    } catch (erro) {
        return {
            sucesso: false,
            erro: "Não foi possível salvar a lista atualizada."
        };
    }

    return {
        sucesso: true,
        mensagem: "Jogador excluído com sucesso."
    };
}

module.exports = {
    consultar,
    lerJogadores
}
