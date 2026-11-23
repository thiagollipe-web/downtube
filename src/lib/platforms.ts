import {homedir} from 'node:os';
import {join} from 'node:path';

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
