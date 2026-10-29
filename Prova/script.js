/**
 * Front-end do sistema de provas.
 *
 * Fluxo:
 *   1. Carrega `perguntas.json` e popula o <select> de provas.
 *   2. Valida o nome contra `/Search/JogadorExiste`.
 *   3. Inicia um COUNTDOWN de 10 minutos + cronômetro visível.
 *   4. Usuário escolhe a prova e responde; cada "Prosseguir" salva em `respostas[]`.
 *   5. Ao finalizar (manualmente OU por tempo esgotado), `enviarProva()` faz POST.
 *
 * Modelo enviado à API:
 *   { nome: string, tipoGabarito: string, respostas: string[], tempo: number }
 */

const API_URL = "https://snct-site.onrender.com";

/** Duração máxima da prova em milissegundos (10 minutos). */
const TEMPO_LIMITE_MS = 10 * 60 * 1000;

// Referências ao DOM
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
const cronometro = document.querySelector("#cronometro");

// ---------------------------------------------------------------------------
// Estado da aplicação
// ---------------------------------------------------------------------------

let nomeJogador = "";
let bancoDePerguntas = {};
let tipoAtual = "";
let questoesAtuais = [];
let indiceQuestao = 0;
let respostas = [];

/** Timestamp (`performance.now()`) do início da prova. */
let inicioProva = 0;

/** Timestamp futuro em que o tempo acaba (`inicioProva + TEMPO_LIMITE_MS`). */
let tempoFinalMs = 0;

/** Handle do `setInterval` (null quando o cronômetro está parado). */
let cronometroIntervalo = null;

/** true quando o tempo acabou (bloqueia avanço; botão vira "Tentar enviar"). */
let tempoEsgotado = false;

/** true enquanto um envio está em andamento (evita envio duplo). */
let enviando = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mostrarStatus(mensagem, tipo = "info") {
  statusTexto.textContent = mensagem;
  statusTexto.className = tipo;
}

/**
 * Formata milissegundos em "MM:SS" (sempre positivo, arredonda para baixo).
 */
function formatarTempo(ms) {
  const totalSegundos = Math.max(0, Math.floor(ms / 1000));
  const minutos = Math.floor(totalSegundos / 60).toString().padStart(2, "0");
  const segundos = (totalSegundos % 60).toString().padStart(2, "0");
  return `${minutos}:${segundos}`;
}

/**
 * Inicia o countdown de 10 minutos.
 * Atualiza o display a cada segundo e, quando zera, dispara o envio automático.
 */
function iniciarCronometro() {
  pararCronometro();
  tempoEsgotado = false;
  cronometro.hidden = false;
  cronometro.classList.remove("alerta", "esgotado");
  tempoFinalMs = inicioProva + TEMPO_LIMITE_MS;

  const atualizar = () => {
    const restante = tempoFinalMs - performance.now();

    if (restante <= 0) {
      // Tempo esgotado: congela o display e dispara o envio.
      cronometro.textContent = "00:00";
      cronometro.classList.remove("alerta");
      cronometro.classList.add("esgotado");
      pararCronometro();
      tempoEsgotado = true;
      dispararEnvioPorTempo();
      return;
    }

    cronometro.textContent = formatarTempo(restante);

    // Último minuto: ativa estado visual de alerta.
    if (restante <= 60_000) {
      cronometro.classList.add("alerta");
    } else {
      cronometro.classList.remove("alerta");
    }
  };

  atualizar(); // mostra o valor imediato (sem esperar 1s)
  cronometroIntervalo = setInterval(atualizar, 1000);
}

/**
 * Para o `setInterval` do cronômetro (não esconde o display).
 */
function pararCronometro() {
  if (cronometroIntervalo !== null) {
    clearInterval(cronometroIntervalo);
    cronometroIntervalo = null;
  }
}

/**
 * Chamado quando o tempo zera: bloqueia avanço e tenta enviar.
 * Se o usuário ainda não escolheu a prova, envia mesmo assim
 * (respostas vazias — a API decide o que fazer).
 */
async function dispararEnvioPorTempo() {
  prosseguirButton.disabled = true;
  prosseguirButton.textContent = "Tempo esgotado";

  if (enviando) return; // já há um envio em andamento

  mostrarStatus("Tempo esgotado! Enviando suas respostas...", "error");
  await enviarProva();
}

// ---------------------------------------------------------------------------
// Carregamento inicial
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Etapa 1: validação do nome
// ---------------------------------------------------------------------------

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

    // Tudo certo: transita para a etapa da prova e inicia o countdown.
    nomeJogador = nome;
    nomeForm.hidden = true;
    etapaProva.hidden = false;
    inicioProva = performance.now();
    iniciarCronometro();
    mostrarStatus("Nome validado. Escolha uma prova.");
  } catch (erro) {
    console.error(erro);
    mostrarStatus(`Não foi possível validar o nome: ${erro.message}`, "error");
  } finally {
    continuarButton.disabled = false;
  }
});

// ---------------------------------------------------------------------------
// Etapa 2: escolha da prova
// ---------------------------------------------------------------------------

tipoProvaSelect.addEventListener("change", () => {
  // Se o tempo esgotou, não permite trocar de prova.
  if (tempoEsgotado) {
    tipoProvaSelect.value = tipoAtual;
    return;
  }

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

// ---------------------------------------------------------------------------
// Etapa 3: renderização da questão atual
// ---------------------------------------------------------------------------

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

  const label = document.createElement("label");
  label.className = "alternativa";

  const input = document.createElement("input");
  input.type = "text";
  input.name = "resposta";
  input.autocomplete = "off";
  input.placeholder = "Digite sua resposta";

  if (typeof respostas[indiceQuestao] === "string") {
    input.value = respostas[indiceQuestao];
  }

  label.appendChild(input);
  fieldset.appendChild(label);

  perguntaArea.appendChild(fieldset);

  prosseguirButton.textContent =
    indiceQuestao === questoesAtuais.length - 1 ? "Finalizar prova" : "Prosseguir";
  prosseguirButton.disabled = tempoEsgotado;
  mostrarStatus(`Questão ${indiceQuestao + 1} de ${questoesAtuais.length}.`);
}

// ---------------------------------------------------------------------------
// Etapa 4: avanço e envio
// ---------------------------------------------------------------------------

prosseguirButton.addEventListener("click", async (event) => {
  event.preventDefault();

  // Se o tempo esgotou, o botão só serve para retry de envio.
  if (tempoEsgotado) {
    if (enviando) return;
    prosseguirButton.disabled = true;
    mostrarStatus("Tentando enviar novamente...", "info");
    await enviarProva();
    return;
  }

  const campo = perguntaArea.querySelector('input[name="resposta"]');
  const valor = campo ? campo.value.trim() : "";
  if (!valor) {
    mostrarStatus("Digite uma resposta para continuar.", "error");
    if (campo) campo.focus();
    return;
  }

  respostas[indiceQuestao] = valor;

  if (indiceQuestao < questoesAtuais.length - 1) {
    indiceQuestao += 1;
    mostrarQuestao();
    return;
  }

  await enviarProva();
});

async function enviarProva() {
  if (enviando) return;
  enviando = true;

  prosseguirButton.disabled = true;
  mostrarStatus("Enviando respostas...");

  // Tempo efetivo: entre 0 e 10 minutos (auto-envio pode estourar levemente).
  const tempoDecorridoMs = performance.now() - inicioProva;
  const tempo = Math.min(10, Math.max(0, Math.round(tempoDecorridoMs / 60000)));

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

    pararCronometro();
    cronometro.hidden = true;
    etapaProva.hidden = true;
    conclusao.hidden = false;
    resultadoFinal.textContent =
      resultado.mensagem ?? "Suas respostas foram enviadas com sucesso.";
    mostrarStatus("");
  } catch (erro) {
    console.error(erro);
    mostrarStatus(`Não foi possível enviar a prova: ${erro.message}`, "error");
    enviando = false;

    // Em caso de falha, permite retry clicando no botão.
    prosseguirButton.disabled = false;

    if (tempoEsgotado) {
      prosseguirButton.textContent = "Tentar enviar novamente";
    }
  } finally {
    // Se chegou aqui com sucesso, o botão já está desabilitado pela tela de conclusão.
    // Se foi erro, `enviando` foi resetado no catch acima.
    if (etapaProva.hidden) enviando = false;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

(async function iniciar() {
  prosseguirButton.disabled = true;

  try {
    await carregarPerguntas();
  } catch (erro) {
    console.error("Erro ao carregar perguntas:", erro);
    mostrarStatus(`Erro ao carregar perguntas: ${erro.message}`, "error");
  }
})();