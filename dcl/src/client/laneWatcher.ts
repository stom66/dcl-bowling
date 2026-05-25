import * as utils from "@dcl-sdk/utils"

import { ComponentManager } from "src/shared/components/componentManager"
import * as LaneComponent from "src/shared/components/lane"
import { LaneStore } from "src/shared/laneStore"
import { LanePhase } from "src/shared/enums"
import { GameSettings } from "src/shared/settings"
import { LaneSnapshot } from "src/shared/types/shared-types"
import { ClientEvents, eventBus } from "src/shared/utils/eventBus"

import { ClientStore } from "src/client/clientStore"


/**
 * Watches the synced lane components for the player's currently-enrolled lane and
 * re-emits state changes on the local `eventBus` using the existing event names.
 *
 * - All lane entities are watched up-front; `flush` emits for every lane that
 *   changed in that tick (clients filter `NOTIFY_LANE_STATE` by `laneIndex` if needed).
 * - Multiple component changes within one tick are coalesced into a single emit
 *   (see `flush`) so consumers only see one `LaneSnapshot` per tick, with all
 *   fields fully synced.
 */
export namespace LaneWatcher {

	// MARK: Vars
	let isInitialised        : boolean    = false

	let lastEmittedPhase     : LanePhase[]  = Array.from({ length: GameSettings.MAX_LANES }, () => LanePhase.NONE)
	let lastEmittedTurnUserId: string[]   = Array.from({ length: GameSettings.MAX_LANES }, () => '')

	// Server endGame sets phase=NONE and resetLane (empty players) in the same tick, so
	// snapshot.players is already [] when we detect the transition. Cache the last
	// non-empty roster so game-end can still tell "our" game from a spectator lane.
	const lastKnownPlayersByLane: string[][] = Array.from({ length: GameSettings.MAX_LANES }, () => [])

	const pendingLanes       : Set<number> = new Set()
	let flushScheduled       : boolean     = false


	// MARK: init
	/**
	 * Binds an `onChange` listener to each lane's synced components, once. Awaits
	 * `ComponentManager.onClientReady` first because in authoritative-server mode
	 * the lane entities only become available on the client after CRDT sync arrives.
	 * Call from client startup, after `ComponentManager.init`. Subsequent calls
	 * are no-ops.
	 */
	export async function init(): Promise<void> {
		if (isInitialised) return
		isInitialised = true

		console.log('MyLane: init: waiting for ComponentManager.onClientReady')
		await ComponentManager.onClientReady()

		console.log('MyLane: init: binding onChange for', GameSettings.MAX_LANES, 'lanes')

		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			const entity = ComponentManager.getLaneEntity(i)

			LaneComponent.LanePhaseEnum.onChange(entity,   () => onLaneChanged(i))
			LaneComponent.LaneCurrentTurn.onChange(entity, () => onLaneChanged(i))
			LaneComponent.LaneGameData.onChange(entity,    () => onLaneChanged(i))
			LaneComponent.LaneScores.onChange(entity,      () => onLaneChanged(i))
		}

		// If the local player already has a lane index set (e.g. they refreshed
		// while in a game), emit an initial snapshot now that the entity is bound.
		const laneIndex = ClientStore.getInstance().getLaneIndex()
		if (laneIndex !== undefined) onMyLaneIndexChanged(laneIndex)
	}


	// MARK: onLaneChanged
	/**
	 * Component-onChange callback. Records the dirty lane and schedules a single
	 * coalesced flush at end-of-tick so all sibling component updates are visible
	 * by the time we read the snapshot.
	 */
	function onLaneChanged(laneIndex: number): void {
		pendingLanes.add(laneIndex)
		if (flushScheduled) return
		flushScheduled = true
		utils.timers.setTimeout(flush, 0)
	}


	// MARK: onMyLaneIndexChanged
	/**
	 * Called by `ClientStore.setLaneIndex` whenever the local player's enrolled lane
	 * changes (join / leave). Resets transition tracking and emits an immediate
	 * snapshot for the new lane so consumers stay in sync without waiting for the
	 * next component change.
	 */
	export function onMyLaneIndexChanged(laneIndex: number | undefined): void {
		console.log('MyLane: onMyLaneIndexChanged: laneIndex', laneIndex)

		pendingLanes.clear()

		if (laneIndex === undefined) return

		const snapshot = LaneStore.getLaneSnapshot(laneIndex)
		if (snapshot.players.length > 0) {
			lastKnownPlayersByLane[laneIndex] = snapshot.players.slice()
		}
		lastEmittedPhase[laneIndex]      = snapshot.phase
		lastEmittedTurnUserId[laneIndex] = snapshot.currentFrameUserId
		eventBus.emit(ClientEvents.NOTIFY_LANE_STATE, snapshot)
		eventBus.emit(ClientEvents.ON_GAME_JOINED,    snapshot)
	}


	// MARK: wasMyLane
	/**
	 * Whether the local player was enrolled on this lane. Uses `ClientStore.laneIndex`
	 * when set, and falls back to the cached roster for game-end when synced players
	 * have already been cleared.
	 */
	function wasMyLane(
		laneIndex: number,
		myUserId : string
	): boolean {
		if (laneIndex === ClientStore.getInstance().getLaneIndex()) return true
		return lastKnownPlayersByLane[laneIndex].includes(myUserId)
	}


	// MARK: flush
	/**
	 * End-of-tick flush. For each dirty lane, reads the snapshot and emits
	 * `NOTIFY_LANE_STATE` plus any phase-transition-derived events.
	 */
	function flush(): void {
		flushScheduled = false

		const lanesToFlush = Array.from(pendingLanes)
		pendingLanes.clear()

		for (const laneIndex of lanesToFlush) {
			const snapshot = LaneStore.getLaneSnapshot(laneIndex)
			if (snapshot.players.length > 0) {
				lastKnownPlayersByLane[laneIndex] = snapshot.players.slice()
			}
			eventBus.emit(ClientEvents.NOTIFY_LANE_STATE, snapshot)

			emitPhaseTransition(snapshot)

			lastEmittedPhase[laneIndex]      = snapshot.phase
			lastEmittedTurnUserId[laneIndex] = snapshot.currentFrameUserId
		}
	}


	// MARK: emitPhaseTransition
	/**
	 * Maps a synced phase change to the existing event-bus events. Uses
	 * `isMyLane` / `isMyTurn` so other lanes still emit `ON_NON_GROUP_*` without
	 * clearing local enrollment.
	 */
	function emitPhaseTransition(snapshot: LaneSnapshot): void {
		const prev = lastEmittedPhase[snapshot.laneIndex]
		const next = snapshot.phase
		if (prev === next) return

		const myUserId  = ClientStore.getInstance().getUserId()
		const isMyTurn  = snapshot.currentFrameUserId === myUserId
		const isMyLane  = snapshot.laneIndex === ClientStore.getInstance().getLaneIndex()

		if (prev === LanePhase.GAME_STARTING && next === LanePhase.WAITING) {
			eventBus.emit(isMyLane ? ClientEvents.ON_GROUP_GAME_START : ClientEvents.ON_NON_GROUP_GAME_START, snapshot)
		}

		if (next === LanePhase.FRAME_START) {
			eventBus.emit(isMyTurn ? ClientEvents.ON_MY_FRAME_START : isMyLane ? ClientEvents.ON_GROUP_FRAME_START : ClientEvents.ON_NON_GROUP_FRAME_START, snapshot)
		}

		if (next === LanePhase.ROLL_END) {
			eventBus.emit(isMyTurn ? ClientEvents.ON_MY_ROLL_END : isMyLane ? ClientEvents.ON_GROUP_ROLL_END : ClientEvents.ON_NON_GROUP_ROLL_END, { userId: snapshot.currentFrameUserId })
		}

		if (next === LanePhase.FRAME_END) {
			eventBus.emit(isMyTurn ? ClientEvents.ON_MY_FRAME_END : isMyLane ? ClientEvents.ON_GROUP_FRAME_END : ClientEvents.ON_NON_GROUP_FRAME_END, { userId: snapshot.currentFrameUserId })
		}

		if (next === LanePhase.NONE && prev !== LanePhase.NONE) {
			const isMyGameEnd = wasMyLane(snapshot.laneIndex, myUserId)
			eventBus.emit(isMyGameEnd ? ClientEvents.ON_GROUP_GAME_END : ClientEvents.ON_NON_GROUP_GAME_END, snapshot)
			if (isMyGameEnd) {
				lastKnownPlayersByLane[snapshot.laneIndex] = []
				ClientStore.getInstance().setLaneIndex(undefined)
			}
		}
	}
}
