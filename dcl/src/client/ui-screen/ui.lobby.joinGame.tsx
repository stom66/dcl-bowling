import ReactEcs, { Button, Label, UiEntity} from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'

import { ComponentManager } from 'src/shared/components/componentManager'
import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'
import { newPlayer, perfectGame } from 'src/shared/utils/discord-webhooks'

import { ClientStore } from 'src/client/clientStore'

import { ButtonAction, Divider, InfoRow, SectionHeader } from 'src/client/ui-screen/utils/components'
import { tweenValue } from './utils/tweens'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'
import { LanePhase } from 'src/shared/enums'
import { ClientMessaging } from '../clientMessaging'
import { clockSync } from 'src/shared/utils/clockSync'

import { buttonUVs, BtnStateUVIndex, getUVsForIconAtlasNumber } from './utils/btn-utils'


// MARK: Vars

const clientStore = ClientStore.getInstance()


export function ShowJoinGameUI() {
	tweenValue(panelBottom, PANEL_VISIBLE, 0.2, (v) => panelBottom = v)
}

export function HideJoinGameUI() {
	tweenValue(panelBottom, PANEL_HIDDEN, 0.3, (v) => panelBottom = v)
}

const FORCE_SHOW    = true
const PANEL_HIDDEN  = -300
const PANEL_VISIBLE = 8
var panelBottom       : number        = FORCE_SHOW? PANEL_VISIBLE: PANEL_HIDDEN


enum BtnInfoUVIndex {
	OPEN     = 0,
	STARTING = 1,
	OCCUPIED = 2
}

/* const sampleLanePhases = [ // used for dev testing
	LanePhase.NONE,
	LanePhase.GAME_STARTING,
	LanePhase.WAITING,
	LanePhase.FRAME_START,
	LanePhase.ROLL_AWAITING,
	LanePhase.ROLL_PROCESSING,
	LanePhase.ROLL_PLAYBACK,
	LanePhase.ROLL_END,
	LanePhase.FRAME_END,
] */

const buttonStates: BtnStateUVIndex[] = Array.from(
	{ length: GameSettings.MAX_LANES },
	() => BtnStateUVIndex.NORMAL,
)

const laneInfo: BtnInfoUVIndex[] = Array.from(
	{ length: GameSettings.MAX_LANES },
	() => BtnInfoUVIndex.OPEN,
)

function getCountdownIndex(value: number, index: number): number {
	const s = value.toString().slice(index, index + 1)
	return parseInt(s)	
}



function LaneButton(i: number) {
	
	var lanePhase    = LaneStore.getPhase(i)

	// -- debug only
	//lanePhase    = sampleLanePhases[i]	
	// -- END DEBUG ONLY


	const gameIsStarting = lanePhase   == LanePhase.GAME_STARTING
	const gameIsRunning  = lanePhase !== LanePhase.NONE && lanePhase !== LanePhase.GAME_STARTING
	const playerCount    = LaneStore.getLaneUserIds(i).length
	var countdown        = clockSync.toLocalTime(LaneStore.getGameStartTime(i)) - Date.now()
	var countdown        = Math.ceil((countdown) / 1000)

	// -- debug only
	//countdown    = 66	
	// -- END DEBUG ONLY
	const frameNumber   = LaneStore.getCurrentFrameIndex(i)
	
	// Disable the button if the game is running
	if (gameIsRunning) buttonStates[i] = BtnStateUVIndex.DISABLED
	// Re-enable the button if the game is not running
	if (!gameIsRunning && buttonStates[i] == BtnStateUVIndex.DISABLED) buttonStates[i] = BtnStateUVIndex.NORMAL


	const laneInfoUVIndex = gameIsRunning ? BtnInfoUVIndex.OCCUPIED : gameIsStarting ? BtnInfoUVIndex.STARTING : BtnInfoUVIndex.OPEN

	const btnElements: ReactEcs.JSX.Element[] = []

	// Get uV location for L1, L2, etc
	const laneNumberUVs: number[] = [
		i * 0.125, 0.875, i * 0.125, 1, (i + 1) * 0.125, 1, (i + 1) * 0.125, 0.875
	]

	// STARTING
	if (gameIsStarting) {
		btnElements.push(
			<UiEntity
				key={`ui_joinGame_laneButton_${i}_players`}
				uiTransform={{
					width: 28,
					height: 28,
					positionType: "absolute",
					position: { left: 98, top: 63 },

				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(playerCount),
				}}
			/>
		)
		btnElements.push(
			<UiEntity
				key={`ui_joinGame_laneButton_${i}_players`}
				uiTransform={{
					width: 28,
					height: 28,
					positionType: "absolute",
					position: { left: 126, top: 75 },

				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(GameSettings.MAX_PLAYERS_PER_GAME),
				}}
			/>
		)
		
		// TIME
		btnElements.push(
			<UiEntity
				key={`ui_joinGame_laneButton_${i}_countdown_10s`}
				uiTransform={{
					width: 20,
					height: 20,
					positionType: "absolute",
					position: { left: 203, top: 51 },

				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(getCountdownIndex(countdown, 0)),
				}}
			/>
		)
		btnElements.push(
			<UiEntity
				key={`ui_joinGame_laneButton_${i}_countdown_1s`}
				uiTransform={{
					width: 20,
					height: 20,
					positionType: "absolute",
					position: { left: 218, top: 51 },

				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(getCountdownIndex(countdown, 1)),
				}}
			/>
		)
	}

	// OCCUPIED
	if (gameIsRunning) {
		btnElements.push(
			<UiEntity
				key={`ui_joinGame_laneButton_${i}_players`}
				uiTransform={{
					width: 28,
					height: 28,
					positionType: "absolute",
					position: { left: 104, top: 60 },
				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(playerCount),
				}}
			/>
		)
		btnElements.push(
			<UiEntity
				key={`ui_joinGame_laneButton_${i}_frames`}
				uiTransform={{
					width: 28,
					height: 28,
					positionType: "absolute",
					position: { left: 216, top: 72 },
				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(frameNumber+1),
				}}
			/>
		)
	}


	return (
		<UiEntity
			key={`ui_joinGame_laneButton_${i}`}
			uiTransform={{
				width         : '256',
				height        : '128',
				alignContent  : 'flex-start',
				alignItems    : "center",
				flexDirection : 'row',
				flexGrow      : 0,
				flexShrink    : 0,
			}}
			onMouseEnter = {() => { if (buttonStates[i] !== BtnStateUVIndex.DISABLED) {
				console.log("HOVER")
				buttonStates[i] = BtnStateUVIndex.HOVER 
			}}}
			onMouseLeave = {() => { if (buttonStates[i] !== BtnStateUVIndex.DISABLED) {
				console.log("NORMAL")
				buttonStates[i] = BtnStateUVIndex.NORMAL 
			}}}
			onMouseDown  = {() => { if (buttonStates[i] !== BtnStateUVIndex.DISABLED) {
				console.log("PRESSED")
				buttonStates[i] = BtnStateUVIndex.PRESSED

				if (!gameIsRunning) {
					ClientMessaging.requestJoinLane(i + 1)
				}
			}}}
			onMouseUp    = {() => { if (buttonStates[i] !== BtnStateUVIndex.DISABLED) {
				console.log("NORMAL")
				buttonStates[i] = BtnStateUVIndex.HOVER 
			}}}

			uiBackground={{ 
				texture    : { src: laneInfoUVIndex == BtnInfoUVIndex.OCCUPIED ? 'assets/images/ui/btn-primary-atlas-b.png' : 'assets/images/ui/btn-secondary-atlas-b.png' }, 
				textureMode: 'stretch',
				uvs        : buttonUVs[buttonStates[i]],
			}}
		>
			<UiEntity uiTransform={{ 
				width       : 64, 
				height      : 64,
				positionType: "absolute",
				position    : { left: 16 },
				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : laneNumberUVs,
				}}
			/>
			<UiEntity uiTransform={{ 
				width       : "100%", 
				height      : "100%",
				positionType: "absolute",
				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/btn-info-atlas.png' },
					textureMode: 'stretch',
					uvs        : buttonUVs[laneInfoUVIndex],
				}}
			/>
			{btnElements}
		</UiEntity>
	)
}

function GetLaneButtons(start: number, end: number) {
	const buttons: ReactEcs.JSX.Element[] = []
	for (let i = start; i <= end; i++) {
		buttons.push(LaneButton(i))
	}
	return buttons
}

const breakAfter = Math.ceil(GameSettings.MAX_LANES / 2) -1


export function JoinGameUI() {
	const rowStyle = {
		width          : 820 as const,
		height         : 128 as const,
		flexDirection  : 'row' as const,
		alignContent   : 'center' as const,
		alignItems     : 'center' as const,
		justifyContent : 'space-between' as const,
		padding        : { left: 16, right: 16 },
	}
	return (
		<UiEntity
			key="ui_debug_root"
			uiTransform={{
				width         : '100%',
				height        : '100%',
				flexDirection : 'column',
				alignItems    : 'center',
				justifyContent: 'flex-end',
			}}
		>

			<UiEntity
				uiTransform={{
					width: rowStyle.width,
					positionType: 'absolute',
					position: { bottom: panelBottom },
					flexDirection: 'column',
					borderRadius  : 8,
					borderWidth   : 3,
					borderColor   : Color4.fromHexString("#CB4F00dd"),
				}}
				uiBackground={{ color: Color4.fromHexString("#BE4B00cc") }}
				>
				<UiEntity
					uiTransform={{...rowStyle}}
				>
					{GetLaneButtons(0, breakAfter)}

				</UiEntity>
				<UiEntity
					uiTransform={{...rowStyle,
						positionType: 'relative',
						position: { top: -10 },
					}}
				>
					{GetLaneButtons(breakAfter + 1, GameSettings.MAX_LANES - 1)}

				</UiEntity>
			</UiEntity>
		</UiEntity>
	)
}
