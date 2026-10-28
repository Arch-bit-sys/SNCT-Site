const API_URL = "http://localhost:3000";

// Elementos da página
const nomeForm = document.querySelector("#nome-form");
const nomeInput = document.querySelector("#nome");
const continuarButton = document.querySelector("#continuar");
const etapaProva = document.querySelector("#etapa-prova");
const tipoProvaSelect = document.querySelector("#tipo-prova");
const perguntaArea = document.querySelector("#pergunta-area");
const prosseguirButton = document.querySelector("#prosseguir");
const conclusao = document.querySelector("#conclusao");
const resultadoFinal = document.querySelector("#resultado-final");
const statusTexto = document.querySelector("#status");

// Estado do jogo
let nomeJogador = "";
let bancoDePerguntas = {};
let tipoAtual = "";
let questoesAtuais = [];
let indiceQuestao = 0;
let respostas = [];
let inicioProva = 0;

function mostrarStatus(mensagem, tipo = "info") {
  statusTexto.textContent = mensagem;
  statusTexto.className = tipo;
}

// Carrega perguntas.json: cada chave é o tipo da prova e seu valor é
// um array com as questões dessa prova.
async function carregarPerguntas() {
  const resposta = await fetch("./perguntas.json");

  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar perguntas.json (HTTP ${resposta.status}).`);
  }

  bancoDePerguntas = await resposta.json();
  const tipos = Object.keys(bancoDePerguntas);

  if (tipos.length === 0) {
    throw new Error("perguntas.json não contém provas.");
  }

  tipoProvaSelect.replaceChildren(new Option("Selecione uma prova", ""));

  for (const tipo of tipos) {
    if (!Array.isArray(bancoDePerguntas[tipo]) || bancoDePerguntas[tipo].length === 0) {
      throw new Error(`A prova ${tipo} não contém uma lista de questões.`);
    }

    tipoProvaSelect.add(new Option(`Prova ${tipo}`, tipo));
  }
}

// Valida o nome sem permitir o envio padrão do formulário.
nomeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nome = nomeInput.value.trim();
  if (!nome) {
    mostrarStatus("Digite seu nome para continuar.", "error");
    nomeInput.focus();
    return;
  }

  continuarButton.disabled = true;
  mostrarStatus("Verificando nome...");

  try {
    const url = new URL(`${API_URL}/Search/JogadorExiste`);
    url.searchParams.set("name", nome);

    const resposta = await fetch(url);
    if (!resposta.ok) {
      throw new Error(`A API respondeu HTTP ${resposta.status}.`);
    }

    const resultado = await resposta.json();
    const textoResultado = (
      typeof resultado === "string" ? resultado : JSON.stringify(resultado)
    ).toLocaleLowerCase("pt-BR");

    if (textoResultado.includes("jogador encontrado")) {
      mostrarStatus("Esse nome já está cadastrado. Escolha outro.", "error");
      return;
    }

    nomeJogador = nome;
    nomeForm.hidden = true;
    etapaProva.hidden = false;
    inicioProva = performance.now();
    mostrarStatus("Nome validado. Escolha uma prova.");
  } catch (erro) {
    console.error(erro);
    mostrarStatus(`Não foi possível validar o nome: ${erro.message}`, "error");
  } finally {
    continuarButton.disabled = false;
  }
});

// Seleciona a prova e prepara a primeira questão.
tipoProvaSelect.addEventListener("change", () => {
  tipoAtual = tipoProvaSelect.value;
  indiceQuestao = 0;
  respostas = [];
  perguntaArea.replaceChildren();

  if (!tipoAtual) {
    questoesAtuais = [];
    prosseguirButton.disabled = true;
    return;
  }

  questoesAtuais = bancoDePerguntas[tipoAtual];
  mostrarQuestao();
});

// Mostra apenas a questão atual.
function mostrarQuestao() {
  perguntaArea.replaceChildren();

  const questao = questoesAtuais[indiceQuestao];
  if (!questao) {
    mostrarStatus("Não encontrei essa questão no JSON.", "error");
    prosseguirButton.disabled = true;
    return;
  }

  const fieldset = document.createElement("fieldset");
  const legenda = document.createElement("legend");
  legenda.textContent = questao.pergunta ?? questao.enunciado ?? questao.questao ?? `Questão ${indiceQuestao + 1}`;
  fieldset.appendChild(legenda);

  const alternativas = questao.alternativas ?? questao.opcoes ?? questao.opções ?? questao.respostas;

  if (!Array.isArray(alternativas) || alternativas.length === 0) {
    mostrarStatus(
      `A questão ${indiceQuestao + 1} não tem um array de alternativas reconhecido.`,
      "error"
    );
    prosseguirButton.disabled = true;
    return;
  }

  alternativas.forEach((alternativa, indice) => {
    const label = document.createElement("label");
    label.className = "alternativa";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "resposta";
    radio.value = String(indice);
    radio.required = true;

    if (respostas[indiceQuestao] === String(indice)) {
      radio.checked = true;
    }

    const texto = document.createElement("span");
    texto.textContent = typeof alternativa === "object"
      ? (alternativa.texto ?? alternativa.text ?? alternativa.alternativa ?? JSON.stringify(alternativa))
      : String(alternativa);

    label.append(radio, texto);
    fieldset.appendChild(label);
  });

  perguntaArea.appendChild(fieldset);
  prosseguirButton.textContent =
    indiceQuestao === questoesAtuais.length - 1 ? "Finalizar prova" : "Prosseguir";
  prosseguirButton.disabled = false;
  mostrarStatus(`Questão ${indiceQuestao + 1} de ${questoesAtuais.length}.`);
}

// Este botão é type=button e não envia nenhum formulário.
prosseguirButton.addEventListener("click", async (event) => {
  event.preventDefault();

  const selecionada = perguntaArea.querySelector('input[name="resposta"]:checked');
  if (!selecionada) {
    mostrarStatus("Selecione uma resposta para continuar.", "error");
    return;
  }

  respostas[indiceQuestao] = selecionada.value;

  if (indiceQuestao < questoesAtuais.length - 1) {
    indiceQuestao += 1;
    mostrarQuestao();
    return;
  }

  await enviarProva();
});

// Envia o resultado apenas depois da última questão.
async function enviarProva() {
  prosseguirButton.disabled = true;
  mostrarStatus("Enviando respostas...");

  const tempo = Math.max(0, Math.round((performance.now() - inicioProva) / 60000));
  const dados = {
    nome: nomeJogador,
    tipoGabarito: tipoAtual,
    respostas,
    tempo
  };

  try {
    const resposta = await fetch(`${API_URL}/Formulario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(resultado.mensagem ?? resultado.erro ?? `Erro HTTP ${resposta.status}.`);
    }

    etapaProva.hidden = true;
    conclusao.hidden = false;
    resultadoFinal.textContent =
      resultado.mensagem ?? "Suas respostas foram enviadas com sucesso.";
    mostrarStatus("");
  } catch (erro) {
    console.error(erro);
    mostrarStatus(`Não foi possível enviar a prova: ${erro.message}`, "error");
    prosseguirButton.disabled = false;
  }
}

// Inicialização
(async function iniciar() {
  prosseguirButton.disabled = true;

  try {
    await carregarPerguntas();
  } catch (erro) {
    console.error("Erro ao carregar perguntas:", erro);
    mostrarStatus(`Erro ao carregar perguntas: ${erro.message}`, "error");
  }
})();
