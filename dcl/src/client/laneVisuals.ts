import * as utils from "@dcl-sdk/utils"
import { Animator, EasingFunction, engine, Entity, GltfContainer, GltfContainerLoadingState, LoadingState, Transform, Tween, TweenSequence, tweenSystem } from "@dcl/sdk/ecs"
import { Quaternion, Vector3 } from "@dcl/sdk/math"

import { PIN_LANE_LOCAL_POSITIONS } from "src/server/physics/physics.pin-layout"
import { SimObjectKeyframes } from "src/server/physics/types"
import { DEFAULT_STORED_ROTATION, storedRotationToQuaternion } from "src/server/physics/physics.utils"
import { NotifyPlayerRollPayload, SimObjectKeyframe } from "src/shared/types/shared-types"
import { ClientEvents, eventBus } from "src/shared/utils/eventBus"

import { ClientStore } from "src/client/clientStore"
import { LaneStore } from "src/shared/laneStore"
import { sfx, SoundManager } from "./soundManager"


// MARK: Types

type replayKeyframes = {
	currentPosition: SimObjectKeyframe | undefined,
	currentRotation: SimObjectKeyframe | undefined,
	nextPosition   : SimObjectKeyframe | undefined,
	nextRotation   : SimObjectKeyframe | undefined,
}

type ReplaySfxEventKind = 'ballHitPin' | 'pinHitPin'

type ReplaySfxEvent = {
	time: number
	kind: ReplaySfxEventKind
}

type ReplayState = {
	elapsed            : number
	duration           : number
	ballKeyframes      : replayKeyframes
	pinsKeyframes      : replayKeyframes[]
	sfxEvents          : ReplaySfxEvent[]
	nextSfxIndex       : number

	onComplete?        : () => void
}


// MARK: Constants

const BALL_SPAWN_LANE_LOCAL_Y   = 0.32
const PIN_GLTF_MESH_OFFSET_Y    = 0.18949292600154877
const PIN_VISUAL_SCALE          = 1.5
const PIN_COUNT                 = PIN_LANE_LOCAL_POSITIONS.length
const LANE_END_Z                = 17
const SCORE_OBJECT_POSITION     = Vector3.create(0, 0.5, 18)
const SCORE_OBJECT_SCALE        = Vector3.create(0.6, 0.6, 0.6)
const COUNTDOWN_OBJECT_POSITION = Vector3.create(0, 0.5, 1)
const COUNTDOWN_OBJECT_SCALE    = Vector3.create(0.6, 0.6, 0.6)

const CHANCE_OF_PIGEON = 20 // 1 in n

/** Delay between countdown visuals and each replay attempt (local player's roll). */
const REPLAY_WAIT_MS = 3000


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

	/** When set, replay system is driving ball/pin transforms each frame until cleared. */
	private replayDriver?: (dt: number) => void

	/** Payload + completion handler staged until playback runs after roll request countdown. */
	private queuedReplay?: { data: NotifyPlayerRollPayload; onComplete?: () => void }

	private awaitingReplay: boolean = false
	private replayWaitTimer?: number

	/** Unsubs for roll-request countdown sources (local emit + server broadcast per lane). */
	private rollRequestUnsubs: Array<() => void> = []

	private readonly rollOwnerUserId: string


	// MARK: Constructor
	constructor(
		lanePosition       : Vector3,
		rollStartTimestamp : number,
		rollOwnerUserId    : string
	) {
		this.lanePosition       = lanePosition
		this.rollStartTimestamp = rollStartTimestamp
		this.rollOwnerUserId    = rollOwnerUserId
		this.setupBall()

		this.bindRollRequestCountdownHandlers()
	}


	// MARK: Destroy
	destroy(): void {
		this.clearReplayWaitTimer()
		for (const unsub of this.rollRequestUnsubs) {
			unsub()
		}
		this.rollRequestUnsubs.length = 0
		this.awaitingReplay = false
		this.queuedReplay = undefined

		this.detachReplayDriver()
		this.removePins()
		this.removeBall()
	}


	// MARK: clearReplayWaitTimer
	private clearReplayWaitTimer(): void {
		if (this.replayWaitTimer === undefined) return
		utils.timers.clearTimeout(this.replayWaitTimer)
		this.replayWaitTimer = undefined
	}


	// MARK: bindRollRequestCountdownHandlers
	/**
	 * Local bowler: {@link ClientEvents.ON_MY_ROLL_REQUEST}. Same-lane group members:
	 * {@link ClientEvents.ON_GROUP_ROLL_REQUEST}. Spectators on other lanes:
	 * {@link ClientEvents.ON_NON_GROUP_ROLL_REQUEST}. Each lane instance only runs when
	 * `userId` matches this visuals' roller to avoid reacting on the wrong lane.
	 */
	private bindRollRequestCountdownHandlers(): void {
		this.rollRequestUnsubs.push(
			eventBus.on(ClientEvents.ON_MY_ROLL_REQUEST, () => {
				if (ClientStore.getInstance().getUserId() !== this.rollOwnerUserId) return
				this.beginRollRequestCountdownPipeline()
			})
		)

		this.rollRequestUnsubs.push(
			eventBus.on(ClientEvents.ON_GROUP_ROLL_REQUEST, (data: { userId: string }) => {
				if (data.userId !== this.rollOwnerUserId) return
				if (data.userId === ClientStore.getInstance().getUserId()) return
				this.beginRollRequestCountdownPipeline()
			})
		)

		this.rollRequestUnsubs.push(
			eventBus.on(ClientEvents.ON_NON_GROUP_ROLL_REQUEST, (data: { userId: string }) => {
				if (data.userId !== this.rollOwnerUserId) return
				this.beginRollRequestCountdownPipeline()
			})
		)
	}


	// MARK: beginRollRequestCountdownPipeline
	private beginRollRequestCountdownPipeline(): void {
		this.awaitingReplay = true
		this.clearReplayWaitTimer()
		this.showCountdownAnimation()
		this.replayWaitTimer = utils.timers.setTimeout(() => {
			this.replayWaitTimer = undefined
			this.tryTriggerReplay()
		}, REPLAY_WAIT_MS)
	}


	// MARK: tryTriggerReplay
	private tryTriggerReplay(): void {
		const queued = this.queuedReplay
		if (queued !== undefined) {
			this.queuedReplay = undefined
			this.awaitingReplay = false
			this.playReplay(queued.data, queued.onComplete)
			return
		}
		if (!this.awaitingReplay) return

		this.showCountdownAnimation()
		this.replayWaitTimer = utils.timers.setTimeout(() => {
			this.replayWaitTimer = undefined
			this.tryTriggerReplay()
		}, REPLAY_WAIT_MS)
	}

	// MARK: Pins
	setupPins(pinStates: boolean[] = new Array(PIN_COUNT).fill(true)): void {
		this.removePins()

		const tweenDurationMs = 500
		const staggerMs       = 50
		const scaleEnd = Vector3.create(PIN_VISUAL_SCALE, PIN_VISUAL_SCALE, PIN_VISUAL_SCALE)

		const id = Quaternion.Identity()
		for (let i = 0; i < PIN_COUNT; i++) {
			if (!pinStates[i]) continue

			const rest = PIN_LANE_LOCAL_POSITIONS[i]!
			const laneLocal = Vector3.create(rest[0]!, rest[1]!, rest[2]!)
			const endPos  = this.pinPivotWorldFromSimBody(laneLocal, id)
			const startPos = Vector3.add(endPos, Vector3.create(0, 2, 0))

			const pinPos = engine.addEntity()
			Transform.create(pinPos, {
				position: startPos,
				scale   : Vector3.One(),
			})

			const pinScale = engine.addEntity()
			Transform.create(pinScale, {
				parent: pinPos,
				scale   : Vector3.Zero(),
			})

			// Add a chance to display a pigeon pin
			var pinFilename = "pin"
			if (i === 0 && this.rollStartTimestamp % CHANCE_OF_PIGEON == 0) pinFilename = "pinPigeon"
			
			GltfContainer.create(pinScale, { src: `assets/models/${pinFilename}.gltf` })

			GltfContainerLoadingState.onChange(pinScale, (state) => {
				if (state?.currentState !== LoadingState.FINISHED) return
				utils.timers.setTimeout(() => {
					Tween.setScale(pinScale, Vector3.Zero(), scaleEnd, tweenDurationMs, EasingFunction.EF_EASEBOUNCE)
					Tween.setMove(pinPos, startPos, endPos, tweenDurationMs, EasingFunction.EF_EASEBOUNCE)
				}, staggerMs * i)
			})

			this.pinEntities[i] = pinPos
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


	// MARK: Countdown animation
	showCountdownAnimation(): void {
		console.log("laneVisuals: showCountdownAnimation()")
		const countdownEntity = engine.addEntity()
		Transform.create(countdownEntity, {
			position: Vector3.add(this.lanePosition, COUNTDOWN_OBJECT_POSITION),
			rotation: Quaternion.fromEulerDegrees(0, 180, 0),
			scale: COUNTDOWN_OBJECT_SCALE,
		})
		GltfContainer.create(countdownEntity, { src: "assets/models/Info_Countdown_3.gltf" })
		Animator.create(countdownEntity, {
			states: [
				{
					clip: "Info_Countdown_3",
					playing: false,
					loop: false,
				}
			]
		})
		GltfContainerLoadingState.onChange(countdownEntity, (state) => {
			if (state?.currentState !== LoadingState.FINISHED) return
			Tween.setScale(countdownEntity, Vector3.Zero(), COUNTDOWN_OBJECT_SCALE, 0.1, EasingFunction.EF_EASEINCUBIC)
			
			Animator.playSingleAnimation(countdownEntity, "Info_Countdown_3", true)
			utils.timers.setTimeout(() => {
				engine.removeEntity(countdownEntity)
			}, 4000)
		})
	}


	// MARK: Score Animations
	showScoreNumber(score: number): void {
		console.log("laneVisuals: showScoreNumber(): score", score)
		score = Math.min(9, Math.max(1, score))
		this.showScoreObject("Score_Score_" + score.toString())
		SoundManager.playSound(sfx.bowl_result_good)
	}

	showScoreStrike() {
		this.showScoreObject("Score_Strike")
		SoundManager.playSound(sfx.bowl_result_great)
	}

	showScoreSpare() {
		this.showScoreObject("Score_Spare")
		SoundManager.playSound(sfx.bowl_result_good)
	}

	showScoreZero() {
		this.showScoreObject("Score_Zero")
		SoundManager.playSound(sfx.bowl_result_bad)
	}

	showScoreGutterBall() { 
		this.showScoreObject("Score_GutterBall")
		SoundManager.playSound(sfx.bowl_result_bad)
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


	// MARK: onReplayEnd
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
			this.emitPlaybackEndByMembership()
		}, 2000)
	}

	// MARK: queueReplay
	/**
	 * Holds playback until the roll-request countdown pipeline finishes. Playback may arrive
	 * before or after {@link ClientEvents.ON_GROUP_ROLL_REQUEST} / local request events; we always
	 * stash here and only {@link playReplay} from {@link tryTriggerReplay} once {@link awaitingReplay}
	 * has been started and {@link REPLAY_WAIT_MS} has elapsed (possibly after repeated countdowns).
	 */
	queueReplay(data: NotifyPlayerRollPayload, onComplete?: () => void): void {
		console.log("laneVisuals: queueReplay(): userId", data.userId)

		if (data.userId !== this.rollOwnerUserId) {
			console.log(
				"laneVisuals: queueReplay: ignoring replay wrong roller rollOwnerUserId",
				this.rollOwnerUserId,
				"payloadUserId",
				data.userId,
			)
			return
		}

		this.queuedReplay = { data, onComplete }
	}


	// MARK: emitPlaybackStartByMembership
	private emitPlaybackStartByMembership(data: NotifyPlayerRollPayload): void {
		const laneIndex   = LaneStore.findLaneByUserId(data.userId)
		if (laneIndex === undefined) {
			console.error('laneVisuals: emitPlaybackStartByMembership: laneIndex not found')
			return
		}

		const myLaneIndex = ClientStore.getInstance().getLaneIndex()
		if (laneIndex == myLaneIndex) {
			eventBus.emit(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, data)
		} else {
			eventBus.emit(ClientEvents.ON_NON_GROUP_ROLL_PLAYBACK_START, data)
		}
	}


	// MARK: emitPlaybackEndByMembership
	private emitPlaybackEndByMembership(): void {
		const userId = this.rollPayload?.userId
		if (userId === undefined) {
			console.log("laneVisuals: emitPlaybackEndByMembership: missing rollPayload userId")
			return
		}

		const laneIndex = LaneStore.findLaneByUserId(userId)
		if (laneIndex === undefined) {
			console.error('laneVisuals: emitPlaybackEndByMembership: laneIndex not found')
			return
		}
		
		const myLane     = ClientStore.getInstance().getLaneIndex()
		if (laneIndex == myLane) {
			eventBus.emit(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END, {})
		} else {
			eventBus.emit(ClientEvents.ON_NON_GROUP_ROLL_PLAYBACK_END, {})
		}
	}


	// MARK: playReplay
	/**
	 * Play back a roll. Ball and any currently-displayed pins are animated
	 * frame-by-frame from the payload's keyframe tracks. Pins not present in
	 * `pinEntities` (already knocked from a prior roll) are left untouched.
	 *
	 * The replay ends when keyframes run out; `onComplete` (if supplied) is
	 * invoked exactly once.
	 */
	private playReplay(data: NotifyPlayerRollPayload, onComplete?: () => void): void {

		console.log("laneVisuals: playReplay(): data", data)
		this.clearReplayWaitTimer()
		this.awaitingReplay = false

		this.rollPayload = data
		this.detachReplayDriver()

		this.emitPlaybackStartByMembership(data)

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
			sfxEvents   : mergeReplaySfxEvents(data.sfxBallHitPinTimestamps ?? [], data.sfxPinHitPinTimestamps ?? []),
			nextSfxIndex: 0,
			onComplete  : onComplete,
		}


		// Make sure the ball exists before we start driving its transform.
		if (this.ball === undefined) this.setupBall()
		if (!this.ball) {
			console.log("laneVisuals: playReplay(): ball not found")
			return
		}

		const ballKf  = data.ballKeyframes as SimObjectKeyframes
		const pinsKfs = data.pinsKeyframes as SimObjectKeyframes[]

		const replaySystem = (dt: number) => {
			replayState.elapsed += dt
			const elapsed   = replayState.elapsed
			const sfxUntil  = Math.min(elapsed, replayState.duration)

			while (
				replayState.nextSfxIndex < replayState.sfxEvents.length &&
				replayState.sfxEvents[replayState.nextSfxIndex]!.time <= sfxUntil
			) {
				const ev = replayState.sfxEvents[replayState.nextSfxIndex]!
				replayState.nextSfxIndex++
				if (ev.kind === 'ballHitPin') {
					SoundManager.playSound(sfx.collisionBallHitPin, this.ball, 10)
				} else {
					SoundManager.playSound(sfx.collisionPinHitPin, this.ball, 10)
				}
			}

			if (elapsed >= replayState.duration) {
				replayState.onComplete?.()
				engine.removeSystem(replaySystem)
				this.onReplayEnd()
				return
			}

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
	 * starting a new replay via {@link playReplay}, otherwise transforms fight tweens and entities never leave the scene cleanly.
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


// MARK: mergeReplaySfxEvents
/**
 * Merges ball–pin and pin–pin collision times into one list sorted by sim time (seconds).
 */
function mergeReplaySfxEvents(
	ballHitPinTimes: number[],
	pinHitPinTimes : number[],
): ReplaySfxEvent[] {
	const events: ReplaySfxEvent[] = []
	for (const time of ballHitPinTimes) {
		events.push({ kind: 'ballHitPin', time })
	}
	for (const time of pinHitPinTimes) {
		events.push({ kind: 'pinHitPin', time })
	}
	events.sort((a, b) => a.time - b.time)
	return events
}


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
	u = Math.max(0, Math.min(1, u))
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
	u = Math.max(0, Math.min(1, u))

	const q1 = storedRotationToQuaternion(next.rotation)
	return replaySlerpQuaternion(q0, q1, u)
}
