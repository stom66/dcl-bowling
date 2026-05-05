import * as utils from "@dcl-sdk/utils"

import { LanePhase, PlayerStatus } from "src/shared/enums"
import { ClientState, LaneState, NotifyJoinGamePayload, NotifyPlayerRollPayload } from "src/shared/types/shared-types"
import { eventBus } from "src/shared/utils/eventBus"

import { ClientEvents } from "src/client/clientEvents"
import { ClientStore } from "src/client/clientStore"
import { Vector3 } from "@dcl/sdk/math"
import { lanePositions } from "./data/lanePositions"
import { GetRandomPointInCircle } from "src/shared/utils/math"
import { movePlayerTo } from "~system/RestrictedActions"
import { userProfileCache } from "src/shared/utils/userProfileCache"
import { BowlingControls } from "./bowlingControls"
import { LaneVisuals } from "./laneVisuals"


export namespace gameStateHandler {

	// MARK: Event bindings
	eventBus.on(ClientEvents.ON_GAME_JOINED, (data: LaneState) => { onJoinGame(data) })
	eventBus.on(ClientEvents.ON_GROUP_GAME_START, (data: LaneState) => { onGameStart(data) })

	eventBus.on(ClientEvents.ON_MY_ROLL_START, (data: { userId: string, pinStanding: boolean[] }) => { onMyRollStart(data) })
	eventBus.on(ClientEvents.ON_MY_ROLL_END, (data: { userId: string }) => { onMyRollEnd(data) })

	eventBus.on(ClientEvents.ON_GROUP_ROLL_START, (data: { userId: string, pinStanding: boolean[] }) => { onGroupRollStart(data) })
	eventBus.on(ClientEvents.ON_GROUP_ROLL_END, (data: { userId: string }) => { })
	eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, (data: NotifyPlayerRollPayload) => { onRollPlaybackStart(data) })
	




	// MARK: Vars
	const clientStore = ClientStore.getInstance()

	var bowlingControls: BowlingControls | undefined
	var laneVisuals    : LaneVisuals | undefined

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

	function onGroupRollStart(data: { userId: string, pinStanding: boolean[] }) {
		console.log('gameStateHandler: onGroupRollStart: data', data)
		
		const laneIndex    = clientStore.getLaneIndex() ?? 0
		const lanePosition = lanePositions[laneIndex]
		laneVisuals?.destroy()
		laneVisuals        = new LaneVisuals(lanePosition)
		laneVisuals.setupPins(data.pinStanding)
	}

	function onMyRollStart(data: { userId: string, pinStanding: boolean[] }) {
		console.log('gameStateHandler: onMyRollStart: data', data)
		const laneIndex    = clientStore.getLaneIndex() ?? 0
		const lanePosition = lanePositions[laneIndex]
		laneVisuals?.destroy()
		laneVisuals        = new LaneVisuals(lanePosition)	
		laneVisuals.setupPins(data.pinStanding)
		bowlingControls    = new BowlingControls(lanePosition, laneVisuals.getBall())
	}

	function onMyRollEnd(data: { userId: string }) {

		if (bowlingControls) {
			bowlingControls.Destroy()
			bowlingControls = undefined
		}
	}


	function onRollPlaybackStart(data: NotifyPlayerRollPayload) {
		console.log('gameStateHandler: onRollPlayback: replaying roll from another player')
		// TODO: replay other player's roll	eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK, (data: NotifyPlayerRollPayload) => { handleNotifyPlayerRollPlayback(data) })

		if (!laneVisuals) {
			console.log('gameStateHandler: onRollPlayback: laneVisuals not found')
			return
		}
		laneVisuals.runReplay(data, () => {
			console.log('gameStateHandler: onRollPlayback: roll replay complete')
		})
	}






}