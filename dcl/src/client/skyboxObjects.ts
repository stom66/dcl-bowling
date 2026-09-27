import { ColliderLayer, engine, Entity, GltfContainer, Transform, Tween } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'

import { balls } from 'src/shared/data/unlocks/balls'
import { getRootPosition } from './data/lanePositions'


/** Alley floor sits near y=20. Orbits stay above the roof. */
const ORBIT_CENTER       = getRootPosition()
const ORBIT_SIZE_X       = [45, 65]
const ORBIT_SIZE_Z       = [45, 65]
const ORBIT_HEIGHT       = [20,20]
const ORBIT_TILT         = [-60, 60]
const ORBIT_ORBIT_SPEED  = [0.05, 0.1]

const CHILD_BALL_CHANCE   = 0.1
const CHILD_BALL_SCALE    = 0.2
const CHILD_BALL_DISTANCE = 0.35


export namespace SkyboxObjects {

	let isInitialized = false


	// MARK: init
	/**
	 * Spawns one model for every ball unlock and sends each on its own orbit above the alley.
	 */
	export function init(): void {
		if (isInitialized) return
		isInitialized = true

		for (const ball of Object.values(balls)) {
			spawnBall(ball.modelSrc)
		}

		console.log('SkyboxObjects: init: spawned', Object.keys(balls).length, 'orbiting balls')
	}


	// MARK: spawnBall
	function spawnBall(modelSrc: string): void {
		const pivot = engine.addEntity()
		Transform.create(pivot, {
			position: ORBIT_CENTER,
			rotation: Quaternion.fromEulerDegrees(randomRange(ORBIT_TILT[0], ORBIT_TILT[1]), 0, 0),
		})

		const spinner = engine.addEntity()
		Transform.create(spinner, { parent: pivot })

		const radiansPerSecond = randomRange(ORBIT_ORBIT_SPEED[0], ORBIT_ORBIT_SPEED[1]) * randomSign()
		Tween.setRotateContinuous(
			spinner,
			Quaternion.fromEulerDegrees(0, 1, 0),
			radiansPerSecond * (180 / Math.PI),
		)

		const scale = randomRange(6, 22)
		const ball  = engine.addEntity()
		Transform.create(ball, {
			parent  : spinner,
			position: Vector3.create(
				randomRange(ORBIT_SIZE_X[0], ORBIT_SIZE_X[1]) * randomSign(),
				randomRange(ORBIT_HEIGHT[0], ORBIT_HEIGHT[1]),
				randomRange(ORBIT_SIZE_Z[0], ORBIT_SIZE_Z[1]) * randomSign(),
			),
			scale: Vector3.create(scale, scale, scale),
		})
		GltfContainer.create(ball, {
			src                         : modelSrc,
			visibleMeshesCollisionMask  : ColliderLayer.CL_NONE,
			invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
		})
		Tween.setRotateContinuous(
			ball,
			Quaternion.fromEulerDegrees(0, 1, 0),
			2 * (180 / Math.PI),
		)
		spawnChildBall(ball)
	}


	// MARK: spawnChildBall
	function spawnChildBall(parent: Entity): void {
		if (Math.random() >= CHILD_BALL_CHANCE) return

		const catalog = Object.values(balls)
		const model   = catalog[Math.floor(Math.random() * catalog.length)]
		if (!model) return

		const angle = Math.random() * Math.PI * 2
		const child = engine.addEntity()
		Transform.create(child, {
			parent  : parent,
			position: Vector3.create(
				Math.cos(angle) * CHILD_BALL_DISTANCE,
				0,
				Math.sin(angle) * CHILD_BALL_DISTANCE,
			),
			scale: Vector3.create(CHILD_BALL_SCALE, CHILD_BALL_SCALE, CHILD_BALL_SCALE),
		})
		GltfContainer.create(child, {
			src                         : model.modelSrc,
			visibleMeshesCollisionMask  : ColliderLayer.CL_NONE,
			invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
		})
	}


	// MARK: randomRange
	function randomRange(
		min: number,
		max: number,
	): number {
		return min + Math.random() * (max - min)
	}


	// MARK: randomSign
	function randomSign(): number {
		return Math.random() < 0.5 ? -1 : 1
	}
}
