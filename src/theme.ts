export type ThemeName = 'auto' | 'light' | 'dark';

export interface Palette {
	background: string;
	foreground: string;
	accent: string;
	muted: string;
	success: string;
	error: string;
	highlight: string;
	border: string;
}

const LIGHT: Palette = {
	background: '#ffffff',
	foreground: '#1a1a1a',
	accent: '#005cc5',
	muted: '#6a737d',
	success: '#22863a',
	error: '#cb2431',
	highlight: '#e8f0fe',
	border: '#d0d7de',
};

const DARK: Palette = {
	background: '#0d1117',
	foreground: '#e6edf3',
	accent: '#58a6ff',
	muted: '#8b949e',
	success: '#3fb950',
	error: '#f85149',
	highlight: '#161b22',
	border: '#30363d',
};

/**
 * No tema auto, o terminal manda: usamos as cores padrão do terminal
 * (sem cor de fundo) e um destaque genérico que funciona nos dois casos.
 */
const AUTO: Palette = {
	background: '',
	foreground: '',
	accent: 'cyan',
	muted: 'gray',
	success: 'green',
	error: 'red',
	highlight: '',
	border: 'gray',
};

export const THEME_ORDER: ThemeName[] = ['auto', 'light', 'dark'];

export function paletteFor(theme: ThemeName): Palette {
	if (theme === 'light') return LIGHT;
	if (theme === 'dark') return DARK;
	return AUTO;
}

export function nextTheme(theme: ThemeName): ThemeName {
	const index = THEME_ORDER.indexOf(theme);
	return THEME_ORDER[(index + 1) % THEME_ORDER.length]!;
}

export function themeLabel(theme: ThemeName): string {
	if (theme === 'light') return 'claro';
	if (theme === 'dark') return 'escuro';
	return 'automático';
}
