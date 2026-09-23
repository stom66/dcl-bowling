import { Entity } from "@dcl/sdk/ecs"
import { isServer } from "@dcl/sdk/network"

import { ComponentManager } from "src/shared/components/componentManager"
import * as LaneComponent from "src/shared/components/lane"
import { LANES_GROUP_ID } from "src/shared/components/registry"
import { LanePhase } from "src/shared/enums"
import { GameSettings } from "src/shared/settings"
import { LaneScores as LaneScoresRow, LaneSnapshot } from "src/shared/types/shared-types"
import { isValidLaneIndex } from "src/shared/utils/laneIndex"
import { getFrameResults, getPlayerTotalScore } from "src/shared/utils/scoreCalc"


/**
 * Data-access wrapper around the synced lane components. Reads work on both
 * server and client; writes are gated by `isServer()` and silently no-op on
 * the client (the server is authoritative). Entity lookup goes through
 * `ComponentManager.getKeyedEntity` for the `lanes` group.
 */
export namespace LaneStore {

	// MARK: Types
	export type LaneCurrentTurnSnapshot = ReturnType<typeof LaneComponent.LaneCurrentTurn.get>


	// MARK: getLaneEntity
	/**
	 * Returns the synced entity for `laneIndex`. Throws if it is not created or discovered yet.
	 */
	export function getLaneEntity(laneIndex: number): Entity {
		const entity = ComponentManager.getKeyedEntity(LANES_GROUP_ID, String(laneIndex))
		if (entity === undefined) {
			throw new Error(`LaneStore: getLaneEntity: lane ${laneIndex} entity not yet available`)
		}
		return entity
	}


	// MARK: forEachLane
	function forEachLane(
		fn: (laneIndex: number, entity: Entity) => void
	): void {
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			const entity = ComponentManager.getKeyedEntity(LANES_GROUP_ID, String(i))
			if (entity === undefined) continue
			fn(i, entity)
		}
	}


	// MARK: areLanesReady
	/**
	 * True once every lane keyed entity has been created or discovered.
	 */
	export function areLanesReady(): boolean {
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			if (ComponentManager.getKeyedEntity(LANES_GROUP_ID, String(i)) === undefined) {
				return false
			}
		}
		return true
	}


	// MARK: onLanesReady
	/**
	 * Resolves when all lane entities exist.
	 */
	export function onLanesReady(): Promise<void> {
		if (areLanesReady()) return Promise.resolve()

		return new Promise<void>((resolve) => {
			const unsub = ComponentManager.onKeyedEntity(LANES_GROUP_ID, () => {
				if (!areLanesReady()) return
				unsub()
				resolve()
			})
		})
	}


	// MARK: seedLaneDefaults
	function seedLaneDefaults(laneIndex: number): void {
		if (!isServer()) return

		const entity = getLaneEntity(laneIndex)

		LaneComponent.LaneCurrentTurn.createOrReplace(entity, {
			currentFrameIndex      : 0,
			currentFramePlayerIndex: 0,
			currentFrameUserId     : '',
			currentRollIndex       : 0,
			currentRollStartTime   : 0,
		})
		LaneComponent.LaneGameData.createOrReplace(entity, { laneIndex, startTime: 0, frameCount: 0, players: [] })
		LaneComponent.LanePhaseEnum.createOrReplace(entity, { phase: LanePhase.NONE })
		LaneComponent.LaneScores.createOrReplace(entity, { scores: [] })
		LaneComponent.LaneBumpers.createOrReplace(entity, { enabled: false })
	}


	// MARK: getLaneSnapshot
	export function getLaneSnapshot(laneIndex: number): LaneSnapshot {
		const entity      = getLaneEntity(laneIndex)

		const currentTurn = LaneComponent.LaneCurrentTurn.get(entity)
		const gameData    = LaneComponent.LaneGameData.get(entity)
		const phase       = LaneComponent.LanePhaseEnum.get(entity)
		const scores      = LaneComponent.LaneScores.get(entity)
		const players     = [...(gameData?.players ?? [])]

		const frames = new Map<string, number[][]>(
			(scores?.scores ?? []).map((s) => [s.userId, s.frames.map((f) => f.slice())])
		)

		return {
			currentFrameIndex      : currentTurn.currentFrameIndex,
			currentFramePlayerIndex: currentTurn.currentFramePlayerIndex,
			currentFrameUserId     : currentTurn.currentFrameUserId,
			currentRollIndex       : currentTurn.currentRollIndex,
			currentRollStartTime   : currentTurn.currentRollStartTime,
			frameCount             : gameData?.frameCount ?? 0,
			frames                 : frames,
			gameStartTime          : gameData?.startTime ?? 0,
			laneIndex              : laneIndex,
			phase                  : phase.phase,
			players                : players,
		}
	}


	// MARK: findLaneByUserId
	export function findLaneByUserId(userId: string): number | undefined {
		let result: number | undefined = undefined
		forEachLane((laneIndex, entity) => {
			if (result !== undefined) return
			const data = LaneComponent.LaneGameData.get(entity)
			if (data?.players?.includes(userId)) result = laneIndex
		})
		return result
	}


	// MARK: resetLane
	export function resetLane(laneIndex: number): void {
		if (!isServer()) return
		seedLaneDefaults(laneIndex)
	}


	// MARK: initLaneScorecards
	export function initLaneScorecards(laneIndex: number): void {
		if (!isServer()) return

		const entity   = getLaneEntity(laneIndex)
		const gameData = LaneComponent.LaneGameData.get(entity)
		const scores   = LaneComponent.LaneScores.getMutable(entity)

		scores.scores = (gameData?.players ?? []).map((p) => ({
			userId: p,
			frames: [[]] as number[][]
		}))
	}


	// MARK: CurrentTurn (atomic)
	export function getCurrentTurn(laneIndex: number): LaneCurrentTurnSnapshot {
		return LaneComponent.LaneCurrentTurn.get(getLaneEntity(laneIndex))
	}

	export function setCurrentTurn(
		laneIndex              : number,
		currentFrameIndex      : number,
		currentFramePlayerIndex: number,
		currentFrameUserId     : string,
		currentRollIndex       : number,
		currentRollStartTime   : number
	): void {
		if (!isServer()) return

		const c = LaneComponent.LaneCurrentTurn.getMutable(getLaneEntity(laneIndex))

		c.currentFrameIndex       = currentFrameIndex
		c.currentFramePlayerIndex = currentFramePlayerIndex
		c.currentFrameUserId      = currentFrameUserId
		c.currentRollIndex        = currentRollIndex
		c.currentRollStartTime    = currentRollStartTime
	}


	// MARK: CurrentTurn (per-field)
	export function getCurrentFrameIndex(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(getLaneEntity(laneIndex)).currentFrameIndex
	}
	export function getCurrentFramePlayerIndex(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(getLaneEntity(laneIndex)).currentFramePlayerIndex
	}
	export function getCurrentFrameUserId(laneIndex: number): string {
		return LaneComponent.LaneCurrentTurn.get(getLaneEntity(laneIndex)).currentFrameUserId
	}
	export function getCurrentRollIndex(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(getLaneEntity(laneIndex)).currentRollIndex
	}
	export function getCurrentRollStartTime(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(getLaneEntity(laneIndex)).currentRollStartTime
	}

	export function setCurrentFrameIndex(
		laneIndex        : number,
		currentFrameIndex: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(getLaneEntity(laneIndex))
		c.currentFrameIndex = currentFrameIndex
	}
	export function setCurrentFramePlayerIndex(
		laneIndex              : number,
		currentFramePlayerIndex: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(getLaneEntity(laneIndex))
		c.currentFramePlayerIndex = currentFramePlayerIndex
	}
	export function setCurrentFrameUserId(
		laneIndex         : number,
		currentFrameUserId: string
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(getLaneEntity(laneIndex))
		c.currentFrameUserId = currentFrameUserId
	}
	export function setCurrentRollIndex(
		laneIndex       : number,
		currentRollIndex: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(getLaneEntity(laneIndex))
		c.currentRollIndex = currentRollIndex
	}
	export function setCurrentRollStartTime(
		laneIndex           : number,
		currentRollStartTime: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(getLaneEntity(laneIndex))
		c.currentRollStartTime = currentRollStartTime
	}


	// MARK: GameStartTime
	export function getGameStartTime(laneIndex: number): number {
		const c = LaneComponent.LaneGameData.get(getLaneEntity(laneIndex))
		return c?.startTime ?? 0
	}
	export function setGameStartTime(
		laneIndex: number,
		startTime: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(getLaneEntity(laneIndex))
		c.startTime = startTime
	}


	// MARK: FrameCount
	/**
	 * Host-chosen length for this lane's current game. `0` while the lane is idle.
	 */
	export function getFrameCount(laneIndex: number): number {
		const c = LaneComponent.LaneGameData.get(getLaneEntity(laneIndex))
		return c?.frameCount ?? 0
	}

	export function setFrameCount(
		laneIndex : number,
		frameCount: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(getLaneEntity(laneIndex))
		c.frameCount = frameCount
	}


	// MARK: Players
	export function getPlayers(laneIndex: number): string[] {
		const c = LaneComponent.LaneGameData.get(getLaneEntity(laneIndex))
		return [...(c?.players ?? [])]
	}/* 

	export function getPlayersMappedToDisplayNames(laneIndex: number): Map<string, string> {
		const players = getPlayers(laneIndex)
		// build a new array of objects with usersId: displayname
		const playersWithDisplayNames = players.map((p) => ({ 
			userId: p, 
			displayName: userProfileCache.getDisplayName(p) 
		}))
		return playersWithDisplayNames
	} */

	/** Returns the `userId` of every player on the given lane. */
	export function getLaneUserIds(laneIndex: number): string[] {
		const data = LaneComponent.LaneGameData.get(getLaneEntity(laneIndex))
		return [...(data?.players ?? [])]
	}


	export function setPlayers(
		laneIndex: number,
		players  : string[]
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(getLaneEntity(laneIndex))
		c.players = players
	}

	export function addPlayer(
		laneIndex  : number,
		userId     : string
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(getLaneEntity(laneIndex))
		const prior = c.players ?? []
		if (prior.includes(userId)) return
		// Reassign rather than push so the component definitely marks dirty for sync.
		c.players = [...prior, userId]
	}

	export function removePlayer(
		laneIndex: number,
		userId   : string
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(getLaneEntity(laneIndex))
		c.players = (c.players ?? []).filter((p) => p !== userId)
	}
	
	/** Server-only: removes the player from every lane's `LaneGameData.players` list. */
	export function removePlayerFromAllLanes(userId: string): void {
		if (!isServer()) return
		forEachLane((_, entity) => {
			const c = LaneComponent.LaneGameData.get(entity)
			if (!c.players?.includes(userId)) return

			const m = LaneComponent.LaneGameData.getMutable(entity)
			m.players = m.players?.filter((p) => p !== userId)
		})
	}


	// MARK: Phase
	export function getPhase(laneIndex: number): LanePhase {
		const c = LaneComponent.LanePhaseEnum.get(getLaneEntity(laneIndex))
		return c?.phase ?? LanePhase.NONE
	}


	// MARK: subscribeLanePhase
	/**
	 * Runs `listener` whenever the synced `LanePhase` component updates on `laneIndex`.
	 * Same primitive as `MyLane`: {@link LaneComponent.LanePhaseEnum.onChange} on the
	 * lane entity — CRDT pushes updates only when the server writes; nothing polls each frame.
	 * Requires {@link onLanesReady} first so lane entities exist.
	 */
	export function subscribeLanePhase(
		laneIndex: number,
		listener : (phase: LanePhase) => void,
	): void {
		const entity = getLaneEntity(laneIndex)
		LaneComponent.LanePhaseEnum.onChange(entity, () => {
			listener(getPhase(laneIndex))
		})
	}


	export function setPhase(
		laneIndex: number,
		phase    : LanePhase
	): void {
		if (!isServer()) return
		const c = LaneComponent.LanePhaseEnum.getMutable(getLaneEntity(laneIndex))
		c.phase = phase
	}


	// MARK: Bumpers
	/**
	 * True when gutter bumpers are raised on `laneIndex`.
	 */
	export function getBumpersEnabled(laneIndex: number): boolean {
		const c = LaneComponent.LaneBumpers.getOrNull(getLaneEntity(laneIndex))
		return c?.enabled ?? false
	}


	/**
	 * Raises or lowers gutter bumpers on `laneIndex`. Server-only.
	 */
	export function setBumpersEnabled(
		laneIndex: number,
		enabled  : boolean
	): void {
		if (!isServer()) return
		const entity = getLaneEntity(laneIndex)
		const c      = LaneComponent.LaneBumpers.getMutableOrNull(entity)
		if (c) {
			c.enabled = enabled
			return
		}
		LaneComponent.LaneBumpers.createOrReplace(entity, { enabled })
	}


	// MARK: Scores
	export function getScores(laneIndex: number): LaneScoresRow[] {
		const c = LaneComponent.LaneScores.get(getLaneEntity(laneIndex))
		return c.scores?.map((s) => ({ userId: s.userId, frames: s.frames.map((f) => f.slice()) })) ?? []
	}
	export function getScoresMap(laneIndex: number): Map<string, number[][]> {
		const scores = getScores(laneIndex)
		return new Map(scores.map((s) => [s.userId, s.frames.map((f) => f.slice())]))
	}
	export function addScore(
		laneIndex : number,
		frameIndex: number,
		userId    : string,
		score     : number
	): void {
		if (!isServer()) return

		const c = LaneComponent.LaneScores.getMutable(getLaneEntity(laneIndex))
		if (!c.scores) c.scores = []

		let scores = c.scores.find((s) => s.userId === userId)
		if (!scores) {
			c.scores.push({ userId: userId, frames: [] })
			scores = c.scores.find((s) => s.userId === userId)
		}

		if (!scores!.frames[frameIndex]) scores!.frames[frameIndex] = []
		scores!.frames[frameIndex]!.push(score)
	}


	export function getWinnerUserId(laneIndex: number): string | undefined {
		var winnerUserId: string | undefined = undefined
		var maxScore    : number             = 0


		const scores = getScores(laneIndex)

		const frameCount = getFrameCount(laneIndex)

		for (const score of scores) {
			const frameResults = getFrameResults(score.frames, frameCount)
			const totalScore   = getPlayerTotalScore(frameResults)

			if (totalScore > maxScore) {
				maxScore = totalScore
				winnerUserId = score.userId
			}
		}

		return winnerUserId
	}

	// MARK: getFramesForUserId
	/**
	 * Returns a copy of the player's frames when the player and scorecard exist.
	 */
	export function getFramesForUserId(userId: string): number[][] | undefined {
		const laneIndex = findLaneByUserId(userId)
		if (!isValidLaneIndex(laneIndex)) {
			console.log('LaneStore: getFramesForUserId: valid laneIndex not found for userId:', userId)
			return undefined
		}

		return getScores(laneIndex).find((score) => score.userId === userId)?.frames
	}


	// MARK: getScoreForUserId
	/**
	 * Returns the player's current total score when their scorecard exists.
	 */
	export function getScoreForUserId(userId: string): number | undefined {
		const frames = getFramesForUserId(userId)

		if (!frames) {
			console.log('LaneStore: getScoreForUserId: frames not found for userId:', userId)
			return undefined
		}

		const laneIndex = findLaneByUserId(userId)
		if (!isValidLaneIndex(laneIndex)) {
			console.log('LaneStore: getScoreForUserId: valid laneIndex not found for userId:', userId)
			return undefined
		}

		const frameResults = getFrameResults(frames, getFrameCount(laneIndex))
		const totalScore   = getPlayerTotalScore(frameResults)
		return totalScore
	}
}
