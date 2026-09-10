import { GameSettings } from 'src/shared/settings'


// MARK: isValidLaneIndex
/**
 * Returns whether a value is a valid zero-based lane index.
 */
export function isValidLaneIndex(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value >= 0 &&
		value < GameSettings.MAX_LANES
	)
}
