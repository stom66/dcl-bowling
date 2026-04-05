import * as utils from "@dcl-sdk/utils"

import { LaneStatus, PlayerStatus } from "src/shared/enums"
import { ClientState, LaneState, NotifyJoinGamePayload } from "src/shared/types"
import { eventBus } from "src/shared/utils/eventBus"

import { ClientEvents } from "src/client/clientEvents"
import { ClientStore } from "src/client/clientStore"
import { Vector3 } from "@dcl/sdk/math"
import { lanePositions } from "./data/lanePositions"
import { GetRandomPointInCircle } from "src/shared/utils/math"
import { movePlayerTo } from "~system/RestrictedActions"


export namespace gameStateHandler {

	// MARK: Event bindings
	eventBus.on(ClientEvents.NOTIFY_JOIN_GAME, (data: LaneState) => { onJoinGame(data) })


	// MARK: Vars
	const clientStore = ClientStore.getInstance()
	var waitingTimeout: utils.TimerId | undefined = undefined


	// MARK: Init
	export function init() {
		
	}


	// MARK: onJoinGame
	function onJoinGame(data: LaneState) {
		console.log('gameStateHandler: onJoinGame: data', data)

		if (!waitingTimeout) {
			console.log('gameStateHandler: onJoinGame: setting waiting timeout')
			const timeToGameStart = data.gameStartTime - Date.now()
			waitingTimeout = utils.timers.setTimeout(() => {
				onGameStart()
			}, timeToGameStart)
		} else {
			console.log('gameStateHandler: onJoinGame: waiting timeout already set')
		}
	}


	// MARK: onGameStart
	function onGameStart() {
		console.log('gameStateHandler: onGameStart')

		// Move the player to their lane zone
		const groupZoneOffset = Vector3.create(0, 0, -3.75) // How far back from the lane should the group be
		const lanePosition = lanePositions[clientStore.getLaneState()?.laneIndex ?? 0]
		const circlePosition = Vector3.add(lanePosition, groupZoneOffset)

		const randomPoint = GetRandomPointInCircle(circlePosition, 1.5)

		movePlayerTo({ newRelativePosition: randomPoint })

	}





}