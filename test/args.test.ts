import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {HELP_TEXT, parseArgs} from '../src/lib/args.js';

describe('parseArgs', () => {
	it('sem argumentos usa o tema automático', () => {
		assert.deepEqual(parseArgs([]), {theme: 'auto', help: false, version: false});
	});

	it('aceita uma URL posicional', () => {
		const parsed = parseArgs(['https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
		assert.equal(parsed.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		assert.equal(parsed.error, undefined);
	});

	it('aceita --theme com espaço e com =', () => {
		assert.equal(parseArgs(['--theme', 'dark']).theme, 'dark');
		assert.equal(parseArgs(['--theme=light']).theme, 'light');
	});

	it('rejeita tema inválido', () => {
		assert.match(parseArgs(['--theme', 'rosa']).error ?? '', /Tema inválido/);
		assert.match(parseArgs(['--theme']).error ?? '', /Tema inválido/);
	});

	it('aceita -h e -v', () => {
		assert.equal(parseArgs(['-h']).help, true);
		assert.equal(parseArgs(['--help']).help, true);
		assert.equal(parseArgs(['-v']).version, true);
		assert.equal(parseArgs(['--version']).version, true);
	});

	it('rejeita opção desconhecida e argumento extra', () => {
		assert.match(parseArgs(['--nada']).error ?? '', /Opção desconhecida/);
		assert.match(parseArgs(['https://a.test', 'https://b.test']).error ?? '', /Argumento extra/);
	});

	it('aceita --dir com espaço e com =', () => {
		assert.equal(parseArgs(['--dir', '/sdcard/Movies']).dir, '/sdcard/Movies');
		assert.equal(parseArgs(['--dir=~/Videos']).dir, '~/Videos');
	});

	it('rejeita --dir sem pasta', () => {
		assert.match(parseArgs(['--dir']).error ?? '', /Falta a pasta do --dir/);
	});

	it('a ajuda menciona o --dir e o Downloads do celular', () => {
		assert.match(HELP_TEXT, /--dir <pasta>/);
		assert.match(HELP_TEXT, /termux-setup-storage/);
	});
});
