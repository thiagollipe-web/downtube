import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join} from 'node:path';

export const MAX_HISTORY = 20;

export function historyPath(): string {
	return join(homedir(), '.downtube', 'history.json');
}

export async function loadHistory(): Promise<string[]> {
	try {
		const raw = await readFile(historyPath(), 'utf8');
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item): item is string => typeof item === 'string');
	} catch {
		return [];
	}
}

export async function saveHistory(urls: string[]): Promise<void> {
	const dir = join(homedir(), '.downtube');
	await mkdir(dir, {recursive: true});
	await writeFile(historyPath(), JSON.stringify(urls.slice(0, MAX_HISTORY), null, 2), 'utf8');
}

/** Adiciona a URL no topo do histórico, sem duplicar, limitado a 20 itens. */
export async function addToHistory(url: string): Promise<string[]> {
	const current = await loadHistory();
	const next = [url, ...current.filter(item => item !== url)].slice(0, MAX_HISTORY);
	await saveHistory(next);
	return next;
}
