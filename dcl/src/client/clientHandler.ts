import { LaneStatus, PlayerStatus } from 'src/shared/enums';
import { MessageType, room } from 'src/shared/room';
import { NotifyLaneStatePayload, NotifyPlayerTurnPayload } from 'src/shared/types';
import { clockSync } from 'src/shared/utils/clockSync';
import { eventBus } from 'src/shared/utils/eventBus';

import { ClientEvents } from 'src/client/clientEvents';
import { ClientStore } from 'src/client/clientStore';
import { gameStateHandler } from './gameStateHandler';


const clientStore = ClientStore.getInstance()


export namespace ClientHandler {
	export function init() {
		room.onMessage(MessageType.NOTIFY_JOIN_GAME, (data)            => { handleNotifyJoinGame(data) })
		room.onMessage(MessageType.NOTIFY_LANE_STATE, (data)           => { handleNotifyLaneState(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_TURN_START, (data)    => { handleNotifyPlayerTurnStart(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_TURN_PLAYBACK, (data) => { handleNotifyPlayerTurnPlaybck(data) })
		room.onMessage(MessageType.NOTIFY_SERVER_TIME, (data)          => { handleNotifyServerTime(data) })
	}


	// MARK: Join Game
	function handleNotifyJoinGame(data: NotifyLaneStatePayload) {
		console.log('ClientHandler: handleNotifyJoinGame: data', data)

		clockSync.updateOffset(data.sentAt)

		clientStore.setPlayerStatus(PlayerStatus.WAITING)
		clientStore.setLaneState(data)

		eventBus.emit(ClientEvents.NOTIFY_JOIN_GAME, clientStore.getLaneState())
	}
	

	// MARK: State
	function handleNotifyLaneState(data: NotifyLaneStatePayload) {
		console.log('ClientHandler: handleNotifyState: state', data)

		clockSync.updateOffset(data.sentAt)
		clientStore.setLaneState(data)

		eventBus.emit(ClientEvents.NOTIFY_LANE_STATE, clientStore.getLaneState())
	}


	function handleNotifyPlayerTurnStart(data: { userId: string }) {
		console.log('ClientHandler: handleNotifyPlayerTurnStart: data', data)

		eventBus.emit(ClientEvents.NOTIFY_PLAYER_TURN_START, data)
	}


	// MARK: Player Turn
	function handleNotifyPlayerTurnPlaybck(data: NotifyPlayerTurnPayload) {
		console.log('ClientHandler: handleNotifyPlayerTurnPlaybck: data', data)

		eventBus.emit(ClientEvents.NOTIFY_PLAYER_TURN_PLAYBACK, data)
	}


	// MARK: Server Time
	function handleNotifyServerTime(serverTime: number) {
		//console.log('ClientHandler: handleNotifyServerTime: serverTime', serverTime)
		clockSync.updateOffset(serverTime)
	}
}
