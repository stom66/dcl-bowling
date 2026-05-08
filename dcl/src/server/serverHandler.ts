import * as utils from "@dcl-sdk/utils"
import { MessageType, room } from 'src/shared/room'
import { GameSettings } from 'src/shared/settings'
import { RequestPlayRollPayload } from 'src/shared/types/shared-types'

import { gameManager } from 'src/server/gameManager'
import { notifyPlayerRollRequestReceived } from './serverMessaging'


export namespace serverHandler {

	// MARK: Utility function
	function getUserId(context: any): string {
		return typeof context?.from === 'string' ? context.from : 'unknown'
	}


	// MARK: Init
	export function init() {
		room.onMessage(MessageType.REQUEST_JOIN_GAME, (data, context) => handleRequestJoinGame(data, context))
		room.onMessage(MessageType.REQUEST_PLAY_ROLL, (data, context) => handleRequestPlayRoll(data, context))
	}

	
	
	// MARK: JoinGame
	export async function handleRequestJoinGame(data: number | undefined, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestJoinGame: userId', userId, 'requestLaneIndex', data)

		if (data === undefined) {
			await gameManager.onPlayerRequestJoin(userId, undefined)
			return
		}

		if (!Number.isInteger(data) || data < 1 || data > GameSettings.MAX_LANES) {
			console.log('serverHandler: handleRequestJoinGame: invalid lane (expected 1..' + GameSettings.MAX_LANES + ')', data)
			return
		}

		await gameManager.onPlayerRequestJoin(userId, data - 1)
	}
	

	// MARK: Play Roll
	export async function handleRequestPlayRoll(data: RequestPlayRollPayload, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestPlayRoll: userId', userId)

		// Notify every client before sim + playback so countdown / UX can start before results arrive.
		notifyPlayerRollRequestReceived(userId, Date.now())

		utils.timers.setTimeout(() => {
			gameManager.onPlayerRequestPlayRoll(userId, data)
		}, 0)
	}
}
