import { engine } from '@dcl/sdk/ecs'
import ReactEcs, { UiEntity } from '@dcl/sdk/react-ecs'
import { isMobile } from '@dcl/sdk/platform'

import { ComponentManager } from 'src/shared/components/componentManager'
import { LanePhase } from 'src/shared/enums'
import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'
import { clockSync } from 'src/shared/utils/clockSync'

import { tweenValue } from 'src/client/ui-screen/utils/tweens'
import { ClientMessaging } from 'src/client/clientMessaging'

import { buttonUVs, BtnStateUVIndex, getUVsForIconAtlasNumber } from '../utils/btn-utils'
import { pixelsScaledRelative, vwAsPixels } from '../utils/sizing'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'


// MARK: Enums

enum BtnInfoUVIndex {
	OPEN     = 0,
	STARTING = 1,
	OCCUPIED = 2
}


// MARK: Vars

// Data caches for lane state stuff
var lanePhase     : LanePhase[] = []
var gameIsStarting: boolean[]   = []
var gameIsRunning : boolean[]   = []
var playerCount   : number[]    = []
var countdown     : number[]    = []
var frameNumber   : number[]    = []


// -- UI Properties/visibility
const FORCE_SHOW    = false
const PANEL_HIDDEN  = isMobile() ? -800: -420
const PANEL_VISIBLE = 8
var panelBottom     : number        = FORCE_SHOW? PANEL_VISIBLE: PANEL_HIDDEN

//const clientStore   = ClientStore.getInstance()
const breakAfter    = Math.ceil(GameSettings.MAX_LANES / 2) -1 // controls buttons per row

// -- Button states
const buttonStates: BtnStateUVIndex[] = Array.from(
	{ length: GameSettings.MAX_LANES },
	() => BtnStateUVIndex.NORMAL,
)


// MARK: Ui Functions

const isVisible = () => {return panelBottom > PANEL_HIDDEN}

export function ShowJoinGameUI() {
	tweenValue(panelBottom, PANEL_VISIBLE, 0.2, (v) => panelBottom = v)
}

export function HideJoinGameUI() {
	tweenValue(panelBottom, PANEL_HIDDEN, 0.3, (v) => panelBottom = v)
}

// - UV Coords lookup
function getCountdownValueAtIndex(value: number, index: number): number {
	const s = value.toString().slice(index, index + 1)
	return parseInt(s)	
}

function getLaneNumberUVs(i: number): number[] {
	// Get uV location for L1, L2, etc
	const laneNumberUVs: number[] = [
		i * 0.125, 0.875, i * 0.125, 1, (i + 1) * 0.125, 1, (i + 1) * 0.125, 0.875
	]
	return laneNumberUVs
}


// MARK: event bindings
eventBus.on(ClientEvents.ON_GROUP_GAME_START, () => { HideJoinGameUI() })
eventBus.on(ClientEvents.ON_MY_ROLL_START, () => { HideJoinGameUI() })


// MARK: s_updateLaneData
function system_updateLaneData(dt: number) {
	if (!ComponentManager.isReady()) return

	for (let i = 0; i < GameSettings.MAX_LANES; i++) {
		const newLanePhase      = LaneStore.getPhase(i)
		const newGameIsStarting = newLanePhase   == LanePhase.GAME_STARTING
		const newGameIsRunning  = newLanePhase  !== LanePhase.NONE && newLanePhase !== LanePhase.GAME_STARTING
		const newPlayerCount    = LaneStore.getLaneUserIds(i).length
		const newCountdown      = clockSync.toLocalTime(LaneStore.getGameStartTime(i)) - Date.now()
		const newFrameNumber    = LaneStore.getCurrentFrameIndex(i)

		// Only update the data cache if the value has changed to avoid redudant component update events
		if (lanePhase[i] !== newLanePhase) lanePhase[i] = newLanePhase
		if (gameIsStarting[i] !== newGameIsStarting) gameIsStarting[i] = newGameIsStarting
		if (gameIsRunning[i] !== newGameIsRunning) gameIsRunning[i] = newGameIsRunning
		if (playerCount[i] !== newPlayerCount) playerCount[i] = newPlayerCount
		if (countdown[i] !== newCountdown) countdown[i] = newCountdown
		if (frameNumber[i] !== newFrameNumber) frameNumber[i] = newFrameNumber
	}
}

engine.addSystem(system_updateLaneData)



// MARK: UiEntity construction 




// MARK: LaneButton
function LaneButton(
	i: number, 
	buttonWidth: number
) {
	
	// Disable the button if the game is running
	if (gameIsRunning[i]) buttonStates[i] = BtnStateUVIndex.DISABLED

	// Re-enable the button if the game is not running
	if (!gameIsRunning[i] && buttonStates[i] == BtnStateUVIndex.DISABLED) buttonStates[i] = BtnStateUVIndex.NORMAL

	const laneInfoUVIndex = gameIsRunning[i] ? BtnInfoUVIndex.OCCUPIED : gameIsStarting[i] ? BtnInfoUVIndex.STARTING : BtnInfoUVIndex.OPEN


	// -- Extra button elements, eg player count, frame number, where required
	const btnElements: ReactEcs.JSX.Element[] = []

	// STARTING
	if (gameIsStarting[i]) {
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
					uvs        : getUVsForIconAtlasNumber(playerCount[i]),
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
					uvs        : getUVsForIconAtlasNumber(getCountdownValueAtIndex(countdown[i], 0)),
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
					uvs        : getUVsForIconAtlasNumber(getCountdownValueAtIndex(countdown[i], 1)),
				}}
			/>
		)
	}

	// OCCUPIED
	if (gameIsRunning[i]) {
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
					uvs        : getUVsForIconAtlasNumber(playerCount[i]),
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
					uvs        : getUVsForIconAtlasNumber(frameNumber[i]+1),
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

				if (!gameIsRunning[i]) {
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
					uvs        : getLaneNumberUVs(i),
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



export function JoinGameUI() {
	
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
				width          : '100%',
				height         : '100%',
				flexDirection  : 'column',
				alignItems     : 'center',
				justifyContent : isMobile() ? 'space-around' : 'flex-end',
				positionType   : 'absolute',
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
