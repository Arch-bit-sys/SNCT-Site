// Importa as funções dos três módulos do sistema.
const validar = require("./validar");
const salvar = require("./salvar");
const consultar = require("./consultar");


// A função principal que faz o cadastro
async function cadastrar(jogador) {
    const validacao = await validar(jogador);

    if (!validacao.sucesso) {
        console.log(validacao.erro);
        return;
    }

    const resultado = await salvar(validacao.dados);
    console.log(resultado);
}

//Função que deleta ou procura um dado, basta substituir o modo em mode ex: deletar e buscar são os unicos modos possiveis.
async function procurar_deletar(mode, nome) {
    const seach = await consultar.consultar(mode, nome);
    return seach;
}
// Lista todos os jogadores
async function ListarJogadores() {
    const jogadores = await consultar.lerJogadores();
    return jogadores;
}

module.exports = {
    cadastrar,
    procurar_deletar,
    ListarJogadores
};
