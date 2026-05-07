import { LaneStore } from "src/shared/laneStore"
import { getMessagePayloadSizeBytes, MessageType, room } from "src/shared/room"
import { NotifyPlayerRollPayload } from "src/shared/types/shared-types"


// MARK: notifyJoinGame
/**
 * Tells a single player they've been enrolled on a lane. The client uses this to
 * set its `ClientStore.laneIndex`; lane state itself comes from synced components,
 * so the payload only needs the lane index. `sentAt` is included so the client
 * can refresh its `clockSync` offset off this message.
 */
export function notifyJoinGame(
	userId    : string,
	laneIndex : number
): void {
	room.send(MessageType.NOTIFY_JOIN_GAME, { laneIndex, sentAt: Date.now() }, { to : [userId] })
}


// MARK: notifyPlayerRollStart
/**
 * Roll-start carries `pinStanding` and `rollStartTimestamp`, neither of which is
 * on a synced component, so this stays as a directed room message.
 */
export function notifyPlayerRollStart(
	laneIndex          : number,
	userId             : string,
	pinStanding        : boolean[],
	rollStartTimestamp : number
): void {
	const to = LaneStore.getLaneUserIds(laneIndex)
	room.send(
		MessageType.NOTIFY_PLAYER_ROLL_START,
		{ userId, pinStanding, rollStartTimestamp, sentAt: Date.now() },
		{ to: to }
	)
}


// MARK: notifyPlayerRollPlayback
/**
 * Roll-playback carries the keyframe arrays, which are far too large to put on a
 * synced component, so this stays as a directed room message.
 */
export function notifyPlayerRollPlayback(
	laneIndex : number,
	payload   : NotifyPlayerRollPayload
): void {
	const to               = LaneStore.getLaneUserIds(laneIndex)
	const payloadSizeBytes = getMessagePayloadSizeBytes(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, payload)
	const totalBytes       = payloadSizeBytes * to.length

	console.log(
		`serverMessaging: notifyPlayerRollPlayback: lane ${laneIndex}, recipients ${to.length}, payload ${payloadSizeBytes} bytes (${(payloadSizeBytes / 1024).toFixed(2)} KB), total ${totalBytes} bytes (${(totalBytes / 1024).toFixed(2)} KB)`
	)

	room.send(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, payload, { to: to })
}


// MARK: notifyServerTime
/** Broadcasts current server time to every connected client for `clockSync`. */
export function notifyServerTime(): void {
	room.send(MessageType.NOTIFY_SERVER_TIME, Date.now())
}
