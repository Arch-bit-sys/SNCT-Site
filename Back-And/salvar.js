// Importa o módulo nativo para trabalhar com arquivos.
const fs = require("fs").promises;
const path = require("path");

// Arquivo onde os jogadores serão armazenados.
const caminhoJogadores = path.join(__dirname, "dados", "jogadores.json");
// Lê os jogadores existentes ou cria uma lista vazia se o arquivo não existir.
async function lerJogadores() {
    try {
        const textoJogadores = await fs.readFile(caminhoJogadores, "utf8");
        return JSON.parse(textoJogadores);
    } catch (erro) {
        // Se o arquivo ainda não existir, a lista inicial deve ser vazia.
        if (erro.code === "ENOENT") {
            await fs.writeFile(caminhoJogadores, "[]", "utf8");
            return [];
        }

        // Outros erros significam que não foi possível ler o arquivo.
        throw erro;
    }
}

// Salva os dados já validados, sem validar as respostas novamente.
async function salvar(dados) {
    let jogadores;

    try {
        jogadores = await lerJogadores();
    } catch (erro) {
        return {
            sucesso: false,
            erro: "Não foi possível ler o arquivo de jogadores."
        };
    }

    // Procura outro jogador com o mesmo nome.
    for (let indice = 0; indice < jogadores.length; indice++) {
        if (jogadores[indice].nome === dados.nome) {
            return {
                sucesso: false,
                erro: "Jogador já cadastrado."
            };
        }
    }

    // Adiciona o novo registro à lista existente.
    jogadores.push(dados);

    try {
        // JSON.stringify transforma a lista JavaScript em texto JSON.
        const textoAtualizado = JSON.stringify(jogadores, null, 2);
        await fs.writeFile(caminhoJogadores, textoAtualizado, "utf8");
    } catch (erro) {
        return {
            sucesso: false,
            erro: "Não foi possível salvar o jogador."
        };
    }

    return {
        sucesso: true,
        mensagem: "Jogador cadastrado com sucesso."
    };
}

module.exports = salvar;
