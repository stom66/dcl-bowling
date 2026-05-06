import * as utils from "@dcl-sdk/utils"
import { Animator, EasingFunction, engine, Entity, GltfContainer, GltfContainerLoadingState, LoadingState, Transform, Tween, TweenSequence, tweenSystem } from "@dcl/sdk/ecs"
import { Quaternion, Vector3 } from "@dcl/sdk/math"
import { PIN_LANE_LOCAL_POSITIONS } from 'src/server/physics/physics.pin-layout'
import { resolveSimulationSettings } from "src/server/physics/physics.client"
import { DEFAULT_STORED_ROTATION, storedRotationToQuaternion } from "src/server/physics/physics.utils"

import { NotifyPlayerRollPayload, RollPayload, SimObjectKeyframe } from "src/shared/types/shared-types"
import { eventBus } from "src/shared/utils/eventBus"
import { ClientEvents } from "./clientEvents"
import { SimObjectKeyframes } from "src/server/physics/types"


// MARK: Types

type replayKeyframes = {
	currentPosition: SimObjectKeyframe | undefined,
	currentRotation: SimObjectKeyframe | undefined,
	nextPosition   : SimObjectKeyframe | undefined,
	nextRotation   : SimObjectKeyframe | undefined,
}

type ReplayState = {
	//data               : RollPayload
	elapsed            : number
	duration           : number
	ballKeyframes      : replayKeyframes
	pinsKeyframes      : replayKeyframes[]

	onComplete?        : () => void
}


// MARK: Constants

const BALL_SPAWN_LANE_LOCAL_Y = 0.32
const PIN_GLTF_MESH_OFFSET_Y  = 0.18949292600154877
const PIN_VISUAL_SCALE        = 1.5
const PIN_COUNT               = PIN_LANE_LOCAL_POSITIONS.length
const LANE_END_Z              = 17
const SCORE_OBJECT_POSITION   = Vector3.create(0, 0.5, 18)
const SCORE_OBJECT_SCALE      = Vector3.create(0.6, 0.6, 0.6)

const CHANCE_OF_PIGEON = 2 // 1 in n


/**
 * Owns the visible meshes on a single lane (ball + pins). Stateless w.r.t.
 * gameplay — the caller is responsible for feeding it pin states and replay
 * payloads.
 */
export class LaneVisuals {

	private readonly lanePosition: Vector3
	private rollPayload: NotifyPlayerRollPayload | undefined

	/** Indexed 0..9 to match the Cannon sim / payload layout. Undefined = pin not currently displayed. */
	private pinEntities: (Entity | undefined)[] = new Array(PIN_COUNT).fill(undefined)
	private ball?: Entity

	private rollStartTimestamp: number = 0

	/** When set, {@link runReplay} is driving ball/pin transforms each frame until cleared. */
	private replayDriver?: (dt: number) => void


	// MARK: Constructor
	constructor(
		lanePosition      : Vector3,
		rollStartTimestamp: number
	) {
		this.lanePosition = lanePosition
		this.rollStartTimestamp = rollStartTimestamp
		this.setupBall()
	}


	// MARK: Destroy
	destroy(): void {
		this.detachReplayDriver()
		this.removePins()
		this.removeBall()
	}



	// MARK: Pins
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

			// Add a chance to display a pigeon pin
			var pinFilename = "pin"
			if (i === 0 && this.rollStartTimestamp % CHANCE_OF_PIGEON == 0) pinFilename = "pinPigeon"
			
			GltfContainer.create(pin, { src: `assets/models/${pinFilename}.gltf` })

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
		this.detachReplayDriver()

		/** `Tween.setMove` duration is milliseconds (same as `Tween.create` / camera tweens). */
		const tweenDurationMs = 500
		const staggerMs       = 50
		let removedCount      = 0
		for (let i = 0; i < PIN_COUNT; i++) {
			const pin = this.pinEntities[i]
			if (pin !== undefined) {
				const delayMs = removedCount * staggerMs
				setTimeout(() => {
					if (!Transform.has(pin)) {
						return
					}
					const start = Transform.get(pin).position
					const end   = Vector3.add(start, Vector3.create(0, 5, 5))
					Tween.setMove(pin, start, end, tweenDurationMs, EasingFunction.EF_EASEINCUBIC)
					setTimeout(() => {
						if (Transform.has(pin)) {
							engine.removeEntity(pin)
						}
					}, tweenDurationMs)
				}, delayMs)

				removedCount++
			}
			this.pinEntities[i] = undefined
		}
	}


	// MARK: Score Animations

	showScoreNumber(score: number): void {
		console.log("laneVisuals: showScoreNumber(): score", score)
		score = Math.min(9, Math.max(1, score))
		this.showScoreObject("Score_Score_" + score.toString())
	}

	showScoreStrike() {
		this.showScoreObject("Score_Strike")
	}

	showScoreSpare() {
		this.showScoreObject("Score_Spare")
	}

	showScoreZero() {
		this.showScoreObject("Score_Zero")
	}

	showScoreGutterBall() { 
		this.showScoreObject("Score_GutterBall")
	}

	showScoreObject(filename: string) {
		console.log("laneVisuals: showScoreObject(): filename", filename)

		const scoreEntity = engine.addEntity()
		Transform.create(scoreEntity, { 
			position: Vector3.add(this.lanePosition, SCORE_OBJECT_POSITION),
			rotation: Quaternion.fromEulerDegrees(0, 180, 0),
			scale: Vector3.Zero()
		 })
		GltfContainer.create(scoreEntity, { src: `assets/models/${filename}.gltf` })
		Animator.create(scoreEntity, {
			states: [
				{
					clip: filename,
					playing: false,
					loop: false,
				}
			]
		})
		GltfContainerLoadingState.onChange(scoreEntity, (state) => {
			if (state?.currentState !== LoadingState.FINISHED) return

			Tween.setScale(scoreEntity, Vector3.Zero(), SCORE_OBJECT_SCALE, 0.1, EasingFunction.EF_EASEINCUBIC)

			// Tirgger the animation
			Animator.playSingleAnimation(scoreEntity, filename, true)

			// Remove the entity after the animation has finished
			utils.timers.setTimeout(() => {
				engine.removeEntity(scoreEntity)
			}, 5000)
		})
	}


	
	// MARK: Ball
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
	onReplayEnd(): void {
		console.log("laneVisuals: onReplayEnd()")

		const allPinsUpAtStart = this.rollPayload?.startingPinStates.every((pin) => pin)
		const allPinsDownAtEnd = this.rollPayload?.finalPinStates.every((pin) => !pin)
		// Was it a strike?
		if (this.rollPayload?.gutterBall === true) {
			this.showScoreGutterBall()
		}
		else if (allPinsUpAtStart && allPinsDownAtEnd) {
			this.showScoreStrike()
		} 
		else if (!allPinsUpAtStart && allPinsDownAtEnd) {
			this.showScoreSpare()
		} 
		else if (this.rollPayload?.score === 0) {
			this.showScoreZero()
		} 
		else {
			this.showScoreNumber(this.rollPayload?.score ?? 1)
		}

		utils.timers.setTimeout(() => {
			this.removePins()
		}, 1000)


		utils.timers.setTimeout(() => {
			this.replayDriver = undefined
			eventBus.emit(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END, {})
		}, 2000)
	}

	runReplay(data: NotifyPlayerRollPayload, onComplete?: () => void): void {

		console.log("laneVisuals: runReplay(): data", data)
		this.rollPayload = data
		this.detachReplayDriver()

		const replayState: ReplayState = {
			elapsed                 : 0,
			duration                : data.duration,
			ballKeyframes: {
				currentPosition: data.ballKeyframes.keyframes[0],
				currentRotation: data.ballKeyframes.keyframes[0],
				nextPosition   : replayGetNextKeyframeWithPosition(data.ballKeyframes.keyframes, 0),
				nextRotation   : replayGetNextKeyframeWithRotation(data.ballKeyframes.keyframes, 0),
			},
			pinsKeyframes: data.pinsKeyframes.map((pins) => {
				return {
					currentPosition: pins.keyframes[0],
					currentRotation: pins.keyframes[0],
					nextPosition   : replayGetNextKeyframeWithPosition(pins.keyframes, 0),
					nextRotation   : replayGetNextKeyframeWithRotation(pins.keyframes, 0),
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

		const ballKf  = data.ballKeyframes as SimObjectKeyframes
		const pinsKfs = data.pinsKeyframes as SimObjectKeyframes[]

		const replaySystem = (dt: number) => {
			replayState.elapsed += dt
			if (replayState.elapsed >= replayState.duration) {
				replayState.onComplete?.()
				engine.removeSystem(replaySystem)
				this.onReplayEnd()
				return
			}

			const elapsed = replayState.elapsed
			replayAdvanceTrack(replayState.ballKeyframes, ballKf.keyframes, elapsed)

			const ballTransform = Transform.getMutableOrNull(this.ball!)
			if (ballTransform) {
				const ballLaneLocal = replaySampleLaneLocal(replayState.ballKeyframes, elapsed)
				ballTransform.position = Vector3.add(this.lanePosition, ballLaneLocal)
				ballTransform.rotation = replaySampleRotation(replayState.ballKeyframes, elapsed)
			}

			const pinTracks = replayState.pinsKeyframes
			for (let i = 0, n = pinTracks.length; i < n; i++) {
				const pinEnt = this.pinEntities[i]
				if (pinEnt === undefined) continue

				const pinKf = pinsKfs[i]?.keyframes
				if (pinKf === undefined) continue

				const track = pinTracks[i]!
				replayAdvanceTrack(track, pinKf, elapsed)
				const pinTransform = Transform.getMutableOrNull(pinEnt)
				if (!pinTransform) continue

				const laneLocal = replaySampleLaneLocal(track, elapsed)
				const rot = replaySampleRotation(track, elapsed)
				pinTransform.position = this.pinPivotWorldFromSimBody(laneLocal, rot)
				pinTransform.rotation = rot
			}
		}
		this.replayDriver = replaySystem
		engine.addSystem(replaySystem)
	}

	// MARK: detachReplayDriver
	/**
	 * Unregisters the replay system so per-frame keyframe writes stop. Call before clearing pins or
	 * starting a new replay, otherwise transforms fight tweens and entities never leave the scene cleanly.
	 */
	private detachReplayDriver(): void {
		if (this.replayDriver === undefined) {
			return
		}
		engine.removeSystem(this.replayDriver)
		this.replayDriver = undefined
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


// MARK: Replay track helpers


function replayGetNextKeyframeWithPosition(
	keyframes   : SimObjectKeyframe[],
	currentIndex: number
): SimObjectKeyframe | undefined {
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


function replayGetNextKeyframeWithRotation(
	keyframes   : SimObjectKeyframe[], 
	currentIndex: number
): SimObjectKeyframe | undefined {
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


function replayAdvanceTrack(
	track    : replayKeyframes, 
	keyframes: SimObjectKeyframe[], 
	elapsed  : number
): void {
	while (track.nextPosition?.time !== undefined && track.nextPosition.time <= elapsed) {
		track.currentPosition = track.nextPosition
		const c = track.currentPosition
		const idx = c !== undefined ? keyframes.indexOf(c) : 0
		track.nextPosition = replayGetNextKeyframeWithPosition(keyframes, idx >= 0 ? idx : 0)
	}
	while (track.nextRotation?.time !== undefined && track.nextRotation.time <= elapsed) {
		track.currentRotation = track.nextRotation
		const c = track.currentRotation
		const idx = c !== undefined ? keyframes.indexOf(c) : 0
		track.nextRotation = replayGetNextKeyframeWithRotation(keyframes, idx >= 0 ? idx : 0)
	}
}


function replaySlerpQuaternion(a: Quaternion, b: Quaternion, t: number): Quaternion {
	let dot = Quaternion.dot(a, b)
	let bx = b.x
	let by = b.y
	let bz = b.z
	let bw = b.w
	if (dot < 0) {
		bx = -bx
		by = -by
		bz = -bz
		bw = -bw
		dot = -dot
	}
	if (dot > 0.9995) {
		return Quaternion.normalize(Quaternion.create(
			a.x + t * (bx - a.x),
			a.y + t * (by - a.y),
			a.z + t * (bz - a.z),
			a.w + t * (bw - a.w),
		))
	}
	const theta0 = Math.acos(Math.min(1, Math.max(-1, dot)))
	const invSin0 = 1 / Math.sin(theta0)
	const s0 = Math.sin((1 - t) * theta0) * invSin0
	const s1 = Math.sin(t * theta0) * invSin0
	return Quaternion.normalize(Quaternion.create(
		a.x * s0 + bx * s1,
		a.y * s0 + by * s1,
		a.z * s0 + bz * s1,
		a.w * s0 + bw * s1,
	))
}


function replaySampleLaneLocal(track: replayKeyframes, elapsed: number): Vector3 {
	const cur = track.currentPosition
	const next = track.nextPosition
	const p0 = cur?.position ?? Vector3.Zero()
	if (!next?.position) return p0

	const t0 = cur?.time ?? 0
	const t1 = next.time
	if (t1 <= t0) return next.position

	let u = (elapsed - t0) / (t1 - t0)
	if (u < 0) {
		u = 0
	} else if (u > 1) {
		u = 1
	}
	return Vector3.lerp(p0, next.position, u)
}


function replaySampleRotation(track: replayKeyframes, elapsed: number): Quaternion {
	const cur = track.currentRotation
	const next = track.nextRotation
	const q0 = storedRotationToQuaternion(cur?.rotation ?? DEFAULT_STORED_ROTATION)
	if (!next?.rotation) {
		return q0
	}
	const t0 = cur?.time ?? 0
	const t1 = next.time
	if (t1 <= t0) {
		return storedRotationToQuaternion(next.rotation)
	}
	let u = (elapsed - t0) / (t1 - t0)
	if (u < 0) {
		u = 0
	} else if (u > 1) {
		u = 1
	}
	const q1 = storedRotationToQuaternion(next.rotation)
	return replaySlerpQuaternion(q0, q1, u)
}
