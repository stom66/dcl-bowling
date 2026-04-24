import { MessageType, room } from "src/shared/room"
import { NotifyPlayerRollPayload } from "src/shared/types"

export namespace RollPlayback {
	export function init() {
		room.onMessage(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, (data) => { handleNotifyPlayerRollPlayback(data) })
	}

	export function handleNotifyPlayerRollPlayback(data: NotifyPlayerRollPayload) {
		console.log('rollPlayback: handleNotifyPlayerRollPlayback: data', data)
	}
}