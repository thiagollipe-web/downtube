import {Box, Text, useStdout} from 'ink';
import {formatDuration, formatSpeed} from '../lib/format.js';
import type {Palette} from '../theme.js';

export type DownloadPhase = 'download' | 'merge' | 'audio';

export interface ProgressProps {
	percent: number;
	speedBytesPerSecond?: number;
	etaSeconds?: number;
	phase: DownloadPhase;
	part: number;
	totalParts: number;
	palette: Palette;
}

const PHASE_LABEL: Record<DownloadPhase, string> = {
	download: 'Baixando…',
	merge: 'Mesclando vídeo e áudio…',
	audio: 'Extraindo áudio (mp3)…',
};

/** Barra de progresso em ASCII, com velocidade, ETA e fase atual. */
export function Progress({percent, speedBytesPerSecond, etaSeconds, phase, part, totalParts, palette}: ProgressProps): React.JSX.Element {
	const {stdout} = useStdout();
	const barWidth = Math.max(10, Math.min(40, (stdout.columns || 80) - 16));
	const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * barWidth);
	const bar = '#'.repeat(filled) + '-'.repeat(barWidth - filled);

	return (
		<Box flexDirection="column">
			<Text color={palette.foreground || undefined}>
				[{bar}] {Math.floor(percent)}%
			</Text>
			<Text color={palette.muted || undefined}>
				{formatSpeed(speedBytesPerSecond)} · ETA {etaSeconds === undefined ? '—' : formatDuration(etaSeconds)}
				{totalParts > 1 ? ` · parte ${part}/${totalParts}` : ''}
			</Text>
			<Text color={palette.accent || undefined}>{PHASE_LABEL[phase]}</Text>
		</Box>
	);
}
