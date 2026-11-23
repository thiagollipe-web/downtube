/** Último arquivo baixado nesta execução, para o cli imprimir o caminho depois de restaurar o terminal. */
export let lastDownloaded: string | null = null;

export function setLastDownloaded(path: string | null): void {
	lastDownloaded = path;
}
