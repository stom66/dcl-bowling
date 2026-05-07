import { MessageType, room } from 'src/shared/room'
import { NotifyJoinGamePayload, NotifyPlayerRollPayload, NotifyPlayerRollStartPayload } from 'src/shared/types/shared-types'
import { clockSync } from 'src/shared/utils/clockSync'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientStore } from 'src/client/clientStore'


const clientStore = ClientStore.getInstance()


export namespace ClientHandler {

	// MARK: init
	export function init() {
		room.onMessage(MessageType.NOTIFY_JOIN_GAME,            (data) => { handleNotifyJoinGame(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_ROLL_START,    (data) => { handleNotifyPlayerRollStart(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, (data) => { handleNotifyPlayerRollReceived(data) })
		room.onMessage(MessageType.NOTIFY_SERVER_TIME,          (data) => { handleNotifyServerTime(data) })
	}


	// MARK: handleNotifyJoinGame
	/**
	 * Sets the local player's lane index. `MyLane.onMyLaneIndexChanged` then re-binds
	 * to the new lane and emits `ON_GAME_JOINED` + `NOTIFY_LANE_STATE` with the
	 * current snapshot, so consumers don't need to react to this message directly.
	 * Also refreshes `clockSync` off the embedded `sentAt` — every state-bearing
	 * server message piggybacks a clock-sync sample to keep the offset fresh
	 * between dedicated `NOTIFY_SERVER_TIME` heartbeats.
	 */
	function handleNotifyJoinGame(data: NotifyJoinGamePayload) {
		console.log('ClientHandler: handleNotifyJoinGame: data', data)
		clockSync.updateOffset(data.sentAt)
		clientStore.setLaneIndex(data.laneIndex)
	}


	// MARK: handleNotifyPlayerRollStart
	/** Roll start carries `pinStanding` + `rollStartTimestamp`, neither on a synced component. */
	function handleNotifyPlayerRollStart(data: NotifyPlayerRollStartPayload) {
		clockSync.updateOffset(data.sentAt)
		if (data.userId === clientStore.getUserId()) {
			eventBus.emit(ClientEvents.ON_MY_ROLL_START, data)
		} else {
			eventBus.emit(ClientEvents.ON_GROUP_ROLL_START, data)
		}
	}


	// MARK: handleNotifyPlayerRollReceived
	/** Roll playback carries the keyframe payload that's far too big for a synced component. */
	function handleNotifyPlayerRollReceived(data: NotifyPlayerRollPayload) {
		console.log('ClientHandler: handleNotifyPlayerRollReceived: data', data)
		clockSync.updateOffset(data.sentAt)
		eventBus.emit(ClientEvents.ON_GROUP_ROLL_PLAYBACK_RECEIVED, data)
	}


	// MARK: handleNotifyServerTime
	function handleNotifyServerTime(serverTime: number) {
		clockSync.updateOffset(serverTime)
	}
}
