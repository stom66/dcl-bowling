import * as utils from "@dcl-sdk/utils"
import { EasingFunction, engine, Entity, GltfContainer, GltfContainerLoadingState, LoadingState, Transform, Tween, TweenSequence, tweenSystem } from "@dcl/sdk/ecs"
import { Quaternion, Vector3 } from "@dcl/sdk/math"
import { PIN_LANE_LOCAL_POSITIONS } from "src/server/physics/physics.cannon-sim"

import { NotifyPlayerRollPayload, RollPayload, SimObjectKeyframe } from "src/shared/types"


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


type replayKeyframes = {
	currentPosition: SimObjectKeyframe | undefined,
	currentRotation: SimObjectKeyframe | undefined,
	nextPosition   : SimObjectKeyframe | undefined,
	nextRotation   : SimObjectKeyframe | undefined,
}

type ReplayState = {
	data               : RollPayload
	elapsed            : number
	duration           : number
	ballKeyframes      : replayKeyframes
	pinsKeyframes      : replayKeyframes[]

	onComplete?        : () => void
}


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
	
	getPins(): Entity[] {
		return this.pinEntities.filter((pin) => pin) as Entity[]
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


	// MARK: getNextKeyframeWithPosition
	/**
	 * Next keyframe after `currentIndex` that defines `position`. `currentIndex` is a keyframes
	 * array index, not simulation time.
	 */
	getNextKeyframeWithPosition(keyframes: SimObjectKeyframe[], currentIndex: number): SimObjectKeyframe | undefined {
		let nextIndex = currentIndex + 1
		while (nextIndex < keyframes.length) {
			const kf = keyframes[nextIndex]
			if (kf?.position) {
				return kf
			}
			nextIndex++
		}
		return undefined
	}


	// MARK: getNextKeyframeWithRotation
	/**
	 * Next keyframe after `currentIndex` that defines `rotation`. `currentIndex` is a keyframes
	 * array index, not simulation time.
	 */
	getNextKeyframeWithRotation(keyframes: SimObjectKeyframe[], currentIndex: number): SimObjectKeyframe | undefined {
		let nextIndex = currentIndex + 1
		while (nextIndex < keyframes.length) {
			const kf = keyframes[nextIndex]
			if (kf?.rotation) {
				return kf
			}
			nextIndex++
		}
		return undefined
	}


	// MARK: runReplay
	/**
	 * Play back a roll. Ball and any currently-displayed pins are animated
	 * frame-by-frame from the payload's keyframe tracks. Pins not present in
	 * `pinEntities` (already knocked from a prior roll) are left untouched.
	 *
	 * The replay ends when keyframes run out; `onComplete` (if supplied) is
	 * invoked exactly once. Call `stopReplay()` to abort early.
	 */
	runReplay(data: NotifyPlayerRollPayload, onComplete?: () => void): void {

		console.log("laneVisuals: runReplay(): data", data)
		const replayState: ReplayState = {
			data                    : data,
			elapsed                 : 0,
			duration                : data.ballKeyframes.keyframes.length,
			ballKeyframes: {
				currentPosition: data.ballKeyframes.keyframes[0],
				currentRotation: data.ballKeyframes.keyframes[0],
				nextPosition   : this.getNextKeyframeWithPosition(data.ballKeyframes.keyframes, 0),
				nextRotation   : this.getNextKeyframeWithRotation(data.ballKeyframes.keyframes, 0),
			},
			pinsKeyframes: data.pinsKeyframes.map((pins) => {
				return {
					currentPosition: pins.keyframes[0],
					currentRotation: pins.keyframes[0],
					nextPosition   : this.getNextKeyframeWithPosition(pins.keyframes, 0),
					nextRotation   : this.getNextKeyframeWithRotation(pins.keyframes, 0),
				}
			}),
			onComplete:  onComplete
		}


		// Make sure the ball exists before we start driving its transform.
		if (this.ball === undefined) this.setupBall()
		if (!this.ball) {
			console.log("laneVisuals: runReplay(): ball not found")
			return
		}




		const replaySystem = (dt: number) => {
			replayState.elapsed += dt
			if (replayState.elapsed >= replayState.duration) {
				replayState.onComplete?.()
				engine.removeSystem(replaySystem)
			}

			// Do we need to skip to the next position keyframe?
			if (replayState.ballKeyframes.nextPosition?.time && replayState.ballKeyframes.nextPosition.time <= replayState.elapsed) {
				const ballKf = data.ballKeyframes.keyframes
				replayState.ballKeyframes.currentPosition = replayState.ballKeyframes.nextPosition
				const cur = replayState.ballKeyframes.currentPosition
				const curIdx = cur !== undefined ? ballKf.indexOf(cur) : 0
				replayState.ballKeyframes.nextPosition = this.getNextKeyframeWithPosition(ballKf, curIdx >= 0 ? curIdx : 0)
			}

			if (!replayState.ballKeyframes.nextPosition) {
				//console.log("laneVisuals: runReplay(): no next ball Position keyframe - this should mean we've reached the end of the sim")
				return
			}

			const ballTransform = Transform.getMutableOrNull(this.ball!)
			if (!ballTransform) {
				console.log("laneVisuals: runReplay(): ball Transform not found")
				return
			}

			const progress         = (replayState.elapsed - (replayState.ballKeyframes.currentPosition?.time ?? 0)) / (replayState.ballKeyframes.nextPosition.time - (replayState.ballKeyframes.currentPosition?.time ?? 0))
			const targetPosition   = Vector3.lerp(replayState.ballKeyframes.currentPosition?.position ?? Vector3.Zero(), replayState.ballKeyframes.nextPosition.position ?? Vector3.Zero(), progress)
			ballTransform.position = Vector3.add(this.lanePosition, targetPosition)

			console.log("laneVisuals: runReplay(): ball position.z", targetPosition.z)

		}
		engine.addSystem(replaySystem)


		
		// Old system using Tweens in sequence
		/*
		const ballWaypoints = this.getPositionWaypoints(data.ballKeyframes.keyframes)
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
		 */
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
