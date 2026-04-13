// List of all client events used by the eventBus for inter-script communication
export enum ClientEvents {
	NOTIFY_JOIN_GAME            = "notifyJoinGame",
	NOTIFY_GAME_START           = "notifyGameStart",
	NOTIFY_LANE_STATE           = "notifyLaneState",
	NOTIFY_PLAYER_TURN_START    = "notifyPlayerTurnStart",
	NOTIFY_PLAYER_TURN_PLAYBACK = "notifyPlayerTurnPlayback",
}
