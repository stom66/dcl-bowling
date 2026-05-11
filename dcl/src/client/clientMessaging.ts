import { Vector3 } from '@dcl/sdk/math'

import { MessageType, room } from 'src/shared/room'

import { ClientStore } from 'src/client/clientStore'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

export namespace ClientMessaging {
	const clientStore = ClientStore.getInstance()

	export function requestJoinLane(laneIndex: number): void {
		console.log('ClientMessaging: requestJoinLane: laneIndex', laneIndex)
		room.send(MessageType.REQUEST_JOIN_GAME, laneIndex)
	}

	export function requestPlayRoll(
		position : Vector3, 
		direction: Vector3, 
		power    : number, 
		spin     : number
	): void {
		console.log('ClientMessaging: requestPlayRoll: position', position, 'direction', direction, 'power', power)
		room.send(MessageType.REQUEST_PLAY_ROLL, { 
			position  : position, 
			direction : direction, 
			power     : power, 
			spin      : spin,
			frameIndex: clientStore.getCurrentFrameIndex() ?? 0, 
			rollIndex : clientStore.getCurrentRollIndex() ?? 0 
		})
	}

	export function requestLeaveGame(): void {
		console.log('ClientMessaging: requestLeaveGame')
		room.send(MessageType.REQUEST_LEAVE_GAME, {})
		eventBus.emit(ClientEvents.REQUEST_LEAVE_GAME, {})
	}
}
