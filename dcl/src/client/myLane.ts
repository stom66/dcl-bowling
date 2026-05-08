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
 * - All lane entities are watched up-front; the per-tick "is this my lane?" filter
 *   gates emissions, so dynamic subscribe/unsubscribe is unnecessary.
 * - Multiple component changes within one tick are coalesced into a single emit
 *   (see `flush`) so consumers only see one `LaneSnapshot` per tick, with all
 *   fields fully synced.
 */
export namespace MyLane {

	// MARK: Vars
	let isInitialised        : boolean    = false
	let lastEmittedPhase     : LanePhase  = LanePhase.NONE
	let lastEmittedTurnUserId: string     = ''

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
		lastEmittedPhase      = LanePhase.NONE
		lastEmittedTurnUserId = ''

		if (laneIndex === undefined) return

		const snapshot = LaneStore.getLaneSnapshot(laneIndex)

		lastEmittedPhase      = snapshot.phase
		lastEmittedTurnUserId = snapshot.currentFrameUserId

		eventBus.emit(ClientEvents.NOTIFY_LANE_STATE, snapshot)
		eventBus.emit(ClientEvents.ON_GAME_JOINED,    snapshot)
	}


	// MARK: onLaneChanged
	/**
	 * Component-onChange callback. Records the dirty lane and schedules a single
	 * coalesced flush at end-of-tick so all sibling component updates are visible
	 * by the time we read the snapshot.
	 */
	function onLaneChanged(laneIndex: number): void {
		if (laneIndex !== ClientStore.getInstance().getLaneIndex()) return

		pendingLanes.add(laneIndex)
		if (flushScheduled) return
		flushScheduled = true
		utils.timers.setTimeout(flush, 0)
	}


	// MARK: flush
	/**
	 * End-of-tick flush. Reads the current snapshot for "my lane" and emits
	 * `NOTIFY_LANE_STATE` plus any phase-transition-derived events.
	 */
	function flush(): void {
		flushScheduled = false

		const laneIndex = ClientStore.getInstance().getLaneIndex()
		if (laneIndex === undefined || !pendingLanes.has(laneIndex)) {
			pendingLanes.clear()
			return
		}
		pendingLanes.clear()

		const snapshot = LaneStore.getLaneSnapshot(laneIndex)
		eventBus.emit(ClientEvents.NOTIFY_LANE_STATE, snapshot)

		emitPhaseTransition(snapshot)

		lastEmittedPhase      = snapshot.phase
		lastEmittedTurnUserId = snapshot.currentFrameUserId
	}


	// MARK: emitPhaseTransition
	/**
	 * Maps a phase change on the local player's lane to the existing event-bus
	 * events. The current player's userId (from `LaneCurrentTurn.currentFrameUserId`)
	 * decides whether to fire an `ON_MY_*` or `ON_GROUP_*` variant.
	 */
	function emitPhaseTransition(snapshot: LaneSnapshot): void {
		const prev = lastEmittedPhase
		const next = snapshot.phase
		if (prev === next) return

		const myUserId  = ClientStore.getInstance().getUserId()
		const isMyTurn  = snapshot.currentFrameUserId === myUserId

		if (prev === LanePhase.GAME_STARTING && next === LanePhase.WAITING) {
			eventBus.emit(ClientEvents.ON_GROUP_GAME_START, snapshot)
		}

		if (next === LanePhase.FRAME_START) {
			eventBus.emit(isMyTurn ? ClientEvents.ON_MY_FRAME_START : ClientEvents.ON_GROUP_FRAME_START, snapshot)
		}

		if (next === LanePhase.ROLL_END) {
			eventBus.emit(isMyTurn ? ClientEvents.ON_MY_ROLL_END : ClientEvents.ON_GROUP_ROLL_END, { userId: snapshot.currentFrameUserId })
		}

		if (next === LanePhase.FRAME_END) {
			eventBus.emit(isMyTurn ? ClientEvents.ON_MY_FRAME_END : ClientEvents.ON_GROUP_FRAME_END, { userId: snapshot.currentFrameUserId })
		}

		if (next === LanePhase.NONE && prev !== LanePhase.NONE) {
			eventBus.emit(ClientEvents.ON_GROUP_GAME_END, snapshot)
			// Player has left this lane (or the lane has been reset).
			ClientStore.getInstance().setLaneIndex(undefined)
		}
	}
}
