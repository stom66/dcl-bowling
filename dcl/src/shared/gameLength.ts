import { GameFrameCount, GameSettings } from 'src/shared/settings'


export type GameLengthEstimate = {
	minMs : number
	maxMs : number
}


// MARK: ballsPerPlayer
/**
 * Balls in a long game: two on every frame except the last, and three on the last.
 * Strikes on earlier frames bowl fewer balls than this.
 */
export function ballsPerPlayer(frameCount: number): number {
	return (2 * frameCount) + 1
}


// MARK: estimateGameLengthMs
/**
 * Short and long match lengths for `playerCount` players over `frameCount` frames.
 * The short end uses {@link GameSettings.ROLL_TYPICAL_AIM_DURATION}. The long end
 * uses {@link GameSettings.ROLL_MAX_DURATION}. A count of 0 is an empty lane.
 * The docs tester in `docs/game-length.html` repeats this formula with editable inputs.
 */
export function estimateGameLengthMs(
	playerCount : number,
	frameCount  : GameFrameCount,
): GameLengthEstimate {
	if (playerCount <= 0) return { minMs: 0, maxMs: 0 }

	return {
		minMs : durationMs(playerCount, frameCount, GameSettings.ROLL_TYPICAL_AIM_DURATION),
		maxMs : durationMs(playerCount, frameCount, GameSettings.ROLL_MAX_DURATION),
	}
}


// MARK: formatGameLengthLabel
/**
 * Lobby copy for an estimate, rounded to the nearest minute.
 * A single minute collapses the range: `ABOUT 5 MIN`.
 */
export function formatGameLengthLabel(estimate: GameLengthEstimate): string {
	if (estimate.maxMs <= 0) return ''

	const minMinutes = Math.max(1, Math.round(estimate.minMs / 60000))
	const maxMinutes = Math.max(minMinutes, Math.round(estimate.maxMs / 60000))
	if (minMinutes === maxMinutes) return `ABOUT ${minMinutes} MIN`
	return `ABOUT ${minMinutes}-${maxMinutes} MIN`
}


// MARK: durationMs
/**
 * One match length. Each player-frame pays the step-up and the leave.
 * Each ball pays the replay window, the roll-end gap, and `aimMs`.
 */
function durationMs(
	playerCount : number,
	frameCount  : number,
	aimMs       : number,
): number {
	const balls   = ballsPerPlayer(frameCount)
	const turns   = frameCount
	const startMs = GameSettings.GAME_START_COUNTDOWN_DURATION + GameSettings.GAME_START_INITIAL_DELAY
	const turnMs  = GameSettings.FRAME_DELAY_BEFORE_ROLL_START + GameSettings.FRAME_DELAY_BETWEEN_TURNS
	const ballMs  = GameSettings.ROLL_REPLAY_DURATION + GameSettings.FRAME_DELAY_BETWEEN_TURNS + aimMs

	return startMs + (playerCount * ((turns * turnMs) + (balls * ballMs)))
}
