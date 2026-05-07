import { isServer } from "@dcl/sdk/network"

import * as LaneComponent from "src/shared/components/lane"
import { ComponentManager } from "src/shared/components/componentManager"
import { LanePhase } from "src/shared/enums"
import { LanePlayers, LaneScores as LaneScoresRow, LaneSnapshot } from "src/shared/types/shared-types"


/**
 * Data-access wrapper around the synced lane components. Reads work on both
 * server and client; writes are gated by `isServer()` and silently no-op on
 * the client (the server is authoritative). All entity lookup goes through
 * `ComponentManager.getLaneEntity` so this module knows nothing about how
 * entities are created or synced.
 */
export namespace LaneStore {

	// MARK: Types
	export type LaneCurrentTurnSnapshot = ReturnType<typeof LaneComponent.LaneCurrentTurn.get>


	// MARK: getLaneSnapshot
	export function getLaneSnapshot(laneIndex: number): LaneSnapshot {
		const entity      = ComponentManager.getLaneEntity(laneIndex)

		const currentTurn = LaneComponent.LaneCurrentTurn.get(entity)
		const gameData    = LaneComponent.LaneGameData.get(entity)
		const phase       = LaneComponent.LanePhaseEnum.get(entity)
		const scores      = LaneComponent.LaneScores.get(entity)

		const players = new Map<string, string>(
			(gameData?.players ?? []).map((p) => [p.userId, p.displayName])
		)
		const frames = new Map<string, number[][]>(
			(scores?.scores ?? []).map((s) => [s.userId, s.frames.map((f) => f.slice())])
		)

		return {
			currentFrameIndex      : currentTurn.currentFrameIndex,
			currentFramePlayerIndex: currentTurn.currentFramePlayerIndex,
			currentFrameUserId     : currentTurn.currentFrameUserId,
			currentRollIndex       : currentTurn.currentRollIndex,
			currentRollStartTime   : currentTurn.currentRollStartTime,
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
		ComponentManager.forEachLane((laneIndex, entity) => {
			if (result !== undefined) return
			const data = LaneComponent.LaneGameData.get(entity)
			if (data?.players?.some((p) => p.userId === userId)) result = laneIndex
		})
		return result
	}


	// MARK: resetLane
	export function resetLane(laneIndex: number): void {
		if (!isServer()) return
		ComponentManager.seedLaneDefaults(laneIndex)
	}


	// MARK: initLaneScorecards
	export function initLaneScorecards(laneIndex: number): void {
		if (!isServer()) return

		const entity   = ComponentManager.getLaneEntity(laneIndex)
		const gameData = LaneComponent.LaneGameData.get(entity)
		const scores   = LaneComponent.LaneScores.getMutable(entity)

		scores.scores = (gameData?.players ?? []).map((p) => ({
			userId: p.userId,
			frames: Array.from({ length: 10 }, () => [] as number[]),
		}))
	}


	// MARK: CurrentTurn (atomic)
	export function getCurrentTurn(laneIndex: number): LaneCurrentTurnSnapshot {
		return LaneComponent.LaneCurrentTurn.get(ComponentManager.getLaneEntity(laneIndex))
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

		const c = LaneComponent.LaneCurrentTurn.getMutable(ComponentManager.getLaneEntity(laneIndex))

		c.currentFrameIndex       = currentFrameIndex
		c.currentFramePlayerIndex = currentFramePlayerIndex
		c.currentFrameUserId      = currentFrameUserId
		c.currentRollIndex        = currentRollIndex
		c.currentRollStartTime    = currentRollStartTime
	}


	// MARK: CurrentTurn (per-field)
	export function getCurrentFrameIndex(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(ComponentManager.getLaneEntity(laneIndex)).currentFrameIndex
	}
	export function getCurrentFramePlayerIndex(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(ComponentManager.getLaneEntity(laneIndex)).currentFramePlayerIndex
	}
	export function getCurrentFrameUserId(laneIndex: number): string {
		return LaneComponent.LaneCurrentTurn.get(ComponentManager.getLaneEntity(laneIndex)).currentFrameUserId
	}
	export function getCurrentRollIndex(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(ComponentManager.getLaneEntity(laneIndex)).currentRollIndex
	}
	export function getCurrentRollStartTime(laneIndex: number): number {
		return LaneComponent.LaneCurrentTurn.get(ComponentManager.getLaneEntity(laneIndex)).currentRollStartTime
	}

	export function setCurrentFrameIndex(
		laneIndex        : number,
		currentFrameIndex: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.currentFrameIndex = currentFrameIndex
	}
	export function setCurrentFramePlayerIndex(
		laneIndex              : number,
		currentFramePlayerIndex: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.currentFramePlayerIndex = currentFramePlayerIndex
	}
	export function setCurrentFrameUserId(
		laneIndex         : number,
		currentFrameUserId: string
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.currentFrameUserId = currentFrameUserId
	}
	export function setCurrentRollIndex(
		laneIndex       : number,
		currentRollIndex: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.currentRollIndex = currentRollIndex
	}
	export function setCurrentRollStartTime(
		laneIndex           : number,
		currentRollStartTime: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneCurrentTurn.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.currentRollStartTime = currentRollStartTime
	}


	// MARK: GameStartTime
	export function getGameStartTime(laneIndex: number): number {
		const c = LaneComponent.LaneGameData.get(ComponentManager.getLaneEntity(laneIndex))
		return c?.startTime ?? 0
	}
	export function setGameStartTime(
		laneIndex: number,
		startTime: number
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.startTime = startTime
	}


	// MARK: Players
	export function getPlayers(laneIndex: number): LanePlayers[] {
		const c = LaneComponent.LaneGameData.get(ComponentManager.getLaneEntity(laneIndex))
		return c?.players?.map((p) => ({ userId: p.userId, displayName: p.displayName })) ?? []
	}

	export function getPlayersMap(laneIndex: number): Map<string, string> {
		const players = getPlayers(laneIndex)
		return new Map(players.map((p) => [p.userId, p.displayName]))
	}

	/** Returns the `userId` of every player on the given lane. */
	export function getLaneUserIds(laneIndex: number): string[] {
		const data = LaneComponent.LaneGameData.get(ComponentManager.getLaneEntity(laneIndex))
		return (data?.players ?? []).map((p) => p.userId)
	}


	export function setPlayers(
		laneIndex: number,
		players  : LanePlayers[]
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.players = players
	}

	export function addPlayer(
		laneIndex  : number,
		userId     : string,
		displayName: string
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(ComponentManager.getLaneEntity(laneIndex))
		// Reassign rather than push so the component definitely marks dirty for sync.
		c.players = [...(c.players ?? []), { userId, displayName }]
	}

	export function removePlayer(
		laneIndex: number,
		userId   : string
	): void {
		if (!isServer()) return
		const c = LaneComponent.LaneGameData.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.players = (c.players ?? []).filter((p) => p.userId !== userId)
	}
	
	/** Server-only: removes the player from every lane's `LaneGameData.players` list. */
	export function removePlayerFromAllLanes(userId: string): void {
		if (!isServer()) return
		ComponentManager.forEachLane((_, entity) => {
			const c = LaneComponent.LaneGameData.get(entity)
			if (!c.players?.some((p) => p.userId === userId)) return
			const m = LaneComponent.LaneGameData.getMutable(entity)
			m.players = m.players?.filter((p) => p.userId !== userId)
		})
	}


	// MARK: Phase
	export function getPhase(laneIndex: number): LanePhase {
		const c = LaneComponent.LanePhaseEnum.get(ComponentManager.getLaneEntity(laneIndex))
		return c?.phase ?? LanePhase.NONE
	}


	// MARK: subscribeLanePhase
	/**
	 * Runs `listener` whenever the synced `LanePhase` component updates on `laneIndex`.
	 * Same primitive as `MyLane`: {@link LaneComponent.LanePhaseEnum.onChange} on the
	 * lane entity — CRDT pushes updates only when the server writes; nothing polls each frame.
	 * Requires {@link ComponentManager.onClientReady} first so lane entities exist.
	 */
	export function subscribeLanePhase(
		laneIndex: number,
		listener : (phase: LanePhase) => void,
	): void {
		const entity = ComponentManager.getLaneEntity(laneIndex)
		LaneComponent.LanePhaseEnum.onChange(entity, () => {
			listener(getPhase(laneIndex))
		})
	}


	export function setPhase(
		laneIndex: number,
		phase    : LanePhase
	): void {
		if (!isServer()) return
		const c = LaneComponent.LanePhaseEnum.getMutable(ComponentManager.getLaneEntity(laneIndex))
		c.phase = phase
	}


	// MARK: Scores
	export function getScores(laneIndex: number): LaneScoresRow[] {
		const c = LaneComponent.LaneScores.get(ComponentManager.getLaneEntity(laneIndex))
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

		const c = LaneComponent.LaneScores.getMutable(ComponentManager.getLaneEntity(laneIndex))
		if (!c.scores) c.scores = []

		let scores = c.scores.find((s) => s.userId === userId)
		if (!scores) {
			c.scores.push({ userId: userId, frames: [] })
			scores = c.scores.find((s) => s.userId === userId)
		}

		if (!scores!.frames[frameIndex]) scores!.frames[frameIndex] = []
		scores!.frames[frameIndex]!.push(score)
	}
}
