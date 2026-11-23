import {access, stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';

export type SupportedOs = 'linux' | 'macos' | 'win';
export type SupportedArch = 'x64' | 'arm64';

export function getOs(): SupportedOs {
	if (process.platform === 'darwin') return 'macos';
	if (process.platform === 'win32') return 'win';
	return 'linux';
}

export function getArch(): SupportedArch {
	return process.arch === 'arm64' ? 'arm64' : 'x64';
}

/** Nome do asset standalone do yt-dlp na release oficial do GitHub. */
export function ytdlpAssetName(os: SupportedOs = getOs(), arch: SupportedArch = getArch()): string {
	if (os === 'win') return 'yt-dlp.exe';
	if (os === 'macos') return 'yt-dlp_macos';
	return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
}

export function downtubeDir(): string {
	return join(homedir(), '.downtube');
}

export function ytdlpBinDir(): string {
	return join(downtubeDir(), 'bin');
}

export function ytdlpBinPath(): string {
	return join(ytdlpBinDir(), getOs() === 'win' ? 'yt-dlp.exe' : 'yt-dlp');
}

export function downloadsDir(): string {
	return join(homedir(), 'Downloads');
}

async function isDirectory(path: string): Promise<boolean> {
	try {
		await access(path);
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

/**
 * Resolve a pasta de destino dos downloads, nesta ordem:
 * 1. pasta explícita (--dir), com ~ expandido e caminho relativo resolvido;
 * 2. Downloads compartilhado do celular no Termux (~/storage/downloads),
 *    criado pelo `termux-setup-storage` — é a pasta Downloads do Android;
 * 3. ~/Downloads.
 */
export async function resolveDownloadsDir(explicitDir?: string, home: string = homedir()): Promise<string> {
	if (explicitDir) {
		const expanded = explicitDir === '~' ? home : explicitDir.startsWith('~/') ? join(home, explicitDir.slice(2)) : explicitDir;
		return resolve(expanded);
	}
	const termuxDownloads = join(home, 'storage', 'downloads');
	if (await isDirectory(termuxDownloads)) return termuxDownloads;
	return join(home, 'Downloads');
}
