let loadingStage = ''


// MARK: getLoadingStage
/**
 * Returns the most recent scene-loading stage for the loading UI.
 */
export function getLoadingStage(): string {
	return loadingStage || 'the bowling alley'
}


// MARK: setLoadingStage
/**
 * Updates the scene-loading stage shown by the loading UI.
 */
export function setLoadingStage(stage: string): void {
	loadingStage = stage
}
