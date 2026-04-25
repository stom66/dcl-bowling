import { QuaternionType, Vector3Type } from '@dcl/sdk/ecs'
import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { Body, Box, Cylinder, Material, Quaternion as CannonQuaternion, Sphere, Vec3, World} from 'cannon-es'

import collidersData from 'src/shared/data/lane-colliders.json'
import pinColliderData from 'src/shared/data/pin-colliders.json'
import { SimObjectKeyframe, SimObjectKeyframes } from '../types'
import { GameSettings } from '../settings'

export type CannonSimObjectState = {
	id      : number
	position: Vector3
	rotation: Quaternion
	velocity: Vector3
}

export type CannonSimAdvanceResult = {
	ball: CannonSimObjectState
	pins: CannonSimObjectState[]
}


export type CannonSimResults = {
	ballKeyframes: SimObjectKeyframes
	pinsKeyframes: SimObjectKeyframes[]
	finalPinStates: boolean[]
}


interface LaneColliderEntry {
	obj_name   : string
	position   : [number, number, number]
	type       : string
	shape      : string
	friction   : number
	restitution: number
	mass       : number
	dimensions : [number, number, number]
	rotation   : [number, number, number, number]
}

/** Matches `pin-colliders.json`; `resolveJsonModule` infers tuples as `number[]` / `number[][]`. */
interface PinColliderFile {
	_comment?    : string
	cylinder     : {
		radiusTop   : number
		radiusBottom: number
		height      : number
		numSegments : number
		friction    : number
		restitution : number
		mass        : number
	}
	positions    : number[][]
}

const collidersJson = collidersData as LaneColliderEntry[]
const pinCfg = pinColliderData as PinColliderFile

const BALL_MASS      = 15
const BOWL_SPEED_MIN = 5
const BOWL_SPEED_MAX = 20




/** Lane-local pin rest positions (same order as simulation bodies). */
export const PIN_LANE_LOCAL_POSITIONS: ReadonlyArray<ReadonlyArray<number>> = pinCfg.positions

export class CannonSim {
	private world: World
	private ballBody: Body
	private pinBodies: Body[]

	constructor(
		position : Vector3, 
		direction: Vector3, 
		strength : number,
		pinStates: boolean[] = Array(PIN_LANE_LOCAL_POSITIONS.length).fill(true) // default all pins standing
	) {
		// Create the world
		this.world = new World({
			gravity: new Vec3(0, -9.82, 0)
		})

		// Create the alley colliders
		for (const c of collidersJson) {
			if (c.shape !== 'BOX') continue

			const halfExtents = new Vec3(
				c.dimensions[0] * 0.5,
				c.dimensions[1] * 0.5,
				c.dimensions[2] * 0.5
			)
			const shapeMat = new Material({
				friction: c.friction,
				restitution: c.restitution
			})
			const shape = new Box(halfExtents)
			shape.material = shapeMat

			const body = new Body({
				type: Body.STATIC,
				material: shapeMat,
				position: new Vec3(c.position[0], c.position[1], c.position[2]),
				quaternion: new CannonQuaternion(c.rotation[0], c.rotation[1], c.rotation[2], c.rotation[3])
			})
			body.addShape(shape)
			this.world.addBody(body)
		}

		// Create the pin bodies
		const pc = pinCfg.cylinder
		const pinShapeMat = new Material({
			friction   : pc.friction,
			restitution: pc.restitution
		})
		const pinMass = pc.mass

		this.pinBodies = []
		for (let i = 0; i < PIN_LANE_LOCAL_POSITIONS.length; i++) {
			// ignore the pin if it's knocked down
			if (!pinStates[i]) continue

			if (!PIN_LANE_LOCAL_POSITIONS[i]) {
				console.error(`cannon-sim: constructor: pin position not found for pin index ${i}`)
				continue
			}

			const pos = PIN_LANE_LOCAL_POSITIONS[i]
			const cyl = new Cylinder(
				pc.radiusTop,
				pc.radiusBottom,
				pc.height,
				pc.numSegments
			)
			cyl.material = pinShapeMat
			const pinBody = new Body({
				mass          : pinMass,
				position      : new Vec3(pos[0], pos[1], pos[2]),
				quaternion    : new CannonQuaternion(0, 0, 0, 1),
				linearDamping : 0.05,
				angularDamping: 0.2
			})
			pinBody.addShape(cyl)
			pinBody.id = i
			this.world.addBody(pinBody)
			this.pinBodies.push(pinBody)
		}

		// Create the ball
		const ballRadius = 0.1
		const ballShape  = new Sphere(ballRadius)
		this.ballBody    = new Body({
			mass          : BALL_MASS,
			position      : new Vec3(position.x, position.y, position.z),
			linearDamping : 0.01,
			angularDamping: 0.02,
			material      : new Material({ friction: 0.2, restitution: 0.05 })
		})
		this.ballBody.addShape(ballShape)
		this.ballBody.id = 0 // not used, but needed for the type
		this.world.addBody(this.ballBody)

		// Fire the ball
		const dx = direction.x
		const dy = direction.y
		const dz = direction.z
		const len = Math.sqrt(dx * dx + dy * dy + dz * dz)
		if (len > 1e-6) {
			const t = Math.max(0, Math.min(1, strength))
			const speed = BOWL_SPEED_MIN + t * (BOWL_SPEED_MAX - BOWL_SPEED_MIN)
			const impulseMag = BALL_MASS * speed
			const s = impulseMag / len
			this.ballBody.applyImpulse(new Vec3(dx * s, dy * s, dz * s))
		}
	}

	dispose(): void {}

	advance(dt: number): CannonSimAdvanceResult {
		// This simulation runs in a tight offline loop, so we must advance by an
		// explicit fixed timestep rather than using wall-clock based stepping.
		this.world.step(dt)
		return {
			ball: this.getBodyTransform(this.ballBody),
			pins: this.pinBodies.map((b) => this.getBodyTransform(b))
		}
	}

	simulate(duration: number): CannonSimResults {
		const simStartTime = Date.now()

		var framesWithNovelocity = 0
		const STEP_TIME = 1 / GameSettings.SIM_FRAME_RATE
		const STEPS     = Math.floor(duration / STEP_TIME)
		const simResults: CannonSimResults = {
			ballKeyframes: {
				index: 0,
				keyframes: []
			},
			pinsKeyframes: Array.from({ length: PIN_LANE_LOCAL_POSITIONS.length }, (_, i) => ({
				index: i,
				keyframes: []
			}))
			,
			finalPinStates: Array.from({ length: PIN_LANE_LOCAL_POSITIONS.length }, () => true)
		}

		const setupDuration = Date.now() - simStartTime
		console.log(`cannon-sim: setup finished after: ${setupDuration}ms`)

		for (let i = 0; i < STEPS; i++) {
			var hasVelocity = false

			const step: CannonSimAdvanceResult = this.advance(STEP_TIME)
			
			// Add the ball keyframes
			const ballKeyframe: SimObjectKeyframe = {
				time    : this.world.time,
				position: roundVector3(step.ball.position),
				rotation: roundQuaternion(step.ball.rotation)
			}
			simResults.ballKeyframes.keyframes.push(ballKeyframe)

			if (Vector3.lengthSquared(step.ball.velocity) > GameSettings.SIM_KEYFRAME_REDUCTION_EPSILON) {
				hasVelocity = true
			}

			// Add the pin keyframes
			for (let j = 0; j < step.pins.length; j++) {
				const pin = step.pins[j]
				if (!pin) continue
				const pinKeyframe: SimObjectKeyframe = {
					time    : this.world.time,
					position: roundVector3(pin.position),
					rotation: roundQuaternion(pin.rotation)
				}
				simResults.pinsKeyframes[pin.id].keyframes.push(pinKeyframe)

				if (!hasVelocity) {		
					if (Vector3.lengthSquared(pin.velocity) > GameSettings.SIM_KEYFRAME_REDUCTION_EPSILON) {
						hasVelocity = true
					}
				}
			}

			if (!hasVelocity) {
				framesWithNovelocity++
			} else {
				framesWithNovelocity = 0
			}

			if (framesWithNovelocity > GameSettings.SIM_FRAMES_WITH_NO_VELOCITY_THRESHOLD) {
				console.log(`cannon-sim: stopping simulation at frame ${i} because it has been running for too long`)
				break
			}
		}
		
		const simulationDuration = Date.now() - simStartTime
		console.log(`cannon-sim: simulation finished after: ${simulationDuration}ms`)

		// Now work out  which of the pins are no longer standing
		for (const pinKeyframes of simResults.pinsKeyframes) {
			// get the last keyframes
			const index = pinKeyframes.index
			const lastKeyframe = pinKeyframes.keyframes[pinKeyframes.keyframes.length - 1]

			if (!lastKeyframe.position || lastKeyframe.position.y < 0.2) {
				simResults.finalPinStates[index] = false
			}
		}
		
		const finalPinStatesDuration = Date.now() - simStartTime
		console.log(`cannon-sim: finalPinStates finished after: ${finalPinStatesDuration}ms`)


		const optimisedSimResults = this.optimise(simResults)
		
		const optimisationDuration = Date.now() - simStartTime
		console.log(`cannon-sim: optimisation finished after: ${optimisationDuration}ms`)
		return optimisedSimResults
	}


	// MARK: Optimise
	optimise(simResults: CannonSimResults): CannonSimResults {
		const startTime = Date.now()
		const optimisedBallKeyframes = this.reduceKeyframes(simResults.ballKeyframes.keyframes)
		const optimisedPinsKeyframes = simResults.pinsKeyframes.map((pin) => ({
			index    : pin.index,
			keyframes: this.reduceKeyframes(pin.keyframes)
		}))

		const optimisedResults: CannonSimResults = {
			ballKeyframes: {
				index: simResults.ballKeyframes.index,
				keyframes: optimisedBallKeyframes
			},
			pinsKeyframes: optimisedPinsKeyframes,
			finalPinStates: simResults.finalPinStates
		}

		const originalKeyframes  = countKeyframes(simResults)
		const optimisedKeyframes = countKeyframes(optimisedResults)
		const ballOriginal       = simResults.ballKeyframes.keyframes.length
		const ballOptimised      = optimisedBallKeyframes.length
		console.log(`cannon-sim: optimise: ball keyframes ${ballOriginal} -> ${ballOptimised} (${ballOriginal - ballOptimised} removed)`)

		for (const [i, pin] of simResults.pinsKeyframes.entries()) {
			const startTimePin = Date.now()
			
			const optimisedPin      = optimisedPinsKeyframes[i]
			const originalPinCount  = pin.keyframes.length
			const optimisedPinCount = optimisedPin?.keyframes.length ?? 0

			const pinDuration = Date.now() - startTimePin
			console.log(`cannon-sim: optimise: pin ${pin.index} keyframes ${originalPinCount} -> ${optimisedPinCount} (${originalPinCount - optimisedPinCount} removed) in ${pinDuration}ms`)
		}

		const duration = Date.now() - startTime
		console.log(`cannon-sim: optimise: original keyframes ${originalKeyframes}, optimised keyframes ${optimisedKeyframes}, duration ${duration}ms`)

		return optimisedResults
	}

	// MARK: Helpers
	private getBodyTransform(body: Body): CannonSimObjectState {
		const p = body.position
		const q = body.quaternion
		const v = body.velocity
		return {
			id      : body.id,
			position: Vector3.create(p.x, p.y, p.z),
			rotation: Quaternion.create(q.x, q.y, q.z, q.w),
			velocity: Vector3.create(v.x, v.y, v.z)
		}
	}
	

	// MARK: reduceKeyframes
	private reduceKeyframes(keyframes: SimObjectKeyframe[]): SimObjectKeyframe[] {
		const reducedKeyframes: SimObjectKeyframe[] = []
		for (const [i, keyframe] of keyframes.entries()) {
			const newKeyframe: SimObjectKeyframe = {
				time    : keyframe.time
			}

			const previousPosition = keyframes[i - 1]?.position
			const currentPosition  = keyframe.position!
			const nextPosition     = keyframes[i + 1]?.position

			if (!previousPosition || !nextPosition) {
				newKeyframe.position = currentPosition
			} else if (
				!areVectorsEqual(previousPosition, currentPosition) ||
				!areVectorsEqual(currentPosition, nextPosition)
			) {
				newKeyframe.position = currentPosition
			}
			
			const previousRotation = keyframes[i - 1]?.rotation
			const currentRotation = keyframe.rotation!
			const nextRotation = keyframes[i + 1]?.rotation
			if (!previousRotation || !nextRotation) {
				newKeyframe.rotation = currentRotation
			} else if (
				!areQuaternionsEqual(previousRotation, currentRotation) ||
				!areQuaternionsEqual(currentRotation, nextRotation)
			) {
				newKeyframe.rotation = currentRotation
			}

			if (newKeyframe.position !== undefined || newKeyframe.rotation !== undefined) {
				reducedKeyframes.push(newKeyframe)
			}
		}
		return reducedKeyframes
	}

	



}

// MARK: Utils

function roundVector3(vector: Vector3, decimalPlaces: number = 3): Vector3 {
	const factor = 10 ** decimalPlaces
	return Vector3.create(
		Math.round(vector.x * factor) / factor,
		Math.round(vector.y * factor) / factor,
		Math.round(vector.z * factor) / factor
	)
}
function roundQuaternion(quaternion: Quaternion, decimalPlaces: number = 3): Quaternion {
	const factor = 10 ** decimalPlaces
	return Quaternion.create(
		Math.round(quaternion.x * factor) / factor,
		Math.round(quaternion.y * factor) / factor,
		Math.round(quaternion.z * factor) / factor,
		Math.round(quaternion.w * factor) / factor
	)
}

function areVectorsEqual(a: Vector3Type, b: Vector3Type): boolean {
	return Vector3.equalsWithEpsilon(a, b, GameSettings.SIM_KEYFRAME_REDUCTION_EPSILON)
}

function areQuaternionsEqual(a: QuaternionType, b: QuaternionType): boolean {
	const dot = Quaternion.dot(a, b)
	return 1 - Math.abs(dot) < GameSettings.SIM_KEYFRAME_REDUCTION_EPSILON
}

	
function countKeyframes(steps: CannonSimResults) {
	var count = 0
	count += steps.ballKeyframes.keyframes.length
	for (const pin of steps.pinsKeyframes) {
		count += pin.keyframes.length
	}
	return count
}

