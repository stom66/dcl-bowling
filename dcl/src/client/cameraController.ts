import { engine, Entity, MainCamera, Transform, Tween, VirtualCamera } from "@dcl/sdk/ecs";
import { Vector3 } from "@dcl/sdk/math";
import * as utils from "@dcl-sdk/utils"

import { eventBus } from "src/shared/utils/eventBus";
import { PlayerSettings } from "src/shared/settings";

import { lanePositions } from "src/client/data/lanePositions";
import { ClientEvents } from "src/client/clientEvents";
import { ClientStore } from "src/client/clientStore";
import { LaneSnapshot } from "src/shared/types/shared-types";


export namespace CameraController {

	const clientStore = ClientStore.getInstance()
	var isMyTurn           : boolean = false
	var camera             : Entity | undefined
	var cameraTarget       : Entity | undefined
	var cameraTargetPosition: Vector3 | undefined
	var cameraStartPosition: Vector3 | undefined
	var cameraEndPosition  : Vector3 | undefined

	var cameraHeight = Vector3.create(0, 0.65, -1.2)
	var cameraTargetOffset = Vector3.create(0, 0.2, 19)

	var cameraEndOffset = Vector3.create(0, 0, 16)

	const cameraTransitionDuration       = 1
	const cameraPlaybackDuration         = 1000 * 2
	const cameraPlaybackEndHoldDuration = 1000 * 3


	// MARK: Init
	export function init() {
		eventBus.on(ClientEvents.ON_MY_ROLL_START, (data: { userId: string }) => { onMyRollStart(data) })
		eventBus.on(ClientEvents.ON_MY_ROLL_END, (data: { userId: string }) => { onMyRollEnd(data) })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, (data: { userId: string }) => { onGroupRollPlaybackStart(data) })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END, (data: {}) => { onGroupRollPlaybackEnd() })
		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME, (data: {}) => { onRequestLeaveGame() })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END, (data: LaneSnapshot) => { resetCamera() })

		camera = engine.addEntity()
		Transform.create(camera, { position: Vector3.create(0, 0, 0) })
		
		cameraTarget = engine.addEntity()
		Transform.create(cameraTarget, { position: Vector3.create(0, 0, 0) })
	}

	function onMyRollStart(data: { userId: string }) {
		console.log("CameraController: onMyRollStart")
		isMyTurn = true
		triggerRollStartCamera()
	}

	function onMyRollEnd(data: { userId: string }) {
		console.log("CameraController: onMyRollEnd")
		isMyTurn = false
		resetCamera()
	}

	function onGroupRollPlaybackStart(data: { userId: string }) {
		console.log("CameraController: onGroupRollPlaybackStart")
		if (isMyTurn || PlayerSettings.CAMER_ACTIVE_FOR_OTHER_PLAYERS_ROLLS) {
			triggerPlaybackCamera()
		}
	}

	function onGroupRollPlaybackEnd() {
		console.log("CameraController: onGroupRollPlaybackEnd")
		if (isMyTurn || PlayerSettings.CAMER_ACTIVE_FOR_OTHER_PLAYERS_ROLLS) {
			utils.timers.setTimeout(() => {
				resetCamera()
			}, 1000)
		}
	}

	function onRequestLeaveGame() {
		console.log("CameraController: onRequestLeaveGame")
		resetCamera()
	}



	function setCameraView(startPosition: Vector3, targetPosition: Vector3): boolean {
		if (!camera || !cameraTarget) {
			console.log("CameraController: setCameraView: camera or cameraTarget not found")
			return false
		}

		const cameraTransform = Transform.getMutableOrNull(camera)
		const cameraTargetTransform = Transform.getMutableOrNull(cameraTarget)
		if (!cameraTransform || !cameraTargetTransform) {
			console.log("CameraController: setCameraView: cameraTransform or cameraTargetTransform not found")
			return false
		}

		cameraStartPosition = startPosition
		cameraTargetPosition = targetPosition
		cameraTransform.position = startPosition
		cameraTargetTransform.position = targetPosition

		VirtualCamera.createOrReplace(camera, {
			lookAtEntity     : cameraTarget,
			defaultTransition: {
				transitionMode: VirtualCamera.Transition.Time(cameraTransitionDuration),
			}
		})

		const mainCamera = MainCamera.getMutableOrNull(engine.CameraEntity)
		if (!mainCamera) {
			console.log("CameraController: setCameraView: mainCamera not found")
			return false
		}

		mainCamera.virtualCameraEntity = camera
		return true
	}

	function triggerRollStartCamera() {
		console.log("CameraController: triggerRollStartCamera")
		const laneIndex     = clientStore.getLaneIndex() ?? 0
		const startPosition = Vector3.add(lanePositions[laneIndex], cameraHeight)
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
		const mainCamera = MainCamera.getMutableOrNull(engine.CameraEntity)
		if (!mainCamera) {
			console.log("CameraController: triggerPlaybackCamera: mainCamera not found after camera activation")
			return
		}
		utils.timers.setTimeout(() => {
			mainCamera.virtualCameraEntity = undefined
		}, cameraPlaybackDuration + cameraPlaybackEndHoldDuration)
	}



	// MARK: resetCamera
	function resetCamera() {
		if (!camera || !cameraTarget) return
		const mainCamera = MainCamera.getMutableOrNull(engine.CameraEntity)
		if (!mainCamera) {
			console.log("CameraController: resetCamera: mainCamera not found")
			return
		}
		mainCamera.virtualCameraEntity = undefined
	}

}
