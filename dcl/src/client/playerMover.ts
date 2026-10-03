import { engine } from "@dcl/sdk/ecs"
import { Vector3 } from "@dcl/sdk/math"
import { movePlayerTo } from "~system/RestrictedActions"

import { eventBus, ClientEvents } from "src/shared/utils/eventBus"
import { FreezePlayer, UnFreezePlayer } from "src/shared/utils/inputModifiers"
import { GetRandomPointInCircle } from "src/shared/utils/math"

import { ClientStore } from "src/client/clientStore"
import { getLaneLobbyPosition, getLanePosition, getRootPosition } from "src/client/data/lanePositions"

export namespace playerMover {

	const clientStore = ClientStore.getInstance()

	export function init() {
		eventBus.on(ClientEvents.ON_MY_FRAME_START, movePlayerToStartOfLane)
		eventBus.on(ClientEvents.ON_MY_FRAME_END, movePlayerToGroupZone)

		eventBus.on(ClientEvents.ON_GROUP_GAME_START, movePlayerToGroupZone)
		eventBus.on(ClientEvents.ON_GROUP_GAME_END, movePlayerToLobby)

		
		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME, (data: {}) => { movePlayerToLobby() })
	}

	export function movePlayerToSpawnPoint() {
		const spawnPoint = Vector3.add(getRootPosition(), Vector3.create(0, 2, 0))
		const lookTarget = Vector3.add(spawnPoint, Vector3.create(0, 1.5, -12))
		if (!spawnPoint) return
		movePlayerTo({ 
			newRelativePosition: spawnPoint,
			cameraTarget: lookTarget
		})
		UnFreezePlayer()
	}


	// MARK: Player Movement
	function movePlayerToGroupZone() {
		const groupZoneOffset = Vector3.create(0, 0, -3.75) // How far back from the lane should the group be
		const lanePosition = getLanePosition(clientStore.getLaneIndex() ?? 0)
		const circlePosition = Vector3.add(lanePosition, groupZoneOffset)
		const randomPoint = GetRandomPointInCircle(circlePosition, 1.5)

		movePlayerTo({ newRelativePosition: randomPoint })
		UnFreezePlayer()
	}


	function movePlayerToStartOfLane() {
		// move the player to the start of the lane
		const lanePosition   = getLanePosition(clientStore.getLaneIndex() ?? 0)
		const playerOffset   = Vector3.create(-1.25, 0, -0.35)
		const targetPosition = Vector3.add(lanePosition, playerOffset)
		const faceForward    = Vector3.create(0, 0, 10)
		movePlayerTo({ newRelativePosition: targetPosition, cameraTarget: Vector3.add(targetPosition, faceForward) })
		FreezePlayer()
	}


	function movePlayerToLobby() {
		const laneIndex   = clientStore.getLaneIndex()
		const lobbyCenter = laneIndex !== undefined
			? getLaneLobbyPosition(laneIndex)
			: Vector3.add(getRootPosition(), Vector3.create(0, 0, 0))
		const randomPoint = GetRandomPointInCircle(lobbyCenter, 1.5)
		movePlayerTo({ newRelativePosition: randomPoint })
		UnFreezePlayer()
	}
}