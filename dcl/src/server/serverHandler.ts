import { MessageType, room } from 'src/shared/room'
import { GameSettings } from 'src/shared/settings'
import { Outfit, RequestPlayTurnPayload } from 'src/shared/types'

import { gameManager } from 'src/server/gameManager'
import { notifyLaneStateUpdate } from 'src/server/serverMessaging'
import { ServerStore } from 'src/server/serverStore'


export namespace serverHandler {

	// MARK: Vars
	const store = ServerStore.getInstance()


	// MARK: Utility function
	function getUserId(context: any): string {
		return typeof context?.from === 'string' ? context.from : 'unknown'
	}


	// MARK: Init
	export function init() {
		room.onMessage(MessageType.REQUEST_JOIN_GAME, (data, context) => handleRequestJoinGame(data, context))
		room.onMessage(MessageType.REQUEST_PLAY_TURN, (data, context) => handleRequestPlayTurn(data, context))
	}

	
	
	// MARK: JoinGame
	export async function handleRequestJoinGame(data: number | undefined, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestJoinGame: userId', userId, 'requestLaneIndex', data)

		if (data === undefined) {
			gameManager.onPlayerRequestJoin(userId, undefined)
			return
		}

		if (!Number.isInteger(data) || data < 1 || data > GameSettings.MAX_LANES) {
			console.log('serverHandler: handleRequestJoinGame: invalid lane (expected 1..' + GameSettings.MAX_LANES + ')', data)
			return
		}

		gameManager.onPlayerRequestJoin(userId, data - 1)
	}
	

	// MARK: Play Turn
	export async function handleRequestPlayTurn(data: RequestPlayTurnPayload, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestPlayTurn: userId', userId)
		gameManager.onPlayerRequestPlayTurn(data)
	}
}
