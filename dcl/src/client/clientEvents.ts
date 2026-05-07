// List of all client events used by the eventBus for inter-script communication
export enum ClientEvents {
	NOTIFY_LANE_STATE      = "notifyLaneState",

	ON_GAME_JOINED         = "onGameJoined",      // When the player joins a game before it starts
	ON_GROUP_GAME_START    = "onGroupGameStart",  // When the group game starts
	ON_GROUP_FRAME_START   = "onGroupFrameStart", // When someone else in the group starts their frame
	ON_GROUP_ROLL_START    = "onGroupRollStart",  // When someone else in the group starts their roll
	ON_GROUP_ROLL_END      = "onGroupRollEnd",    // When someone else in the group ends their roll
	ON_GROUP_FRAME_END     = "onGroupFrameEnd",   // When someone else in the group ends their frame
	ON_GROUP_GAME_END      = "onGroupGameEnd",    // When the group game ends
	
	
	ON_MY_FRAME_START               = "onMyFrameStart",              // When the local player starts their frame
	ON_MY_FRAME_END                 = "onMyFrameEnd",                // When the local player ends their frame
	ON_MY_ROLL_START                = "onMyRollStart",               // When the local player starts their roll
	ON_MY_ROLL_REQUEST              = "onMyRollRequest",             // When the local player requests a roll
	ON_GROUP_ROLL_PLAYBACK_RECEIVED = "onGroupRollPlaybackReceived", // Server sent roll playback payload (room message)
	ON_GROUP_ROLL_PLAYBACK_START    = "onRollPlaybackStart",         // Lane visuals began driving keyframe playback
	ON_GROUP_ROLL_PLAYBACK_END      = "onRollPlaybackEnd",           // Lane visuals finished playback / teardown tick
	ON_MY_ROLL_END                  = "onMyRollEnd",                 // When the local player ends their roll


	//ON_GROUP_TURN_START    =  "onGroupTurnStart", // When someone else in the group starts their turn
	//ON_GROUP_TURN_END      =  "onGroupTurnEnd",   // When someone else in the group ends their turn
	//ON_MY_TURN_START       =  "onMyTurnStart",    // When the local player starts their turn
	//ON_MY_TURN_END         =  "onMyTurnEnd",      // When the local player ends their turn

}
