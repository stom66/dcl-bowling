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
import { FrameResult, getDummyScoreData, getFrameResults } from 'src/shared/utils/scoreCalc'


// MARK: Event Bindings
eventBus.on(ClientEvents.NOTIFY_LANE_STATE, (data: LaneState) => {

})


// MARK: Vars
const clientStore = ClientStore.getInstance()

const forceShowScores = false


const getFrames = (): Map<string, FrameResult[]> => {
	// The expected structure in clientState.laneState.frames is:
	// Map<string, number[][]>, where
	//   key: userId (string)
	//   value: array of arrays (frames), each frame being number[] of rolled pins

	//const frames = getDummyScoreData()
	const frames = clientStore.getFrames() ?? new Map<string, number[][]>()
	

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
					width         : "100%",
					height        : 45,
					flexShrink    : 0,
					flexDirection : 'row',
					alignItems    : 'flex-start',
					margin        : { bottom: '5px' }
				}}
			>
				<UiEntity
					key={`ui_Scores_row_${userId}_avatar`}
					uiTransform={{
						width         : 45,
						height        : 45,
						flexShrink    : 0,
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
					//uiBackground={{ color: Color4.fromHexString("#4C958166") }}
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
						width: 16,
						height: 18,
						margin: { right: 2 },
						borderRadius: 3,
						alignContent: 'center',
						alignItems: 'center',
					}}
					uiBackground={{ color: Color4.fromHexString("#6eb8c7aa") }}
					uiText={{
						value: scoreDisplay,
						fontSize: 9,
						color: Color4.White(),
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
					width: 52, 
					height: 45,
					margin: { left: 4 },
					flexDirection: 'column',
					borderRadius: 4
				}}
				uiBackground={{ 
					color: Color4.fromHexString(frameResult.isStrike ? "#1f354d" : frameResult.isSpare ? "#345981" : "#4C958166") 
				}}
				>


				<UiEntity
					key={`ui_Scores_row_${userId}_frame_${frameIndex}_scores`}
					uiTransform={{
						width: "100%",
						height: "50%",
						flexDirection: 'row',
						alignItems: 'flex-end',
						justifyContent: 'flex-end'

					}}
				>
					{frameScores}
				</UiEntity>

				<UiEntity
					key={`ui_Scores_row_${userId}_frame_${frameIndex}_runningTotal`}
					uiTransform={{
						width: "100%",
						height: "50%",
						flexDirection: 'row',
						alignItems: 'flex-start',
						justifyContent: 'center'
					}}
					uiText={{
						value: frameResult.runningScore?.toString() ?? '-',
						fontSize: 14,
						color: Color4.White(),
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
	const isVisible = clientStore.getPlayerStatus() == PlayerStatus.IN_GAME_PLAYING || 
					  clientStore.getPlayerStatus() == PlayerStatus.IN_GAME_WAITING ||
					  forceShowScores

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
				display       : isVisible ? 'flex' : 'none',
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
					margin        : { bottom: '35px' },
					display       : 'flex',
					padding       : { top: 16, bottom: 10, left: 32, right: 32 },
					borderRadius  : { topLeft: 32, topRight: 32, bottomLeft: 8, bottomRight: 8 },
					borderColor   : Color4.fromHexString("#4C9581FF"),
					borderWidth   : 3
				}}
				uiBackground={{ color: Color4.fromHexString("#4C958166") }}
			>
				{GetScoreRows()}
			</UiEntity>
		</UiEntity>
	)
}
