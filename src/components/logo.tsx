import {Box, Text} from 'ink';
import type {Palette} from '../theme.js';

/** Logo em ASCII puro, estilo terminal: só caracteres ASCII, 3 linhas. */
const LOGO_LINES: string[] = [
	' __   __  _   _   _   _ ___ _   _  __  ___',
	'| _\\ /  \\ \\ \\ / / | \\ |  |  |   | |__\\ |__',
	'|__/ \\__/  \\_/    |_\\_| _|_ \\_ _/ |__/ |___|',
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
