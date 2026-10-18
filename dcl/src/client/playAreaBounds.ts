import { engine, Transform } from '@dcl/sdk/ecs'

import { getRootPosition } from 'src/client/data/lanePositions'
import { playerMover } from 'src/client/playerMover'


export namespace PlayAreaBounds {

	/** Seconds between boundary samples. */
	const CHECK_INTERVAL = 0.5

	/** Scene-space floor. Below this the player has left the alley. */
	const MIN_Y = 64

	/**
	 * Horizontal radius of the skybox sphere.
	 * Taken from the `skybox.gltf` POSITION accessor X/Z extent.
	 */
	const SKYBOX_RADIUS = 126.36557

	let isInitialized = false
	let elapsed       = 0


	// MARK: init
	/**
	 * Starts the play-area check. Players below {@link MIN_Y}, or farther from
	 * the alley center than {@link SKYBOX_RADIUS} on XZ, are sent back to spawn.
	 */
	export function init(): void {
		if (isInitialized) return
		isInitialized = true

		engine.addSystem(sys_checkBounds)
	}


	// MARK: sys_checkBounds
	/**
	 * Accumulates frame time and runs {@link checkBounds} once
	 * {@link CHECK_INTERVAL} elapses.
	 */
	function sys_checkBounds(dt: number): void {
		elapsed += dt
		if (elapsed < CHECK_INTERVAL) return

		elapsed = 0
		checkBounds()
	}


	// MARK: checkBounds
	/**
	 * Teleports the local player to spawn when they are below the floor or
	 * outside the skybox on the horizontal plane.
	 */
	function checkBounds(): void {
		const transform = Transform.getOrNull(engine.PlayerEntity)
		if (!transform) return

		const position = transform.position
		const center   = getRootPosition()
		const distance = Math.hypot(position.x - center.x, position.z - center.z)
		if (position.y >= MIN_Y && distance <= SKYBOX_RADIUS) return

		console.log('PlayAreaBounds: checkBounds: player outside play area', position)
		playerMover.movePlayerToSpawnPoint()
	}
}
