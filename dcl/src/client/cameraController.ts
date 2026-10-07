import { EasingFunction, engine, Entity, MainCamera, Transform, Tween, VirtualCamera } from "@dcl/sdk/ecs";
import { Vector3 } from "@dcl/sdk/math";
import * as utils from "@dcl-sdk/utils"

import { GameSettings, PlayerSettings } from "src/shared/settings";
import { ClientEvents, eventBus } from "src/shared/utils/eventBus";

import { ClientStore } from "src/client/clientStore";
import { getLanePosition } from "src/client/data/lanePositions";


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

	const aimPitchDegrees               = 13.5
	const cameraTransitionDuration      = 1
	const cameraDestroyDelayMs          = 1000 * cameraTransitionDuration
	const cameraPlaybackDuration        = 1000 * 2
	const cameraLookRaiseDuration       = 1000
	const cameraPlaybackEndHoldDuration = 1000 * 3
	var holdResetForSummary             = false


	// MARK: Init
	export function init() {
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
	function setCameraView(startPosition: Vector3, targetPosition: Vector3): boolean {
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
				transitionMode: VirtualCamera.Transition.Time(cameraTransitionDuration),
			}
		})

		const mainCamera = MainCamera.getMutableOrNull(engine.CameraEntity)
		if (!mainCamera) {
			console.log("CameraController: setCameraView: mainCamera not found")
			engine.removeEntity(camera)
			engine.removeEntity(cameraTarget)
			camera       = previousCamera
			cameraTarget = previousTarget
			return false
		}

		mainCamera.virtualCameraEntity = camera

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
