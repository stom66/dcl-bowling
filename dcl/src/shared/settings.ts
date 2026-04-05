import { Quaternion, Vector3 } from '@dcl/sdk/math'
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
export class GameSettings {
	
	static SERVER_TIME_UPDATE_INTERVAL = (IS_DEBUG ? 15: 30) * 1000

	static MAX_LANES = 6
	static MAX_PLAYERS_PER_LANE = 4

	static GAME_START_DELAY = 6000
	static TURN_DURATION = 10000

	static LANE_POSITIONS = [...lanePositions]
}
