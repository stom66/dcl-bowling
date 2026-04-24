import * as utils from "@dcl-sdk/utils"
import { EasingFunction, engine, Entity, GltfContainer, GltfContainerLoadingState, LoadingState, Transform, Tween, TweenSequence, tweenSystem } from "@dcl/sdk/ecs"
import { Quaternion, Vector3 } from "@dcl/sdk/math"

import { NotifyPlayerRollPayload, RollPayload, SimObjectKeyframe } from "src/shared/types"
import { PIN_LANE_LOCAL_POSITIONS } from "src/shared/utils/cannon-sim"


// MARK: Constants

/** Lane-local Y for the ball center; must clear the lane floor (sim ball radius is 0.1). */
const BALL_SPAWN_LANE_LOCAL_Y = 0.32

/** `pin.gltf` root node translates the mesh up; entity pivot sits below the pin center.
 *  Used to reconcile the Cannon cylinder center (sim) with the glTF pivot (visual). */
const PIN_GLTF_MESH_OFFSET_Y = 0.18949292600154877
const PIN_VISUAL_SCALE       = 1.5

/** Simulation step rate (see `CannonSim.simulate` — 1 / FRAMERATE). */
const REPLAY_FRAMERATE = 30

const PIN_COUNT = PIN_LANE_LOCAL_POSITIONS.length


/* type ReplayState = {
	data       : RollPayload
	elapsed    : number
	frameCount : number
	duration   : number
	onComplete?: () => void
} */


/**
 * Owns the visible meshes on a single lane (ball + pins). Stateless w.r.t.
 * gameplay — the caller is responsible for feeding it pin states and replay
 * payloads.
 */
export class LaneVisuals {

	private readonly lanePosition: Vector3

	/** Indexed 0..9 to match the Cannon sim / payload layout. Undefined = pin not currently displayed. */
	private pinEntities: (Entity | undefined)[] = new Array(PIN_COUNT).fill(undefined)
	private ball?: Entity

	//private replay?: ReplayState


	// MARK: Constructor
	constructor(lanePosition: Vector3) {
		this.lanePosition = lanePosition
		this.setupBall()
	}


	// MARK: Destroy
	destroy(): void {
		this.removePins()
		this.removeBall()
	}


	// MARK: setupPins
	setupPins(pinStates: boolean[] = new Array(PIN_COUNT).fill(true)): void {
		this.removePins()

		const id = Quaternion.Identity()
		for (let i = 0; i < PIN_COUNT; i++) {
			if (!pinStates[i]) continue

			const rest = PIN_LANE_LOCAL_POSITIONS[i]!
			const laneLocal = Vector3.create(rest[0]!, rest[1]!, rest[2]!)
			const worldPos  = this.pinPivotWorldFromSimBody(laneLocal, id)

			const pin = engine.addEntity()
			Transform.create(pin, {
				position: worldPos,
				scale   : Vector3.Zero(),
			})
			GltfContainer.create(pin, { src: "assets/models/pin.gltf" })

			const staggerMs = 50 * i
			GltfContainerLoadingState.onChange(pin, (state) => {
				if (state?.currentState !== LoadingState.FINISHED) return
				utils.timers.setTimeout(() => {
					Tween.setScale(
						pin,
						Vector3.Zero(),
						Vector3.create(PIN_VISUAL_SCALE, PIN_VISUAL_SCALE, PIN_VISUAL_SCALE),
						0.7,
						EasingFunction.EF_EASEINCUBIC,
					)
				}, staggerMs)
			})

			this.pinEntities[i] = pin
		}
	}

	removePins(): void {
		const tweenDuration = 0.5
		const interval = 50
		var removedCount = 0
		for (let i = 0; i < PIN_COUNT; i++) {
			const pin = this.pinEntities[i]
			if (pin !== undefined) {
				const t = Transform.getMutable(pin)

				utils.timers.setTimeout(() => {
					Tween.setMove(pin, t.position, Vector3.add(t.position, Vector3.create(0, 5, 5)), tweenDuration, EasingFunction.EF_EASEINCUBIC)
					utils.timers.setTimeout(() => {
						engine.removeEntity(pin)
					}, tweenDuration)
				}, removedCount*interval)

				removedCount++
			}
			this.pinEntities[i] = undefined
		}
	}


	
	// MARK: setupBall
	setupBall(laneLocalPosition: Vector3 = Vector3.create(0, BALL_SPAWN_LANE_LOCAL_Y, 0)): void {
		const worldPos = Vector3.add(this.lanePosition, laneLocalPosition)

		if (this.ball === undefined) {
			this.ball = engine.addEntity()
			Transform.create(this.ball, { position: worldPos, scale: Vector3.One() })
			GltfContainer.create(this.ball, { src: "assets/models/bowlingBall.gltf" })
		} else {
			Transform.getMutable(this.ball).position = worldPos
		}
	}

	getBall(): Entity | undefined {
		return this.ball
	}


	// MARK: removeBall
	removeBall(): void {
		if (this.ball === undefined) return
		engine.removeEntity(this.ball)
		this.ball = undefined
	}


	// =========================================================================
	// MARK: Replay
	// =========================================================================

	/**
	 * Play back a roll. Ball and any currently-displayed pins are animated
	 * frame-by-frame from the payload's keyframe tracks. Pins not present in
	 * `pinEntities` (already knocked from a prior roll) are left untouched.
	 *
	 * The replay ends when keyframes run out; `onComplete` (if supplied) is
	 * invoked exactly once. Call `stopReplay()` to abort early.
	 */
	runReplay(data: NotifyPlayerRollPayload, onComplete?: () => void): void {

		// Make sure the ball exists before we start driving its transform.
		if (this.ball === undefined) this.setupBall()

		const ballWaypoints = this.getPositionWaypoints(data.ballKeyframes.keyframes)

		// For now we're just going to animate the ball
		const sequence = ballWaypoints.map((w: any) => {
			return {
				duration      : w.duration!,
				easingFunction: EasingFunction.EF_LINEAR,
				mode          : Tween.Mode.Move({
					start: w.start!,
					end  : w.end!,
				}),
			}
		})
		// Remove the first waypoint from the sequence, because we've already animated it with setMove below
		sequence.shift()


		Tween.setMove(this.ball!, 
			ballWaypoints[0].start!, 
			ballWaypoints[0].end!, 
			ballWaypoints[0].duration!
		)

		TweenSequence.create(this.ball!, { sequence: sequence })

		if (!this.ball) return

		const systemName = `animateBall`
		engine.addSystem(() => {
			if (!this.ball) {
				engine.removeSystem(systemName); 
				return;
			}

			const tweenCompleted = tweenSystem.tweenCompleted(this.ball)
			if (tweenCompleted) {
				console.log("laneVisuals: runReplay(): tween completed for ball")
				const tween = Tween.getMutableOrNull(this.ball)
				if (tween) {
					tween.playing = false
					Tween.deleteFrom(this.ball)
				}
				engine.removeSystem(systemName)
			}
		}, undefined, systemName)
	}

	animateEntity(entity: Entity, keyframes: any) {
	}

	getPositionWaypoints(keyframes: SimObjectKeyframe[]) {
		const waypoints: any = {}

		// now we go through the ball keyframes and get the 
		var lastPosition = keyframes[0]!.position
		var lastTime = keyframes[0]!.time
		
		// Build a list of the position
		for (const [index, keyframe] of keyframes.entries()) {
			if (index === 0) continue

			if (keyframe.position) {
				waypoints.push({
					start: lastPosition,
					end  : keyframe.position!,
					time : keyframe.time - lastTime
				})
				lastPosition = keyframe.position
				lastTime = keyframe.time
			}
		}

		return waypoints
	}



	// =========================================================================
	// MARK: Helpers
	// =========================================================================

	/** Sim uses cylinder center; glTF pivot is lower. Offset rotates with the pin. */
	private pinPivotWorldFromSimBody(laneLocal: Vector3, bodyRotation: Quaternion): Vector3 {
		const bodyWorld     = Vector3.add(this.lanePosition, laneLocal)
		const offsetModelUp = Vector3.create(0, PIN_GLTF_MESH_OFFSET_Y * PIN_VISUAL_SCALE, 0)
		const offsetWorld   = Vector3.rotate(offsetModelUp, bodyRotation)
		return Vector3.create(
			bodyWorld.x - offsetWorld.x,
			bodyWorld.y - offsetWorld.y,
			bodyWorld.z - offsetWorld.z,
		)
	}
}
