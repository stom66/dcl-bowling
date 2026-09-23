import { engine, Entity, MainCamera, Transform, Tween, VirtualCamera } from "@dcl/sdk/ecs";
import { Vector3 } from "@dcl/sdk/math";
import * as utils from "@dcl-sdk/utils"

import { PlayerSettings } from "src/shared/settings";
import { ClientEvents, eventBus } from "src/shared/utils/eventBus";

import { ClientStore } from "src/client/clientStore";
import { lanePositions } from "src/client/data/lanePositions";


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
	var cameraTargetOffset              = Vector3.create(0, 0.2, 19)

	var cameraEndOffset                 = Vector3.create(0, 0, 16)

	const cameraTransitionDuration      = 1
	const cameraDestroyDelayMs          = 1000 * cameraTransitionDuration
	const cameraPlaybackDuration        = 1000 * 2
	const cameraPlaybackEndHoldDuration = 1000 * 3


	// MARK: Init
	export function init() {
		eventBus.on(ClientEvents.ON_MY_ROLL_START,             () => { onMyRollStart() })
		eventBus.on(ClientEvents.ON_MY_ROLL_END,               () => { onMyRollEnd() })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => { onGroupRollPlaybackStart() })

		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME,           () => { resetCamera() })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END,   () => { resetCamera() })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,            () => { resetCamera() })
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

	function triggerRollStartCamera() {
		console.log("CameraController: triggerRollStartCamera")
		const laneIndex      = clientStore.getLaneIndex() ?? 0
		const startPosition  = Vector3.add(lanePositions[laneIndex], cameraHeight)
		const targetPosition = Vector3.add(lanePositions[laneIndex], cameraTargetOffset)
		setCameraView(startPosition, targetPosition)
	}


	// MARK: Playback Camera
	function triggerPlaybackCamera() {

		console.log("CameraController: triggerPlaybackCamera")
		const laneIndex      = clientStore.getLaneIndex() ?? 0
		const startPosition  = Vector3.add(lanePositions[laneIndex], cameraHeight)
		const targetPosition = Vector3.add(lanePositions[laneIndex], cameraTargetOffset)
		const endPosition    = Vector3.add(startPosition, cameraEndOffset)
		cameraEndPosition    = endPosition

		if (!setCameraView(startPosition, targetPosition)) {
			return
		}

		const activeCamera = camera
		if (!activeCamera) {
			console.log("CameraController: triggerPlaybackCamera: camera not found after camera activation")
			return
		}

		Tween.setMove(activeCamera, startPosition, endPosition, cameraPlaybackDuration)
		clearPlaybackReleaseTimer()
		playbackReleaseTimer = utils.timers.setTimeout(() => {
			playbackReleaseTimer = undefined
			if (camera !== activeCamera) return
			resetCamera()
		}, cameraPlaybackDuration + cameraPlaybackEndHoldDuration)
	}


	// MARK: resetCamera
	function resetCamera() {
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
