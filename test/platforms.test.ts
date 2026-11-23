import assert from 'node:assert/strict';
import {mkdir, mkdtemp} from 'node:fs/promises';
import {homedir} from 'node:os';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {describe, it} from 'node:test';
import {downloadsDir, resolveDownloadsDir} from '../src/lib/platforms.js';

describe('resolveDownloadsDir', () => {
	it('sem pasta explícita e sem storage do Termux usa ~/Downloads', async () => {
		const home = await mkdtemp(join(tmpdir(), 'downtube-home-'));
		assert.equal(await resolveDownloadsDir(undefined, home), join(home, 'Downloads'));
	});

	it('no Termux usa ~/storage/downloads quando a pasta existe', async () => {
		const home = await mkdtemp(join(tmpdir(), 'downtube-home-'));
		const termuxDownloads = join(home, 'storage', 'downloads');
		await mkdir(termuxDownloads, {recursive: true});
		assert.equal(await resolveDownloadsDir(undefined, home), termuxDownloads);
	});

	it('a pasta explícita vence o Downloads do Termux', async () => {
		const home = await mkdtemp(join(tmpdir(), 'downtube-home-'));
		await mkdir(join(home, 'storage', 'downloads'), {recursive: true});
		assert.equal(await resolveDownloadsDir('/sdcard/Movies', home), '/sdcard/Movies');
	});

	it('expande ~ e resolve caminho relativo', async () => {
		const home = await mkdtemp(join(tmpdir(), 'downtube-home-'));
		assert.equal(await resolveDownloadsDir('~/Videos', home), join(home, 'Videos'));
		assert.equal(await resolveDownloadsDir('videos', home), resolve('videos'));
	});

	it('downloadsDir continua sendo ~/Downloads', () => {
		assert.equal(downloadsDir(), join(homedir(), 'Downloads'));
	});
});
