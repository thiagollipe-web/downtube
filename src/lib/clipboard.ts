import {execFile} from 'node:child_process';
import {isValidUrl} from './format.js';

type ClipboardCommand = {cmd: string; args: string[]};

function commandsForPlatform(): ClipboardCommand[] {
	switch (process.platform) {
		case 'darwin':
			return [{cmd: 'pbpaste', args: []}];
		case 'win32':
			return [{cmd: 'powershell', args: ['-NoProfile', '-Command', 'Get-Clipboard -Raw']}];
		default:
			return [
				{cmd: 'wl-paste', args: []},
				{cmd: 'xclip', args: ['-o', '-selection', 'clipboard']},
				{cmd: 'xsel', args: ['--clipboard', '--output']},
			];
	}
}

function run(command: ClipboardCommand, timeoutMs = 2000): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(command.cmd, command.args, {timeout: timeoutMs, maxBuffer: 1024 * 1024}, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout);
		});
	});
}

/** Lê o texto da área de transferência. Retorna null se não houver texto ou se a leitura falhar. */
export async function readClipboard(): Promise<string | null> {
	for (const command of commandsForPlatform()) {
		try {
			const text = await run(command);
			if (text) return text;
		} catch {
			// Tenta o próximo comando disponível.
		}
	}
	return null;
}

/**
 * Retorna a URL da área de transferência quando houver uma única URL válida.
 * Conteúdo multilinha é ignorado e nunca é colado sozinho.
 */
export async function readClipboardUrl(): Promise<string | null> {
	const text = await readClipboard();
	if (!text) return null;
	const trimmed = text.trim();
	if (!trimmed || /[\r\n]/.test(trimmed)) return null;
	return isValidUrl(trimmed) ? trimmed : null;
}
