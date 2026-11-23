export interface ClickRegion {
	id: string;
	/** Coluna inicial (base 0) no frame renderizado. */
	x: number;
	/** Linha inicial (base 0) no frame renderizado. */
	y: number;
	width: number;
	height: number;
	onClick: () => void;
}

export interface MousePress {
	x: number;
	y: number;
	button: number;
	pressed: boolean;
}

/** Mapa de regiões clicáveis do frame atual, com teste de acerto (hit-test). */
export class ClickMap {
	private regions: ClickRegion[] = [];

	register(region: ClickRegion): void {
		this.unregister(region.id);
		this.regions.push(region);
	}

	unregister(id: string): void {
		this.regions = this.regions.filter(region => region.id !== id);
	}

	clear(): void {
		this.regions = [];
	}

	/** Retorna a região sob o ponto, priorizando a registrada por último. */
	hitTest(x: number, y: number): ClickRegion | undefined {
		for (let i = this.regions.length - 1; i >= 0; i--) {
			const region = this.regions[i]!;
			if (
				x >= region.x &&
				x < region.x + region.width &&
				y >= region.y &&
				y < region.y + region.height
			) {
				return region;
			}
		}
		return undefined;
	}

	/** Executa o clique no ponto e retorna true quando acertou uma região. */
	click(x: number, y: number): boolean {
		const region = this.hitTest(x, y);
		if (!region) return false;
		region.onClick();
		return true;
	}
}

/**
 * Extrai eventos de mouse no formato SGR (1006) de um trecho de dados do stdin.
 * Exemplo: "\x1b[<0;12;4M" = botão 0 pressionado na coluna 12, linha 4 (base 1).
 */
export function parseSgrMouse(data: string): MousePress[] {
	const events: MousePress[] = [];
	const pattern = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(data)) !== null) {
		events.push({
			button: Number(match[1]),
			// O protocolo SGR usa coordenadas base 1; o click-map usa base 0.
			x: Number(match[2]) - 1,
			y: Number(match[3]) - 1,
			pressed: match[4] === 'M',
		});
	}
	return events;
}
