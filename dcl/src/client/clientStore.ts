import { Color3 } from '@dcl/sdk/math'

import { LaneStatus, PlayerStatus } from 'src/shared/enums'
import { LaneState, NotifyLaneStatePayload } from 'src/shared/types'
import { eventBus } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { clockSync } from 'src/shared/utils/clockSync'
import { ClientEvents } from 'src/client/clientEvents'

// MARK: Type
export type ClientState = {
	userId        : string
	displayName   : string
	laneState     : LaneState | undefined
	playerStatus  : PlayerStatus
}

// MARK: ClientStore
export class ClientStore {
	private static instance: ClientStore | undefined

	private clientState: ClientState = {
		userId           : "",
		displayName      : "",
		laneState        : undefined,
		playerStatus     : PlayerStatus.IDLE,
	}
	
	private constructor() {
		console.log('ClientStore: constructor')
	}


	// MARK: Init
	async init(): Promise<void> {
		console.log('ClientStore: init')
		const data = await userProfileCache.getUserProfile()
		if (!data) {
			console.error('ClientStore: fetchUserProfile: no data')
			return
		}
		const record = data.avatars?.[0]
		if (!record || !record.name || !record.userId) {
			console.error('ClientStore: fetchUserProfile: no record/name/userId')
			return
		}
		this.clientState.userId = record.userId
		this.clientState.displayName = record.name

		console.log('ClientStore: fetchUserProfile: success. userId:', this.clientState.userId, 'displayName:', this.clientState.displayName)
	}


	// MARK: Instance
	static getInstance(): ClientStore {
		if (!ClientStore.instance) ClientStore.instance = new ClientStore()
		return ClientStore.instance
	}
		
	// MARK: User data
	getUserId(): string {
		return this.clientState.userId
	}
	getDisplayName(): string {
		return this.clientState.displayName
	}



	// MARK: LaneState
	setLaneState(data: NotifyLaneStatePayload): void {
		this.clientState.laneState = {
			//groupId             : data.groupId,
			currentRound        : data.currentRound,
			currentTurnStartTime: data.currentTurnStartTime,
			currentTurnUserId   : data.currentTurnUserId,
			gameStartTime       : data.gameStartTime,
			laneIndex           : data.laneIndex,
			laneStatus          : data.laneStatus as LaneStatus,
			players             : new Map<string, string>(data.players.map(player => [player.userId, player.displayName])),
			frames              : new Map<string, number[][]>(data.frames.map(frame => [frame.userId, frame.frames])),
		}
	}
		getLaneState(): LaneState | undefined {
			return this.clientState.laneState
		}


	getGameStartTime(): number {
		return this.clientState.laneState?.gameStartTime ?? 0
	}



	// MARK: PlayerStatus
	setPlayerStatus(status: PlayerStatus): void {
		this.clientState.playerStatus = status
	}
		getPlayerStatus(): PlayerStatus {
			return this.clientState.playerStatus
		}
/* 		isPlayerInGame(): boolean {
			return this.clientState.playerStatus === PlayerStatus.IN_GAME_PLAYING || this.clientState.playerStatus === PlayerStatus.IN_GAME_WAITING
		}
		isPlayerWaiting(): boolean {
			return this.clientState.playerStatus === PlayerStatus.WAITING_FOR_GAME_START
		}
		isPlayerIdle(): boolean {
			return this.clientState.playerStatus === PlayerStatus.IDLE
		} */

}
