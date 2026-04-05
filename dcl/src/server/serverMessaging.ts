import { MessageType, room } from "src/shared/room"
import { NotifyLaneStatePayload, ServerState } from "src/shared/types"

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


export function notifyServerTime() {
	room.send(MessageType.NOTIFY_SERVER_TIME, Date.now())
}