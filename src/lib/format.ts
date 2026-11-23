/** Valida se o texto é uma URL http(s) com host. */
export function isValidUrl(text: string): boolean {
	const trimmed = text.trim();
	if (!trimmed || /\s/.test(trimmed)) return false;
	try {
		const url = new URL(trimmed);
		return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
	} catch {
		return false;
	}
}

/** Remove caracteres inválidos para nome de arquivo e limita o tamanho. */
export function sanitizeFilename(title: string, maxLength = 60): string {
	const cleaned = title
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (!cleaned) return 'video';
	if (cleaned.length <= maxLength) return cleaned;
	return cleaned.slice(0, maxLength).replace(/\s+\S*$/, '').trim() || cleaned.slice(0, maxLength).trim();
}

export function formatBytes(bytes: number | undefined | null): string {
	if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return 'tamanho desconhecido';
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB', 'TB'];
	let value = bytes;
	let unitIndex = -1;
	do {
		value /= 1024;
		unitIndex++;
	} while (value >= 1024 && unitIndex < units.length - 1);
	return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDuration(totalSeconds: number | undefined | null): string {
	if (totalSeconds === undefined || totalSeconds === null || Number.isNaN(totalSeconds)) {
		return 'duração desconhecida';
	}
	const total = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(2, '0');
	return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

/** Converte "1.23MiB/s" ou bytes/s em texto legível. */
export function formatSpeed(bytesPerSecond: number | undefined | null): string {
	if (bytesPerSecond === undefined || bytesPerSecond === null || Number.isNaN(bytesPerSecond)) {
		return '—';
	}
	return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatEta(totalSeconds: number | undefined | null): string {
	if (totalSeconds === undefined || totalSeconds === null || Number.isNaN(totalSeconds)) {
		return '—';
	}
	return formatDuration(totalSeconds);
}

/** Converte um tamanho do yt-dlp ("10.00MiB", "1.23GiB") em bytes. */
export function parseSize(size: string | undefined | null): number | undefined {
	if (!size) return undefined;
	const match = size.trim().match(/^([\d.]+)\s*([KMGT]?i?B)?$/i);
	if (!match) return undefined;
	const value = Number.parseFloat(match[1]!);
	const unit = (match[2] ?? 'B').toUpperCase();
	const factor: Record<string, number> = {
		B: 1,
		KB: 1000,
		MB: 1000 ** 2,
		GB: 1000 ** 3,
		TB: 1000 ** 4,
		KIB: 1024,
		MIB: 1024 ** 2,
		GIB: 1024 ** 3,
		TIB: 1024 ** 4,
	};
	return value * (factor[unit] ?? 1);
}

/** Converte "00:05" ou "01:02:03" em segundos. */
export function parseEta(eta: string | undefined | null): number | undefined {
	if (!eta) return undefined;
	const parts = eta.split(':').map(Number);
	if (parts.some(Number.isNaN)) return undefined;
	let total = 0;
	for (const part of parts) total = total * 60 + part;
	return total;
}
