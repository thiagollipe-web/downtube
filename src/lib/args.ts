export type ThemeName = 'auto' | 'light' | 'dark';

export interface ParsedArgs {
	url?: string;
	theme: ThemeName;
	/** Pasta de destino dos downloads (padrão: Downloads do sistema / do celular). */
	dir?: string;
	help: boolean;
	version: boolean;
	error?: string;
}

const THEMES: ThemeName[] = ['auto', 'light', 'dark'];

export function parseArgs(argv: string[]): ParsedArgs {
	const result: ParsedArgs = {theme: 'auto', help: false, version: false};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;

		if (arg === '-h' || arg === '--help') {
			result.help = true;
			continue;
		}

		if (arg === '-v' || arg === '--version') {
			result.version = true;
			continue;
		}

		if (arg === '--theme' || arg.startsWith('--theme=')) {
			const value =
				arg === '--theme' ? argv[++i] : arg.slice('--theme='.length);
			if (value === undefined || !(THEMES as string[]).includes(value)) {
				result.error = `Tema inválido. Use --theme auto|light|dark.`;
				return result;
			}
			result.theme = value as ThemeName;
			continue;
		}

		if (arg === '--dir' || arg.startsWith('--dir=')) {
			const value = arg === '--dir' ? argv[++i] : arg.slice('--dir='.length);
			if (value === undefined || value === '') {
				result.error = `Falta a pasta do --dir. Exemplo: --dir ~/Downloads`;
				return result;
			}
			result.dir = value;
			continue;
		}

		if (arg.startsWith('-')) {
			result.error = `Opção desconhecida: ${arg}. Use -h para ver a ajuda.`;
			return result;
		}

		if (result.url === undefined) {
			result.url = arg;
			continue;
		}

		result.error = `Argumento extra: ${arg}. Informe apenas uma URL.`;
		return result;
	}

	return result;
}

export const HELP_TEXT = `downtube — baixe vídeos do YouTube e de outros sites, direto do terminal.

Uso:
  downtube <url>              Abre direto no seletor de formato
  downtube                    Pede a URL na tela inicial

Opções:
  --theme auto|light|dark     Tema da interface (padrão: auto)
  --dir <pasta>               Pasta de destino dos vídeos
  -h, --help                  Mostra esta ajuda
  -v, --version               Mostra a versão

Atalhos na interface:
  Tab     Cola a URL da área de transferência (quando válida)
  Esc     Cancela a operação atual
  Ctrl+T  Alterna o tema (auto → light → dark)

Os vídeos são salvos em ~/Downloads. No celular (Termux), depois de rodar
termux-setup-storage uma vez, eles vão para o Downloads do Android e
aparecem no app Arquivos. Use --dir para escolher outra pasta.
O download é feito pelo yt-dlp;
o downtube não baixa conteúdo por conta própria nem envia telemetria.
Baixe apenas conteúdo que você tem direito de guardar e respeite os
termos das plataformas.`;
