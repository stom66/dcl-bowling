import * as utils from "@dcl-sdk/utils"
import { Vector3 } from "@dcl/sdk/math"
import { movePlayerTo } from "~system/RestrictedActions"

import { LanePhase, PlayerStatus } from "src/shared/enums"
import { LaneSnapshot, NotifyPlayerRollPayload, NotifyPlayerRollStartPayload } from "src/shared/types/shared-types"
import { GetRandomPointInCircle } from "src/shared/utils/math"
import { userProfileCache } from "src/shared/utils/userProfileCache"
import { ClientEvents, eventBus } from "src/shared/utils/eventBus"

import { BowlingControls } from "src/client/bowlingControls"
import { ClientStore } from "src/client/clientStore"
import { lanePositions } from "src/client/data/lanePositions"
import { LaneVisuals } from "src/client/laneVisuals"


export namespace gameStateHandler {

	// MARK: Event bindings
	eventBus.on(ClientEvents.ON_GAME_JOINED,              (data: LaneSnapshot)                  => { onJoinGame(data) })
	eventBus.on(ClientEvents.ON_GROUP_GAME_START,         (data: LaneSnapshot)                  => { onGameStart(data) })

	eventBus.on(ClientEvents.ON_MY_ROLL_START,            (data: NotifyPlayerRollStartPayload)  => { onMyRollStart(data) })
	eventBus.on(ClientEvents.ON_MY_ROLL_END,              (data: { userId: string })            => { onMyRollEnd(data) })

	eventBus.on(ClientEvents.ON_GROUP_ROLL_START,         (data: NotifyPlayerRollStartPayload)  => { onGroupRollStart(data) })
	eventBus.on(ClientEvents.ON_GROUP_ROLL_END,           (data: { userId: string })            => { })
	eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_RECEIVED, (data: NotifyPlayerRollPayload)      => { onRollPlaybackReceived(data) })


	// MARK: Vars
	const clientStore = ClientStore.getInstance()

	var bowlingControls: BowlingControls | undefined
	var laneVisuals    : LaneVisuals | undefined


	// MARK: Init
	export function init() {

	}


	// MARK: onJoinGame
	function onJoinGame(data: LaneSnapshot) {
		console.log('gameStateHandler: onJoinGame: data', data)
	}


	// MARK: onGameStart
	function onGameStart(data: LaneSnapshot) {
		console.log('gameStateHandler: onGameStart')
	}

	function onGroupRollStart(data: NotifyPlayerRollStartPayload) {
		console.log('gameStateHandler: onGroupRollStart: data', data)
		createLaneVisuals(data)
	}

	function onMyRollStart(data: NotifyPlayerRollStartPayload) {
		console.log('gameStateHandler: onMyRollStart: data', data)
		
		createLaneVisuals(data)
		if (!laneVisuals) return
		const laneIndex    = clientStore.getLaneIndex() ?? 0
		const lanePosition = lanePositions[laneIndex]
		bowlingControls    = new BowlingControls(lanePosition, laneVisuals.getBall())
	}

		function createLaneVisuals(data: NotifyPlayerRollStartPayload) {
			const laneIndex    = clientStore.getLaneIndex() ?? 0
			const lanePosition = lanePositions[laneIndex]
			laneVisuals?.destroy()
			laneVisuals        = new LaneVisuals(lanePosition, data.rollStartTimestamp)
			laneVisuals.setupPins(data.pinStanding)
		}

	function onMyRollEnd(data: { userId: string }) {

		if (bowlingControls) {
			bowlingControls.Destroy()
			bowlingControls = undefined
		}
	}


	function onRollPlaybackReceived(data: NotifyPlayerRollPayload) {
		console.log('gameStateHandler: onRollPlaybackReceived: userId', data.userId)

		if (!laneVisuals) {
			console.log('gameStateHandler: onRollPlaybackReceived: laneVisuals not found')
			return
		}
		laneVisuals.queueReplay(data, () => {
			console.log('gameStateHandler: onRollPlaybackReceived: queueReplay complete')
		})
	}






}