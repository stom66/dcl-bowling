import { ColliderLayer, engine, Material, MeshCollider, MeshRenderer, Transform, TriggerArea, triggerAreaEventsSystem } from "@dcl/sdk/ecs"
import { Color3, Color4, Quaternion } from "@dcl/sdk/math"
import { playerMover } from "./playerMover"

export namespace RespawnTrigger {

	const TRIGGER_XZ_SIZE = 256
	const TRIGGER_Y_SIZE  = 10

	const SHOW_TRIGGER    = true

	export function init() {
		const trigger = engine.addEntity()
		Transform.create(trigger, {
			position: { x: 0, y: TRIGGER_Y_SIZE / 2, z: 0 },
			rotation: Quaternion.fromEulerDegrees(0, 0, 0),
			scale   : { x: TRIGGER_XZ_SIZE, y: TRIGGER_Y_SIZE, z: TRIGGER_XZ_SIZE },
		})
		//MeshCollider.setBox(trigger)

		if (SHOW_TRIGGER) {
			MeshRenderer.setBox(trigger)
			Material.setBasicMaterial(trigger, {
				diffuseColor: Color4.Red()
			})
		}

		TriggerArea.create(trigger, {
			collisionMask: ColliderLayer.CL_MAIN_PLAYER,
		})

		triggerAreaEventsSystem.onTriggerEnter(trigger, (result) => {
			// Only local player
			if (result.trigger?.entity !== engine.PlayerEntity) return

			console.log('Player entered trigger area!')

			// Teleport the player to the respawn point
			playerMover.movePlayerToSpawnPoint()

		  })
	}
}