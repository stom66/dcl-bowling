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
import { UIScaleUpdate } from 'dcl-npc-toolkit/dist/ui'


// MARK: Event Bindings
eventBus.on(ClientEvents.NOTIFY_LANE_STATE, (data: LaneState) => {

})


// MARK: Vars
const clientStore = ClientStore.getInstance()


// MARK: Get Scores
function GetScoreRows() {
	const ui: ReactEcs.JSX.Element[] = []

	for (const [userId, frames] of clientStore.getLaneState()?.frames ?? []) {
		ui.push(
			<UiEntity
				key={`ui_Scores_row_${userId}`}
				uiTransform={{
					width         : "100%",
					height        : 60,
					flexShrink    : 0,
					flexDirection : 'row',
					alignItems    : 'flex-start',
				}}
			>
				<UiEntity
					key={`ui_Scores_row_${userId}_avatar`}
					uiTransform={{
						width         : 60,
						height        : 60,
						flexShrink    : 0,
					}}
					uiBackground={{ 
						texture: {
							src: userProfileCache.getCachedAvatarUrl(userId)
						}
					 }}
				/>

				<UiEntity
					key={`ui_Scores_row_${userId}_scores`}
					uiTransform={{
						width         : "100%",
						height        : 60,
						flexShrink    : 0,
						flexDirection : 'row',
						alignItems    : 'flex-start',
					}}
					uiBackground={{ color: Color4.fromHexString("#4C958166") }}
				>
					{GetFrames(userId, frames)}
				</UiEntity>
			</UiEntity>
		)
	}
	return ui
}

function GetFrames(userId: string, frames: number[][]) {
	const ui: ReactEcs.JSX.Element[] = []

	var runningTotal = 0
	
	for (let frameIndex = 0; frameIndex < 10; frameIndex++) {
		const frame = frames[frameIndex] ?? []

		// update the running total
		runningTotal += frame.reduce((a, b) => a + b, 0)

		// build the individual scores within the frame
		const frameScores: ReactEcs.JSX.Element[] = []

		for (let i = 0; i < (frameIndex == 9 ? 3 : 2); i++ ) {
			// Add each of the scores
			frameScores.push(
				<UiEntity
					key={`ui_Scores_row_${userId}_frame_${frameIndex}_score_${i}`}
					uiTransform={{
						width: 18,
						height: 18,
						margin: { left: 2 }
					}}
					uiBackground={{ color: Color4.fromHexString("#6eb8c7aa") }}
					uiText={{
						value: frame[i].toString() ?? '-',
						fontSize: 12,
						color: Color4.White(),
						textAlign: 'middle-center'
					}}
				/>
			)
		}

		// Add the frame itself
		ui.push(
			<UiEntity 
				key={`ui_Scores_row_${userId}_frame_${frameIndex}`}
				uiTransform={{ 
					width: 60, 
					height: 60,
					margin: { left: 2 },
					flexDirection: 'column'
				}}
				uiBackground={{ 
					color: Color4.fromHexString("#4C9581aa") 
				}}
				uiText={{
					value: frameIndex.toString(),
					fontSize: 16,
					color: Color4.White(),
					textAlign: 'middle-center'
				}}
				>


				<UiEntity
					key={`ui_Scores_row_${userId}_frame_${frameIndex}_scores`}
					uiTransform={{
						width: "100%",
						height: "50%",
						flexDirection: 'row',
						alignItems: 'flex-start',
						justifyContent: 'center'
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
						value: runningTotal.toString() ?? '-',
						fontSize: 16,
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
			}}
		>
			<UiEntity
				key={`ui_GameStatus_body`}
				uiTransform={{
					width         : 680,
					height        : 120,
					flexShrink    : 0,
					flexDirection : 'row',
					alignItems    : 'center',
					justifyContent: 'center',
					margin        : { bottom: '35px' },
					display       : 'flex',
					padding       : { top: 10, bottom: 10, left: 10, right: 10 }
				}}
				uiBackground={{ color: Color4.fromHexString("#4C958166") }}
			>
				{GetScoreRows()}
			</UiEntity>
		</UiEntity>
	)
}
