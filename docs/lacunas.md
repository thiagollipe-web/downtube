# Relatório de lacunas — Downtube

Metodologia aplicada (documentação de código legado, sem decompilar
nem analisar binários): mapear o que a referência pede, entender como
o código atual cobre cada ponto, documentar o resultado e listar as
lacunas. A referência aqui é a especificação do projeto (requisitos do
MVP); não há código-fonte de referência para comparar.

## Mapeamento: requisito → código

| Requisito | Onde está | Estado |
| --- | --- | --- |
| `downtube <url>` abre no seletor; sem args pede a URL | `src/cli.tsx`, `src/app.tsx` (bootstrap → probe ou input) | Feito |
| Flags `--theme auto\|light\|dark`, `-h`, `-v` | `src/lib/args.ts` | Feito |
| Validar URL; Tab cola da área de transferência, nunca sozinho; ignora multilinha | `src/lib/format.ts`, `src/lib/clipboard.ts`, `src/components/input.tsx` | Feito |
| Probe `yt-dlp -J --no-playlist`, spinner, Esc cancela | `src/lib/ytdlp.ts` (`probe`), `src/app.tsx` | Feito |
| Seletor: 1 opção por resolução (até 8, maior → menor, mp4) + "áudio apenas · mp3", tamanho estimado | `src/lib/ytdlp.ts` (`buildChoices`) | Feito |
| Download com `--load-info-json`, progresso com velocidade e ETA, fases de merge/áudio, "parte 1/2" | `src/lib/ytdlp.ts` (`download`) | Feito |
| Esc cancela e apaga `.part` e `.ytdl` | `src/lib/ytdlp.ts` (`removePartials`), `src/app.tsx` | Feito |
| Tela final com caminho e botão "baixar outro"; salva em `~/Downloads` | `src/app.tsx`, `src/lib/platforms.ts` | Feito |
| Tela centralizada, j/k e 1-9 no seletor, logo e rodapé clicáveis, caminho impresso ao sair | `src/app.tsx`, `src/components/picker.tsx`, `src/cli.tsx`, `src/lib/last-result.ts` | Feito |
| Nome do arquivo: título sanitizado, máx. 60 caracteres | `src/lib/format.ts` (`sanitizeFilename`) | Feito |
| Mouse: botões e itens clicáveis, hit-test | `src/lib/click-map.ts`, `src/lib/use-mouse-click.ts` | Feito |
| Temas auto/light/dark, `Ctrl+T` alterna os três | `src/theme.ts`, `src/app.tsx` | Feito |
| Histórico das últimas 20 URLs em `~/.downtube/history.json` | `src/lib/history.ts` | Feito |
| Restaurar tela e cursor ao sair, inclusive em crash; tela alternativa; erro só depois de restaurar | `src/cli.tsx` | Feito |
| Bootstrap do yt-dlp: PATH → `~/.downtube/bin/`, senão baixa da release oficial, `chmod 755`, status "primeira execução" | `src/lib/ytdlp.ts` (`ensureYtDlp`), `src/lib/platforms.ts` | Feito |
| ffmpeg do PATH, senão `ffmpeg-static` | `src/lib/ytdlp.ts` (`resolveFfmpeg`) | Feito |
| TypeScript strict, Node 18+, ESM, Ink, tsup, tsx, node:test | `package.json`, `tsconfig.json`, `tsup.config.ts` | Feito |
| Testes com fixtures, sem baixar vídeo real | `test/`, `test/fixtures/probe-youtube.json` | Feito |
| README, LICENSE (MIT), `.gitignore`, `bin`, `files: ["dist"]` | raiz do projeto | Feito |
| Logo monocromático estilo terminal ASCII (SVG claro/escuro + PNG 512) | `assets/` | Feito |

## Lacunas e limites conhecidos

1. **Posição do clique é calculada, não medida.** O hit-test usa um
   layout de linhas fixas (logo ASCII de 5 linhas + painel de 2 linhas),
   centralizado a partir do tamanho do terminal (`rows`/`columns` do
   Ink). Se o terminal for mais estreito que o logo (69 colunas), o
   texto trunca e o clique pode não bater com o item em terminais muito
   estreitos. O Ink não expõe a posição real dos elementos renderizados.
2. **O clique depende do Ink entregar a sequência SGR.** O hook lê a
   sequência pelo `useInput` do Ink. Em terminais que não reportam
   mouse em SGR 1006, só o teclado funciona — o que continua cobrindo
   todas as ações.
3. **O formato escolhido é aproximado.** O seletor mostra o `format_id`
   do probe, mas o download usa `bestvideo[height<=N][ext=mp4]+bestaudio`
   para garantir vídeo + áudio juntos. O arquivo final tem a resolução
   pedida, mas pode não ser exatamente o `format_id` exibido.
4. **Sem fila nem playlist.** O probe usa `--no-playlist` e cada
   execução baixa um vídeo. Playlist e fila estão no roadmap.
5. **Sem teste de ponta a ponta com o yt-dlp real.** Os testes usam
   fixtures de JSON e nunca baixam vídeo de verdade. O fluxo completo
   (probe → download) só foi verificado por inspeção do código e pelo
   typecheck/build; o teste manual pede um terminal com yt-dlp e rede.
6. **A área de transferência no Linux depende de ferramenta externa**
   (`wl-paste`, `xclip` ou `xsel`). Sem nenhuma delas, o `Tab` só não
   oferece nada — o resto funciona.
