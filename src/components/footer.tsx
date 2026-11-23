import {Text} from 'ink';
import type {Palette} from '../theme.js';

export function Footer({palette, text}: {palette: Palette; text: string}): React.JSX.Element {
	return (
		<Text color={palette.muted || undefined} wrap="truncate">
			{text}
		</Text>
	);
}
