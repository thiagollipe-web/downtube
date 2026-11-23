import {Box, Text} from 'ink';
import type {Palette} from '../theme.js';

export interface PanelProps {
	title: string;
	subtitle: string;
	palette: Palette;
}

/**
 * Cabeçalho de duas linhas da tela atual: título e subtítulo.
 * Sempre renderiza exatamente duas linhas, para o mapa de cliques
 * poder calcular a posição dos itens abaixo dele.
 */
export function Panel({title, subtitle, palette}: PanelProps): React.JSX.Element {
	return (
		<Box flexDirection="column">
			<Text color={palette.foreground || undefined} bold wrap="truncate">
				{title}
			</Text>
			<Text color={palette.muted || undefined} wrap="truncate">
				{subtitle || ' '}
			</Text>
		</Box>
	);
}
