import {mkdir} from 'node:fs/promises';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Box, Text, useApp, useInput, useStdout} from 'ink';
import Spinner from 'ink-spinner';
import {Footer} from './components/footer.js';
import {UrlInput} from './components/input.js';
import {Logo} from './components/logo.js';
import {Panel} from './components/panel.js';
import {Picker} from './components/picker.js';
import {Progress, type DownloadPhase} from './components/progress.js';
import {ClickMap} from './lib/click-map.js';
import {readClipboardUrl} from './lib/clipboard.js';
import {formatDuration, isValidUrl, sanitizeFilename} from './lib/format.js';
import {addToHistory} from './lib/history.js';
import {setLastDownloaded} from './lib/last-result.js';
import {downloadsDir, resolveDownloadsDir} from './lib/platforms.js';
import {useMouseClick} from './lib/use-mouse-click.js';
import {
	buildChoices,
	download,
	ensureYtDlp,
	probe,
	removePartials,
	resolveFfmpeg,
	type FormatChoice,
	type ProbeInfo,
} from './lib/ytdlp.js';
import {nextTheme, paletteFor, type ThemeName} from './theme.js';

type Phase = 'bootstrap' | 'input' | 'probe' | 'picker' | 'download' | 'done' | 'error';

const LOGO_WIDTH = 43;
const CONTENT_WIDTH = 72;

/**
 * Layout em linhas fixas, centralizado na tela, para o mapa de cliques
 * saber onde cada item está: logo ASCII (3) + branco (1) + painel (2) +
 * branco (1) = conteúdo 7 linhas abaixo do topo da área centralizada.
 * O seletor tem o rótulo nessa linha e os itens a partir da próxima.
 */
function totalHeight(phase: Phase, choiceCount: number): number {
	switch (phase) {
		case 'picker':
			return 11 + choiceCount;
		case 'input':
		case 'download':
			return 12;
		case 'error':
			return 11;
		default:
			return 10;
	}
}

interface ProgressState {
	percent: number;
	speedBytesPerSecond?: number;
	etaSeconds?: number;
	part: number;
	totalParts: number;
}

const FOOTER_HINTS: Record<Phase, string> = {
	bootstrap: 'Preparando o yt-dlp…',
	input: 'Tab cola a URL · Enter confirma · Ctrl+T tema · Esc sai',
	probe: 'Esc cancela',
	picker: 'Setas ou j/k escolhem · 1-9 baixa direto · Enter ou [ baixar ] · Esc volta',
	download: 'Esc cancela e apaga os arquivos parciais',
	done: 'Enter baixa outro · Esc sai',
	error: 'Enter volta · Esc sai',
};

export function App({initialUrl, initialTheme, outDir}: {initialUrl?: string; initialTheme: ThemeName; outDir?: string}): React.JSX.Element {
	const {exit} = useApp();
	const {stdout} = useStdout();
	const [theme, setTheme] = useState<ThemeName>(initialTheme);
	const [phase, setPhase] = useState<Phase>('bootstrap');
	const [bootstrapNote, setBootstrapNote] = useState('Procurando o yt-dlp…');
	const [outDirLabel, setOutDirLabel] = useState<string | null>(null);
	const [url, setUrl] = useState('');
	const [urlError, setUrlError] = useState<string | null>(null);
	const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
	const [probeInfo, setProbeInfo] = useState<ProbeInfo | null>(null);
	const [probeJson, setProbeJson] = useState('');
	const [choices, setChoices] = useState<FormatChoice[]>([]);
	const [progress, setProgress] = useState<ProgressState>({percent: 0, part: 1, totalParts: 1});
	const [downloadPhase, setDownloadPhase] = useState<DownloadPhase>('download');
	const [savedFile, setSavedFile] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const clickMap = useMemo(() => new ClickMap(), []);
	const ytDlpRef = useRef<string | null>(null);
	const ffmpegRef = useRef<string | undefined>(undefined);
	const outDirRef = useRef<string | null>(null);
	const outDirArgRef = useRef(outDir);
	const initialUrlRef = useRef(initialUrl);
	const probeAbortRef = useRef<AbortController | null>(null);
	const downloadAbortRef = useRef<AbortController | null>(null);

	useMouseClick(clickMap);

	// Centralização: o bloco inteiro fica no meio do terminal.
	const rows = stdout.rows || 24;
	const cols = stdout.columns || 80;
	const height = totalHeight(phase, choices.length);
	const topPad = Math.max(0, Math.floor((rows - height) / 2));
	const marginLeft = Math.max(0, Math.floor((cols - CONTENT_WIDTH) / 2));
	const contentStart = topPad + 7;
	const pickerItemsStart = topPad + 8;
	const footerY = topPad + height - 1;

	const startProbe = useCallback(async (targetUrl: string) => {
		const bin = ytDlpRef.current;
		if (!bin) return;
		const controller = new AbortController();
		probeAbortRef.current = controller;
		setUrl(targetUrl);
		setUrlError(null);
		setPhase('probe');
		try {
			await addToHistory(targetUrl);
			const info = await probe(targetUrl, bin, controller.signal);
			setProbeInfo(info);
			setProbeJson(JSON.stringify(info));
			setChoices(buildChoices(info));
			setPhase('picker');
		} catch (error) {
			if (controller.signal.aborted) {
				setPhase('input');
				return;
			}
			setErrorMsg(error instanceof Error ? error.message : 'Falha ao procurar os formatos.');
			setPhase('error');
		}
	}, []);

	const bootstrap = useCallback(async () => {
		try {
			const bin = await ensureYtDlp(status => {
				if (status === 'downloading') {
					setBootstrapNote('Primeira execução: baixando o yt-dlp…');
				}
			});
			ytDlpRef.current = bin;
			ffmpegRef.current = await resolveFfmpeg();
			outDirRef.current = await resolveDownloadsDir(outDirArgRef.current);
			setOutDirLabel(outDirRef.current);
			const firstUrl = initialUrlRef.current;
			if (firstUrl && isValidUrl(firstUrl)) {
				await startProbe(firstUrl.trim());
				return;
			}
			if (firstUrl) setUrlError('URL inválida. Cole uma URL http(s) completa.');
			setPhase('input');
			setClipboardUrl(await readClipboardUrl());
		} catch (error) {
			setErrorMsg(error instanceof Error ? error.message : 'Falha ao preparar o yt-dlp.');
			setPhase('error');
		}
	}, [startProbe]);

	useEffect(() => {
		void bootstrap();
	}, [bootstrap]);

	const resetToInput = useCallback(() => {
		setUrl('');
		setUrlError(null);
		setProbeInfo(null);
		setChoices([]);
		setSavedFile(null);
		setPhase('input');
		void readClipboardUrl().then(setClipboardUrl);
	}, []);

	const submitUrl = useCallback(() => {
		const trimmed = url.trim();
		if (!isValidUrl(trimmed)) {
			setUrlError('URL inválida. Cole uma URL http(s) completa.');
			return;
		}
		void startProbe(trimmed);
	}, [url, startProbe]);

	const startDownload = useCallback(
		async (choice: FormatChoice) => {
			const bin = ytDlpRef.current;
			const info = probeInfo;
			if (!bin || !info) return;
			const outDir = outDirRef.current ?? downloadsDir();
			const filename = sanitizeFilename(info.title);
			setProgress({percent: 0, part: 1, totalParts: 1});
			setDownloadPhase('download');
			setPhase('download');
			const controller = new AbortController();
			downloadAbortRef.current = controller;
			try {
				await mkdir(outDir, {recursive: true});
				const result = await download({
					ytDlp: bin,
					probeJson,
					choice,
					outDir,
					filename,
					ffmpegPath: ffmpegRef.current,
					signal: controller.signal,
					onEvent: event => {
						if (event.type === 'progress') {
							setProgress({
								percent: event.percent,
								speedBytesPerSecond: event.speedBytesPerSecond,
								etaSeconds: event.etaSeconds,
								part: event.part,
								totalParts: event.totalParts,
							});
						} else if (event.type === 'phase') {
							setDownloadPhase(event.phase);
						} else if (event.type === 'done') {
							setSavedFile(event.file);
							setLastDownloaded(event.file);
						}
					},
				});
				setSavedFile(result.file);
				setLastDownloaded(result.file);
				setPhase('done');
			} catch (error) {
				if (controller.signal.aborted) {
					await removePartials(outDir, filename);
					setPhase('picker');
					return;
				}
				setErrorMsg(error instanceof Error ? error.message : 'O download falhou.');
				setPhase('error');
			}
		},
		[probeInfo, probeJson],
	);

	// Logo clicável: volta para a tela inicial (cancela o probe, se houver).
	useEffect(() => {
		clickMap.register({
			id: 'logo',
			x: marginLeft,
			y: topPad,
			width: LOGO_WIDTH,
			height: 3,
			onClick: () => {
				if (phase === 'download' || phase === 'bootstrap') return;
				if (phase === 'probe') probeAbortRef.current?.abort();
				else if (phase === 'picker' || phase === 'done' || phase === 'error') resetToInput();
			},
		});
		return () => {
			clickMap.unregister('logo');
		};
	}, [clickMap, marginLeft, topPad, phase, resetToInput]);

	// Rodapé clicável: alterna o tema.
	useEffect(() => {
		clickMap.register({
			id: 'rodape',
			x: marginLeft,
			y: footerY,
			width: Math.max(20, cols - marginLeft),
			height: 1,
			onClick: () => setTheme(current => nextTheme(current)),
		});
		return () => {
			clickMap.unregister('rodape');
		};
	}, [clickMap, marginLeft, footerY, cols]);

	// Botão "baixar outro": região clicável na linha do conteúdo.
	useEffect(() => {
		if (phase !== 'done') return;
		clickMap.register({
			id: 'baixar-outro',
			x: marginLeft,
			y: contentStart,
			width: Math.max(20, cols - marginLeft),
			height: 1,
			onClick: () => resetToInput(),
		});
		return () => {
			clickMap.unregister('baixar-outro');
		};
	}, [phase, clickMap, marginLeft, contentStart, cols, resetToInput]);

	useInput((input, key) => {
		if (input.startsWith('[<')) return; // sequência de mouse
		if (key.ctrl && input === 't') {
			setTheme(current => nextTheme(current));
			return;
		}
		if (key.ctrl && input === 'c') {
			exit();
			return;
		}
		if (key.return) {
			if (phase === 'done') resetToInput();
			else if (phase === 'error') setPhase('input');
			return;
		}
		if (!key.escape) return;
		if (phase === 'probe') probeAbortRef.current?.abort();
		else if (phase === 'download') downloadAbortRef.current?.abort();
		else if (phase === 'picker' || phase === 'error') setPhase('input');
		else if (phase === 'input' || phase === 'done') exit();
	});

	const palette = paletteFor(theme);
	const channel = probeInfo?.uploader ?? probeInfo?.channel ?? 'canal desconhecido';
	const duration = formatDuration(probeInfo?.duration);

	let panelTitle: string;
	let panelSubtitle: string;
	if (phase === 'bootstrap') {
		panelTitle = 'Downtube';
		panelSubtitle = bootstrapNote;
	} else if (phase === 'input') {
		panelTitle = 'Baixar vídeo';
		panelSubtitle = clipboardUrl ? 'Tab cola a URL da área de transferência' : 'Cole a URL do vídeo';
	} else if (phase === 'probe') {
		panelTitle = 'Procurando formatos…';
		panelSubtitle = url;
	} else if (phase === 'picker' || phase === 'download') {
		panelTitle = probeInfo?.title ?? 'Vídeo';
		panelSubtitle = `${channel} · ${duration}`;
	} else if (phase === 'done') {
		panelTitle = 'Download concluído!';
		panelSubtitle = savedFile ?? '';
	} else {
		panelTitle = 'Algo deu errado';
		panelSubtitle = ' ';
	}

	return (
		<Box flexDirection="column" marginLeft={marginLeft} paddingTop={topPad}>
			<Logo palette={palette} />
			<Text> </Text>
			<Panel title={panelTitle} subtitle={panelSubtitle} palette={palette} />
			<Text> </Text>
			{phase === 'bootstrap' && (
				<Box>
					<Spinner type="dots" />
					<Text color={palette.foreground || undefined}> Preparando o yt-dlp…</Text>
				</Box>
			)}
			{phase === 'input' && (
				<Box flexDirection="column">
					<UrlInput
						value={url}
						onChange={value => {
							setUrl(value);
							setUrlError(null);
						}}
						onSubmit={submitUrl}
						clipboardUrl={clipboardUrl}
						palette={palette}
						isActive
					/>
					<Text color={palette.muted || undefined}>
						{clipboardUrl ? `Tab cola: ${clipboardUrl}` : 'Enter confirma · Esc sai'}
					</Text>
					{outDirLabel ? <Text color={palette.muted || undefined}>Salvo em: {outDirLabel}</Text> : <Text> </Text>}
					{urlError ? <Text color={palette.error || undefined}>{urlError}</Text> : <Text> </Text>}
				</Box>
			)}
			{phase === 'probe' && (
				<Box>
					<Spinner type="dots" />
					<Text color={palette.foreground || undefined}> Procurando formatos… Esc cancela</Text>
				</Box>
			)}
			{phase === 'picker' && (
				<Picker
					choices={choices}
					palette={palette}
					startY={pickerItemsStart}
					startX={marginLeft}
					clickMap={clickMap}
					onSelect={choice => void startDownload(choice)}
					isActive
				/>
			)}
			{phase === 'download' && (
				<Progress
					percent={progress.percent}
					speedBytesPerSecond={progress.speedBytesPerSecond}
					etaSeconds={progress.etaSeconds}
					phase={downloadPhase}
					part={progress.part}
					totalParts={progress.totalParts}
					palette={palette}
				/>
			)}
			{phase === 'done' && (
				<Text color={palette.accent || undefined} bold>
					[ baixar outro ]
				</Text>
			)}
			{phase === 'error' && (
				<Box flexDirection="column">
					<Text color={palette.error || undefined}>{errorMsg ?? 'Erro desconhecido.'}</Text>
					<Text color={palette.muted || undefined}>Enter volta · Esc sai</Text>
				</Box>
			)}
			<Text> </Text>
			<Footer palette={palette} text={`${FOOTER_HINTS[phase]} · tema ${theme === 'auto' ? 'automático' : theme === 'light' ? 'claro' : 'escuro'} (Ctrl+T ou clique no rodapé)`} />
		</Box>
	);
}
