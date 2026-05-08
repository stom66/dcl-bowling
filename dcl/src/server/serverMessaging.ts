import { LaneStore } from "src/shared/laneStore"
import { getMessagePayloadSizeBytes, MessageType, room } from "src/shared/room"
import { GameSettings } from "src/shared/settings"
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
 *
 * When {@link GameSettings.SHOW_NON_GROUP_ROLL_VISUALS} is on, broadcasts to every
 * client so lane meshes can be spawned for games you're not enrolled in (same scope
 * as {@link notifyPlayerRollPlayback}); otherwise only players on that lane receive it.
 */
export function notifyPlayerRollStart(
	laneIndex          : number,
	userId             : string,
	pinStanding        : boolean[],
	rollStartTimestamp : number
): void {
	const payload = {
		userId,
		pinStanding,
		rollStartTimestamp,
		sentAt: Date.now(),
	}

	if (GameSettings.SHOW_NON_GROUP_ROLL_VISUALS) {
		room.send(MessageType.NOTIFY_PLAYER_ROLL_START, payload, { to: undefined })
		return
	}

	const to = LaneStore.getLaneUserIds(laneIndex)
	room.send(MessageType.NOTIFY_PLAYER_ROLL_START, payload, { to: to })
}


// MARK: notifyPlayerRollRequestReceived
/**
 * Tells all players that a player has sent in a roll request
 */
export function notifyPlayerRollRequestReceived(
	userId    : string,
	sentAt    : number
): void {
	room.send(MessageType.NOTIFY_PLAYER_ROLL_REQUEST_RECEIVED, { userId, sentAt }, { to : undefined })
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
	const to               = GameSettings.SHOW_NON_GROUP_ROLL_VISUALS ? undefined: LaneStore.getLaneUserIds(laneIndex)
	const payloadSizeBytes = getMessagePayloadSizeBytes(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, payload)
	const totalBytes       = payloadSizeBytes * (to?.length ?? 0)
	console.log(
		`serverMessaging: notifyPlayerRollPlayback: lane ${laneIndex}, recipients ${to?.length ?? 0 > 0 ? to?.length ?? 0 : 'all'}, payload ${payloadSizeBytes} bytes (${(payloadSizeBytes / 1024).toFixed(2)} KB), total ${totalBytes} bytes (${(totalBytes / 1024).toFixed(2)} KB)`
	)
	
	room.send(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, payload, { to: to ? to : undefined })
}


// MARK: notifyServerTime
/** Broadcasts current server time to every connected client for `clockSync`. */
export function notifyServerTime(): void {
	room.send(MessageType.NOTIFY_SERVER_TIME, Date.now())
}
