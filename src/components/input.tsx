import {Box, Text, useInput} from 'ink';
import type {Palette} from '../theme.js';

export interface UrlInputProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	/** URL válida lida da área de transferência, se houver. */
	clipboardUrl: string | null;
	palette: Palette;
	isActive: boolean;
}

/**
 * Campo de URL feito com useInput, sem dependência extra:
 * digita, apaga, cola da área de transferência com Tab e confirma com Enter.
 * A URL da área de transferência nunca é colada sozinha.
 */
export function UrlInput({value, onChange, onSubmit, clipboardUrl, palette, isActive}: UrlInputProps): React.JSX.Element {
	useInput(
		(input, key) => {
			if (input.startsWith('[<')) return; // sequência de mouse, não é tecla
			if (key.ctrl || key.meta) return;
			if (key.escape) return; // o App decide o que o Esc faz
			if (key.return) {
				onSubmit();
				return;
			}
			if (key.tab) {
				if (clipboardUrl) onChange(clipboardUrl);
				return;
			}
			if (key.backspace || key.delete) {
				onChange(value.slice(0, -1));
				return;
			}
			if (!input) return;
			const clean = input.replace(/[\u0000-\u001f\u007f]/g, '');
			if (clean) onChange(value + clean);
		},
		{isActive},
	);

	return (
		<Box>
			<Text color={palette.accent || undefined} bold>
				{'> '}
			</Text>
			<Text color={palette.foreground || undefined} wrap="truncate">
				{value || 'https://www.youtube.com/watch?v=…'}
			</Text>
			<Text color={palette.accent || undefined}>▋</Text>
		</Box>
	);
}
