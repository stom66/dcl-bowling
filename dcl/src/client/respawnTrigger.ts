import { ColliderLayer, engine, Material, MeshRenderer, Transform, TriggerArea, triggerAreaEventsSystem } from "@dcl/sdk/ecs"
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math"

import { getRootPosition } from "src/client/data/lanePositions"
import { playerMover } from "src/client/playerMover"


export namespace RespawnTrigger {

	/** scene.json parcels -16..16 on both axes, base 0,0. Each parcel is 16 m. */
	const PARCEL_METERS   = 16
	const PARCEL_MIN      = -16
	const PARCEL_MAX      = 16
	const SCENE_MIN       = PARCEL_MIN * PARCEL_METERS
	const SCENE_MAX       = (PARCEL_MAX + 1) * PARCEL_METERS
	const TRIGGER_XZ_SIZE = SCENE_MAX - SCENE_MIN
	const TRIGGER_CENTER  = (SCENE_MIN + SCENE_MAX) / 2
	const TRIGGER_Y_SIZE  = 10

	/** scene.json spawn is x/z -5..5. Top face is the walkable height at the spawn. */
	const SPAWN_PAD_XZ  = 9.25
	const SPAWN_PAD_Y   = 2
	const SPAWN_PAD_TOP = 129
	const SPAWN_PAD_YAW = 45

	const SHOW_TRIGGER = false


	// MARK: init
	/**
	 * Builds the scene-wide pit and the pad under the spawn point.
	 * Either volume sends the local player back to the spawn point.
	 */
	export function init(): void {
		createVolume(
			Vector3.create(TRIGGER_CENTER, TRIGGER_Y_SIZE / 2, TRIGGER_CENTER),
			Vector3.create(TRIGGER_XZ_SIZE, TRIGGER_Y_SIZE, TRIGGER_XZ_SIZE),
			Color4.Red(),
			0,
		)

		const root = getRootPosition()
		createVolume(
			Vector3.create(root.x+0.25, SPAWN_PAD_TOP - SPAWN_PAD_Y / 2, root.z),
			Vector3.create(SPAWN_PAD_XZ, SPAWN_PAD_Y, SPAWN_PAD_XZ),
			Color4.Yellow(),
			SPAWN_PAD_YAW,
		)
	}


	// MARK: createVolume
	/**
	 * Adds a trigger box that respawns the local player on enter.
	 */
	function createVolume(
		position  : Vector3,
		scale     : Vector3,
		color     : Color4,
		yawDegrees: number,
	): void {
		const trigger = engine.addEntity()
		Transform.create(trigger, {
			position,
			rotation: Quaternion.fromEulerDegrees(0, yawDegrees, 0),
			scale,
		})

		if (SHOW_TRIGGER) {
			MeshRenderer.setBox(trigger)
			Material.setBasicMaterial(trigger, {
				diffuseColor: color,
			})
		}

		TriggerArea.create(trigger, {
			collisionMask: ColliderLayer.CL_MAIN_PLAYER,
		})

		triggerAreaEventsSystem.onTriggerEnter(trigger, (result) => {
			if (result.trigger?.entity !== engine.PlayerEntity) return

			console.log("RespawnTrigger: onTriggerEnter: player entered respawn volume")
			playerMover.movePlayerToSpawnPoint()
		})
	}
}
