import { LaneStatus } from "src/shared/enums"
import { GameSettings } from "src/shared/settings"
import { LaneState, NotifyLaneStatePayload, Outfit, ServerState } from "src/shared/types"

import { gameManager } from "src/server/gameManager"
import { notifyLaneStateUpdate } from "src/server/serverMessaging"
import { userProfileCache } from "src/shared/utils/userProfileCache"


// MARK: ServerStore
export class ServerStore {
	private static instance: ServerStore | undefined

	private readonly serverState: ServerState = {
		lanes: [],
		groups: [],
	}

	private constructor() {
		console.log('ServerStore: constructor')
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			this.serverState.lanes.push(this.getDefaultLaneState(i))
		}
	}

	getDefaultLaneState(laneIndex: number): LaneState {
		return {
			//groupId             : undefined,
			currentRound        : 0,
			currentTurnUserId   : undefined,
			currentTurnStartTime: undefined,
			gameStartTime       : 0,
			laneIndex           : laneIndex,
			laneStatus          : LaneStatus.IDLE,
			players             : new Map<string, string>(),
			frames              : new Map<string, number[][]>(),
		} as LaneState
	}

	
	// MARK: Instance
	static getInstance(): ServerStore {
		if (!ServerStore.instance) ServerStore.instance = new ServerStore()
		return ServerStore.instance
	}


	getLaneState(laneIndex: number): LaneState {
		return this.serverState.lanes.find(lane => lane.laneIndex === laneIndex) ?? this.getDefaultLaneState(laneIndex)
	}
		getLaneStatePayload(laneIndex: number): NotifyLaneStatePayload {
			return {
				currentRound : this.serverState.lanes[laneIndex].currentRound,
				currentTurnUserId: this.serverState.lanes[laneIndex].currentTurnUserId,
				currentTurnStartTime: this.serverState.lanes[laneIndex].currentTurnStartTime,
				gameStartTime: this.serverState.lanes[laneIndex].gameStartTime,
				laneIndex    : this.serverState.lanes[laneIndex].laneIndex,
				laneStatus   : this.serverState.lanes[laneIndex].laneStatus,
				players      : Array.from(this.serverState.lanes[laneIndex].players.entries()).map(([userId, displayName]) => ({
					userId      : userId,
					displayName : displayName,
				})),
				frames       : Array.from(this.serverState.lanes[laneIndex].frames.entries()).map(([userId, frames]) => ({
					userId      : userId,
					frames      : frames,
				})),
				sentAt       : Date.now(),
			}
		}

	getLaneUserIds(laneIndex: number): string[] {
		return Array.from(this.serverState.lanes[laneIndex].players.keys())
	}

	resetLaneState(laneIndex: number): void {
		this.serverState.lanes[laneIndex] = this.getDefaultLaneState(laneIndex)
	}

	// MARK: Players
	async addPlayer(userId: string, laneIndex: number): Promise<void> {
		console.log(`serverStore: addPlayer: adding userId ${userId} to players map.`)

		const displayName = await userProfileCache.getDisplayName(userId)
		this.serverState.lanes[laneIndex].players.set(userId, displayName)	
	}


	removePlayer(userId: string): void {
		this.serverState.lanes.forEach(lane => lane.players.delete(userId))
	}

}
