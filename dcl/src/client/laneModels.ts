import { Animator, engine, Entity, GltfContainer, Transform } from "@dcl/sdk/ecs"
import { Quaternion } from "@dcl/sdk/math"

import { ComponentStore } from "src/shared/components/componentStore"
import { LaneBumpers } from "src/shared/components/definitions/shared.lane"
import { DEFAULT_LANE_ID, getLaneModelSrc } from "src/shared/data/unlocks"
import { resolvePlayerLoadout } from "src/shared/data/unlocks/resolveLoadout"
import { LaneStore } from "src/shared/laneStore"
import { GameSettings } from "src/shared/settings"
import { LaneSnapshot, NotifyPlayerRollStartPayload } from "src/shared/types/shared-types"
import { ClientEvents, eventBus } from "src/shared/utils/eventBus"

import { lanePositions } from "src/client/data/lanePositions"


export type LaneClipName = 'idle' | 'down' | 'up'

const BUMPER_MODEL_SRC = 'assets/models/lanes/lane_bumpers.gltf'


/**
 * Always-visible lane meshes at each lane root. The floor/lane GLTF can swap
 * with a player's equipped lane; bumpers are a shared animated model that does
 * not change with lane type.
 */
export namespace LaneModels {

	const laneEntities  : (Entity | undefined)[] = new Array(GameSettings.MAX_LANES).fill(undefined)
	const bumperEntities: (Entity | undefined)[] = new Array(GameSettings.MAX_LANES).fill(undefined)
	const bumperRaised  : boolean[]              = new Array(GameSettings.MAX_LANES).fill(false)

	const BUMPER_ANIMATOR_STATES = [
		{ clip: 'idle', playing: true,  loop: true  },
		{ clip: 'down', playing: false, loop: false },
		{ clip: 'up',   playing: false, loop: false },
	]


	// MARK: init
	/**
	 * Spawns the default lane and bumper models at every lane root, then binds
	 * turn swap/restore for the lane mesh only.
	 */
	export function init(): void {
		for (let laneIndex = 0; laneIndex < GameSettings.MAX_LANES; laneIndex++) {
			spawnLane(laneIndex)
			spawnBumpers(laneIndex)
			bindBumperState(laneIndex)
		}

		eventBus.on(ClientEvents.ON_MY_ROLL_START,            applyForRoll)
		eventBus.on(ClientEvents.ON_GROUP_ROLL_START,         applyForRoll)
		eventBus.on(ClientEvents.ON_NON_GROUP_ROLL_START,     applyForRoll)
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,           restoreFromSnapshot)
		eventBus.on(ClientEvents.ON_NON_GROUP_GAME_END,       restoreFromSnapshot)
	}


	// MARK: spawnLane
	function spawnLane(laneIndex: number): void {
		if (laneEntities[laneIndex] !== undefined) return

		const entity = createRootEntity(laneIndex, getLaneModelSrc(DEFAULT_LANE_ID))
		if (entity === undefined) return
		laneEntities[laneIndex] = entity
	}


	// MARK: spawnBumpers
	function spawnBumpers(laneIndex: number): void {
		if (bumperEntities[laneIndex] !== undefined) return

		const entity = createRootEntity(laneIndex, BUMPER_MODEL_SRC)
		if (entity === undefined) return

		applyBumperAnimator(entity)
		bumperEntities[laneIndex] = entity
	}


	// MARK: createRootEntity
	function createRootEntity(
		laneIndex : number,
		src       : string
	): Entity | undefined {
		const position = lanePositions[laneIndex]
		if (!position) {
			console.error('LaneModels: createRootEntity: missing lane position', laneIndex)
			return undefined
		}

		const entity = engine.addEntity()
		Transform.create(entity, {
			position,
			rotation: Quaternion.fromEulerDegrees(0, 180, 0),
		})
		GltfContainer.create(entity, { src })
		return entity
	}


	// MARK: applyBumperAnimator
	function applyBumperAnimator(entity: Entity): void {
		Animator.createOrReplace(entity, {
			states: BUMPER_ANIMATOR_STATES.map((state) => ({ ...state })),
		})
	}


	// MARK: playAnimation
	/**
	 * Plays a bumper clip on `laneIndex`. Idle loops; up/down play once.
	 */
	export function playAnimation(
		laneIndex : number,
		clip      : LaneClipName
	): void {
		const entity = bumperEntities[laneIndex]
		if (entity === undefined) {
			console.error('LaneModels: playAnimation: no bumper entity', laneIndex)
			return
		}

		Animator.playSingleAnimation(entity, clip, true)
	}


	// MARK: bindBumperState
	/**
	 * Plays `up` / `down` when the synced bumper flag for `laneIndex` changes.
	 */
	function bindBumperState(laneIndex: number): void {
		ComponentStore.onChange(LaneBumpers, (data) => {
			const enabled = data?.enabled ?? false
			if (enabled === bumperRaised[laneIndex]) return

			bumperRaised[laneIndex] = enabled
			console.log('LaneModels: bindBumperState: lane', laneIndex, 'enabled', enabled)
			playAnimation(laneIndex, enabled ? 'up' : 'down')
		}, { key: String(laneIndex) })
	}


	// MARK: applyForRoll
	function applyForRoll(data: NotifyPlayerRollStartPayload): void {
		const laneIndex = LaneStore.findLaneByUserId(data.userId)
		if (laneIndex === undefined) {
			console.error('LaneModels: applyForRoll: laneIndex not found', data.userId)
			return
		}

		const loadout = resolvePlayerLoadout(data.userId)
		setLaneSrc(laneIndex, getLaneModelSrc(loadout.laneId))
	}


	// MARK: restoreFromSnapshot
	function restoreFromSnapshot(data: LaneSnapshot): void {
		restore(data.laneIndex)
	}


	// MARK: restore
	/**
	 * Puts the default lane model back on `laneIndex`. Bumpers are unchanged.
	 */
	export function restore(laneIndex: number): void {
		setLaneSrc(laneIndex, getLaneModelSrc(DEFAULT_LANE_ID))
	}


	// MARK: setLaneSrc
	function setLaneSrc(
		laneIndex : number,
		src       : string
	): void {
		spawnLane(laneIndex)

		const entity = laneEntities[laneIndex]
		if (entity === undefined) return

		const gltf = GltfContainer.getMutableOrNull(entity)
		if (!gltf) {
			GltfContainer.create(entity, { src })
			return
		}
		if (gltf.src === src) return
		gltf.src = src
	}

}
