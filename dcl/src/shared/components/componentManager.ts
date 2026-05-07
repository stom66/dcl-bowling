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
	const LANE_ENTITY_SYNC_ENUM_BASE = 1000
	const laneComponentEntities      : (Entity | undefined)[] = []
	const clientReadyResolvers       : Array<() => void>      = [] // Promise resolvers awaiting client-side discovery of all lane entities.
	let isInitialised                : boolean                = false

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
	export function init(): void {
		if (isInitialised) {
			console.log('ComponentManager: init: already initialised, skipping')
			return
		}
		isInitialised = true

		isServer() ? initServer() : initClient()
	}


	// MARK: initServer
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
	// one-shot system that watches for the synced lane entities and stores them in `laneComponentEntities[]` 
	function initClient(): void {
		console.log('ComponentManager: initClient: starting discovery watcher, expecting', GameSettings.MAX_LANES, 'lane entities')
		const watcher = (): void => {
			let foundCount = 0
			for (const [entity, gameData] of engine.getEntitiesWith(LaneComponent.LaneGameData)) {
				const laneIndex = gameData.laneIndex
				if (laneIndex < 0 || laneIndex >= GameSettings.MAX_LANES) continue

				if (laneComponentEntities[laneIndex] === undefined) {
					laneComponentEntities[laneIndex] = entity
					console.log('ComponentManager: initClient: discovered lane entity: ', laneIndex)
				}
				foundCount++
			}

			if (foundCount >= GameSettings.MAX_LANES) {
				engine.removeSystem(watcher)
				console.log('ComponentManager: initClient: all', GameSettings.MAX_LANES, 'lane entities discovered')
				const resolvers = clientReadyResolvers.splice(0)
				for (const resolve of resolvers) resolve()
				return
			}
		}
		engine.addSystem(watcher)
	}


	// MARK: protectServerEntity
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
	export function onClientReady(): Promise<void> {
		if (isServer() || isReady()) return Promise.resolve()

		return new Promise<void>((resolve) => {
			clientReadyResolvers.push(resolve)
		})
	}


	// MARK: isReady
	export function isReady(): boolean {
		return (
			laneComponentEntities.length >= GameSettings.MAX_LANES &&
			laneComponentEntities.every((e) => e !== undefined)
		)
	}


	// MARK: getLaneEntity
	export function getLaneEntity(laneIndex: number): Entity {
		const entity = laneComponentEntities[laneIndex]
		if (entity === undefined) {
			throw new Error(`ComponentManager: getLaneEntity: lane ${laneIndex} entity not yet available`)
		}
		return entity
	}


	// MARK: forEachLane
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
