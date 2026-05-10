import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

import { LanePhase, PlayerStatus } from 'src/shared/enums'
import { GameSettings } from 'src/shared/settings'
import { LaneSnapshot } from 'src/shared/types/shared-types'
import { clockSync } from 'src/shared/utils/clockSync'
import { eventBus, ClientEvents } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientStore } from 'src/client/clientStore'

import { InfoRow } from './utils/components'


// MARK: Event Bindings
eventBus.on(ClientEvents.NOTIFY_LANE_STATE, (data: LaneSnapshot) => {
	// Player name
	if (data.currentFrameUserId) {
		userProfileCache.getDisplayName(data.currentFrameUserId).then(displayName => {
			playerName = displayName
		})
	}

	// Timing
	if (data.currentRollStartTime) {
		endTime = clockSync.toLocalTime(data.currentRollStartTime) + GameSettings.ROLL_MAX_DURATION
	} else {
		endTime = clockSync.toLocalTime(data.gameStartTime)
	}

	// Phase
	lanePhase = data.phase

})

// MARK: Vars
const clientStore = ClientStore.getInstance()
var lanePhase : LanePhase  = LanePhase.NONE
var playerName: string     = "~"
var endTime   : number     = 0




function getStatusText() {
	var text = "You are idle."
	if (lanePhase === LanePhase.GAME_STARTING) {
		text = "Game is starting..."
	} else if (lanePhase === LanePhase.FRAME_START) {
		text = playerName + "'s turn is starting"
	} else if (lanePhase === LanePhase.ROLL_AWAITING) {
		text = playerName + " is about to roll"
	} else if (lanePhase === LanePhase.ROLL_PLAYBACK) {
		text = playerName + " is rolling!"
	} else if (lanePhase === LanePhase.ROLL_END) {
		text = playerName + " has finished rolling"
	} else if (lanePhase === LanePhase.FRAME_END) {
		text = playerName + " has finished their frame"
	} else if (lanePhase === LanePhase.GAME_ENDING) {
		text = "Game is ending..."
	} else {
		text = "You are not in a game"
	}
	return text
}

function getCountdownTime() {
	if (endTime > 0) {
		const timeRemaining = Math.ceil((endTime - Date.now()) / 1000)
		return timeRemaining > 0 ? timeRemaining.toString() : "~"
	}
	return "~"
}


// MARK: Main GameUI
export function GameStatusUI() {
	return (
		<UiEntity
			key={`ui_GameStatus_root`}
			uiTransform={{
				width         : '100%',
				height        : '100%',
				flexDirection : 'column',
				alignItems    : 'center',
				justifyContent: 'flex-start',
				positionType  : "absolute",
			}}
		>
			<UiEntity
				key={`ui_GameStatus_body`}
				uiTransform={{
					width         : 400,
					height        : 80,
					flexShrink    : 0,
					flexDirection : 'row',
					alignItems    : 'center',
					justifyContent: 'center',
					margin        : { top: '8px' },
					display       : 'flex',
					padding       : { top: 10, bottom: 10, left: 30, right: 30 },
					borderRadius  : { topLeft: 8, topRight: 8, bottomLeft: 32, bottomRight: 32 },
					borderColor   : Color4.fromHexString("#4C9581FF"),
					borderWidth   : 3
				}}
				uiBackground={{ color: Color4.fromHexString("#4C958199") }}
			>
				<InfoRow 
					label            = {getStatusText()}
					value            = {getCountdownTime()}
					fontSize         = {26}
					firstColumnWidth = {70}
				/>
			</UiEntity>
		</UiEntity>
	)
}
