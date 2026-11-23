import {useEffect, useRef} from 'react';
import {useInput} from 'ink';
import {ClickMap, parseSgrMouse} from './click-map.js';

/**
 * Ativa o relatório de mouse do terminal (SGR 1006) e despacha cliques
 * para as regiões registradas no click-map.
 *
 * O Ink não expõe eventos de mouse, mas entrega a sequência SGR
 * (sem o ESC inicial) no useInput. O hook lê essa sequência, faz o
 * hit-test e ignora o resto. Não há listener extra no stdin, para não
 * brigar com a leitura do Ink.
 */
export function useMouseClick(clickMap: ClickMap): void {
	const mapRef = useRef(clickMap);
	mapRef.current = clickMap;

	useEffect(() => {
		const out = process.stdout;
		out.write('\x1b[?1000h\x1b[?1002h\x1b[?1006h');
		return () => {
			out.write('\x1b[?1002l\x1b[?1000l');
		};
	}, []);

	useInput(input => {
		if (!input.startsWith('[<')) return;
		// Recoloca o ESC que o Ink removeu, para reaproveitar o parser SGR.
		for (const event of parseSgrMouse(`\x1b${input}`)) {
			if (event.pressed && event.button === 0) {
				mapRef.current.click(event.x, event.y);
			}
		}
	});
}
