
export enum LaneStatus {
	IDLE     = "IDLE",
	STARTING = "STARTING",
	ACTIVE   = "ACTIVE",
}

export enum PlayerStatus {
	IDLE                   = "IDLE",
	WAITING_FOR_GAME_START = "WAITING_FOR_GAME_START",
	IN_GAME_WAITING        = "IN_GAME_WAITING",
	IN_GAME_PLAYING        = "IN_GAME_PLAYING",
}

/**
 * Per-lane game phase used by GameManager's systemFrameWatcher to decide when
 * to advance the game. When a phase's timer elapses, the watcher invokes the
 * corresponding phase-advance function.
 */
export enum LanePhase {
	NONE              = "NONE",               // Not running / idle
	FRAME_START_DELAY = "FRAME_START_DELAY",  // notifyPlayerFrameStart sent, waiting to start roll
	ROLL_AWAITING     = "ROLL_AWAITING",      // notifyPlayerRollStart sent, waiting for REQUEST_PLAY_ROLL
	ROLL_PLAYBACK     = "ROLL_PLAYBACK",      // notifyPlayerRollPlayback sent, waiting for replay to finish
	ROLL_END_DELAY    = "ROLL_END_DELAY",     // notifyPlayerRollEnd sent, waiting before next roll or frame end
	FRAME_END_DELAY   = "FRAME_END_DELAY",    // notifyPlayerFrameEnd sent, waiting before next player's frame
}