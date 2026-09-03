# Concert Player 1.2

Extensão para Chrome, Edge e Opera que permite selecionar músicas dentro de um
show completo no YouTube e reproduzir somente os trechos desejados.

## Instalação

1. Extraia o arquivo ZIP.
2. Abra a página de extensões:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Opera: `opera://extensions`
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `concert-player` que foi extraída.
6. Fixe o Concert Player na barra do navegador, se desejar.

## Como usar

1. Abra um vídeo comum do YouTube e atualize a página após instalar a extensão.
2. Posicione o vídeo no começo de uma música.
3. Abra a extensão e clique em **Usar tempo atual** abaixo de Início.
4. Posicione o vídeo no final da música e capture o tempo de Fim.
5. Informe o nome e clique em **Adicionar música**.
6. Repita o processo para as demais músicas.
7. Marque os trechos desejados e clique em **Reproduzir seleção**.

Também é possível usar **Importar setlist da descrição** quando a descrição
possuir linhas como `1:15 - Nome da música`. O final de cada trecho será
calculado usando o início da próxima música.

Se a setlist estiver em um comentário, clique em **Colar setlist**, copie o
texto completo do comentário e use **Importar texto**. São aceitas linhas como
`01:45 The boss` e `1:04:58 Creep`, com ou sem hífen após o horário.

Marque **Ir para o próximo vídeo ao terminar** para avançar automaticamente
quando acabar o último trecho selecionado.

As músicas são salvas apenas no navegador e separadas pelo ID de cada vídeo.

## Observações

- Use os formatos `MM:SS` ou `HH:MM:SS`.
- Trechos sobrepostos não são permitidos nesta versão.
- Para cadastrar o instante exato, pause o vídeo antes de capturar o tempo.
- A reprodução sempre segue a ordem original dos trechos no show.
- O avanço depende da existência de um próximo vídeo na playlist ou reprodução
  automática do YouTube.
