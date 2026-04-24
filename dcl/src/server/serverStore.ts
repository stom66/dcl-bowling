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

	private getDefaultLaneState(laneIndex: number): LaneState {
		return {
			currentFrameIndex      : 0,
			currentFramePlayerIndex: 0,
			currentFrameUserId     : undefined,
			currentRollIndex       : 0,
			currentRollStartTime   : undefined,
			frames                 : new Map<string, number[][]>(),
			gameStartTime          : 0,
			laneIndex              : laneIndex,
			laneStatus             : LaneStatus.IDLE,
			players                : new Map<string, string>(),
		} as LaneState
	}


	// MARK: Instance
	static getInstance(): ServerStore {
		if (!ServerStore.instance) ServerStore.instance = new ServerStore()
		return ServerStore.instance
	}


	// MARK: Lane State (private)
	private getLaneState(laneIndex: number): LaneState {
		return this.serverState.lanes.find(lane => lane.laneIndex === laneIndex) ?? this.getDefaultLaneState(laneIndex)
	}


	// MARK: Getters & Setters

	setCurrentFrameIndex(laneIndex: number, value: number) {
		this.getLaneState(laneIndex).currentFrameIndex = value
	}
		getCurrentFrameIndex(laneIndex: number): number {
			return this.getLaneState(laneIndex).currentFrameIndex
		}

	setCurrentFramePlayerIndex(laneIndex: number, value: number) {
		this.getLaneState(laneIndex).currentFramePlayerIndex = value
	}
		getCurrentFramePlayerIndex(laneIndex: number): number {
			return this.getLaneState(laneIndex).currentFramePlayerIndex
		}

	setCurrentFrameUserId(laneIndex: number, value: string | undefined) {
		this.getLaneState(laneIndex).currentFrameUserId = value
	}
		getCurrentFrameUserId(laneIndex: number): string | undefined {
			return this.getLaneState(laneIndex).currentFrameUserId
		}

	setCurrentRollIndex(laneIndex: number, value: number) {
		this.getLaneState(laneIndex).currentRollIndex = value
	}
		getCurrentRollIndex(laneIndex: number): number {
			return this.getLaneState(laneIndex).currentRollIndex
		}

	setCurrentRollStartTime(laneIndex: number, value: number | undefined) {
		this.getLaneState(laneIndex).currentRollStartTime = value
	}
		getCurrentRollStartTime(laneIndex: number): number | undefined {
			return this.getLaneState(laneIndex).currentRollStartTime
		}

	setFrames(laneIndex: number, value: Map<string, number[][]>) {
		this.getLaneState(laneIndex).frames = value
	}
		getFrames(laneIndex: number): Map<string, number[][]> {
			return this.getLaneState(laneIndex).frames
		}

	addScore(laneIndex: number, frameIndex: number, userId: string, score: number) {
		const frames = this.getFrames(laneIndex).get(userId)
		frames?.[frameIndex]?.push(score)
	}

	setGameStartTime(laneIndex: number, value: number) {
		this.getLaneState(laneIndex).gameStartTime = value
	}
		getGameStartTime(laneIndex: number): number {
			return this.getLaneState(laneIndex).gameStartTime
		}

	setLaneIndex(laneIndex: number, value: number) {
		this.getLaneState(laneIndex).laneIndex = value
	}
		getLaneIndex(laneIndex: number): number {
			return this.getLaneState(laneIndex).laneIndex
		}

	setLaneStatus(laneIndex: number, value: LaneStatus) {
		this.getLaneState(laneIndex).laneStatus = value
	}
		getLaneStatus(laneIndex: number): LaneStatus {
			return this.getLaneState(laneIndex).laneStatus
		}

	setPlayers(laneIndex: number, value: Map<string, string>) {
		this.getLaneState(laneIndex).players = value
	}
		getPlayers(laneIndex: number): Map<string, string> {
			return this.getLaneState(laneIndex).players
		}


	// MARK: Derived Accessors

	getLaneStatePayload(laneIndex: number): NotifyLaneStatePayload {
		const lane = this.getLaneState(laneIndex)
		return {
			currentFrameIndex      : lane.currentFrameIndex,
			currentFramePlayerIndex: lane.currentFramePlayerIndex,
			currentFrameUserId     : lane.currentFrameUserId,
			currentRollIndex       : lane.currentRollIndex,
			currentRollStartTime   : lane.currentRollStartTime,
			gameStartTime          : lane.gameStartTime,
			laneIndex              : lane.laneIndex,
			laneStatus             : lane.laneStatus,
			players                : Array.from(lane.players.entries()).map(([userId, displayName]) => ({ userId, displayName })),
			frames                 : Array.from(lane.frames.entries()).map(([userId, frames]) => ({ userId, frames })),
			sentAt                 : Date.now(),
		}
	}

	getLaneUserIds(laneIndex: number): string[] {
		return Array.from(this.getPlayers(laneIndex).keys())
	}

	/** Lane index containing this player, if any. */
	findLaneByUserId(userId: string): number | undefined {
		for (let i = 0; i < this.serverState.lanes.length; i++) {
			if (this.getPlayers(i).has(userId)) return i
		}
		return undefined
	}


	// MARK: Lane Operations

	/** Reset per-frame roll arrays (10 frames each) for every player on the lane. */
	initLaneScorecards(laneIndex: number): void {
		const players = this.getPlayers(laneIndex)
		const frames = this.getFrames(laneIndex)
		for (const userId of players.keys()) {
			frames.set(
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

		const players = this.getPlayers(laneIndex)
		players.set(userId, '')

		const displayName = await userProfileCache.getDisplayName(userId)
		players.set(userId, displayName)
	}

	removePlayer(userId: string): void {
		this.serverState.lanes.forEach(lane => lane.players.delete(userId))
	}

}
