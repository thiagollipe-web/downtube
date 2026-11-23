import assert from 'node:assert/strict';
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {buildChoices, parseSpeed, removePartials, type ProbeInfo} from '../src/lib/ytdlp.js';

async function loadFixture(): Promise<ProbeInfo> {
	const raw = await readFile(new URL('./fixtures/probe-youtube.json', import.meta.url), 'utf8');
	return JSON.parse(raw) as ProbeInfo;
}

describe('buildChoices', () => {
	it('uma opção por resolução, da maior para a menor, em mp4', async () => {
		const choices = buildChoices(await loadFixture());
		const video = choices.filter(choice => !choice.isAudio);
		assert.deepEqual(
			video.map(choice => choice.height),
			[4320, 2160, 1080, 720, 480, 360, 240, 144],
		);
		// O formato webm de 1440p não entra: só mp4.
		assert.equal(video.some(choice => choice.height === 1440), false);
	});

	it('limita a 8 opções de vídeo, cortando as menores', async () => {
		const info = await loadFixture();
		info.formats.push(
			{format_id: '400', ext: 'mp4', height: 2880, vcodec: 'avc1', filesize: 1000000000},
			{format_id: '399', ext: 'mp4', height: 1440, vcodec: 'avc1', filesize: 300000000},
		);
		const video = buildChoices(info).filter(choice => !choice.isAudio);
		assert.equal(video.length, 8);
		assert.deepEqual(
			video.map(choice => choice.height),
			[4320, 2880, 2160, 1440, 1080, 720, 480, 360],
		);
	});

	it('ignora webm e áudio, e pega o maior arquivo por resolução', async () => {
		const choices = buildChoices(await loadFixture());
		const hd = choices.find(choice => choice.height === 1080);
		assert.equal(hd?.formatId, '299'); // 180 MB, maior que o 137 (120 MB)
		assert.equal(hd?.label.includes('MB'), true);
		assert.equal(choices.some(choice => choice.label.includes('webm')), false);
	});

	it('sempre termina com a opção de áudio apenas em mp3', async () => {
		const choices = buildChoices(await loadFixture());
		const last = choices.at(-1)!;
		assert.equal(last.isAudio, true);
		assert.equal(last.ext, 'mp3');
		assert.equal(last.label, 'áudio apenas · mp3');
	});

	it('sem formatos de vídeo, só oferece o áudio', () => {
		const choices = buildChoices({title: 'só áudio', formats: []});
		assert.equal(choices.length, 1);
		assert.equal(choices[0]?.isAudio, true);
	});
});

describe('parseSpeed', () => {
	it('converte velocidades do yt-dlp', () => {
		assert.ok(Math.abs((parseSpeed('1.23MiB/s') ?? 0) - 1.23 * 1024 * 1024) < 1);
		assert.equal(parseSpeed('500KiB/s'), 500 * 1024);
		assert.equal(parseSpeed(undefined), undefined);
		assert.equal(parseSpeed('rápido'), undefined);
	});
});

describe('removePartials', () => {
	it('apaga .part e .ytdl e mantém o arquivo final', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'downtube-test-'));
		try {
			const filename = 'meu video';
			await writeFile(join(dir, 'meu video.mp4.part'), 'parcial');
			await writeFile(join(dir, 'meu video.f137.mp4.part'), 'parcial');
			await writeFile(join(dir, 'meu video.mp4.ytdl'), 'meta');
			await writeFile(join(dir, 'meu video.mp4'), 'final');
			await writeFile(join(dir, 'outro.txt'), 'fica');
			await removePartials(dir, filename);
			const remaining = await readdir(dir);
			assert.deepEqual(remaining.sort(), ['meu video.mp4', 'outro.txt']);
		} finally {
			await rm(dir, {force: true, recursive: true});
		}
	});
});
