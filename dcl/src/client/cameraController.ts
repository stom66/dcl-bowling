import { EasingFunction, engine, Entity, MainCamera, Transform, Tween, VirtualCamera } from "@dcl/sdk/ecs";
import { Vector3 } from "@dcl/sdk/math";
import * as utils from "@dcl-sdk/utils"

import { GameSettings, PlayerSettings } from "src/shared/settings";
import { ClientEvents, eventBus } from "src/shared/utils/eventBus";
import { FreezePlayer, UnFreezePlayer } from "src/shared/utils/inputModifiers";

import { ClientStore } from "src/client/clientStore";
import { getLanePosition, getRootPosition } from "src/client/data/lanePositions";


export namespace CameraController {

	const clientStore                   = ClientStore.getInstance()
	var isMyTurn                        : boolean = false
	var camera                          : Entity | undefined
	var cameraTarget                    : Entity | undefined
	var cameraTargetPosition            : Vector3 | undefined
	var cameraStartPosition             : Vector3 | undefined
	var cameraEndPosition               : Vector3 | undefined
	var playbackReleaseTimer            : number | undefined

	var cameraHeight                    = Vector3.create(0, 0.65, -1.2)
	// Pin rack sits around z 18-19. This look point must stay ahead of the
	// playback dolly (cameraHeight.z + cameraEndOffset.z) or the view spins around.
	var playbackTargetOffset            = Vector3.create(0, 0.2, 19)

	var cameraEndOffset                 = Vector3.create(0, 0, 16)
	var summaryCameraHeight             = Vector3.create(0, 2.2, -6.5)
	var summaryCameraEndOffset          = Vector3.create(0, 0, 8)
	var flyInStartOffset                = Vector3.create(0, 36, 90)
	var flyInLandRadius                 = 5
	var flyInLandHeight                 = 2.4
	var flyInLookHeight                 = 1.6
	const flyInRotateAfter              = 0.2

	const aimPitchDegrees               = 13.5
	const cameraTransitionDuration      = 1
	const cameraDestroyDelayMs          = 1000 * cameraTransitionDuration
	const cameraPlaybackDuration        = 1000 * 2
	const cameraLookRaiseDuration       = 1000
	const cameraPlaybackEndHoldDuration = 1000 * 3
	/** Orbit heading that lands due north of the player (+Z). */
	const flyInEndAngle                 = 0
	var holdResetForSummary             = false
	var flyInActive                     = false
	var flyInMotion                     : FlyInMotion | undefined

	type FlyInMotion = {
		camera      : Entity
		centerX     : number
		centerZ     : number
		startAngle  : number
		angleSweep  : number
		startRadius : number
		startHeight : number
		endRadius   : number
		endHeight   : number
		durationSec : number
		elapsed     : number
	}


	// MARK: Init
	export function init() {
		eventBus.on(ClientEvents.LOAD_COMPLETE,                () => { triggerFlyInCamera() })
		eventBus.on(ClientEvents.ON_MY_ROLL_START,             () => { onMyRollStart() })
		eventBus.on(ClientEvents.ON_MY_ROLL_END,               () => { onMyRollEnd() })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => { onGroupRollPlaybackStart() })

		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME,           () => { resetCamera() })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END,   () => { resetCamera() })
		eventBus.on(ClientEvents.ON_GAME_SUMMARY,              () => { holdResetForSummary = true })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,            () => {
			if (holdResetForSummary) {
				holdResetForSummary = false
				return
			}
			resetCamera()
		})
		eventBus.on(ClientEvents.ON_GROUP_FRAME_END,           () => { resetCamera() })
		eventBus.on(ClientEvents.ON_MY_FRAME_END,              () => { resetCamera() })
	}

	function onMyRollStart() {
		console.log("CameraController: onMyRollStart")
		isMyTurn = true
		triggerRollStartCamera()
	}

	function onMyRollEnd() {
		console.log("CameraController: onMyRollEnd")
		isMyTurn = false
		resetCamera()
	}

	function onGroupRollPlaybackStart() {
		console.log("CameraController: onGroupRollPlaybackStart")
		if (isMyTurn || PlayerSettings.CAMER_ACTIVE_FOR_OTHER_PLAYERS_ROLLS) {
			triggerPlaybackCamera()
		}
	}


	// MARK: clearPlaybackReleaseTimer
	function clearPlaybackReleaseTimer() {
		if (playbackReleaseTimer === undefined) return
		utils.timers.clearTimeout(playbackReleaseTimer)
		playbackReleaseTimer = undefined
	}


	// MARK: scheduleCameraDestroy
	function scheduleCameraDestroy(
		cameraEntity : Entity,
		targetEntity : Entity
	) {
		if (Tween.has(cameraEntity)) {
			Tween.deleteFrom(cameraEntity)
		}
		if (Tween.has(targetEntity)) {
			Tween.deleteFrom(targetEntity)
		}

		utils.timers.setTimeout(() => {
			engine.removeEntity(cameraEntity)
			engine.removeEntity(targetEntity)
		}, cameraDestroyDelayMs)
	}


	// MARK: setCameraView
	function setCameraView(
		startPosition     : Vector3,
		targetPosition    : Vector3,
		transitionDuration: number = cameraTransitionDuration,
	): boolean {
		const previousCamera = camera
		const previousTarget = cameraTarget

		cameraStartPosition  = startPosition
		cameraTargetPosition = targetPosition

		cameraTarget = engine.addEntity()
		Transform.create(cameraTarget, { position: targetPosition })

		camera = engine.addEntity()
		Transform.create(camera, { position: startPosition })
		VirtualCamera.create(camera, {
			lookAtEntity     : cameraTarget,
			defaultTransition: {
				transitionMode: VirtualCamera.Transition.Time(transitionDuration),
			}
		})

		MainCamera.createOrReplace(engine.CameraEntity, { virtualCameraEntity: camera })

		if (previousCamera && previousTarget) {
			scheduleCameraDestroy(previousCamera, previousTarget)
		}

		return true
	}


	// MARK: getAimTargetOffset
	/**
	 * Lane-local aim target, pitched `aimPitchDegrees` below horizontal.
	 * Shares the pin look point's down-lane position so the replay can raise
	 * it onto the pins without the moving camera passing the target.
	 */
	function getAimTargetOffset(): Vector3 {
		const laneDistance = playbackTargetOffset.z - cameraHeight.z
		const drop         = laneDistance * Math.tan(aimPitchDegrees * Math.PI / 180)
		return Vector3.create(playbackTargetOffset.x, cameraHeight.y - drop, playbackTargetOffset.z)
	}


	// MARK: easeCubic
	/** Cubic ease-in-out for the fly-in rotation and zoom. */
	function easeCubic(t: number) {
		return t < 0.5
			? 4 * t * t * t
			: 1 - Math.pow(-2 * t + 2, 3) / 2
	}


	// MARK: stopFlyInMotion
	/** Stops the per-frame fly-in orbit system. */
	function stopFlyInMotion() {
		if (!flyInMotion) return
		engine.removeSystem(flyInSystem)
		flyInMotion = undefined
	}


	// MARK: flyInSystem
	/**
	 * Shrinks in for the full duration. Rotation starts after
	 * {@link flyInRotateAfter} so the first stretch is a straight fly-over.
	 */
	function flyInSystem(dt: number) {
		if (!flyInMotion) return

		const motion    = flyInMotion
		motion.elapsed += dt
		const t         = Math.min(motion.elapsed / motion.durationSec, 1)
		const zoom      = easeCubic(t)
		const radius    = motion.startRadius + (motion.endRadius - motion.startRadius) * zoom
		const height    = motion.startHeight + (motion.endHeight - motion.startHeight) * zoom
		let   angle     = motion.startAngle
		if (t > flyInRotateAfter) {
			const rotateT = (t - flyInRotateAfter) / (1 - flyInRotateAfter)
			angle         = motion.startAngle + easeCubic(rotateT) * motion.angleSweep
		}

		const transform = Transform.getMutableOrNull(motion.camera)
		if (transform) {
			transform.position = Vector3.create(
				motion.centerX + Math.sin(angle) * radius,
				height,
				motion.centerZ + Math.cos(angle) * radius,
			)
		}

		if (t < 1) return

		stopFlyInMotion()
		finishFlyIn()
	}


	// MARK: finishFlyIn
	/**
	 * Hands the camera back to the player and restores movement.
	 */
	function finishFlyIn() {
		stopFlyInMotion()
		if (flyInActive && camera) {
			const virtual = VirtualCamera.getMutableOrNull(camera)
			if (virtual) {
				virtual.defaultTransition = {
					transitionMode: VirtualCamera.Transition.Time(cameraTransitionDuration),
				}
			}
		}

		flyInActive = false
		resetCamera()
		UnFreezePlayer()
		eventBus.emit(ClientEvents.ON_LOAD_FLY_IN_END, {})
	}


	// MARK: triggerFlyInCamera
	/**
	 * Flies in over the alley, then spirals around the player and returns
	 * control. Keeps movement and touch controls disabled until then.
	 */
	export function triggerFlyInCamera() {
		console.log("CameraController: triggerFlyInCamera")
		stopFlyInMotion()
		if (flyInActive || camera) {
			flyInActive = false
			resetCamera()
		}

		FreezePlayer()
		eventBus.emit(ClientEvents.ON_LOAD_FLY_IN_START, {})
		flyInActive = true

		const duration = GameSettings.LOADING_CAMERA_FLY_IN_DURATION
		if (duration <= 0) {
			console.log("CameraController: triggerFlyInCamera: duration is 0, skipping")
			finishFlyIn()
			return
		}

		const playerTransform = Transform.getOrNull(engine.PlayerEntity)
		if (!playerTransform) {
			console.log("CameraController: triggerFlyInCamera: player transform not found")
			finishFlyIn()
			return
		}

		const playerPosition = playerTransform.position
		const startPosition  = Vector3.add(getRootPosition(), flyInStartOffset)
		const lookPosition   = Vector3.create(playerPosition.x, playerPosition.y + flyInLookHeight, playerPosition.z)
		const offsetX        = startPosition.x - playerPosition.x
		const offsetZ        = startPosition.z - playerPosition.z
		const startRadius    = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ)
		const startAngle     = Math.atan2(offsetX, offsetZ)
		const twoPi          = Math.PI * 2
		let   angleSweep     = flyInEndAngle - startAngle
		while (angleSweep <= 0) angleSweep += twoPi

		if (!setCameraView(startPosition, lookPosition, 0)) {
			console.log("CameraController: triggerFlyInCamera: failed to activate camera")
			finishFlyIn()
			return
		}

		const activeCamera = camera
		if (!activeCamera) {
			console.log("CameraController: triggerFlyInCamera: camera not found after camera activation")
			finishFlyIn()
			return
		}

		flyInMotion = {
			camera      : activeCamera,
			centerX     : playerPosition.x,
			centerZ     : playerPosition.z,
			startAngle  : startAngle,
			angleSweep  : angleSweep,
			startRadius : startRadius,
			startHeight : startPosition.y,
			endRadius   : flyInLandRadius,
			endHeight   : playerPosition.y + flyInLandHeight,
			durationSec : duration / 1000,
			elapsed     : 0,
		}
		engine.addSystem(flyInSystem)
	}


	// MARK: triggerRollStartCamera
	function triggerRollStartCamera() {
		console.log("CameraController: triggerRollStartCamera")
		const laneIndex      = clientStore.getLaneIndex() ?? 0
		const startPosition  = Vector3.add(getLanePosition(laneIndex), cameraHeight)
		const targetPosition = Vector3.add(getLanePosition(laneIndex), getAimTargetOffset())
		setCameraView(startPosition, targetPosition)
	}


	// MARK: Playback Camera
	function triggerPlaybackCamera() {

		console.log("CameraController: triggerPlaybackCamera")
		const laneIndex     = clientStore.getLaneIndex() ?? 0
		const laneOrigin    = getLanePosition(laneIndex)
		const startPosition = Vector3.add(laneOrigin, cameraHeight)
		const pinPosition   = Vector3.add(laneOrigin, playbackTargetOffset)
		const endPosition   = Vector3.add(startPosition, cameraEndOffset)
		cameraEndPosition   = endPosition

		const aimCamera       = camera
		const aimTarget       = cameraTarget
		const continueAimView = isMyTurn && aimCamera !== undefined && aimTarget !== undefined

		if (!continueAimView) {
			if (!setCameraView(startPosition, pinPosition)) {
				return
			}
		}

		const activeCamera = camera
		const activeTarget = cameraTarget
		if (!activeCamera || !activeTarget) {
			console.log("CameraController: triggerPlaybackCamera: camera not found after camera activation")
			return
		}

		if (continueAimView) {
			const current     = Transform.get(activeTarget).position
			const targetStart = Vector3.create(current.x, current.y, current.z)
			Tween.setMove(
				activeTarget,
				targetStart,
				pinPosition,
				cameraLookRaiseDuration,
				EasingFunction.EF_EASEOUTCUBIC,
			)
			cameraTargetPosition = pinPosition
		}

		Tween.setMove(activeCamera, startPosition, endPosition, cameraPlaybackDuration)
		clearPlaybackReleaseTimer()
		playbackReleaseTimer = utils.timers.setTimeout(() => {
			playbackReleaseTimer = undefined
			if (camera !== activeCamera) return
			resetCamera()
		}, cameraPlaybackDuration + cameraPlaybackEndHoldDuration)
	}


	// MARK: triggerSummaryCamera
	/**
	 * Dolly from behind the group spot down the lane. Holds until {@link resetCamera}.
	 */
	export function triggerSummaryCamera(laneIndex: number) {
		console.log("CameraController: triggerSummaryCamera")
		const laneOrigin     = getLanePosition(laneIndex)
		const startPosition  = Vector3.add(laneOrigin, summaryCameraHeight)
		const targetPosition = Vector3.add(laneOrigin, getAimTargetOffset())
		const endPosition    = Vector3.add(startPosition, summaryCameraEndOffset)

		if (!setCameraView(startPosition, targetPosition)) {
			return
		}

		const activeCamera = camera
		if (!activeCamera) {
			console.log("CameraController: triggerSummaryCamera: camera not found after camera activation")
			return
		}

		Tween.setMove(activeCamera, startPosition, endPosition, GameSettings.GAME_SUMMARY_CAMERA_DURATION)
	}


	// MARK: resetCamera
	/**
	 * Releases the active virtual camera and destroys its entities.
	 */
	export function resetCamera() {
		stopFlyInMotion()
		if (flyInActive) {
			flyInActive = false
			UnFreezePlayer()
			eventBus.emit(ClientEvents.ON_LOAD_FLY_IN_END, {})
		}

		clearPlaybackReleaseTimer()
		if (!camera || !cameraTarget) return

		const oldCamera = camera
		const oldTarget = cameraTarget
		camera       = undefined
		cameraTarget = undefined

		const mainCamera = MainCamera.getMutableOrNull(engine.CameraEntity)
		if (!mainCamera) {
			console.log("CameraController: resetCamera: mainCamera not found")
			scheduleCameraDestroy(oldCamera, oldTarget)
			return
		}

		if (mainCamera.virtualCameraEntity === oldCamera) {
			mainCamera.virtualCameraEntity = undefined
		}

		scheduleCameraDestroy(oldCamera, oldTarget)
	}

}
