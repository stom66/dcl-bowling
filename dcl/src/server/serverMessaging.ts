import { MessageType, room } from "src/shared/room"
import { NotifyPlayerRollPayload } from "src/shared/types"

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

export function notifyGameStart(laneIndex: number) {
	const serverStore = ServerStore.getInstance()
	const laneStatePayload = serverStore.getLaneStatePayload(laneIndex)
	room.send(MessageType.NOTIFY_GAME_START, laneStatePayload, { to : serverStore.getLaneUserIds(laneIndex) })
}

export function notifyPlayerFrameStart(laneIndex: number, userId: string) {
	const serverStore = ServerStore.getInstance()
	room.send(MessageType.NOTIFY_PLAYER_FRAME_START, { userId, sentAt: Date.now() }, { to : serverStore.getLaneUserIds(laneIndex) })
}

export function notifyPlayerRollStart(laneIndex: number, userId: string) {
	const serverStore = ServerStore.getInstance()
	room.send(MessageType.NOTIFY_PLAYER_ROLL_START, { userId, sentAt: Date.now() }, { to : serverStore.getLaneUserIds(laneIndex) })
}

export function notifyPlayerRollPlayback(laneIndex: number, payload: NotifyPlayerRollPayload) {
	const serverStore = ServerStore.getInstance()
	const to = serverStore.getLaneUserIds(laneIndex)
	room.send(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, payload, { to: to })
}

export function notifyPlayerRollEnd(laneIndex: number, userId: string) {
	const serverStore = ServerStore.getInstance()
	room.send(MessageType.NOTIFY_PLAYER_ROLL_END, { userId, sentAt: Date.now() }, { to : serverStore.getLaneUserIds(laneIndex) })
}

export function notifyPlayerFrameEnd(laneIndex: number, userId: string) {
	const serverStore = ServerStore.getInstance()
	room.send(MessageType.NOTIFY_PLAYER_FRAME_END, { userId, sentAt: Date.now() }, { to : serverStore.getLaneUserIds(laneIndex) })
}

export function notifyGameEnd(laneIndex: number) {
	const serverStore = ServerStore.getInstance()
	const laneStatePayload = serverStore.getLaneStatePayload(laneIndex)
	room.send(MessageType.NOTIFY_GAME_END, laneStatePayload, { to : serverStore.getLaneUserIds(laneIndex) })
}


export function notifyServerTime() {
	room.send(MessageType.NOTIFY_SERVER_TIME, Date.now())
}
