import {useEffect, useState} from 'react';
import {Box, Text, useStdout} from 'ink';
import SelectInput from 'ink-select-input';
import type {ClickMap} from '../lib/click-map.js';
import type {FormatChoice} from '../lib/ytdlp.js';
import type {Palette} from '../theme.js';

export interface PickerProps {
	choices: FormatChoice[];
	palette: Palette;
	/** Linha (base 0) do primeiro item no frame renderizado. */
	startY: number;
	/** Coluna (base 0) onde a lista começa, para centralizar. */
	startX: number;
	clickMap: ClickMap;
	onSelect: (choice: FormatChoice) => void;
	isActive: boolean;
}

/**
 * Seletor de formato com ink-select-input (teclado) e clique do mouse.
 * O ink-select-input já aceita setas, j/k e teclas de 1 a 9.
 * Cada item ocupa exatamente uma linha, a partir de startY, e o botão
 * "[ baixar ]" baixa o formato destacado no momento.
 */
export function Picker({choices, palette, startY, startX, clickMap, onSelect, isActive}: PickerProps): React.JSX.Element {
	const {stdout} = useStdout();
	const width = Math.max(20, (stdout.columns || 80) - startX);
	const [highlighted, setHighlighted] = useState<FormatChoice>(choices[0]!);

	useEffect(() => {
		setHighlighted(choices[0]!);
	}, [choices]);

	useEffect(() => {
		for (let i = 0; i < choices.length; i++) {
			const choice = choices[i]!;
			clickMap.register({
				id: `choice-${choice.id}`,
				x: startX,
				y: startY + i,
				width,
				height: 1,
				onClick: () => onSelect(choice),
			});
		}
		clickMap.register({
			id: 'baixar',
			x: startX,
			y: startY + choices.length,
			width,
			height: 1,
			onClick: () => onSelect(highlighted),
		});
		return () => {
			for (const choice of choices) clickMap.unregister(`choice-${choice.id}`);
			clickMap.unregister('baixar');
		};
	}, [choices, startY, startX, width, clickMap, onSelect, highlighted]);

	return (
		<Box flexDirection="column">
			<Text color={palette.foreground || undefined} bold>
				Escolha o formato:
			</Text>
			<SelectInput<FormatChoice['id']>
				items={choices.map(choice => ({label: choice.label, value: choice.id}))}
				isFocused={isActive}
				onSelect={item => {
					const choice = choices.find(candidate => candidate.id === item.value);
					if (choice) onSelect(choice);
				}}
				onHighlight={item => {
					const choice = choices.find(candidate => candidate.id === item.value);
					if (choice) setHighlighted(choice);
				}}
			/>
			<Text color={palette.accent || undefined} bold>
				[ baixar ]
			</Text>
		</Box>
	);
}
