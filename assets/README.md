# Logo do Downtube

Logo monocromático em estilo terminal ASCII, criado do zero para o projeto.
Não usa imagem, marca ou asset de nenhum outro projeto.

## Arquivos

- `logo-light.svg` — arte ASCII em preto (`#111111`), fundo transparente, para fundos claros.
- `logo-dark.svg` — arte ASCII em branco (`#f5f5f5`), fundo transparente, para fundos escuros.
- `logo-512.png` — PNG de 512 × 512 px, fundo transparente, texto escuro
  (versão clara). Renderizado em 1024 px e reduzido para 512 px com
  antialiasing, para o traço ficar limpo.

## Prompt usado

> "Logo monocromático estilo terminal ASCII: a palavra DOWNTUBE escrita
> em arte ASCII com os caracteres `| / \ _`, em fonte monospace em
> negrito, uma única cor, sem fundo, sem sombra e sem gradiente.
> Abaixo, em letras pequenas, o slogan 'baixe videos do terminal'.
> Nada de ícones, fotos ou cores."

## Arte ASCII (a mesma do terminal, em `src/components/logo.tsx`)

```text
 ____     ___   __        __  _   _   _____   _   _   ____    _____
|  _ \   / _ \  \ \      / / | \ | | |_   _| | | | | | | __ )  | ____|
| | | | | | | |  \ \ /\ / /  |  \| |   | |   | | | | |  _ \  |  _|
| |_| | | |_| |   \ V  V /   | |\  |   | |   | |_| | | |_) | | |___
|____/   \___/     \_/\_/    |_| \_|   |_|    \___/  |____/  |_____|
```

O PNG foi gerado a partir dessa mesma arte, com a fonte DejaVu Sans Mono
em negrito. O fundo foi removido (transparente) nos três arquivos.
