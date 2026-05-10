import { lanePositions } from 'src/client/data/lanePositions'


// MARK: Vars
declare var process: {
	env: {
		NODE_ENV: string
	}
}
const env = process.env.NODE_ENV
const IS_DEBUG = env == "development"


// MARK: GameSettings
export class PlayerSettings {
	static CAMER_ACTIVE_FOR_OTHER_PLAYERS_ROLLS = true
}

export class GameSettings {

	static LOADING_SCREEN_DELAY           = 1000 * 2
	
	static SERVER_TIME_UPDATE_INTERVAL    = (IS_DEBUG ? 15: 30) * 1000

	static MAX_LANES                      = 6
	static MAX_PLAYERS_PER_GAME           = IS_DEBUG ? 2 : 3
	static MAX_FRAMES_PER_GAME            = 5

	static GAME_START_COUNTDOWN_DURATION  = 1000 * (IS_DEBUG ? 5 : 30)
	static GAME_START_INITIAL_DELAY       = 1000 * 3    // Time between starting the game, and starting the first frame
	static FRAME_DELAY_BEFORE_ROLL_START  = 1000 * 2    // How long to wait before the roll starts after the frame starts
	static FRAME_DELAY_BETWEEN_TURNS      = 1000 * 3    // How long to wait between Frames
	static ROLL_MAX_DURATION              = 1000 * (IS_DEBUG ? 20 : 30)
	static ROLL_REPLAY_DURATION           = 1000 * 10
	static ROLL_REPLAY_ANIM_DURATION      = 1000 * 7     // duration of the bowling animation which plays before the replay start - time before the animation releases the ball

	static SHOW_NON_GROUP_ROLL_VISUALS = true

}
