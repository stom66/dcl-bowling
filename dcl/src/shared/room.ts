import { registerMessages } from '@dcl/sdk/network'
import { Schemas } from '@dcl/sdk/ecs'

// MARK: MessageType enum
export enum MessageType {
	REQUEST_JOIN_GAME  = 'requestJoinGame',
	REQUEST_PLAY_TURN  = 'requestPlayTurn',

	NOTIFY_JOIN_GAME   = 'notifyJoinGame',
	NOTIFY_LANE_STATE  = 'notifyLaneState',
	NOTIFY_PLAYER_TURN = 'notifyPlayerTurn',
	NOTIFY_SERVER_TIME = 'notifyServerTime'
}

// MARK: Message schemas
const notifyLaneStateSchema = Schemas.Map({
	sentAt              : Schemas.Int64,
	gameStartTime       : Schemas.Int64,
	//groupId             : Schemas.String,
	laneIndex           : Schemas.Int,
	laneStatus          : Schemas.String,
	players             : Schemas.Array(
		Schemas.Map({
			userId            : Schemas.String,
			displayName       : Schemas.String
		})
	),
	frames              : Schemas.Array(
		Schemas.Map({
			userId            : Schemas.String,
			frames            : Schemas.Array(Schemas.Array(Schemas.Number))
		})
	),
	currentRound        : Schemas.Int,
	currentTurnUserId   : Schemas.Optional(Schemas.String),
	currentTurnStartTime: Schemas.Optional(Schemas.Int64)
})

const turnMessageBaseSchema = {
	frameIndex   : Schemas.Number,
	pinStates    : Schemas.Array(Schemas.Boolean),
	ballPositions: Schemas.Array(Schemas.Vector3),
	pinPositions : Schemas.Array(Schemas.Array(Schemas.Vector3)),
	pinRotations : Schemas.Array(Schemas.Array(Schemas.Quaternion)),
	score        : Schemas.Number,
	sentAt       : Schemas.Int64
}

const Messages = {
	// Sent by client
	[MessageType.REQUEST_JOIN_GAME]: Schemas.Optional(Schemas.Number),
	[MessageType.REQUEST_PLAY_TURN]: Schemas.Map({
		...turnMessageBaseSchema,
		frameIndex: Schemas.Number
	}),
	[MessageType.NOTIFY_PLAYER_TURN]: Schemas.Map({
		...turnMessageBaseSchema,
		playerId: Schemas.String
	}),

	[MessageType.NOTIFY_LANE_STATE] : notifyLaneStateSchema,
	[MessageType.NOTIFY_JOIN_GAME]  : notifyLaneStateSchema,
	[MessageType.NOTIFY_SERVER_TIME]: Schemas.Int64
}

// Export room
export const room = registerMessages(Messages)
