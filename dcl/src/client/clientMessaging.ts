import { Vector3 } from '@dcl/sdk/math'

import { MessageType, room } from 'src/shared/room'
import { GameSettings } from 'src/shared/settings'
import { RequestSetPreferencesPayload } from 'src/shared/types/shared-types'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientStore } from 'src/client/clientStore'

export namespace ClientMessaging {
	const clientStore = ClientStore.getInstance()


	// MARK: requestJoinLane
	/**
	 * Asks the server to join a 1-based lane. `frameCount` is used only when opening an idle lane.
	 */
	export function requestJoinLane(
		laneIndex : number,
		frameCount: number = GameSettings.DEFAULT_FRAME_COUNT,
	): void {
		console.log('ClientMessaging: requestJoinLane: laneIndex', laneIndex, 'frameCount', frameCount)
		room.send(MessageType.REQUEST_JOIN_GAME, {
			laneIndex : laneIndex,
			frameCount: frameCount,
		})
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
		room.send(MessageType.REQUEST_PLAY_ROLL, { 
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
	 * Asks the server to remove this player from their current lane.
	 */
	export function requestLeaveGame(): void {
		console.log('ClientMessaging: requestLeaveGame')
		room.send(MessageType.REQUEST_LEAVE_GAME, {})
		eventBus.emit(ClientEvents.REQUEST_LEAVE_GAME, {})
	}


	// MARK: requestUnlockItem
	/**
	 * Asks the server to spend tickets unlocking `itemId`.
	 */
	export function requestUnlockItem(itemId: string): void {
		console.log('ClientMessaging: requestUnlockItem: itemId', itemId)
		room.send(MessageType.REQUEST_UNLOCK_ITEM, { itemId })
	}


	// MARK: requestEquipItem
	/**
	 * Asks the server to equip an owned catalog item.
	 */
	export function requestEquipItem(itemId: string): void {
		console.log('ClientMessaging: requestEquipItem: itemId', itemId)
		room.send(MessageType.REQUEST_EQUIP_ITEM, { itemId })
	}


	// MARK: requestResetUnlocks
	/**
	 * Asks the server to relock purchased items and restore the default loadout.
	 */
	export function requestResetUnlocks(): void {
		console.log('ClientMessaging: requestResetUnlocks')
		room.send(MessageType.REQUEST_RESET_UNLOCKS, {})
	}


	// MARK: requestTicket
	/**
	 * Asks the server to add tickets to this player.
	 * Granted for admins, and for any player while the playtest panel is enabled.
	 */
	export function requestTicket(amount: number): void {
		console.log('ClientMessaging: requestTicket: amount', amount)
		room.send(MessageType.REQUEST_TICKET, { amount })
	}


	// MARK: requestSetPreferences
	/**
	 * Asks the server to persist player preferences such as background-music mute.
	 */
	export function requestSetPreferences(preferences: RequestSetPreferencesPayload): void {
		console.log('ClientMessaging: requestSetPreferences: bgmMuted', preferences.bgmMuted, 'bumpersEnabled', preferences.bumpersEnabled)
		room.send(MessageType.REQUEST_SET_PREFERENCES, preferences)
	}


	// MARK: requestSetLaneBumpers
	/**
	 * Asks the server to raise or lower gutter bumpers on the local player's lane.
	 */
	export function requestSetLaneBumpers(enabled: boolean): void {
		console.log('ClientMessaging: requestSetLaneBumpers: enabled', enabled)
		room.send(MessageType.REQUEST_SET_LANE_BUMPERS, { enabled })
	}
}
