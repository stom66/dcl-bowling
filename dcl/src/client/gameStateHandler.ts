import * as utils from "@dcl-sdk/utils"

import { LaneStatus, PlayerStatus } from "src/shared/enums"
import { ClientState, LaneState, NotifyJoinGamePayload, NotifyPlayerRollPayload } from "src/shared/types"
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
	eventBus.on(ClientEvents.ON_GAME_JOINED, (data: LaneState) => { onJoinGame(data) })
	eventBus.on(ClientEvents.ON_GROUP_GAME_START, (data: LaneState) => { onGameStart(data) })

	eventBus.on(ClientEvents.ON_MY_ROLL_START, (data: { userId: string }) => { onMyRollStart(data) })
	eventBus.on(ClientEvents.ON_MY_ROLL_END, (data: { userId: string }) => { onMyRollEnd(data) })

	eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK, (data: NotifyPlayerRollPayload) => { onRollPlayback(data) })



	// MARK: Vars
	const clientStore = ClientStore.getInstance()

	var bowlingControls: BowlingControls | undefined


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
	}


	function onMyRollStart(data: { userId: string }) {

		// Change the players camera to ve a view down the lane
		// Trigger the input controls
		const laneIndex    = clientStore.getLaneIndex() ?? 0
		const lanePosition = lanePositions[laneIndex]
		bowlingControls    = new BowlingControls(lanePosition)
	}


	function onMyRollEnd(data: { userId: string }) {

		if (bowlingControls) {
			bowlingControls.Destroy()
			bowlingControls = undefined
		}
	}


	function onRollPlayback(data: NotifyPlayerRollPayload) {
		console.log('gameStateHandler: onRollPlayback: replaying roll from another player')
		// TODO: replay other player's roll
	}






}