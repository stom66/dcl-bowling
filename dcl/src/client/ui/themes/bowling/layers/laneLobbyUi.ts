type OpenLaneLobby = (
	laneIndex: number,
	occupied : boolean,
) => void

let openLaneLobby  : OpenLaneLobby | null = null
let closeLaneLobby : (() => void) | null  = null


// MARK: bindLaneLobbyUi
/**
 * Registers the lobby panel open and close handlers.
 * Called when the lane lobby layer is created.
 */
export function bindLaneLobbyUi(
	open : OpenLaneLobby,
	close: () => void,
): void {
	openLaneLobby  = open
	closeLaneLobby = close
}


// MARK: ShowLaneLobbyUI
/** Opens the lobby panel for a 0-based lane index. */
export function ShowLaneLobbyUI(
	laneIndex: number,
	occupied : boolean = false,
): void {
	openLaneLobby?.(laneIndex, occupied)
}


// MARK: HideLaneLobbyUI
/** Hides the lobby panel. */
export function HideLaneLobbyUI(): void {
	closeLaneLobby?.()
}
