import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'

import { PlayerStatus } from 'src/shared/enums'
import { GameSettings } from 'src/shared/settings'
import { eventBus } from 'src/shared/utils/eventBus'
import { clockSync } from 'src/shared/utils/clockSync'

import { ClientStore } from 'src/client/clientStore'
import { ClientEvents } from 'src/client/clientEvents'
import { LaneState, NotifyLaneStatePayload } from 'src/shared/types'
import { userProfileCache } from 'src/shared/utils/userProfileCache'
import { InfoRow } from './ui.components'


// MARK: Event Bindings
eventBus.on(ClientEvents.NOTIFY_LANE_STATE, (data: LaneState) => {
	// Player name
	if (data.currentTurnUserId) {
		userProfileCache.getDisplayName(data.currentTurnUserId).then(displayName => {
			playerName = displayName
		})
	}

	if (data.currentTurnStartTime) {
		roundEndTime = data.currentTurnStartTime + GameSettings.TURN_DURATION
	} else {
		roundEndTime = 0
		gameStartTime = data.gameStartTime
	}
})


// MARK: Vars
const clientStore = ClientStore.getInstance()

var playerName    : string = "~"
//var roundStartTime: number = 0
var roundEndTime  : number = 0
var gameStartTime : number = 0





function getTimeToGameStart() {
	const gameStartTime = clientStore.getGameStartTime()
	const timeToGameStart = Math.ceil((gameStartTime - Date.now()) / 1000)
	return timeToGameStart > 0 ? timeToGameStart : "~"
}

function getRoundTimeRemaing() {
	const timeRemaining = Math.ceil((roundEndTime - Date.now()) / 1000)
	return timeRemaining > 0 ? timeRemaining : "~"
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
					margin        : { top: '35px' },
					display       : 'flex',
					padding       : { top: 10, bottom: 10, left: 30, right: 30 },
					borderRadius  : { topLeft: 8, topRight: 8, bottomLeft: 32, bottomRight: 32 },
					borderColor   : Color4.fromHexString("#4C9581FF"),
					borderWidth   : 3
				}}
				uiBackground={{ color: Color4.fromHexString("#4C958199") }}
			>
				<InfoRow 
					label={roundEndTime > 0 ? `{playerName}'s Turn` : "Game Starts in..."}
					value={roundEndTime > 0 ? getRoundTimeRemaing().toString() : getTimeToGameStart().toString()}
					fontSize={26}
					firstColumnWidth={70}
				/>
			</UiEntity>
		</UiEntity>
	)
}
