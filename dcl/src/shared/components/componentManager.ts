import { engine, Entity } from "@dcl/sdk/ecs"
import { isServer, syncEntity } from "@dcl/sdk/network"
import { AUTH_SERVER_PEER_ID } from "@dcl/sdk/network/message-bus-sync"

import * as LaneComponent from "src/shared/components/lane"
import { LanePhase } from "src/shared/enums"
import { GameSettings } from "src/shared/settings"


/**
 * Lifecycle-only namespace: creates the synced lane entities, registers them
 * with `syncEntity`/`validateBeforeChange`, and exposes lookup + readiness
 * helpers. Does not read or write component fields directly — that's
 * `LaneStore`'s job. Keeping the two split makes the dependency direction
 * one-way (`LaneStore` -> `ComponentManager`) and means the manager has no
 * domain knowledge of the data shape beyond what `lane.ts` already declares.
 */
export namespace ComponentManager {

	// MARK: Types
	type ComponentWithValidation = {
		validateBeforeChange: (
			entity: Entity,
			cb    : (value: { senderAddress: string }) => boolean
		) => void
	}


	// MARK: Vars
	// Lane entities use sync IDs starting at this base. Keep it well clear of low
	// IDs the SDK / other features may reserve (e.g. avatars, player nameplates) —
	// using `1` caused `syncEntity failed because the id provided is already in use`.
	const LANE_ENTITY_SYNC_ENUM_BASE = 1000

	let isInitialised: boolean = false

	// Indexed by laneIndex. On the server this is populated synchronously in
	// `initServer`; on the client it's filled in lazily by the discovery system
	// in `initClient` as CRDT messages arrive.
	const laneComponentEntities: (Entity | undefined)[] = []

	// Promise resolvers awaiting client-side discovery of all lane entities.
	const clientReadyResolvers: Array<() => void> = []

	const laneSyncedComponents = [
		LaneComponent.LaneCurrentTurn,
		LaneComponent.LaneGameData,
		LaneComponent.LanePhaseEnum,
		LaneComponent.LaneScores,
	]

	const laneSyncedComponentIds = [
		LaneComponent.LaneCurrentTurn.componentId,
		LaneComponent.LaneGameData.componentId,
		LaneComponent.LanePhaseEnum.componentId,
		LaneComponent.LaneScores.componentId,
	]


	// MARK: init
	/**
	 * In authoritative-server mode only the server creates the synced lane entities
	 * and registers them with `syncEntity`. The client discovers each entity as it
	 * arrives over CRDT and stashes it in `laneComponentEntities[]` keyed by
	 * `LaneGameData.laneIndex`. Doing it this way avoids the
	 * "id already in use" error you get when both peers allocate a local entity
	 * and try to claim the same syncId.
	 *
	 * Idempotent — second and subsequent calls are no-ops.
	 */
	export function init(): void {
		if (isInitialised) {
			console.log('ComponentManager: init: already initialised, skipping')
			return
		}
		isInitialised = true

		isServer() ? initServer() : initClient()
	}


	// MARK: initServer
	/**
	 * Creates one entity per lane, seeds default component data on it, registers
	 * it for CRDT sync, and protects it against client-originated writes.
	 */
	function initServer(): void {
		console.log('ComponentManager: initServer: creating', GameSettings.MAX_LANES, 'lane entities')
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			const entity = engine.addEntity()
			laneComponentEntities[i] = entity

			seedLaneDefaults(i)

			syncEntity(entity, laneSyncedComponentIds, i + LANE_ENTITY_SYNC_ENUM_BASE)
			protectServerEntity(entity, laneSyncedComponents)
		}
		console.log('ComponentManager: initServer: done')
	}


	// MARK: seedLaneDefaults
	/**
	 * Server-only: writes every lane-related component on the lane back to its
	 * default "no game running" state. Single source of truth for the defaults —
	 * used by `initServer` at boot to populate fresh entities, and by
	 * `LaneStore.resetLane` at runtime to wipe a lane between games.
	 * `LaneGameData.laneIndex` is preserved so the client-side discovery system
	 * can still map the synced entity back to its slot.
	 */
	export function seedLaneDefaults(laneIndex: number): void {
		if (!isServer()) return

		const entity = getLaneEntity(laneIndex)

		LaneComponent.LaneCurrentTurn.createOrReplace(entity, {
			currentFrameIndex      : 0,
			currentFramePlayerIndex: 0,
			currentFrameUserId     : '',
			currentRollIndex       : 0,
			currentRollStartTime   : 0,
		})
		LaneComponent.LaneGameData.createOrReplace(entity, { laneIndex, startTime: 0, players: [] })
		LaneComponent.LanePhaseEnum.createOrReplace(entity, { phase: LanePhase.NONE })
		LaneComponent.LaneScores.createOrReplace(entity, { scores: [] })
	}


	// MARK: initClient
	/**
	 * Adds a one-shot system that watches for the synced lane entities to arrive
	 * over CRDT, then stores them in `laneComponentEntities[]` keyed by their
	 * `LaneGameData.laneIndex` field. Once all `MAX_LANES` entities are populated,
	 * the system removes itself and any pending `onClientReady()` promises resolve.
	 *
	 * The watcher also emits a periodic progress log so we can see when CRDT
	 * sync is hung (server hasn't started, network issues, etc.) rather than
	 * silently waiting forever.
	 */
	function initClient(): void {
		console.log('ComponentManager: initClient: starting discovery watcher, expecting', GameSettings.MAX_LANES, 'lane entities')
		let tickCount = 0
		const watcher = (): void => {
			tickCount++
			let foundCount = 0
			for (const [entity, gameData] of engine.getEntitiesWith(LaneComponent.LaneGameData)) {
				const laneIndex = gameData.laneIndex
				if (laneIndex < 0 || laneIndex >= GameSettings.MAX_LANES) continue

				if (laneComponentEntities[laneIndex] === undefined) {
					laneComponentEntities[laneIndex] = entity
					console.log('ComponentManager: initClient: discovered lane entity', { laneIndex: laneIndex, entity })
				}
				foundCount++
			}

			if (foundCount >= GameSettings.MAX_LANES) {
				engine.removeSystem(watcher)
				console.log('ComponentManager: initClient: all', GameSettings.MAX_LANES, 'lane entities discovered after', tickCount, 'ticks')
				const resolvers = clientReadyResolvers.splice(0)
				for (const resolve of resolvers) resolve()
				return
			}

			// Approx every 2s at 30 fps. If you keep seeing this log forever, the
			// server isn't producing the synced entities — check server logs.
			if (tickCount % 60 === 0) {
				console.log(`ComponentManager: initClient: still waiting after ${tickCount} ticks, found ${foundCount}/${GameSettings.MAX_LANES} lane entities`)
			}
		}
		engine.addSystem(watcher)
	}


	// MARK: protectServerEntity
	/**
	 * Registers a `validateBeforeChange` hook on each component of `entity` that
	 * rejects any update whose `senderAddress` isn't the authoritative server.
	 * Only meaningful on the server; on the client `validateBeforeChange` is a no-op.
	 */
	function protectServerEntity(
		entity    : Entity,
		components: ComponentWithValidation[]
	): void {
		for (const component of components) {
			component.validateBeforeChange(entity, (value) => {
				return value.senderAddress === AUTH_SERVER_PEER_ID
			})
		}
	}


	// MARK: onClientReady
	/**
	 * Resolves once the client has discovered all `MAX_LANES` synced lane entities
	 * over CRDT. On the server, resolves immediately. Use this to gate any work
	 * that needs entity references (e.g. `MyLane` binding `Component.onChange`).
	 */
	export function onClientReady(): Promise<void> {
		if (isServer() || isReady()) return Promise.resolve()

		return new Promise<void>((resolve) => {
			clientReadyResolvers.push(resolve)
		})
	}


	// MARK: isReady
	/**
	 * Synchronous "have all lane entities been discovered?" check. Mostly intended
	 * for client-side callers that aren't tied to a specific player (e.g. the
	 * debug UI iterating every lane) and need to skip rendering during the brief
	 * window before CRDT sync arrives. Server returns true once `initServer` has run.
	 */
	export function isReady(): boolean {
		return (
			laneComponentEntities.length >= GameSettings.MAX_LANES &&
			laneComponentEntities.every((e) => e !== undefined)
		)
	}


	// MARK: getLaneEntity
	/**
	 * Returns the synced ECS entity that holds the lane's components. Throws if
	 * called before the entity has been discovered — on the server that means
	 * before `initServer` ran; on the client it means before `onClientReady`
	 * resolved. Callers that may run that early MUST gate themselves on
	 * `onClientReady()` (or `isReady()` for non-async paths).
	 */
	export function getLaneEntity(laneIndex: number): Entity {
		const entity = laneComponentEntities[laneIndex]
		if (entity === undefined) {
			throw new Error(`ComponentManager: getLaneEntity: lane ${laneIndex} entity not yet available`)
		}
		return entity
	}


	// MARK: forEachLane
	/**
	 * Iterates every populated lane (laneIndex, entity) pair. Useful for
	 * `LaneStore` operations that need to act on every lane (e.g.
	 * `removePlayerFromAllLanes`, `findLaneByUserId`) without exposing the
	 * underlying entity registry.
	 */
	export function forEachLane(
		fn: (laneIndex: number, entity: Entity) => void
	): void {
		for (let i = 0; i < laneComponentEntities.length; i++) {
			const entity = laneComponentEntities[i]
			if (entity === undefined) continue
			fn(i, entity)
		}
	}
}
