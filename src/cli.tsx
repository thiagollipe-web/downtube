import {render} from 'ink';
import React from 'react';
import {App} from './app.js';
import {HELP_TEXT, parseArgs} from './lib/args.js';
import {lastDownloaded} from './lib/last-result.js';

const VERSION = '0.1.0';

/** Restaura a tela alternativa, desliga o mouse e mostra o cursor. */
function restoreTerminal(): void {
	process.stdout.write('\x1b[?1002l\x1b[?1000l\x1b[?1049l\x1b[?25h');
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
	console.log(HELP_TEXT);
	process.exit(0);
}

if (args.version) {
	console.log(`downtube ${VERSION}`);
	process.exit(0);
}

if (args.error) {
	console.error(args.error);
	process.exit(2);
}

let restored = false;
const restoreOnce = (): void => {
	if (restored) return;
	restored = true;
	restoreTerminal();
};

// O erro só é impresso depois de restaurar o terminal.
process.on('uncaughtException', error => {
	restoreOnce();
	console.error(`downtube: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
});
process.on('unhandledRejection', reason => {
	restoreOnce();
	console.error(`downtube: ${reason instanceof Error ? reason.message : String(reason)}`);
	process.exit(1);
});
process.on('SIGINT', () => {
	restoreOnce();
	process.exit(130);
});
process.on('SIGTERM', () => {
	restoreOnce();
	process.exit(143);
});

// Tela alternativa + cursor escondido, antes de renderizar.
process.stdout.write('\x1b[?1049h\x1b[?25l');

try {
	const instance = render(<App initialUrl={args.url} initialTheme={args.theme} outDir={args.dir} />, {exitOnCtrlC: false});
	await instance.waitUntilExit();
} catch (error) {
	restoreOnce();
	console.error(`downtube: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
} finally {
	restoreOnce();
}

// Depois de restaurar o terminal, o caminho do arquivo fica no scrollback.
if (lastDownloaded) {
	console.log(`\nSalvo em: ${lastDownloaded}`);
}
