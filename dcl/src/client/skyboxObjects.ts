import * as utils from '@dcl-sdk/utils'
import { ColliderLayer, EasingFunction, engine, Entity, GltfContainer, ParticleSystem, PBParticleSystem, PBParticleSystem_BlendMode, PBParticleSystem_PlaybackState, PBParticleSystem_SimulationSpace, Transform, Tween, TweenSequence } from '@dcl/sdk/ecs'
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { getPlatform, isMobile } from '@dcl/sdk/platform'

import { balls } from 'src/shared/data/unlocks/balls'
import { GameSettings } from 'src/shared/settings'

import { getRootPosition } from 'src/client/data/lanePositions'
import { ParticleSpawner } from 'src/client/particleSpawner'


/** Alley floor sits near y=20. Orbits stay above the roof. */
const ORBIT_CENTER             = getRootPosition()
const ORBIT_SIZE_X             = [45, 65]
const ORBIT_SIZE_Z             = [45, 65]
const ORBIT_HEIGHT             = [20,20]
const ORBIT_TILT               = [-60, 60]
const ORBIT_ORBIT_SPEED        = [0.05, 0.1]

const CHILD_BALL_CHANCE         = 0.2
const CHILD_BALL_SCALE          = 0.2
const CHILD_BALL_DISTANCE       = 0.35
/** Degrees off the planet's orbital plane, so the moon stays out of the dust wake. */
const CHILD_ORBIT_INCLINATION   = [55, 80]
/** Radians per second around the tilted axis. */
const CHILD_ORBIT_SPEED         = 2
/** ParticleSystem ignores Transform.scale, so moon dust is sized explicitly. */
const CHILD_PARTICLE_SIZE_SCALE = 3
/** One planet's particle share. A quarter of that was about 2 particles per second. */
const CHILD_PARTICLE_RATIO      = 1

/** Unscaled bowling-ball mesh radius. Skybox `scale` is applied on top. */
const BALL_MODEL_RADIUS        = 0.125

/** Drop the authored model at this path. Nose should face +Z. */
const METEOR_MODEL_SRC         = 'assets/models/astro-pigeon.gltf'
/**
 * Radius is world height at the peak. Pivot sits on the alley root, so this
 * must stay under the scene height cap (~74m of sky above y=128).
 */
const METEOR_RADIUS            = 60
const METEOR_SCALE             = 4
/** Start/end below the horizon. 270° is three-quarters of a circle. */
const METEOR_START_DEGREES     = -135
const METEOR_END_DEGREES       = 135
const METEOR_ARC_DEGREES       = METEOR_END_DEGREES - METEOR_START_DEGREES
/** Time to cross the visible 180° sky. Full sweep is scaled from this. */
const METEOR_SWEEP_MS          = 6000
const METEOR_DURATION_MS       = METEOR_SWEEP_MS * (METEOR_ARC_DEGREES / 180)
const METEOR_TRAIL_RATE        = 2
const METEOR_FACE_TRAVEL       = Quaternion.lookRotation(Vector3.create(-1, 0, 0), Vector3.Up())

//const PARTICLE_TRAIL_TEXTURE = 'assets/images/unlocks/trails/sprites-dust.png'
/** Live particles shared equally by the orbiting balls. Meteor and child trails scale one ball's share. */
const SKYBOX_PARTICLE_MAX_COUNT = 512
const PARTICLE_TRAIL_LIFESPAN   = 2
/** Half a planet trail. Emission rate doubles; the live count stays the same. */
const CHILD_PARTICLE_LIFESPAN   = PARTICLE_TRAIL_LIFESPAN / 2


export namespace SkyboxObjects {

	let isInitialized = false


	// MARK: init
	/**
	 * Spawns one model for every ball unlock, sends each on its own orbit
	 * above the alley, and starts the periodic one-shot meteor.
	 * Skips all of that on mobile, after the explorer has reported its platform.
	 */
	export async function init(): Promise<void> {
		if (isInitialized) return
		isInitialized = true

		await waitForPlatform()
		if (isMobile()) {
			console.log('SkyboxObjects: init: skipped on mobile')
			return
		}

		for (const ball of Object.values(balls)) {
			spawnBall(ball.modelSrc)
		}

		fireMeteor()
		utils.timers.setInterval(fireMeteor, GameSettings.SKYBOX_METEOR_INTERVAL)

		console.log('SkyboxObjects: init: spawned', Object.keys(balls).length, 'orbiting balls; meteor every', GameSettings.SKYBOX_METEOR_INTERVAL, 'ms')
	}


	// MARK: waitForPlatform
	/**
	 * Resolves once `getPlatform()` is non-null. Until then `isMobile()` is false
	 * on every platform, including mobile.
	 */
	function waitForPlatform(): Promise<void> {
		if (getPlatform() !== null) return Promise.resolve()

		return new Promise((resolve) => {
			function sys_waitForPlatform(): void {
				if (getPlatform() === null) return
				engine.removeSystem(sys_waitForPlatform)
				resolve()
			}

			engine.addSystem(sys_waitForPlatform)
		})
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
			visibleMeshesCollisionMask  : ColliderLayer.CL_PHYSICS
		})
		Tween.setRotateContinuous(
			ball,
			Quaternion.fromEulerDegrees(0, 1, 0),
			2 * (180 / Math.PI),
		)
		attachDustTrail(ball, scale)
		spawnChildBall(ball, spinner, scale)
	}


	// MARK: fireMeteor
	/**
	 * Spawns a meteor on a root-centered spinner, sweeps it from below one
	 * horizon to below the other, then deletes the entities after the trail fades.
	 */
	function fireMeteor(): void {
		const pivot = engine.addEntity()
		Transform.create(pivot, {
			position: ORBIT_CENTER,
			rotation: Quaternion.fromEulerDegrees(0, randomRange(0, 360), 0),
		})

		const stepMs  = METEOR_DURATION_MS / 3
		const startZ  = METEOR_START_DEGREES
		const midA    = METEOR_START_DEGREES + METEOR_ARC_DEGREES / 3
		const midB    = METEOR_START_DEGREES + METEOR_ARC_DEGREES * 2 / 3
		const endZ    = METEOR_END_DEGREES

		const spinner = engine.addEntity()
		Transform.create(spinner, {
			parent  : pivot,
			rotation: Quaternion.fromEulerDegrees(0, 0, startZ),
		})
		Tween.create(spinner, {
			mode           : Tween.Mode.Rotate({
				start: Quaternion.fromEulerDegrees(0, 0, startZ),
				end  : Quaternion.fromEulerDegrees(0, 0, midA),
			}),
			duration       : stepMs,
			easingFunction : EasingFunction.EF_LINEAR,
		})
		TweenSequence.create(spinner, {
			sequence: [
				{
					mode           : Tween.Mode.Rotate({
						start: Quaternion.fromEulerDegrees(0, 0, midA),
						end  : Quaternion.fromEulerDegrees(0, 0, midB),
					}),
					duration       : stepMs,
					easingFunction : EasingFunction.EF_LINEAR,
				},
				{
					mode           : Tween.Mode.Rotate({
						start: Quaternion.fromEulerDegrees(0, 0, midB),
						end  : Quaternion.fromEulerDegrees(0, 0, endZ),
					}),
					duration       : stepMs,
					easingFunction : EasingFunction.EF_LINEAR,
				},
			],
		})

		const meteor = engine.addEntity()
		Transform.create(meteor, {
			parent  : spinner,
			position: Vector3.create(0, METEOR_RADIUS, 0),
			rotation: METEOR_FACE_TRAVEL,
			scale   : Vector3.create(METEOR_SCALE, METEOR_SCALE, METEOR_SCALE),
		})
		GltfContainer.create(meteor, {
			src                         : METEOR_MODEL_SRC,
			visibleMeshesCollisionMask  : ColliderLayer.CL_NONE,
			invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
		})
		const trail = attachDustTrail(meteor, METEOR_SCALE, METEOR_TRAIL_RATE)

		utils.timers.setTimeout(() => {
			ParticleSpawner.stop(trail)
			utils.timers.setTimeout(() => {
				if (trail) engine.removeEntity(trail)
				engine.removeEntity(meteor)
				engine.removeEntity(spinner)
				engine.removeEntity(pivot)
			}, PARTICLE_TRAIL_LIFESPAN * 1000)
		}, METEOR_DURATION_MS)

		console.log('SkyboxObjects: fireMeteor: launched meteor')
	}


	// MARK: attachDustTrail
	/**
	 * Soft glowing dust left in a ball's wake. `scale` is world visual scale —
	 * ParticleSystem ignores Transform.scale, so this must already include parent scale.
	 * `sizeScale` multiplies particle size only, not the emitter radius.
	 */
	function attachDustTrail(
		ball         : Entity,
		scale        : number,
		particleRatio: number = 1,
		sizeScale    : number = 1,
		lifetime     : number = PARTICLE_TRAIL_LIFESPAN,
	): Entity | undefined {
		return ParticleSpawner.spawn(dustConfig(scale, particleRatio, sizeScale, lifetime), {
			parent: ball,
		})
	}


	// MARK: dustConfig
	function dustConfig(
		scale        : number,
		particleRatio: number,
		sizeScale    : number,
		lifetime     : number,
	): PBParticleSystem {
		const radius       = BALL_MODEL_RADIUS * scale
		const maxParticles = particlesPerBall() * particleRatio
		const particleSize = radius * sizeScale
		return {
			active               : true,
			loop                 : true,
			prewarm              : true,
			rate                 : maxParticles / lifetime,
			lifetime             : lifetime,
			maxParticles         : maxParticles,
			gravity              : 0,
			blendMode            : PBParticleSystem_BlendMode.PSB_ALPHA,
			shape                : ParticleSystem.Shape.Sphere({ radius: radius * 0.85 }),
			initialVelocitySpeed : { start: 0.04, end: 0.18 },
			initialSize          : { start: particleSize * 0.01, end: particleSize * 0.125 },
			sizeOverTime         : { start: 1, end: 0 },
			initialColor         : {
				start : Color4.create(1.00, 0.96, 0.82, 0.42),
				end   : Color4.create(1.00, 0.88, 0.62, 0.28),
			},
			//colorOverTime        : {
			//	start : Color4.create(1.00, 0.95, 0.80, 0.38),
			//	end   : Color4.create(1.00, 0.82, 0.55, 0.00),
			//},
			billboard            : true,
			faceTravelDirection  : false,
			simulationSpace      : PBParticleSystem_SimulationSpace.PSS_WORLD,
			//texture              : { src: DUST_TEXTURE },
			//spriteSheet          : { tilesX: 6, tilesY: 6, framesPerSecond: 15 },
			playbackState        : PBParticleSystem_PlaybackState.PS_PLAYING,
		}
	}


	// MARK: particlesPerBall
	/**
	 * One orbiting ball's share of {@link SKYBOX_PARTICLE_MAX_COUNT}.
	 */
	function particlesPerBall(): number {
		const ballCount = Object.keys(balls).length
		if (ballCount <= 0) return 0
		return SKYBOX_PARTICLE_MAX_COUNT / ballCount
	}


	// MARK: spawnChildBall
	/**
	 * Moon on a tilted orbit around the planet, clear of the planet's dust wake.
	 * The rig is a sibling of the planet so the planet's own spin does not flatten the orbit.
	 */
	function spawnChildBall(
		planet     : Entity,
		orbitParent: Entity,
		planetScale: number,
	): void {
		if (Math.random() >= CHILD_BALL_CHANCE) return

		const catalog = Object.values(balls)
		const model   = catalog[Math.floor(Math.random() * catalog.length)]
		if (!model) return

		const planetPosition = Transform.get(planet).position
		const inclination    = randomRange(CHILD_ORBIT_INCLINATION[0], CHILD_ORBIT_INCLINATION[1]) * randomSign()
		const worldScale     = planetScale * CHILD_BALL_SCALE

		const moonPivot = engine.addEntity()
		Transform.create(moonPivot, {
			parent  : orbitParent,
			position: planetPosition,
			rotation: Quaternion.fromEulerDegrees(inclination, 0, 0),
		})

		const moonSpinner = engine.addEntity()
		Transform.create(moonSpinner, {
			parent  : moonPivot,
			rotation: Quaternion.fromEulerDegrees(0, randomRange(0, 360), 0),
		})
		Tween.setRotateContinuous(
			moonSpinner,
			Quaternion.fromEulerDegrees(0, 1, 0),
			CHILD_ORBIT_SPEED * randomSign() * (180 / Math.PI),
		)

		const child = engine.addEntity()
		Transform.create(child, {
			parent  : moonSpinner,
			position: Vector3.create(CHILD_BALL_DISTANCE * planetScale, 0, 0),
			scale   : Vector3.create(worldScale, worldScale, worldScale),
		})
		GltfContainer.create(child, {
			src                         : model.modelSrc,
			visibleMeshesCollisionMask  : ColliderLayer.CL_NONE,
			invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
		})

		attachDustTrail(child, worldScale, CHILD_PARTICLE_RATIO, CHILD_PARTICLE_SIZE_SCALE, CHILD_PARTICLE_LIFESPAN)
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
