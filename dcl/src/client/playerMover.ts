import { eventBus } from "src/shared/utils/eventBus"
import { ClientEvents } from "./clientEvents"
import { Vector3 } from "@dcl/sdk/math"
import { ClientStore } from "./clientStore"

import { lanePositions } from "./data/lanePositions"
import { GetRandomPointInCircle } from "src/shared/utils/math"
import { movePlayerTo } from "~system/RestrictedActions"

export namespace playerMover {

	const clientStore = ClientStore.getInstance()

	export function init() {
		eventBus.on(ClientEvents.ON_MY_FRAME_START, movePlayerToStartOfLane)
		eventBus.on(ClientEvents.ON_MY_FRAME_END, movePlayerToGroupZone)

		eventBus.on(ClientEvents.ON_GROUP_GAME_START, movePlayerToGroupZone)
		eventBus.on(ClientEvents.ON_GROUP_GAME_END, movePlayerToLobby)
	}


	// MARK: Player Movement
	function movePlayerToGroupZone() {
		const groupZoneOffset = Vector3.create(0, 0, -3.75) // How far back from the lane should the group be
		const lanePosition = lanePositions[clientStore.getLaneIndex() ?? 0]
		const circlePosition = Vector3.add(lanePosition, groupZoneOffset)
		const randomPoint = GetRandomPointInCircle(circlePosition, 1.5)

		movePlayerTo({ newRelativePosition: randomPoint })
	}


	function movePlayerToStartOfLane() {
		// move the player to the start of the lane
		const lanePosition   = lanePositions[clientStore.getLaneIndex() ?? 0]
		const playerOffset   = Vector3.create(-1, 0, 0)
		const targetPosition = Vector3.add(lanePosition, playerOffset)
		const faceForward    = Vector3.create(0, 0, 10)
		movePlayerTo({ newRelativePosition: targetPosition, cameraTarget: Vector3.add(targetPosition, faceForward) })
	}


	function movePlayerToLobby() {
		const randomPoint = GetRandomPointInCircle(Vector3.create(16, 0, 4), 1.5)
		movePlayerTo({ newRelativePosition: randomPoint })
	}
}