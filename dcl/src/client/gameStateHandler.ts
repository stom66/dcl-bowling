import * as utils from "@dcl-sdk/utils"

import { LaneStatus, PlayerStatus } from "src/shared/enums"
import { ClientState, LaneState, NotifyJoinGamePayload, NotifyPlayerTurnPayload } from "src/shared/types"
import { eventBus } from "src/shared/utils/eventBus"

import { ClientEvents } from "src/client/clientEvents"
import { ClientStore } from "src/client/clientStore"
import { Vector3 } from "@dcl/sdk/math"
import { lanePositions } from "./data/lanePositions"
import { GetRandomPointInCircle } from "src/shared/utils/math"
import { movePlayerTo } from "~system/RestrictedActions"
import { userProfileCache } from "src/shared/utils/userProfileCache"
import { BowlingControls } from "./bowlingControls"


export namespace gameStateHandler {

	// MARK: Event bindings
	eventBus.on(ClientEvents.NOTIFY_JOIN_GAME, (data: LaneState) => { onJoinGame(data) })
	eventBus.on(ClientEvents.NOTIFY_GAME_START, (data: LaneState) => { onGameStart(data) })
	eventBus.on(ClientEvents.NOTIFY_PLAYER_TURN_START, (data: { userId: string }) => { onTurnStart(data) })
	eventBus.on(ClientEvents.NOTIFY_PLAYER_TURN_PLAYBACK, (data: NotifyPlayerTurnPayload) => { onTurnPlayback(data) })


	// MARK: Vars
	const clientStore = ClientStore.getInstance()


	// MARK: Init
	export function init() {
		
	}


	// MARK: onJoinGame
	function onJoinGame(data: LaneState) {
		console.log('gameStateHandler: onJoinGame: data', data)
	}


	// MARK: onGameStart
	function onGameStart(data: LaneState) {
		console.log('gameStateHandler: onGameStart')
		movePlayerToGroupZone()
	}


	function onTurnStart(data: { userId: string }) {
		if (data.userId === clientStore.getUserId()) {
			console.log('gameStateHandler: onTurnStart: moving player to start of lane')
			movePlayerToStartOfLane()
		}

		// Change the players camera to ve a view down the lane
		// Trigger the input controls
		const laneIndex       = clientStore.getLaneState()?.laneIndex ?? 0
		const lanePosition    = lanePositions[laneIndex]
		var bowlingControls = new BowlingControls(lanePosition)

		utils.timers.setTimeout(() => {
			bowlingControls.EndTheBowl()
			bowlingControls = new BowlingControls(lanePosition)
		}, 20000)

	}


	function onTurnEnd() {
		movePlayerToGroupZone()
	}


	function onTurnPlayback(data: NotifyPlayerTurnPayload) {
		console.log('gameStateHandler: onTurnPlayback: replaying the turn taken by another players')
		// TODO: replay other players turn
	}




	// MARK: Player Movement
	function movePlayerToGroupZone() {
		const groupZoneOffset = Vector3.create(0, 0, -3.75) // How far back from the lane should the group be
		const lanePosition = lanePositions[clientStore.getLaneState()?.laneIndex ?? 0]
		const circlePosition = Vector3.add(lanePosition, groupZoneOffset)
		const randomPoint = GetRandomPointInCircle(circlePosition, 1.5)

		movePlayerTo({ newRelativePosition: randomPoint })
	}

	function movePlayerToStartOfLane() {
		
		// move the player to the start of the lane
		const lanePosition   = lanePositions[clientStore.getLaneState()?.laneIndex ?? 0]
		const playerOffset   = Vector3.create(-1, 0, 0)
		const targetPosition = Vector3.add(lanePosition, playerOffset)
		const faceForward    = Vector3.create(0, 0, 10)
		movePlayerTo({ newRelativePosition: targetPosition, cameraTarget: Vector3.add(targetPosition, faceForward) })
	}





}