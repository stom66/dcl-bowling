
//export enum LaneStatus {
//	IDLE     = "IDLE",
//	STARTING = "STARTING",
//	ACTIVE   = "ACTIVE",
//	ENDING   = "ENDING",
//}

export enum PlayerStatus {
	IDLE                   = "IDLE",
	WAITING_FOR_GAME_START = "WAITING_FOR_GAME_START",
	IN_GAME_WAITING        = "IN_GAME_WAITING",
	IN_GAME_PLAYING        = "IN_GAME_PLAYING",
}

export enum LanePhase {
	NONE            = "NONE",              // Not running / idle
	GAME_STARTING   = "GAME_STARTING",     // Game is starting (countdown to first frame)
	WAITING         = "WAITING",           // Game running, waiting between players' frames
	FRAME_START     = "FRAME_START_DELAY", // Waiting between frame start and roll start
	ROLL_AWAITING   = "ROLL_AWAITING",     // Waiting for REQUEST_PLAY_ROLL from active player
	ROLL_PROCESSING = "ROLL_PROCESSING",   // REQUEST_PLAY_ROLL received, waiting for sim to finish
	ROLL_PLAYBACK   = "ROLL_PLAYBACK",     // Roll keyframes sent, waiting for replay to finish
	ROLL_END        = "ROLL_END_DELAY",    // Waiting before next roll or frame end
	FRAME_END       = "FRAME_END_DELAY",   // Waiting before next player's frame
	GAME_ENDING     = "GAME_ENDING",       // Game is ending
}
