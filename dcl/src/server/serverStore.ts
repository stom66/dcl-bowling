import { LaneStatus } from "src/shared/enums"
import { GameSettings } from "src/shared/settings"
import { LaneState, NotifyLaneStatePayload, ServerState } from "src/shared/types"

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

	/** Lane index containing this player, if any. */
	findLaneByUserId(userId: string): number | undefined {
		for (let i = 0; i < this.serverState.lanes.length; i++) {
			if (this.serverState.lanes[i].players.has(userId)) return i
		}
		return undefined
	}

	/** Reset per-frame roll arrays (10 frames each) for every player on the lane. */
	initLaneScorecards(laneIndex: number): void {
		const lane = this.serverState.lanes[laneIndex]
		for (const userId of lane.players.keys()) {
			lane.frames.set(
				userId,
				Array.from({ length: 10 }, () => [] as number[]),
			)
		}
	}

	resetLaneState(laneIndex: number): void {
		this.serverState.lanes[laneIndex] = this.getDefaultLaneState(laneIndex)
	}

	// MARK: Players
	async addPlayer(userId: string, laneIndex: number): Promise<void> {
		console.log(`serverStore: addPlayer: adding userId ${userId} to players map.`)

		const lane = this.serverState.lanes[laneIndex]
		lane.players.set(userId, '')

		const displayName = await userProfileCache.getDisplayName(userId)
		lane.players.set(userId, displayName)
	}


	removePlayer(userId: string): void {
		this.serverState.lanes.forEach(lane => lane.players.delete(userId))
	}

}
