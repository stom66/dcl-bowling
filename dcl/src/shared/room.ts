import { registerMessages } from '@dcl/sdk/network'
import { Schemas } from '@dcl/sdk/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'

// MARK: MessageType enum
export enum MessageType {
	REQUEST_JOIN_GAME           = 'requestJoinGame',
	REQUEST_PLAY_ROLL           = 'requestPlayRoll',

	NOTIFY_SERVER_TIME          = 'notifyServerTime',
	NOTIFY_LANE_STATE           = 'notifyLaneState',
	
	NOTIFY_JOIN_GAME            = 'notifyJoinGame',
	NOTIFY_GAME_START           = 'notifyGameStart',
	NOTIFY_PLAYER_FRAME_START   = 'notifyPlayerFrameStart',
	NOTIFY_PLAYER_ROLL_START    = 'notifyPlayerRollStart',
	NOTIFY_PLAYER_ROLL_PLAYBACK = 'notifyPlayerRollPlayback',
	NOTIFY_PLAYER_ROLL_END      = 'notifyPlayerRollEnd',
	NOTIFY_PLAYER_FRAME_END     = 'notifyPlayerFrameEnd',
	NOTIFY_GAME_END             = 'notifyGameEnd',
}

// MARK: Message schemas
const notifyLaneStateSchema = Schemas.Map({
	currentFrameIndex      : Schemas.Optional(Schemas.Int),
	currentFramePlayerIndex: Schemas.Optional(Schemas.Int),
	currentFrameUserId     : Schemas.Optional(Schemas.String),
	currentRollIndex       : Schemas.Optional(Schemas.Int),
	currentRollStartTime   : Schemas.Optional(Schemas.Int64),
	frames                 : Schemas.Array(
		Schemas.Map({
			userId               : Schemas.String,
			frames               : Schemas.Array(Schemas.Array(Schemas.Number))
		})
	),
	gameStartTime          : Schemas.Int64,
	//groupId                : Schemas.String,
	laneIndex              : Schemas.Int,
	laneStatus             : Schemas.String,
	phase                  : Schemas.String,
	players                : Schemas.Array(
		Schemas.Map({
			userId               : Schemas.String,
			displayName          : Schemas.String
		})
	),
	sentAt                 : Schemas.Int64,
})

const rollRequestSchema = {
	direction : Schemas.Vector3,
	frameIndex: Schemas.Number,
	position  : Schemas.Vector3,
	power     : Schemas.Number,
	rollIndex : Schemas.Number,
}

const rollReplaySchema = {
	frameIndex   : Schemas.Number,
	rollIndex    : Schemas.Int,
	startingPinStates: Schemas.Array(Schemas.Boolean),
	finalPinStates   : Schemas.Array(Schemas.Boolean),
	ballKeyframes    : Schemas.Map({
		index    : Schemas.Int,
		keyframes: Schemas.Array(Schemas.Map({
			time    : Schemas.Number,
			position: Schemas.Optional(Schemas.Vector3),
			rotation: Schemas.Optional(Schemas.Quaternion)
		}))
	}),
	pinsKeyframes    : Schemas.Array(Schemas.Map({
		index    : Schemas.Int,
		keyframes: Schemas.Array(Schemas.Map({
			time    : Schemas.Number,
			position: Schemas.Optional(Schemas.Vector3),
			rotation: Schemas.Optional(Schemas.Quaternion)
		}))
	})),
	score        : Schemas.Number,
	sentAt       : Schemas.Int64,
	userId       : Schemas.String
}

const userIdMessageBaseSchema = {
	sentAt       : Schemas.Int64,
	userId       : Schemas.String
}

const eventEnvelopeSchema = Schemas.Map({
	eventType: Schemas.String,
	timestamp: Schemas.Int64
})

const Messages = {
	// Sent by client
	[MessageType.REQUEST_JOIN_GAME]          : Schemas.Optional(Schemas.Number),
	[MessageType.REQUEST_PLAY_ROLL]          : Schemas.Map({
		...rollRequestSchema
	}),

	[MessageType.NOTIFY_SERVER_TIME]         : Schemas.Int64,

	[MessageType.NOTIFY_LANE_STATE]          : notifyLaneStateSchema,
	[MessageType.NOTIFY_JOIN_GAME]           : notifyLaneStateSchema,
	[MessageType.NOTIFY_GAME_START]          : notifyLaneStateSchema,

	[MessageType.NOTIFY_PLAYER_FRAME_START]  : Schemas.Map({
		...userIdMessageBaseSchema,
	}),
	[MessageType.NOTIFY_PLAYER_ROLL_START]   : Schemas.Map({
		...userIdMessageBaseSchema,
	}),
	[MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK]: Schemas.Map({
		...rollReplaySchema
	}),
	[MessageType.NOTIFY_PLAYER_ROLL_END]     : Schemas.Map({
		...userIdMessageBaseSchema,
	}),
	[MessageType.NOTIFY_PLAYER_FRAME_END]    : Schemas.Map({
		...userIdMessageBaseSchema,
	}),
	[MessageType.NOTIFY_GAME_END]          : notifyLaneStateSchema,
}

const CUSTOM_EVENT_WRAPPER_BYTES = 1

export function getMessagePayloadSizeBytes(eventType: keyof typeof Messages, data: unknown): number {
	const buffer = new ReadWriteByteBuffer()

	eventEnvelopeSchema.serialize({
		eventType : eventType,
		timestamp : Date.now()
	}, buffer)

	Messages[eventType].serialize(data as never, buffer)

	return buffer.toBinary().byteLength + CUSTOM_EVENT_WRAPPER_BYTES
}

// Export room
export const room = registerMessages(Messages)
