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
import { LaneStore } from "src/shared/laneStore"


export namespace gameStateHandler {

	// MARK: Event bindings
	eventBus.on(ClientEvents.ON_GAME_JOINED,              (data: LaneSnapshot)                  => { onJoinGame(data) })
	eventBus.on(ClientEvents.ON_GROUP_GAME_START,         (data: LaneSnapshot)                  => { onGameStart(data) })

	eventBus.on(ClientEvents.ON_MY_ROLL_START,            (data: NotifyPlayerRollStartPayload)  => { onMyRollStart(data) })
	eventBus.on(ClientEvents.ON_MY_ROLL_END,              (data: { userId: string })            => { onMyRollEnd(data) })

	eventBus.on(ClientEvents.ON_GROUP_ROLL_START,         (data: NotifyPlayerRollStartPayload)  => { onGroupRollStart(data) })
	eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_RECEIVED, (data: NotifyPlayerRollPayload)      => { onRollPlaybackReceived(data) })

	eventBus.on(ClientEvents.ON_NON_GROUP_ROLL_START,         (data: NotifyPlayerRollStartPayload)  => { onNonGroupRollStart(data) })
	eventBus.on(ClientEvents.ON_NON_GROUP_ROLL_PLAYBACK_RECEIVED, (data: NotifyPlayerRollPayload)      => { onRollPlaybackReceived(data) })


	// MARK: Vars
	const clientStore = ClientStore.getInstance()

	var bowlingControls: BowlingControls | undefined
	var laneVisuals    : LaneVisuals[] = [] // array of visuals, indexed matches laneIndex


	// MARK: Init
	export function init() {
/* 		eventBus.on(ClientEvents.ON_GROUP_GAME_END, (data: LaneSnapshot) => { (data) }) {
			console.log('gameStateHandler: onGroupGameEnd: data', data)
			for (let i = 0; i < laneVisuals.length; i++) {
				if (laneVisuals[i]) laneVisuals[i]?.destroy()
			}
			laneVisuals = []
		} */
	}

	function createLaneVisuals(
		data     : NotifyPlayerRollStartPayload
	) {
		const laneIndex = LaneStore.findLaneByUserId(data.userId)
		if (laneIndex === undefined) {
			console.error('gameStateHandler: createLaneVisuals: laneIndex not found')
			return undefined
		}

		if (laneVisuals[laneIndex]) laneVisuals[laneIndex]?.destroy()
			
		const pos = lanePositions[laneIndex]
		const lv = new LaneVisuals(pos, data.rollStartTimestamp, data.userId)
		lv.setupPins(data.pinStanding)

		laneVisuals[laneIndex] = lv
		return lv
	}


	// MARK: onJoinGame
	function onJoinGame(data: LaneSnapshot) {
		console.log('gameStateHandler: onJoinGame: data', data)
	}


	// MARK: onGameStart
	function onGameStart(data: LaneSnapshot) {
		console.log('gameStateHandler: onGameStart')
	}

	function onNonGroupRollStart(data: NotifyPlayerRollStartPayload) {
		console.log('gameStateHandler: onNonGroupRollStart: data', data)


		createLaneVisuals(data)
	}

	function onGroupRollStart(data: NotifyPlayerRollStartPayload) {
		console.log('gameStateHandler: onGroupRollStart: data', data)

		createLaneVisuals(data)
	}

	function onMyRollStart(data: NotifyPlayerRollStartPayload) {
		console.log('gameStateHandler: onMyRollStart: data', data)
		
		const lv = createLaneVisuals(data)

		const laneIndex = LaneStore.findLaneByUserId(data.userId)
		if (laneIndex === undefined) {
			console.error('gameStateHandler: onMyRollStart: laneIndex not found')
			return
		}

		const lanePosition = lanePositions[laneIndex]
		bowlingControls    = new BowlingControls(lanePosition, lv?.getBall())
	}

	function onMyRollEnd(data: { userId: string }) {
		if (bowlingControls) {
			bowlingControls.Destroy()
			bowlingControls = undefined
		}
	}


	function onRollPlaybackReceived(data: NotifyPlayerRollPayload) {
		console.log('gameStateHandler: onRollPlaybackReceived: userId', data.userId)

		
		const laneIndex = LaneStore.findLaneByUserId(data.userId)
		if (laneIndex === undefined) {
			console.error('gameStateHandler: onRollPlaybackReceived: laneIndex not found')
			return
		}

		const lv = laneVisuals[laneIndex]

		if (!lv) {
			console.log('gameStateHandler: onRollPlaybackReceived: laneVisuals not found')
			return
		}
		lv.queueReplay(data, () => {
			console.log('gameStateHandler: onRollPlaybackReceived: queueReplay complete')
		})
	}






}