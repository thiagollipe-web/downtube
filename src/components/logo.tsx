import {Box, Text} from 'ink';
import type {Palette} from '../theme.js';

/** Logo em ASCII puro, estilo terminal: só caracteres ASCII, 5 linhas. */
const LOGO_LINES: string[] = [
	' ____     ___   __        __  _   _   _____   _   _   ____    _____',
	'|  _ \\   / _ \\  \\ \\      / / | \\ | | |_   _| | | | | | __ )  | ____|',
	'| | | | | | | |  \\ \\ /\\ / /  |  \\| |   | |   | | | | |  _ \\  |  _|',
	'| |_| | | |_| |   \\ V  V /   | |\\  |   | |   | |_| | | |_) | | |___',
	'|____/   \\___/     \\_/\\_/    |_| \\_|   |_|    \\___/  |____/  |_____|',
];

export function Logo({palette}: {palette: Palette}): React.JSX.Element {
	return (
		<Box flexDirection="column">
			{LOGO_LINES.map((line, index) => (
				<Text key={index} color={palette.accent || undefined} bold wrap="truncate">
					{line}
				</Text>
			))}
		</Box>
	);
}
