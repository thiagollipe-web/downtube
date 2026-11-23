import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {ClickMap, parseSgrMouse} from '../src/lib/click-map.js';

describe('ClickMap', () => {
	it('acerta a região sob o ponto, com deslocamento de centralização', () => {
		const map = new ClickMap();
		let clicked: string | null = null;
		// Lista centralizada: começa na coluna 10, linha 12.
		map.register({id: 'item-720p', x: 10, y: 12, width: 50, height: 1, onClick: () => { clicked = '720p'; }});
		map.register({id: 'item-1080p', x: 10, y: 11, width: 50, height: 1, onClick: () => { clicked = '1080p'; }});
		assert.equal(map.hitTest(15, 12)?.id, 'item-720p');
		assert.equal(map.hitTest(15, 11)?.id, 'item-1080p');
		assert.equal(map.hitTest(5, 12), undefined); // antes da margem, não acerta
		assert.equal(map.hitTest(15, 13), undefined); // abaixo da lista, não acerta
		assert.equal(map.click(15, 12), true);
		assert.equal(clicked, '720p');
		assert.equal(map.click(0, 0), false);
	});

	it('a última região registrada ganha quando há sobreposição', () => {
		const map = new ClickMap();
		map.register({id: 'fundo', x: 0, y: 0, width: 80, height: 24, onClick: () => {}});
		map.register({id: 'botao', x: 10, y: 5, width: 12, height: 1, onClick: () => {}});
		assert.equal(map.hitTest(11, 5)?.id, 'botao');
		assert.equal(map.hitTest(0, 0)?.id, 'fundo');
	});

	it('parseSgrMouse lê press e release no formato SGR 1006', () => {
		const events = parseSgrMouse('\x1b[<0;12;4M\x1b[<0;12;4m');
		assert.deepEqual(events, [
			{button: 0, x: 11, y: 3, pressed: true},
			{button: 0, x: 11, y: 3, pressed: false},
		]);
		assert.deepEqual(parseSgrMouse('texto sem mouse'), []);
	});
});
