import { registerMessages } from '@dcl/sdk/network'
import { Schemas } from '@dcl/sdk/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'

// MARK: MessageType enum
/**
 * State-bearing messages have been dropped: NOTIFY_LANE_STATE, NOTIFY_GAME_START,
 * NOTIFY_GAME_END, NOTIFY_PLAYER_FRAME_START, NOTIFY_PLAYER_FRAME_END, and
 * NOTIFY_PLAYER_ROLL_END. Their data lives on synced lane components and the
 * client's `MyLane` module derives the equivalent eventBus events from phase
 * transitions on those components.
 */
export enum MessageType {
	REQUEST_JOIN_GAME           = 'requestJoinGame',
	REQUEST_PLAY_ROLL           = 'requestPlayRoll',

	NOTIFY_SERVER_TIME          = 'notifyServerTime',

	NOTIFY_JOIN_GAME            = 'notifyJoinGame',
	NOTIFY_PLAYER_ROLL_START    = 'notifyPlayerRollStart',
	NOTIFY_PLAYER_ROLL_PLAYBACK = 'notifyPlayerRollPlayback',
	NOTIFY_PLAYER_ROLL_REQUEST_RECEIVED = 'notifyPlayerRollRequestReceived',
}

// MARK: Message schemas
const notifyJoinGameSchema = Schemas.Map({
	laneIndex: Schemas.Int,
	sentAt   : Schemas.Int64,
})

const rollRequestSchema = {
	direction : Schemas.Vector3,
	frameIndex: Schemas.Number,
	position  : Schemas.Vector3,
	power     : Schemas.Number,
	spin      : Schemas.Number,
	rollIndex : Schemas.Number,
}

const notifyRollRequestReceivedSchema = {
	userId: Schemas.String,
	sentAt: Schemas.Int64,
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
			rotation: Schemas.Optional(Schemas.Vector3)
		}))
	}),
	duration       : Schemas.Number,
	gutterBall     : Schemas.Boolean,
	pinsKeyframes    : Schemas.Array(Schemas.Map({
		index    : Schemas.Int,
		keyframes: Schemas.Array(Schemas.Map({
			time    : Schemas.Number,
			position: Schemas.Optional(Schemas.Vector3),
			rotation: Schemas.Optional(Schemas.Vector3)
		}))
	})),
	sfxBallHitPinTimestamps: Schemas.Array(Schemas.Number),
	sfxPinHitPinTimestamps : Schemas.Array(Schemas.Number),
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

	[MessageType.NOTIFY_JOIN_GAME]           : notifyJoinGameSchema,

	[MessageType.NOTIFY_PLAYER_ROLL_START]   : Schemas.Map({
		...userIdMessageBaseSchema,
		pinStanding: Schemas.Array(Schemas.Boolean),
		rollStartTimestamp: Schemas.Int64,
	}),
	[MessageType.NOTIFY_PLAYER_ROLL_REQUEST_RECEIVED]   : Schemas.Map({
		...notifyRollRequestReceivedSchema
	}),
	[MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK]: Schemas.Map({
		...rollReplaySchema
	}),
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
