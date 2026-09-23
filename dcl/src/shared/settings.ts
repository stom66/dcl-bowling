// MARK: Vars
declare var process: {
	env: {
		NODE_ENV: string
	}
}
const env = process.env.NODE_ENV
const IS_DEBUG = env == "development"


/**
 * Host-chosen game length. Last frame of any length is the bonus frame.
 */
export type GameFrameCount = 3 | 6 | 10


// MARK: GameSettings
export class PlayerSettings {
	static CAMER_ACTIVE_FOR_OTHER_PLAYERS_ROLLS = true
}

export class GameSettings {

	static LOADING_SCREEN_DELAY           = IS_DEBUG ? 0 : 1000 * 2

	static SERVER_TIME_UPDATE_INTERVAL    = (IS_DEBUG ? 15: 30) * 1000

	static MAX_LANES                      = 6
	static MAX_PLAYERS_PER_GAME           = IS_DEBUG ? 2 : 5
	static GAME_FRAME_COUNTS              = [3, 6, 10] as const
	static DEFAULT_FRAME_COUNT            : GameFrameCount = 6
	static MAX_FRAMES_PER_GAME            = 10
	static PERFECT_SCORE_BY_FRAME_COUNT   : Record<GameFrameCount, number> = {
		3 : 90,
		6 : 180,
		10: 300,
	}

	static GAME_START_COUNTDOWN_DURATION  = 1000 * (IS_DEBUG ? 2 : 30)
	static GAME_START_INITIAL_DELAY       = 1000 * 1                      // Time between starting the game, and starting the first frame
	static FRAME_DELAY_BEFORE_ROLL_START  = 1000 * 2                      // How long to wait before the roll starts after the frame starts
	static FRAME_DELAY_BETWEEN_TURNS      = 1000 * 3                      // How long to wait between Frames
	static ROLL_MAX_DURATION              = 1000 * (IS_DEBUG ? 20 : 30)
	static ROLL_REPLAY_DURATION           = 1000 * 10
	//static ROLL_REPLAY_ANIM_DURATION      = 1000 * 7                    // duration of the bowling animation which plays before the replay start - time before the animation releases the ball

	static SHOW_NON_GROUP_ROLL_VISUALS    = true

	static SHOW_FINAL_SCORES_DURATION     = 1000 * 5

}


// MARK: isGameFrameCount
/**
 * True when `value` is a supported host-chosen game length.
 */
export function isGameFrameCount(value: number): value is GameFrameCount {
	return value === 3 || value === 6 || value === 10
}


// MARK: normalizeFrameCount
/**
 * Returns a valid game length, falling back to {@link GameSettings.DEFAULT_FRAME_COUNT}.
 */
export function normalizeFrameCount(value: number | undefined | null): GameFrameCount {
	if (value === 3 || value === 6 || value === 10) return value
	return GameSettings.DEFAULT_FRAME_COUNT
}


// MARK: getPerfectScore
/**
 * Perfect total for a game of `frameCount` frames (30 points per frame).
 */
export function getPerfectScore(frameCount: GameFrameCount): number {
	return GameSettings.PERFECT_SCORE_BY_FRAME_COUNT[frameCount]
}
