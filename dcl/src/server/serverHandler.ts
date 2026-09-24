import * as utils from "@dcl-sdk/utils"

import { MessageType, room } from 'src/shared/room'
import { canUsePlaytestDebug, GameSettings } from 'src/shared/settings'
import { RequestCatalogItemPayload, RequestJoinGamePayload, RequestPlayRollPayload, RequestSetLaneBumpersPayload, RequestSetPreferencesPayload, RequestTicketPayload } from 'src/shared/types/shared-types'

import { gameManager } from 'src/server/gameManager'
import { PlayerProfileManager } from 'src/server/playerProfileManager'
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
		room.onMessage(MessageType.REQUEST_LEAVE_GAME, (data, context) => handleRequestLeaveGame(data, context))
		room.onMessage(MessageType.REQUEST_UNLOCK_ITEM, (data, context) => handleRequestUnlockItem(data, context))
		room.onMessage(MessageType.REQUEST_RESET_UNLOCKS, (_data, context) => handleRequestResetUnlocks(context))
		room.onMessage(MessageType.REQUEST_EQUIP_ITEM, (data, context) => handleRequestEquipItem(data, context))
		room.onMessage(MessageType.REQUEST_TICKET, (data, context) => handleRequestTicket(data, context))
		room.onMessage(MessageType.REQUEST_SET_PREFERENCES, (data, context) => handleRequestSetPreferences(data, context))
		room.onMessage(MessageType.REQUEST_SET_LANE_BUMPERS, (data, context) => handleRequestSetLaneBumpers(data, context))
	}

	
	
	// MARK: JoinGame
	export async function handleRequestJoinGame(data: RequestJoinGamePayload | undefined, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestJoinGame: userId', userId, 'data', data)

		if (data === undefined) {
			await gameManager.onPlayerRequestJoin(userId, undefined, undefined)
			return
		}

		const laneIndex = data.laneIndex
		if (!Number.isInteger(laneIndex) || laneIndex < 1 || laneIndex > GameSettings.MAX_LANES) {
			console.log('serverHandler: handleRequestJoinGame: invalid lane (expected 1..' + GameSettings.MAX_LANES + ')', laneIndex)
			return
		}

		await gameManager.onPlayerRequestJoin(userId, laneIndex - 1, data.frameCount)
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

	// MARK: Leave Game
	export async function handleRequestLeaveGame(data: any, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestLeaveGame: userId', userId)

		await gameManager.onPlayerRequestLeaveGame(userId)
	}


	// MARK: Unlock Item
	export function handleRequestUnlockItem(data: RequestCatalogItemPayload, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestUnlockItem: userId', userId, 'itemId', data?.itemId)
		if (!data?.itemId) return
		PlayerProfileManager.requestUnlockItem(userId, data.itemId)
	}


	// MARK: Reset Unlocks
	/**
	 * Relocks the sender's items when they are an admin or the playtest panel is on.
	 */
	export function handleRequestResetUnlocks(context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestResetUnlocks: userId', userId)
		if (!canUsePlaytestDebug(userId)) {
			console.log('serverHandler: handleRequestResetUnlocks: playtest debug disabled and not an admin', userId)
			return
		}
		PlayerProfileManager.requestResetUnlocks(userId)
	}


	// MARK: Equip Item
	export function handleRequestEquipItem(data: RequestCatalogItemPayload, context: any) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestEquipItem: userId', userId, 'itemId', data?.itemId)
		if (!data?.itemId) return
		PlayerProfileManager.requestEquipItem(userId, data.itemId)
	}


	// MARK: Add Tickets
	export function handleRequestTicket(
		data    : RequestTicketPayload,
		context : any
	) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestTicket: userId', userId, 'amount', data?.amount)
		if (!canUsePlaytestDebug(userId)) {
			console.log('serverHandler: handleRequestTicket: playtest debug disabled and not an admin', userId)
			return
		}
		if (typeof data?.amount !== 'number') return
		PlayerProfileManager.requestAddTickets(userId, data.amount)
	}


	// MARK: Set Preferences
	export function handleRequestSetPreferences(
		data    : RequestSetPreferencesPayload,
		context : any
	) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestSetPreferences: userId', userId, 'bgmMuted', data?.bgmMuted, 'bumpersEnabled', data?.bumpersEnabled)

		const next: Partial<RequestSetPreferencesPayload> = {}
		if (typeof data?.bgmMuted === 'boolean')       next.bgmMuted       = data.bgmMuted
		if (typeof data?.bumpersEnabled === 'boolean') next.bumpersEnabled = data.bumpersEnabled
		if (next.bgmMuted === undefined && next.bumpersEnabled === undefined) return

		PlayerProfileManager.requestSetPreferences(userId, next)
	}


	// MARK: Set Lane Bumpers
	export function handleRequestSetLaneBumpers(
		data    : RequestSetLaneBumpersPayload,
		context : any
	) {
		const userId = getUserId(context)
		console.log('serverHandler: handleRequestSetLaneBumpers: userId', userId, 'enabled', data?.enabled)
		if (typeof data?.enabled !== 'boolean') return
		gameManager.onPlayerRequestSetLaneBumpers(userId, data.enabled)
	}
}
