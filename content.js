(() => {
  if (window.__concertPlayerCarregado) return;
  window.__concertPlayerCarregado = true;

  let trechos = [];
  let indiceAtual = 0;
  let reproduzindo = false;
  let temporizador = null;
  let deveAvancarProximoVideo = false;

  chrome.runtime.onMessage.addListener((mensagem, remetente, responder) => {
    const video = document.querySelector("video");

    if (!video) {
      responder({ sucesso: false, erro: "Vídeo não encontrado." });
      return;
    }

    switch (mensagem.tipo) {
      case "OBTER_ESTADO":
        responder({
          sucesso: true,
          tempoAtual: video.currentTime,
          duracao: video.duration,
          reproduzindo
        });
        break;

      case "OBTER_DESCRICAO":
        responder(obterDescricao(video));
        break;

      case "IR_PARA":
        video.currentTime = Math.max(0, Number(mensagem.tempo) || 0);
        responder({ sucesso: true });
        break;

      case "INICIAR_REPRODUCAO":
        iniciar(video, mensagem.trechos, mensagem.avancarProximoVideo);
        responder({ sucesso: true });
        break;

      case "PARAR_REPRODUCAO":
        parar();
        responder({ sucesso: true });
        break;
    }
  });

  function iniciar(video, novosTrechos, avancarProximoVideo = false) {
    parar();
    trechos = [...novosTrechos].sort((a, b) => a.inicio - b.inicio);
    indiceAtual = 0;
    deveAvancarProximoVideo = Boolean(avancarProximoVideo);

    if (!trechos.length) return;

    reproduzindo = true;
    video.currentTime = trechos[0].inicio;
    video.play().catch(() => {});
    temporizador = window.setInterval(controlarTrecho, 150);
  }

  function controlarTrecho() {
    if (!reproduzindo) return;

    const video = document.querySelector("video");
    const trecho = trechos[indiceAtual];
    if (!video || !trecho) {
      parar();
      return;
    }

    if (video.currentTime + 0.08 < trecho.fim) return;

    indiceAtual += 1;
    if (indiceAtual >= trechos.length) {
      video.pause();
      const avancar = deveAvancarProximoVideo;
      parar();
      if (avancar) irParaProximoVideo();
      return;
    }

    video.currentTime = trechos[indiceAtual].inicio;
    video.play().catch(() => {});
  }

  function parar() {
    reproduzindo = false;
    trechos = [];
    indiceAtual = 0;
    deveAvancarProximoVideo = false;
    if (temporizador !== null) {
      clearInterval(temporizador);
      temporizador = null;
    }
  }

  function obterDescricao(video) {
    const botaoExpandir =
      document.querySelector("#description-inline-expander #expand") ??
      document.querySelector("ytd-text-inline-expander #expand");

    if (botaoExpandir instanceof HTMLElement) {
      botaoExpandir.click();
    }

    const seletores = [
      "#description-inline-expander",
      "ytd-text-inline-expander",
      "#description"
    ];

    const elemento = seletores
      .map(seletor => document.querySelector(seletor))
      .find(item => item?.innerText?.trim());

    if (!elemento) {
      return { sucesso: false, erro: "Descrição do vídeo não encontrada." };
    }

    return {
      sucesso: true,
      descricao: elemento.innerText,
      duracao: video.duration
    };
  }

  function irParaProximoVideo() {
    const botaoProximo = document.querySelector(".ytp-next-button");
    const indisponivel =
      !botaoProximo ||
      botaoProximo.hasAttribute("disabled") ||
      botaoProximo.getAttribute("aria-disabled") === "true";

    if (!indisponivel && botaoProximo instanceof HTMLElement) {
      botaoProximo.click();
    }
  }

  document.addEventListener("yt-navigate-start", parar);
})();
