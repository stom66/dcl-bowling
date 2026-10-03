import { Vector3 } from '@dcl/sdk/math'

import { MessageType, net } from 'src/shared/net'
import { RequestSetPreferencesPayload } from 'src/shared/types/shared-types'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientStore } from 'src/client/clientStore'

export namespace ClientMessaging {
	const clientStore = ClientStore.getInstance()


	// MARK: requestJoinLobby
	/**
	 * Asks the server to join a 1-based lane lobby.
	 */
	export function requestJoinLobby(laneIndex: number): void {
		console.log('ClientMessaging: requestJoinLobby: laneIndex', laneIndex)
		net.send(MessageType.REQUEST_JOIN_LOBBY, {
			laneIndex: laneIndex,
		})
	}


	// MARK: requestSetLaneFrameCount
	/**
	 * Asks the server to set the lobby-chosen frame count for the local player's lane.
	 */
	export function requestSetLaneFrameCount(frameCount: number): void {
		console.log('ClientMessaging: requestSetLaneFrameCount: frameCount', frameCount)
		net.send(MessageType.REQUEST_SET_LANE_FRAME_COUNT, {
			frameCount: frameCount,
		})
	}


	// MARK: requestStartCountdown
	/**
	 * Asks the server to start the pre-game countdown for the local player's lobby.
	 */
	export function requestStartCountdown(): void {
		console.log('ClientMessaging: requestStartCountdown')
		net.send(MessageType.REQUEST_START_COUNTDOWN, {})
	}


	// MARK: requestCancelCountdown
	/**
	 * Asks the server to cancel the pre-game countdown for the local player's lobby.
	 */
	export function requestCancelCountdown(): void {
		console.log('ClientMessaging: requestCancelCountdown')
		net.send(MessageType.REQUEST_CANCEL_COUNTDOWN, {})
	}


	// MARK: requestPlayRoll
	/**
	 * Sends the current roll snapshot to the server.
	 */
	export function requestPlayRoll(
		position : Vector3, 
		direction: Vector3, 
		power    : number, 
		spin     : number
	): void {
		console.log('ClientMessaging: requestPlayRoll: position', position, 'direction', direction, 'power', power)
		net.send(MessageType.REQUEST_PLAY_ROLL, { 
			position  : position, 
			direction : direction, 
			power     : power, 
			spin      : spin,
			frameIndex: clientStore.getCurrentFrameIndex() ?? 0, 
			rollIndex : clientStore.getCurrentRollIndex() ?? 0 
		})
	}



	// MARK: requestLeaveGame
	/**
	 * Asks the server to remove this player from their current lane and relocates them.
	 */
	export function requestLeaveGame(): void {
		console.log('ClientMessaging: requestLeaveGame')
		net.send(MessageType.REQUEST_LEAVE_GAME, {})
		eventBus.emit(ClientEvents.REQUEST_LEAVE_GAME, {})
		clientStore.setLaneIndex(undefined)
	}


	// MARK: requestLeaveLobby
	/**
	 * Leaves the current lobby without relocating the player (used on zone exit).
	 */
	export function requestLeaveLobby(): void {
		console.log('ClientMessaging: requestLeaveLobby')
		net.send(MessageType.REQUEST_LEAVE_GAME, {})
		clientStore.setLaneIndex(undefined)
	}


	// MARK: requestUnlockItem
	/**
	 * Asks the server to spend tickets unlocking `itemId`.
	 */
	export function requestUnlockItem(itemId: string): void {
		console.log('ClientMessaging: requestUnlockItem: itemId', itemId)
		net.send(MessageType.REQUEST_UNLOCK_ITEM, { itemId })
	}


	// MARK: requestEquipItem
	/**
	 * Asks the server to equip an owned catalog item.
	 */
	export function requestEquipItem(itemId: string): void {
		console.log('ClientMessaging: requestEquipItem: itemId', itemId)
		net.send(MessageType.REQUEST_EQUIP_ITEM, { itemId })
	}


	// MARK: requestResetUnlocks
	/**
	 * Asks the server to relock purchased items and restore the default loadout.
	 */
	export function requestResetUnlocks(): void {
		console.log('ClientMessaging: requestResetUnlocks')
		net.send(MessageType.REQUEST_RESET_UNLOCKS, {})
	}


	// MARK: requestTicket
	/**
	 * Asks the server to add or remove tickets for this player.
	 * A negative `amount` subtracts, and the balance cannot fall below zero.
	 * Granted for admins, and for any player while the playtest panel is enabled.
	 */
	export function requestTicket(amount: number): void {
		console.log('ClientMessaging: requestTicket: amount', amount)
		net.send(MessageType.REQUEST_TICKET, { amount })
	}


	// MARK: requestSetPreferences
	/**
	 * Asks the server to persist player preferences such as background-music mute.
	 */
	export function requestSetPreferences(preferences: RequestSetPreferencesPayload): void {
		console.log('ClientMessaging: requestSetPreferences: bgmMuted', preferences.bgmMuted, 'bumpersEnabled', preferences.bumpersEnabled)
		net.send(MessageType.REQUEST_SET_PREFERENCES, preferences)
	}


	// MARK: requestSetLaneBumpers
	/**
	 * Asks the server to raise or lower gutter bumpers on the local player's lane.
	 */
	export function requestSetLaneBumpers(enabled: boolean): void {
		console.log('ClientMessaging: requestSetLaneBumpers: enabled', enabled)
		net.send(MessageType.REQUEST_SET_LANE_BUMPERS, { enabled })
	}
}
