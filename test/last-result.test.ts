import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {lastDownloaded, setLastDownloaded} from '../src/lib/last-result.js';

describe('last-result', () => {
	it('guarda o último arquivo baixado para o cli imprimir ao sair', () => {
		assert.equal(lastDownloaded, null);
		setLastDownloaded('/home/thigas/Downloads/meu video.mp4');
		assert.equal(lastDownloaded, '/home/thigas/Downloads/meu video.mp4');
		setLastDownloaded(null);
		assert.equal(lastDownloaded, null);
	});
});
