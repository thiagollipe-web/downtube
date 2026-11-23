import {spawn, type ChildProcess} from 'node:child_process';
import {access, chmod, mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {delimiter, join} from 'node:path';
import {ytdlpAssetName, ytdlpBinDir, ytdlpBinPath} from './platforms.js';
import {parseEta, parseSize} from './format.js';

export interface YtFormat {
	format_id: string;
	ext?: string;
	resolution?: string;
	width?: number;
	height?: number;
	fps?: number;
	filesize?: number;
	filesize_approx?: number;
	vcodec?: string;
	acodec?: string;
	format_note?: string;
}

export interface ProbeInfo {
	id?: string;
	title: string;
	uploader?: string;
	channel?: string;
	duration?: number;
	formats: YtFormat[];
}

export interface FormatChoice {
	id: string;
	label: string;
	formatId: string;
	isAudio: boolean;
	height?: number;
	ext: string;
	filesize?: number;
}

export type DownloadEvent =
	| {type: 'progress'; percent: number; downloadedBytes?: number; totalBytes?: number; speedBytesPerSecond?: number; etaSeconds?: number; part: number; totalParts: number}
	| {type: 'phase'; phase: 'download' | 'merge' | 'audio'}
	| {type: 'done'; file: string};

const MAX_VIDEO_CHOICES = 8;

function sizeOf(format: YtFormat): number | undefined {
	return format.filesize ?? format.filesize_approx;
}

/**
 * Monta as opções do seletor a partir do JSON do probe:
 * uma opção por resolução (até 8, da maior para a menor, em mp4)
 * mais a opção de áudio apenas em mp3.
 */
export function buildChoices(info: ProbeInfo): FormatChoice[] {
	const byHeight = new Map<number, YtFormat>();
	for (const format of info.formats) {
		if (format.ext !== 'mp4') continue;
		if (!format.height || format.height <= 0) continue;
		if (format.vcodec === 'none') continue;
		const current = byHeight.get(format.height);
		if (!current || (sizeOf(format) ?? 0) > (sizeOf(current) ?? 0)) {
			byHeight.set(format.height, format);
		}
	}

	const videoChoices: FormatChoice[] = [...byHeight.entries()]
		.sort((a, b) => b[0] - a[0])
		.slice(0, MAX_VIDEO_CHOICES)
		.map(([height, format]) => {
			const size = sizeOf(format);
			return {
				id: `${height}p`,
				label: `${height}p · mp4${size ? ` · ${formatSizeLabel(size)}` : ''}`,
				formatId: format.format_id,
				isAudio: false,
				height,
				ext: 'mp4',
				filesize: size,
			};
		});

	videoChoices.push({
		id: 'audio',
		label: 'áudio apenas · mp3',
		formatId: 'bestaudio',
		isAudio: true,
		ext: 'mp3',
	});
	return videoChoices;
}

function formatSizeLabel(bytes: number): string {
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function exists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function findInPath(name: string): Promise<string | null> {
	const pathEnv = process.env['PATH'] ?? '';
	for (const dir of pathEnv.split(delimiter)) {
		if (!dir) continue;
		const candidate = join(dir, name);
		if (await exists(candidate)) return candidate;
	}
	return null;
}

/** Ordem de busca: yt-dlp no PATH, depois ~/.downtube/bin/yt-dlp. */
export async function findYtDlp(): Promise<string | null> {
	const binary = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
	const fromPath = await findInPath(binary);
	if (fromPath) return fromPath;
	const local = ytdlpBinPath();
	if (await exists(local)) return local;
	return null;
}

export type BootstrapStatus = 'found' | 'downloading' | 'ready';

/**
 * Garante um binário do yt-dlp. Se não houver nenhum, baixa o standalone
 * da última release oficial no GitHub e salva com chmod 755.
 */
export async function ensureYtDlp(onStatus?: (status: BootstrapStatus) => void): Promise<string> {
	const found = await findYtDlp();
	if (found) {
		onStatus?.('found');
		return found;
	}

	onStatus?.('downloading');
	const asset = ytdlpAssetName();
	const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${asset}`;
	const response = await fetch(url, {redirect: 'follow'});
	if (!response.ok) {
		throw new Error(`Não foi possível baixar o yt-dlp (HTTP ${response.status}). Verifique a conexão e tente de novo.`);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	await mkdir(ytdlpBinDir(), {recursive: true});
	const target = ytdlpBinPath();
	await writeFile(target, buffer);
	await chmod(target, 0o755);
	onStatus?.('ready');
	return target;
}

/** Roda `yt-dlp -J --no-playlist` e devolve o JSON do probe. */
export function probe(url: string, ytDlp: string, signal?: AbortSignal): Promise<ProbeInfo> {
	return new Promise((resolve, reject) => {
		const child = spawn(ytDlp, ['-J', '--no-playlist', '--no-warnings', url], {
			signal,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', chunk => {
			stdout += String(chunk);
		});
		child.stderr.on('data', chunk => {
			stderr += String(chunk);
		});
		child.on('error', error => {
			reject(new Error(`Falha ao executar o yt-dlp: ${error.message}`));
		});
		child.on('close', code => {
			if (signal?.aborted) {
				reject(new Error('Probe cancelado.'));
				return;
			}
			if (code !== 0) {
				const detail = stderr.trim().split('\n').pop() ?? '';
				reject(new Error(detail || `O yt-dlp saiu com o código ${code}.`));
				return;
			}
			try {
				const parsed = JSON.parse(stdout) as ProbeInfo;
				if (!parsed || typeof parsed.title !== 'string' || !Array.isArray(parsed.formats)) {
					reject(new Error('O yt-dlp devolveu um resultado inválido.'));
					return;
				}
				resolve(parsed);
			} catch {
				reject(new Error('Não consegui ler o resultado do yt-dlp.'));
			}
		});
	});
}

export interface DownloadOptions {
	ytDlp: string;
	probeJson: string;
	choice: FormatChoice;
	outDir: string;
	/** Nome base do arquivo, sem extensão. */
	filename: string;
	ffmpegPath?: string;
	onEvent: (event: DownloadEvent) => void;
	signal?: AbortSignal;
}

const PROGRESS_RE =
	/\[download\]\s+(\d+(?:\.\d+)?)% of\s+([\d.]+[KMGT]?i?B)(?:\s+at\s+([\d.]+[KMGT]?i?B\/s))?(?:\s+ETA\s+(\d+:\d+(?::\d+)?))?/;
const SPEED_RE = /^([\d.]+)([KMGT]?i?B)\/s$/;

/** Converte "1.23MiB/s" em bytes por segundo. */
export function parseSpeed(text: string | undefined): number | undefined {
	if (!text) return undefined;
	const match = SPEED_RE.exec(text.trim());
	if (!match) return undefined;
	const bytes = parseSize(match[1]! + match[2]!);
	return bytes;
}

/**
 * Baixa reutilizando o JSON do probe com --load-info-json.
 * Emite eventos de progresso, de fase (download/merge/áudio) e de conclusão.
 */
export async function download(options: DownloadOptions): Promise<{file: string}> {
	const {ytDlp, probeJson, choice, outDir, filename, ffmpegPath, onEvent, signal} = options;
	const tempDir = await mkdtemp(join(tmpdir(), 'downtube-'));
	const infoJsonPath = join(tempDir, 'info.json');
	await writeFile(infoJsonPath, probeJson, 'utf8');

	const outputTemplate = join(outDir, `${filename}.%(ext)s`);
	const args: string[] = ['--load-info-json', infoJsonPath, '--newline', '--no-warnings', '--progress'];
	if (ffmpegPath) args.push('--ffmpeg-location', ffmpegPath);
	if (choice.isAudio) {
		args.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3');
	} else {
		const height = choice.height ?? 1080;
		args.push(
			'-f',
			`bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best`,
			'--merge-output-format',
			'mp4',
		);
	}
	args.push('-o', outputTemplate);

	return new Promise((resolve, reject) => {
		let child: ChildProcess;
		try {
			child = spawn(ytDlp, args, {signal, stdio: ['ignore', 'pipe', 'pipe']});
		} catch (error) {
			void rm(tempDir, {force: true, recursive: true});
			reject(error instanceof Error ? error : new Error(String(error)));
			return;
		}

		const destinations: string[] = [];
		let finalFile: string | undefined;
		let phase: 'download' | 'merge' | 'audio' = 'download';
		let lastPercent = 0;
		let settled = false;

		const finish = (error?: Error) => {
			if (settled) return;
			settled = true;
			void rm(tempDir, {force: true, recursive: true});
			if (error) reject(error);
			else resolve({file: finalFile ?? destinations.at(-1) ?? join(outDir, `${filename}.${choice.ext}`)});
		};

		const handleLine = (line: string) => {
			const destination = line.match(/\[download\] Destination: (.+)$/);
			if (destination) {
				const path = destination[1]!.trim();
				if (!destinations.includes(path)) destinations.push(path);
				return;
			}
			const merger = line.match(/\[Merger\] Merging formats into "(.+)"$/);
			if (merger) {
				phase = 'merge';
				finalFile = merger[1];
				onEvent({type: 'phase', phase: 'merge'});
				return;
			}
			const audio = line.match(/\[ExtractAudio\] Destination: (.+)$/);
			if (audio) {
				phase = 'audio';
				finalFile = audio[1]!.trim();
				onEvent({type: 'phase', phase: 'audio'});
				return;
			}
			if (line.includes('[ExtractAudio]')) {
				if (phase !== 'audio') {
					phase = 'audio';
					onEvent({type: 'phase', phase: 'audio'});
				}
				return;
			}
			const progress = PROGRESS_RE.exec(line);
			if (progress) {
				lastPercent = Number(progress[1]);
				const totalBytes = parseSize(progress[2]);
				const speed = parseSpeed(progress[3]);
				const etaSeconds = parseEta(progress[4]);
				const totalParts = destinations.length >= 2 ? 2 : 1;
				const part = Math.min(destinations.length || 1, totalParts);
				onEvent({
					type: 'progress',
					percent: lastPercent,
					totalBytes,
					speedBytesPerSecond: speed,
					etaSeconds,
					part,
					totalParts,
				});
			}
		};

		let buffer = '';
		const onData = (chunk: unknown) => {
			buffer += String(chunk);
			let newline = buffer.indexOf('\n');
			while (newline >= 0) {
				handleLine(buffer.slice(0, newline).replace(/\r$/, ''));
				buffer = buffer.slice(newline + 1);
				newline = buffer.indexOf('\n');
			}
			// Linhas de progresso terminadas em \r (sem \n).
			const carriage = buffer.lastIndexOf('\r');
			if (carriage >= 0) {
				handleLine(buffer.slice(0, carriage));
				buffer = buffer.slice(carriage + 1);
			}
		};
		child.stdout?.on('data', onData);
		child.stderr?.on('data', onData);

		child.on('error', error => {
			finish(new Error(`Falha ao executar o yt-dlp: ${error.message}`));
		});
		child.on('close', code => {
			if (signal?.aborted) {
				finish(new Error('Download cancelado.'));
				return;
			}
			if (code !== 0) {
				finish(new Error(`O download falhou (código ${code}).`));
				return;
			}
			onEvent({type: 'progress', percent: 100, part: 1, totalParts: 1});
			onEvent({type: 'done', file: finalFile ?? destinations.at(-1) ?? join(outDir, `${filename}.${choice.ext}`)});
			finish();
		});
	});
}

/** Apaga arquivos parciais (.part e .ytdl) de um download cancelado. */
export async function removePartials(outDir: string, filename: string): Promise<void> {
	for (const suffix of ['.part', '.ytdl']) {
		for (const ext of ['', '.mp4', '.mp3', '.m4a', '.webm']) {
			await rm(join(outDir, `${filename}${ext}${suffix}`), {force: true});
		}
	}
	// Arquivos .part com nome gerado pelo yt-dlp (ex.: titulo.f123.mp4.part).
	const {readdir} = await import('node:fs/promises');
	try {
		const entries = await readdir(outDir);
		for (const entry of entries) {
			if (entry.startsWith(filename) && (entry.endsWith('.part') || entry.endsWith('.ytdl'))) {
				await rm(join(outDir, entry), {force: true});
			}
		}
	} catch {
		// Pasta inexistente: nada a apagar.
	}
}

/** Resolve o ffmpeg: o do PATH, ou o ffmpeg-static como reserva. */
export async function resolveFfmpeg(): Promise<string | undefined> {
	const fromPath = await findInPath(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
	if (fromPath) return fromPath;
	try {
		const module = await import('ffmpeg-static');
		const path = (module as {default?: string}).default ?? (module as unknown as string);
		if (typeof path === 'string' && path) return path;
	} catch {
		// Sem reserva disponível.
	}
	return undefined;
}
