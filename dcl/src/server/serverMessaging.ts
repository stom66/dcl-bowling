import { MessageType, room } from "src/shared/room"
import { NotifyLaneStatePayload, NotifyPlayerTurnPayload } from "src/shared/types"

import { ServerStore } from "src/server/serverStore"


export function notifyLaneStateUpdate(laneIndex: number) {
	const serverStore = ServerStore.getInstance()
	const laneStatePayload = serverStore.getLaneStatePayload(laneIndex)
	const to = serverStore.getLaneUserIds(laneIndex)
	room.send(MessageType.NOTIFY_LANE_STATE, laneStatePayload, { to : to })
}

export function notifyJoinGame(userId: string, laneIndex: number) {
	const serverStore = ServerStore.getInstance()
	const laneStatePayload = serverStore.getLaneStatePayload(laneIndex)
	room.send(MessageType.NOTIFY_JOIN_GAME, laneStatePayload, { to : [userId] })
}

export function notifyPlayerTurnStart(laneIndex: number, userId: string) {
	const serverStore = ServerStore.getInstance()
	room.send(MessageType.NOTIFY_PLAYER_TURN_START, { userId }, { to : serverStore.getLaneUserIds(laneIndex) })
}

export function notifyPlayerTurnPlayback(laneIndex: number, payload: NotifyPlayerTurnPayload) {
	const serverStore = ServerStore.getInstance()
	const to = serverStore.getLaneUserIds(laneIndex)
	room.send(MessageType.NOTIFY_PLAYER_TURN_PLAYBACK, payload, { to })
}


export function notifyServerTime() {
	room.send(MessageType.NOTIFY_SERVER_TIME, Date.now())
}