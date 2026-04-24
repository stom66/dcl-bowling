import { LaneStatus, PlayerStatus } from 'src/shared/enums';
import { MessageType, room } from 'src/shared/room';
import { NotifyLaneStatePayload, NotifyPlayerRollPayload } from 'src/shared/types';
import { clockSync } from 'src/shared/utils/clockSync';
import { eventBus } from 'src/shared/utils/eventBus';

import { ClientEvents } from 'src/client/clientEvents';
import { ClientStore } from 'src/client/clientStore';
import { gameStateHandler } from './gameStateHandler';


const clientStore = ClientStore.getInstance()


export namespace ClientHandler {
	export function init() {
		room.onMessage(MessageType.NOTIFY_JOIN_GAME, (data)            => { handleNotifyJoinGame(data) })
		room.onMessage(MessageType.NOTIFY_GAME_START, (data)           => { handleNotifyGameStart(data) })
		room.onMessage(MessageType.NOTIFY_GAME_END, (data)           => { handleNotifyGameEnd(data) })
		room.onMessage(MessageType.NOTIFY_LANE_STATE, (data)           => { handleNotifyLaneState(data) })

		room.onMessage(MessageType.NOTIFY_PLAYER_FRAME_START, (data)   => { handleNotifyPlayerFrameStart(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_ROLL_START, (data)    => { handleNotifyPlayerRollStart(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_ROLL_PLAYBACK, (data) => { handleNotifyPlayerRollPlayback(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_ROLL_END, (data)      => { handleNotifyPlayerRollEnd(data) })
		room.onMessage(MessageType.NOTIFY_PLAYER_FRAME_END, (data)     => { handleNotifyPlayerFrameEnd(data) })
		room.onMessage(MessageType.NOTIFY_SERVER_TIME, (data)          => { handleNotifyServerTime(data) })
	}


	// MARK: Join Game
	function handleNotifyJoinGame(data: NotifyLaneStatePayload) {
		console.log('ClientHandler: handleNotifyJoinGame: data', data)

		clockSync.updateOffset(data.sentAt)

		clientStore.setPlayerStatus(PlayerStatus.WAITING_FOR_GAME_START)
		clientStore.setLaneState(data)

		eventBus.emit(ClientEvents.ON_GAME_JOINED, clientStore.getLaneState())
	}

	// MARK: Game Start
	function handleNotifyGameStart(data: NotifyLaneStatePayload) {
		console.log('ClientHandler: handleNotifyGameStart: data', data)

		clockSync.updateOffset(data.sentAt)

		clientStore.setPlayerStatus(PlayerStatus.IN_GAME_WAITING)
		clientStore.setLaneState(data)

		eventBus.emit(ClientEvents.ON_GROUP_GAME_START, data)
	}
	

	// MARK: Game End
	function handleNotifyGameEnd(data: NotifyLaneStatePayload) {
		console.log('ClientHandler: handleNotifyGameEnd: data', data)

		clockSync.updateOffset(data.sentAt)
		eventBus.emit(ClientEvents.ON_GROUP_GAME_END, data)
	}


	// MARK: Lane State
	function handleNotifyLaneState(data: NotifyLaneStatePayload) {
		console.log('ClientHandler: handleNotifyState: state', data)

		clockSync.updateOffset(data.sentAt)
		clientStore.setLaneState(data)

		eventBus.emit(ClientEvents.NOTIFY_LANE_STATE, clientStore.getLaneState())
	}

	

	// MARK: Frame Start
	function handleNotifyPlayerFrameStart(data: { userId: string }) {
		console.log('ClientHandler: handleNotifyPlayerFrameStart: data', data)

		if (data.userId === clientStore.getUserId()) {
			clientStore.setPlayerStatus(PlayerStatus.IN_GAME_PLAYING)
			eventBus.emit(ClientEvents.ON_MY_FRAME_START, data)
		} else {
			eventBus.emit(ClientEvents.ON_GROUP_FRAME_START, data)
		}
	}

	// MARK: Roll Start
	function handleNotifyPlayerRollStart(data: { userId: string }) {
		if (data.userId === clientStore.getUserId()) {
			eventBus.emit(ClientEvents.ON_MY_ROLL_START, data)
		} else {
			eventBus.emit(ClientEvents.ON_GROUP_ROLL_START, data)
		}
	}

	// MARK: Roll Playback
	function handleNotifyPlayerRollPlayback(data: NotifyPlayerRollPayload) {
		console.log('ClientHandler: handleNotifyPlayerRollPlayback: data', data)
		eventBus.emit(ClientEvents.ON_GROUP_ROLL_PLAYBACK, data)
	}

	// MARK: Roll End
	function handleNotifyPlayerRollEnd(data: { userId: string }) {
		if (data.userId === clientStore.getUserId()) {
			eventBus.emit(ClientEvents.ON_MY_ROLL_END, data)
		} else {
			eventBus.emit(ClientEvents.ON_GROUP_ROLL_END, data)
		}
	}


	// MARK: Frame End
	function handleNotifyPlayerFrameEnd(data: { userId: string }) {
		console.log('ClientHandler: handleNotifyPlayerFrameEnd: data', data)

		if (data.userId === clientStore.getUserId()) {
			clientStore.setPlayerStatus(PlayerStatus.IN_GAME_WAITING)
			eventBus.emit(ClientEvents.ON_MY_FRAME_END, data)
		} else {
			eventBus.emit(ClientEvents.ON_GROUP_FRAME_END, data)
		}
	}



	// MARK: Server Time
	function handleNotifyServerTime(serverTime: number) {
		//console.log('ClientHandler: handleNotifyServerTime: serverTime', serverTime)
		clockSync.updateOffset(serverTime)
	}
}
