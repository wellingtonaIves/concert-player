const elementos = {
  nome: document.querySelector("#nome"),
  inicio: document.querySelector("#inicio"),
  fim: document.querySelector("#fim"),
  capturarInicio: document.querySelector("#capturarInicio"),
  capturarFim: document.querySelector("#capturarFim"),
  salvar: document.querySelector("#salvarTrecho"),
  cancelar: document.querySelector("#cancelarEdicao"),
  lista: document.querySelector("#lista"),
  listaVazia: document.querySelector("#listaVazia"),
  mensagem: document.querySelector("#mensagem"),
  reproduzir: document.querySelector("#reproduzir"),
  parar: document.querySelector("#parar"),
  selecionarTodas: document.querySelector("#selecionarTodas"),
  videoStatus: document.querySelector("#videoStatus"),
  importarDescricao: document.querySelector("#importarDescricao"),
  avancarProximoVideo: document.querySelector("#avancarProximoVideo"),
  abrirImportacaoManual: document.querySelector("#abrirImportacaoManual"),
  painelImportacaoManual: document.querySelector("#painelImportacaoManual"),
  textoSetlist: document.querySelector("#textoSetlist"),
  importarTextoManual: document.querySelector("#importarTextoManual"),
  cancelarImportacaoManual: document.querySelector("#cancelarImportacaoManual")
};

let abaAtual;
let videoId;
let trechos = [];
let idEmEdicao = null;

document.addEventListener("DOMContentLoaded", inicializar);

async function inicializar() {
  [abaAtual] = await chrome.tabs.query({ active: true, currentWindow: true });
  videoId = obterVideoId(abaAtual?.url);

  if (!videoId) {
    bloquearInterface("Abra um vídeo do YouTube");
    return;
  }

  try {
    const resposta = await enviar({ tipo: "OBTER_ESTADO" });
    if (!resposta?.sucesso) throw new Error(resposta?.erro);
    elementos.videoStatus.textContent = "Vídeo encontrado";
    elementos.videoStatus.classList.add("ok");
  } catch {
    bloquearInterface("Recarregue a página");
    return;
  }

  trechos = await carregarTrechos();
  await carregarPreferencias();
  ordenarTrechos();
  renderizar();
  registrarEventos();
}

function registrarEventos() {
  elementos.capturarInicio.addEventListener("click", () => capturarTempo(elementos.inicio));
  elementos.capturarFim.addEventListener("click", () => capturarTempo(elementos.fim));
  elementos.salvar.addEventListener("click", salvarTrecho);
  elementos.cancelar.addEventListener("click", limparFormulario);
  elementos.reproduzir.addEventListener("click", reproduzirSelecao);
  elementos.parar.addEventListener("click", () => enviar({ tipo: "PARAR_REPRODUCAO" }));
  elementos.selecionarTodas.addEventListener("click", alternarSelecaoCompleta);
  elementos.importarDescricao.addEventListener("click", importarDescricao);
  elementos.avancarProximoVideo.addEventListener("change", salvarPreferencias);
  elementos.abrirImportacaoManual.addEventListener("click", abrirImportacaoManual);
  elementos.cancelarImportacaoManual.addEventListener("click", fecharImportacaoManual);
  elementos.importarTextoManual.addEventListener("click", importarTextoManual);
}

function obterVideoId(url) {
  try {
    const endereco = new URL(url);
    if (endereco.hostname === "youtu.be") return endereco.pathname.slice(1);
    return endereco.searchParams.get("v");
  } catch {
    return null;
  }
}

function chaveStorage() {
  return `concert-player:${videoId}`;
}

async function carregarTrechos() {
  const chave = chaveStorage();
  const resultado = await chrome.storage.local.get(chave);
  return Array.isArray(resultado[chave]) ? resultado[chave] : [];
}

async function persistirTrechos() {
  await chrome.storage.local.set({ [chaveStorage()]: trechos });
}

async function carregarPreferencias() {
  const resultado = await chrome.storage.local.get("concert-player:preferencias");
  elementos.avancarProximoVideo.checked =
    resultado["concert-player:preferencias"]?.avancarProximoVideo ?? false;
}

async function salvarPreferencias() {
  await chrome.storage.local.set({
    "concert-player:preferencias": {
      avancarProximoVideo: elementos.avancarProximoVideo.checked
    }
  });
}

async function enviar(mensagem) {
  return chrome.tabs.sendMessage(abaAtual.id, mensagem);
}

async function capturarTempo(campo) {
  try {
    const resposta = await enviar({ tipo: "OBTER_ESTADO" });
    if (!resposta?.sucesso) throw new Error(resposta?.erro);
    campo.value = formatarTempo(resposta.tempoAtual);
    exibirMensagem("Tempo atual capturado.", true);
  } catch {
    exibirMensagem("Não foi possível acessar o vídeo. Recarregue a página.");
  }
}

async function salvarTrecho() {
  try {
    const nome = elementos.nome.value.trim();
    const inicio = converterParaSegundos(elementos.inicio.value);
    const fim = converterParaSegundos(elementos.fim.value);

    if (!nome) throw new Error("Informe o nome da música.");
    if (inicio >= fim) throw new Error("O início precisa ser menor que o fim.");

    const sobreposto = trechos.find(trecho =>
      trecho.id !== idEmEdicao && inicio < trecho.fim && fim > trecho.inicio
    );
    if (sobreposto) {
      throw new Error(`O trecho se sobrepõe a “${sobreposto.nome}”.`);
    }

    if (idEmEdicao) {
      const indice = trechos.findIndex(trecho => trecho.id === idEmEdicao);
      trechos[indice] = { ...trechos[indice], nome, inicio, fim };
    } else {
      trechos.push({
        id: crypto.randomUUID(),
        nome,
        inicio,
        fim,
        selecionada: true
      });
    }

    ordenarTrechos();
    await persistirTrechos();
    renderizar();
    limparFormulario();
    exibirMensagem("Música salva.", true);
  } catch (erro) {
    exibirMensagem(erro.message || "Não foi possível salvar.");
  }
}

function converterParaSegundos(valor) {
  const texto = valor.trim();
  if (!/^\d{1,3}:\d{1,2}(?::\d{1,2})?$/.test(texto)) {
    throw new Error("Use o formato MM:SS ou HH:MM:SS.");
  }

  const partes = texto.split(":").map(Number);
  if (partes.some(Number.isNaN) || partes.slice(1).some(parte => parte > 59)) {
    throw new Error("Informe um tempo válido.");
  }

  return partes.reduce((total, parte) => total * 60 + parte, 0);
}

function formatarTempo(valor) {
  const total = Math.max(0, Math.floor(Number(valor) || 0));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const mm = String(minutos).padStart(2, "0");
  const ss = String(segundos).padStart(2, "0");
  return horas > 0 ? `${String(horas).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ordenarTrechos() {
  trechos.sort((a, b) => a.inicio - b.inicio);
}

function renderizar() {
  elementos.lista.replaceChildren();
  elementos.listaVazia.classList.toggle("hidden", trechos.length > 0);

  for (const trecho of trechos) {
    const item = document.createElement("article");
    item.className = "track";

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = trecho.selecionada;
    check.title = "Incluir na reprodução";
    check.addEventListener("change", async () => {
      trecho.selecionada = check.checked;
      await persistirTrechos();
    });

    const info = document.createElement("div");
    info.className = "track-info";
    const nome = document.createElement("p");
    nome.className = "track-name";
    nome.textContent = trecho.nome;
    const tempo = document.createElement("p");
    tempo.className = "track-time";
    tempo.textContent = `${formatarTempo(trecho.inicio)} → ${formatarTempo(trecho.fim)}`;
    info.append(nome, tempo);

    const acoes = document.createElement("div");
    acoes.className = "track-actions";
    acoes.append(
      criarBotao("↗", "Ir para o início", () => enviar({ tipo: "IR_PARA", tempo: trecho.inicio })),
      criarBotao("✎", "Editar", () => editarTrecho(trecho)),
      criarBotao("×", "Excluir", () => excluirTrecho(trecho.id), true)
    );

    item.append(check, info, acoes);
    elementos.lista.append(item);
  }
}

function criarBotao(texto, titulo, acao, perigo = false) {
  const botao = document.createElement("button");
  botao.className = `icon-button${perigo ? " danger" : ""}`;
  botao.textContent = texto;
  botao.title = titulo;
  botao.addEventListener("click", acao);
  return botao;
}

function editarTrecho(trecho) {
  idEmEdicao = trecho.id;
  elementos.nome.value = trecho.nome;
  elementos.inicio.value = formatarTempo(trecho.inicio);
  elementos.fim.value = formatarTempo(trecho.fim);
  elementos.salvar.textContent = "Salvar alterações";
  elementos.cancelar.classList.remove("hidden");
  elementos.nome.focus();
}

async function excluirTrecho(id) {
  trechos = trechos.filter(trecho => trecho.id !== id);
  await persistirTrechos();
  if (idEmEdicao === id) limparFormulario();
  renderizar();
}

function limparFormulario() {
  idEmEdicao = null;
  elementos.nome.value = "";
  elementos.inicio.value = "";
  elementos.fim.value = "";
  elementos.salvar.textContent = "Adicionar música";
  elementos.cancelar.classList.add("hidden");
}

async function reproduzirSelecao() {
  const selecionados = trechos.filter(trecho => trecho.selecionada);
  if (!selecionados.length) {
    exibirMensagem("Selecione pelo menos uma música.");
    return;
  }

  try {
    const resposta = await enviar({
      tipo: "INICIAR_REPRODUCAO",
      trechos: selecionados,
      avancarProximoVideo: elementos.avancarProximoVideo.checked
    });
    if (!resposta?.sucesso) throw new Error(resposta?.erro);
    exibirMensagem("Reprodução iniciada.", true);
    window.close();
  } catch {
    exibirMensagem("Não foi possível iniciar. Recarregue o vídeo.");
  }
}

async function importarDescricao() {
  elementos.importarDescricao.disabled = true;
  exibirMensagem("Analisando a descrição...");

  try {
    const resposta = await enviar({ tipo: "OBTER_DESCRICAO" });
    if (!resposta?.sucesso) {
      throw new Error(resposta?.erro || "Descrição não encontrada.");
    }

    await processarTextoImportado(resposta.descricao, resposta.duracao);
  } catch (erro) {
    exibirMensagem(erro.message || "Falha ao importar a descrição.");
  } finally {
    elementos.importarDescricao.disabled = false;
  }
}

function abrirImportacaoManual() {
  elementos.painelImportacaoManual.classList.remove("hidden");
  elementos.textoSetlist.focus();
}

function fecharImportacaoManual() {
  elementos.painelImportacaoManual.classList.add("hidden");
  elementos.textoSetlist.value = "";
}

async function importarTextoManual() {
  const texto = elementos.textoSetlist.value.trim();
  if (!texto) {
    exibirMensagem("Cole uma setlist antes de importar.");
    return;
  }

  elementos.importarTextoManual.disabled = true;

  try {
    const estado = await enviar({ tipo: "OBTER_ESTADO" });
    if (!estado?.sucesso) throw new Error("Não foi possível acessar o vídeo.");
    const importou = await processarTextoImportado(texto, estado.duracao);
    if (importou) fecharImportacaoManual();
  } catch (erro) {
    exibirMensagem(erro.message || "Falha ao importar o texto.");
  } finally {
    elementos.importarTextoManual.disabled = false;
  }
}

async function processarTextoImportado(texto, duracao) {
  const importados = extrairSetlist(texto, duracao);
  if (!importados.length) {
    throw new Error("Nenhuma linha com horário e nome foi encontrada.");
  }

  const novos = importados.filter(importado =>
    !trechos.some(atual => atual.inicio === importado.inicio)
  );

  if (!novos.length) {
    throw new Error("Todos os trechos encontrados já estão cadastrados.");
  }

  const confirmado = window.confirm(
    `${importados.length} marcações encontradas e ${novos.length} novas. Deseja importá-las?`
  );
  if (!confirmado) {
    exibirMensagem("Importação cancelada.");
    return false;
  }

  trechos.push(...novos);
  ordenarTrechos();
  await persistirTrechos();
  renderizar();
  exibirMensagem(`${novos.length} músicas importadas.`, true);
  return true;
}

function extrairSetlist(descricao, duracaoVideo) {
  const marcacoes = [];
  const regex = /^(\d{1,3}:\d{2}(?::\d{2})?)\s*(?:[-–—|:]\s*)?(.+)$/;

  for (const linhaOriginal of descricao.split(/\r?\n/)) {
    const resultado = linhaOriginal.trim().match(regex);
    if (!resultado) continue;

    try {
      const inicio = converterParaSegundos(resultado[1]);
      const nome = resultado[2]
        .replace(/^[-–—|:]\s*/, "")
        .replace(/\s+/g, " ")
        .trim();

      if (nome && !marcacoes.some(item => item.inicio === inicio)) {
        marcacoes.push({ inicio, nome });
      }
    } catch {
      // Linhas inválidas da descrição são ignoradas.
    }
  }

  marcacoes.sort((a, b) => a.inicio - b.inicio);

  return marcacoes
    .map((marcacao, indice) => ({
      id: crypto.randomUUID(),
      nome: marcacao.nome,
      inicio: marcacao.inicio,
      fim: marcacoes[indice + 1]?.inicio ?? Math.floor(duracaoVideo),
      selecionada: true
    }))
    .filter(trecho => Number.isFinite(trecho.fim) && trecho.fim > trecho.inicio);
}

async function alternarSelecaoCompleta() {
  const marcar = trechos.some(trecho => !trecho.selecionada);
  trechos.forEach(trecho => trecho.selecionada = marcar);
  await persistirTrechos();
  renderizar();
}

function exibirMensagem(texto, sucesso = false) {
  elementos.mensagem.textContent = texto;
  elementos.mensagem.classList.toggle("success", sucesso);
}

function bloquearInterface(texto) {
  elementos.videoStatus.textContent = texto;
  document.querySelectorAll("input, button").forEach(elemento => elemento.disabled = true);
  exibirMensagem("Abra um vídeo comum do YouTube e recarregue a página.");
}
