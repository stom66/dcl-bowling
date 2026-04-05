import { MessageType, room } from 'src/shared/room'

export namespace ClientMessaging {
	export function requestJoinLane(laneIndex: number): void {
		console.log('ClientMessaging: requestJoinLane: laneIndex', laneIndex)
		room.send(MessageType.REQUEST_JOIN_GAME, laneIndex)
	}
}
