import ReactEcs, { Button, Label, UiEntity, UiFontType} from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'
import { getPlatform, isMobile, isDesktop, isWeb } from '@dcl/sdk/platform'

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
import { Font, UiText } from '@dcl/sdk/ecs'
import { pixelsScaledRelative, vwAsPixels } from './utils/sizing'


// MARK: Vars

const clientStore = ClientStore.getInstance()


export function ShowJoinGameUI() {
	tweenValue(panelBottom, PANEL_VISIBLE, 0.2, (v) => panelBottom = v)
}

export function HideJoinGameUI() {
	tweenValue(panelBottom, PANEL_HIDDEN, 0.3, (v) => panelBottom = v)
}

const FORCE_SHOW    = false
const PANEL_HIDDEN  = isMobile() ? -800 : -420
const PANEL_VISIBLE = 8
var panelBottom       : number        = FORCE_SHOW? PANEL_VISIBLE: PANEL_HIDDEN

const isVisible = () => {return panelBottom > PANEL_HIDDEN}


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

function getCountdownValueAtIndex(value: number, index: number): number {
	const s = value.toString().slice(index, index + 1)
	return parseInt(s)	
}



function LaneButton(
	i: number, 
	buttonWidth: number
) {
	
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
				key={`ui_joinGame_laneButton_${i}_players_current`}
				uiTransform={{
					width: pixelsScaledRelative(20, 256, buttonWidth),
					height: pixelsScaledRelative(20, 256, buttonWidth),
					positionType: "absolute",
					position: { left: pixelsScaledRelative(95, 256, buttonWidth), top: pixelsScaledRelative(63, 256, buttonWidth) },

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
				key={`ui_joinGame_laneButton_${i}_players_max`}
				uiTransform={{
					width: pixelsScaledRelative(20, 256, buttonWidth),
					height: pixelsScaledRelative(20, 256, buttonWidth),
					positionType: "absolute",
					position: { left: pixelsScaledRelative(118, 256, buttonWidth), top: pixelsScaledRelative(78, 256, buttonWidth) },

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
					width: pixelsScaledRelative(20, 256, buttonWidth),
					height: pixelsScaledRelative(20, 256, buttonWidth),
					positionType: "absolute",
					position: { left: pixelsScaledRelative(203, 256, buttonWidth), top: pixelsScaledRelative(51, 256, buttonWidth) },

				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(getCountdownValueAtIndex(countdown, 0)),
				}}
			/>
		)
		btnElements.push(
			<UiEntity
				key={`ui_joinGame_laneButton_${i}_countdown_1s`}
				uiTransform={{
					width: pixelsScaledRelative(20, 256, buttonWidth),
					height: pixelsScaledRelative(20, 256, buttonWidth),
					positionType: "absolute",
					position: { left: pixelsScaledRelative(218, 256, buttonWidth), top: pixelsScaledRelative(51, 256, buttonWidth) },

				}}
				uiBackground={{ 
					texture    : { src: 'assets/images/ui/icon-atlas.png' },
					textureMode: 'stretch',
					uvs        : getUVsForIconAtlasNumber(getCountdownValueAtIndex(countdown, 1)),
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
					width: pixelsScaledRelative(20, 256, buttonWidth),
					height: pixelsScaledRelative(20, 256, buttonWidth),
					positionType: "absolute",
					position: { left: pixelsScaledRelative(92, 256, buttonWidth), top: pixelsScaledRelative(60, 256, buttonWidth) },
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
					width: pixelsScaledRelative(20, 256, buttonWidth),
					height: pixelsScaledRelative(20, 256, buttonWidth),
					positionType: "absolute",
					position: { left: pixelsScaledRelative(174, 256, buttonWidth), top: pixelsScaledRelative(72, 256, buttonWidth) },
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
				width         : buttonWidth,
				height        : buttonWidth / 2,
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
				texture    : { src: laneInfoUVIndex == BtnInfoUVIndex.OPEN ? 'assets/images/ui/btn-primary-atlas-b.png' : 'assets/images/ui/btn-secondary-atlas-b.png' }, 
				textureMode: 'stretch',
				uvs        : buttonUVs[buttonStates[i]],
			}}
		>
			<UiEntity uiTransform={{ 
				width       : pixelsScaledRelative(58, 256, buttonWidth), 
				height      : pixelsScaledRelative(58, 256, buttonWidth),
				positionType: "absolute",
				position    : { left: pixelsScaledRelative(16, 256, buttonWidth) },
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

function GetLaneButtons(
	start      : number, 
	end        : number, 
	buttonWidth: number
) {
	const buttons: ReactEcs.JSX.Element[] = []
	for (let i = start; i <= end; i++) {
		buttons.push(LaneButton(i, buttonWidth))
	}
	return buttons
}

const breakAfter = Math.ceil(GameSettings.MAX_LANES / 2) -1


export function JoinGameUI() {

	//if (!isVisible()) return (<UiEntity />)
	
	const mainWidth   = vwAsPixels(75, 600, 1024)
	const padding     = { left: 32, right: 32, top: 32, bottom: 16 }

	const mainWidthMinusPadding = mainWidth - padding.left - padding.right
	const buttonWidth = mainWidthMinusPadding * 0.25
	const rowHeight   = buttonWidth / 2

	const rowStyle    = {
		width          : mainWidth * 0.75,
		height         : rowHeight,
		flexDirection  : 'row' as const,
		alignContent   : 'center' as const,
		alignItems     : 'center' as const,
		justifyContent : 'space-between' as const,
		padding        : padding,
	}

	return (
		<UiEntity
			key="ui_debug_root"
			uiTransform={{
				width         : '100%',
				height        : '100%',
				flexDirection : 'column',
				alignItems    : 'center',
				justifyContent: isMobile() ? 'space-around' : 'flex-end',
			}}
		>

			<UiEntity
				uiTransform={{
					width        : mainWidth,
					height       : buttonWidth + padding.top + padding.bottom,
					positionType : 'relative',
					position     : { bottom: panelBottom },
					flexDirection: 'row',
					justifyContent: 'center',
					display       : panelBottom <= PANEL_HIDDEN ? 'none' : 'flex',

					padding      : { left  : rowStyle.padding.left, right: rowStyle.padding.right, top: rowStyle.padding.top, bottom: rowStyle.padding.bottom },
				}}
				uiBackground={{ 
					texture: { src: 'assets/images/ui/bg-popup.png' },
					textureMode: 'nine-slices',
					textureSlices: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
				}}
			>
				<UiEntity
					uiTransform={{
						width      : mainWidthMinusPadding * 0.25,
						height     : mainWidthMinusPadding * 0.25,
						//borderColor: Color4.Red(),
						//borderWidth: 1,
						flexGrow   : 0,
						flexShrink : 0
					}}
					uiBackground={{
						texture    : { src: 'assets/images/ui/info-welcome.png' },
						textureMode: 'stretch'						
					}}
				/>

				<UiEntity uiTransform={{
					width         : mainWidthMinusPadding * 0.75,
					height        : mainWidthMinusPadding * 0.25,
					flexDirection : 'column',
					alignItems    : 'center',
					justifyContent: 'center',
					//borderColor   : Color4.Red(),
					//borderWidth   : 1,
				}}>
					<UiEntity
						uiTransform={{
							...rowStyle
						}}
					>
						{GetLaneButtons(0, breakAfter, buttonWidth)}
					</UiEntity>
					<UiEntity
						uiTransform={{
							...rowStyle,
							positionType: 'relative',
							position: { top: -20 },
						}}
					>
						{GetLaneButtons(breakAfter + 1, GameSettings.MAX_LANES - 1, buttonWidth)}
					</UiEntity>
				</UiEntity>
			</UiEntity>
		</UiEntity>
	)
}
