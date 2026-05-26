import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import * as utils from "@dcl-sdk/utils"

import { PlayerStatus } from 'src/shared/enums'
import { GameSettings } from 'src/shared/settings'
import { clockSync } from 'src/shared/utils/clockSync'
import { eventBus, ClientEvents } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientStore } from 'src/client/clientStore'

import { FrameResult, getDummyScoreData, getFrameResults } from 'src/shared/utils/scoreCalc'
import { tweenValue } from '../utils/tweens'
import { theme } from '../vars/theme'


// MARK: Vars
const clientStore = ClientStore.getInstance()

const forceShowScores = true

const OFFSET_VISIBLE = 0
const OFFSET_HIDDEN = -512

var offset = forceShowScores ? OFFSET_VISIBLE : OFFSET_HIDDEN

var lastKnownScores: Map<string, number[][]> | null = null
var gameHasEnded = false


// MARK: Event Bindings
eventBus.on(ClientEvents.ON_MY_ROLL_START,             () => { HideScores() })
eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => { HideScores() })
eventBus.on(ClientEvents.ON_GROUP_GAME_START,          () => { gameHasEnded = false })
eventBus.on(ClientEvents.ON_GROUP_GAME_END,            () => { gameHasEnded = true; ShowFinalScores() })

eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END,     () => { ShowScores() })



// MARK: Utility Functions
export function ShowScores() {
	tweenValue(offset, OFFSET_VISIBLE, 0.8, (v) => offset = v)
}
export function HideScores() {
	tweenValue(offset, OFFSET_HIDDEN, 0.8, (v) => offset = v)
}

function ShowFinalScores() {
	ShowScores()
	utils.timers.setTimeout(() => {
		HideScores()
	}, GameSettings.SHOW_FINAL_SCORES_DURATION)
}



// MARK: UI Functions
const getFrames = (): Map<string, FrameResult[]> => {
	// The expected structure in clientState.laneState.frames is:
	// Map<string, number[][]>, where
	//   key: userId (string)
	//   value: array of arrays (frames), each frame being number[] of rolled pins

	//const frames = getDummyScoreData()
	var frames: Map<string, number[][]> | null
	if (!gameHasEnded) {
		frames = clientStore.getFrames() ?? new Map<string, number[][]>()
		if (frames.size > 0) {
			lastKnownScores = frames
		}	
	} else {
		frames = lastKnownScores
	}

	if (frames === null) {
		return new Map<string, FrameResult[]>()
	}

	const frameResults = new Map<string, FrameResult[]>()
	for (const [userId, frame] of frames.entries()) {
		frameResults.set(userId, getFrameResults(frame))
	}

	return frameResults
}



// MARK: Get Score Rows
function GetScoreRows() {
	const frameResults = getFrames()
	const ui: ReactEcs.JSX.Element[] = []

	// A row for each player
	for (const [userId, frameResult] of frameResults.entries()) {
		ui.push(
			<UiEntity
				key={`ui_Scores_row_${userId}`}
				uiTransform={{
					width        : "100%",
					height       : 45,
					flexShrink   : 0,
					flexDirection: 'row',
					alignItems   : 'flex-start',
					margin       : { bottom: '5px' }
				}}
			>
				<UiEntity
					key={`ui_Scores_row_${userId}_avatar`}
					uiTransform={{
						width       : 45,
						height      : 45,
						flexShrink  : 0,
						borderRadius: 8
					}}
					uiBackground={{ 
						texture: {
							src: userProfileCache.getCachedAvatarUrl(userId)
						},
						textureMode: 'stretch'
					 }}
				/>

				<UiEntity
					key={`ui_Scores_row_${userId}_scores`}
					uiTransform={{
						width         : "100%",
						height        : 45,
						flexShrink    : 0,
						flexDirection : 'row',
						alignItems    : 'flex-start',
						margin        : { right: '100px' },
					}}
					//uiBackground={{ color: theme.colors.warning }}
				>
					{GetFrames(userId, frameResult)}
				</UiEntity>
			</UiEntity>
		)
	}
	return ui
}


// MARK: Get Frame Cells
function GetFrames(userId: string, frameResults: FrameResult[]) {
	const ui: ReactEcs.JSX.Element[] = []

	var runningTotal = 0
	
	for (let [frameIndex, frameResult] of frameResults.entries()) {
		// Add the individual scores within the frame
		const frameScores: ReactEcs.JSX.Element[] = []

		// MARK: Bowl Scores
		for (let i = 0; i < frameResult.scores.length; i++ ) {
			// Add each of the scores
			const score = frameResult.scores[i]
			
			var scoreDisplay = score.toString()
			if (score == 0) scoreDisplay = '-'
			if (score == 10) scoreDisplay = 'X'
			if (i == 1 && frameResult.isSpare) scoreDisplay = "/"

			frameScores.push(
				<UiEntity
					key={`ui_Scores_row_${userId}_frame_${frameIndex}_score_${i}`}
					uiTransform={{
						width       : 16,
						height      : 18,
						margin      : { right: 2 },
						borderRadius: 3,
						alignContent: 'center',
						alignItems  : 'center',
					}}
					uiBackground={{ color: theme.colors.info }}
					uiText={{
						value    : scoreDisplay,
						fontSize : 9,
						color    : theme.colors.light,
						textAlign: 'middle-center'
					}}
				/>
			)
		}

		// MARK: Frame Cell
		ui.push(
			<UiEntity 
				key={`ui_Scores_row_${userId}_frame_${frameIndex}`}
				uiTransform={{ 
					width        : 52, 
					height       : 45,
					margin       : { left: 4 },
					flexDirection: 'column',
					borderRadius : 4
				}}
				uiBackground={{ 
					color: Color4.fromHexString(frameResult.isStrike ? "#1f354d" : frameResult.isSpare ? "#345981" : "#4C958166") 
				}}
				>


				<UiEntity
					key={`ui_Scores_row_${userId}_frame_${frameIndex}_scores`}
					uiTransform={{
						width         : "100%",
						height        : "50%",
						flexDirection : 'row',
						alignItems    : 'flex-end',
						justifyContent: 'flex-end'

					}}
				>
					{frameScores}
				</UiEntity>

				<UiEntity
					key={`ui_Scores_row_${userId}_frame_${frameIndex}_runningTotal`}
					uiTransform={{
						width         : "100%",
						height        : "50%",
						flexDirection : 'row',
						alignItems    : 'flex-start',
						justifyContent: 'center'
					}}
					uiText={{
						value    : frameResult.runningScore?.toString() ?? '-',
						fontSize : 14,
						color    : theme.colors.light,
						textAlign: 'middle-center'
					}}
				/>
				
			</UiEntity>
		)
	}
	return ui
}

// MARK: Main GameUI
export function ScoresUI() {

	return (
		<UiEntity
			key={`ui_GameStatus_root`}
			uiTransform={{
				width         : '100%',
				height        : '100%',
				flexDirection : 'column',
				alignItems    : 'center',
				justifyContent: 'flex-end',
				positionType  : "absolute",
				position      : { bottom: offset },
				display       : 'flex',
			}}
		>
			<UiEntity
				key={`ui_GameStatus_body`}
				uiTransform={{
					width         : 680,
					height        : 'auto',
					flexShrink    : 0,
					flexDirection : 'column',
					alignItems    : 'center',
					justifyContent: 'center',
					margin        : { bottom: '16px' },
					display       : 'flex',
					padding       : { top: 16, bottom: 10, left: 32, right: 32 },
					borderRadius  : { topLeft: 32, topRight: 32, bottomLeft: 16, bottomRight: 16 },
					borderColor   : theme.colors.primary,
					borderWidth   : 3
				}}
				uiBackground={{ color: theme.colors.secondary }}
			>
				{GetScoreRows()}
			</UiEntity>
		</UiEntity>
	)
}
