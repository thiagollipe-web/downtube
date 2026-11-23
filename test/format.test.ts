import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
	formatBytes,
	formatDuration,
	formatEta,
	formatSpeed,
	isValidUrl,
	parseEta,
	parseSize,
	sanitizeFilename,
} from '../src/lib/format.js';

describe('isValidUrl', () => {
	it('aceita http(s) com host e rejeita o resto', () => {
		assert.equal(isValidUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
		assert.equal(isValidUrl('http://exemplo.test/video'), true);
		assert.equal(isValidUrl('ftp://exemplo.test/video'), false);
		assert.equal(isValidUrl('não é url'), false);
		assert.equal(isValidUrl('https://'), false);
		assert.equal(isValidUrl(''), false);
	});
});

describe('sanitizeFilename', () => {
	it('remove caracteres inválidos e espaços extras', () => {
		assert.equal(sanitizeFilename('Meu vídeo: parte 1/2? *final*'), 'Meu vídeo parte 12 final');
	});

	it('limita a 60 caracteres sem cortar palavra no meio', () => {
		const title = 'palavra '.repeat(20).trim();
		const result = sanitizeFilename(title);
		assert.ok(result.length <= 60);
		assert.equal(result.endsWith('palavra'), true);
	});

	it('usa "video" quando não sobra nada', () => {
		assert.equal(sanitizeFilename('///:::***'), 'video');
		assert.equal(sanitizeFilename(''), 'video');
	});
});

describe('formatBytes / formatDuration', () => {
	it('formata bytes e duração', () => {
		assert.equal(formatBytes(500), '500 B');
		assert.equal(formatBytes(1536), '1.5 KB');
		assert.equal(formatBytes(undefined), 'tamanho desconhecido');
		assert.equal(formatDuration(372), '6:12');
		assert.equal(formatDuration(3723), '1:02:03');
		assert.equal(formatDuration(undefined), 'duração desconhecida');
	});

	it('formata velocidade e ETA', () => {
		assert.equal(formatSpeed(1048576), '1.0 MB/s');
		assert.equal(formatSpeed(undefined), '—');
		assert.equal(formatEta(42), '0:42');
		assert.equal(formatEta(undefined), '—');
	});
});

describe('parseSize / parseEta', () => {
	it('converte tamanhos do yt-dlp em bytes', () => {
		assert.equal(parseSize('10.00MiB'), 10 * 1024 * 1024);
		assert.ok(Math.abs((parseSize('1.23GiB') ?? 0) - 1.23 * 1024 ** 3) < 1);
		assert.equal(parseSize('500B'), 500);
		assert.equal(parseSize('nada'), undefined);
		assert.equal(parseSize(undefined), undefined);
	});

	it('converte ETA em segundos', () => {
		assert.equal(parseEta('00:05'), 5);
		assert.equal(parseEta('01:02:03'), 3723);
		assert.equal(parseEta('nada'), undefined);
	});
});
