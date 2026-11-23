import {Box, Text} from 'ink';
import type {Palette} from '../theme.js';

/** Logo em ASCII puro, estilo terminal: só caracteres ASCII, 5 linhas. */
const LOGO_LINES: string[] = [
	' ___   ___  __     __  _   _  _____ |   | ____  _____',
	'|  _\\ /   \\ \\ \\   / / | \\ | |   |   |   | |   \\ |',
	'| | | | | |  \\ \\ / /  |  \\| |   |   |   | |___| |___',
	'| |_| | |_|   \\   /   | |\\  |   |   |   | |   \\ |',
	'|___/ \\___/    \\_/    |_| \\_|   |    \\_/  |___| |____',
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
