import { Color3 } from '@dcl/sdk/math'

import { LanePhase, LaneStatus, PlayerStatus } from 'src/shared/enums'
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
		this.setUserId(record.userId)
		this.setDisplayName(record.name)

		console.log('ClientStore: fetchUserProfile: success. userId:', this.getUserId(), 'displayName:', this.getDisplayName())
	}


	// MARK: Instance
	static getInstance(): ClientStore {
		if (!ClientStore.instance) ClientStore.instance = new ClientStore()
		return ClientStore.instance
	}


	// MARK: ClientState

	setUserId(value: string) {
		this.clientState.userId = value
	}
		getUserId(): string {
			return this.clientState.userId
		}

	setDisplayName(value: string) {
		this.clientState.displayName = value
	}
		getDisplayName(): string {
			return this.clientState.displayName
		}

	setLaneState(data: NotifyLaneStatePayload): void {
		this.clientState.laneState = {
			currentFrameIndex      : data.currentFrameIndex ?? 0,
			currentFramePlayerIndex: data.currentFramePlayerIndex ?? 0,
			currentFrameUserId     : data.currentFrameUserId,
			currentRollIndex       : data.currentRollIndex ?? 0,
			currentRollStartTime   : data.currentRollStartTime,
			gameStartTime          : data.gameStartTime,
			laneIndex              : data.laneIndex,
			laneStatus             : data.laneStatus as LaneStatus,
			phase                  : data.phase as LanePhase,
			players                : new Map<string, string>(data.players.map(p => [p.userId, p.displayName])),
			frames                 : new Map<string, number[][]>(data.frames.map(f => [f.userId, f.frames])),
		}
	}
		getLaneState(): LaneState | undefined {
			return this.clientState.laneState
		}

	getLanePhase(): LanePhase {
		return this.clientState.laneState?.phase ?? LanePhase.NONE
	}

	setPlayerStatus(status: PlayerStatus): void {
		this.clientState.playerStatus = status
	}
		getPlayerStatus(): PlayerStatus {
			return this.clientState.playerStatus
		}


	// MARK: LaneState

	setCurrentFrameIndex(value: number) {
		if (this.clientState.laneState) this.clientState.laneState.currentFrameIndex = value
	}
		getCurrentFrameIndex(): number | undefined {
			return this.clientState.laneState?.currentFrameIndex
		}

	setCurrentFramePlayerIndex(value: number) {
		if (this.clientState.laneState) this.clientState.laneState.currentFramePlayerIndex = value
	}
		getCurrentFramePlayerIndex(): number | undefined {
			return this.clientState.laneState?.currentFramePlayerIndex
		}

	setCurrentFrameUserId(value: string | undefined) {
		if (this.clientState.laneState) this.clientState.laneState.currentFrameUserId = value
	}
		getCurrentFrameUserId(): string | undefined {
			return this.clientState.laneState?.currentFrameUserId
		}

	setCurrentRollIndex(value: number) {
		if (this.clientState.laneState) this.clientState.laneState.currentRollIndex = value
	}
		getCurrentRollIndex(): number | undefined {
			return this.clientState.laneState?.currentRollIndex
		}

	setCurrentRollStartTime(value: number | undefined) {
		if (this.clientState.laneState) this.clientState.laneState.currentRollStartTime = value
	}
		getCurrentRollStartTime(): number | undefined {
			return this.clientState.laneState?.currentRollStartTime
		}

	setFrames(value: Map<string, number[][]>) {
		if (this.clientState.laneState) this.clientState.laneState.frames = value
	}
		getFrames(): Map<string, number[][]> | undefined {
			return this.clientState.laneState?.frames
		}

	setGameStartTime(value: number) {
		if (this.clientState.laneState) this.clientState.laneState.gameStartTime = value
	}
		getGameStartTime(): number {
			return this.clientState.laneState?.gameStartTime ?? 0
		}

	setLaneIndex(value: number) {
		if (this.clientState.laneState) this.clientState.laneState.laneIndex = value
	}
		getLaneIndex(): number | undefined {
			return this.clientState.laneState?.laneIndex
		}

	setLaneStatus(value: LaneStatus) {
		if (this.clientState.laneState) this.clientState.laneState.laneStatus = value
	}
		getLaneStatus(): LaneStatus | undefined {
			return this.clientState.laneState?.laneStatus
		}

	setPlayers(value: Map<string, string>) {
		if (this.clientState.laneState) this.clientState.laneState.players = value
	}
		getPlayers(): Map<string, string> | undefined {
			return this.clientState.laneState?.players
		}

}
