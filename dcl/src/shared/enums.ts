
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
	GAME_STARTING   = "GAME_STARTING",     // Game is starting
	WAITING         = "WAITING",           // Waiting for game to start, or waiting for next player's frame
	FRAME_START     = "FRAME_START_DELAY", // notifyPlayerFrameStart sent, waiting to start roll
	ROLL_AWAITING   = "ROLL_AWAITING",     // notifyPlayerRollStart sent, waiting for REQUEST_PLAY_ROLL
	ROLL_PROCESSING = "ROLL_PROCESSING",   // REQUEST_PLAY_ROLL received, waiting for sim to finish
	ROLL_PLAYBACK   = "ROLL_PLAYBACK",     // notifyPlayerRollPlayback sent, waiting for replay to finish
	ROLL_END        = "ROLL_END_DELAY",    // notifyPlayerRollEnd sent, waiting before next roll or frame end
	FRAME_END       = "FRAME_END_DELAY",   // notifyPlayerFrameEnd sent, waiting before next player's frame
	GAME_ENDING     = "GAME_ENDING",       // Game is ending
}
