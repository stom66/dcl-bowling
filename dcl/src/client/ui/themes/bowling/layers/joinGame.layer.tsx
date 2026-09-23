import { engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	Background,
	ButtonText,
	getTheme,
	Icon,
	Layer,
	PropsController,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { LanePhase } from 'src/shared/enums'
import { LaneStore } from 'src/shared/laneStore'
import { GameFrameCount, GameSettings } from 'src/shared/settings'
import { clockSync } from 'src/shared/utils/clockSync'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientMessaging } from 'src/client/clientMessaging'
import {
	bowlingIconAtlas,
	bowlingThemeAssets,
	getBowlingDigitUvs,
	getLaneNumberUvs,
	laneInfoAtlas,
	primaryButtonAtlas,
	secondaryButtonAtlas,
} from 'src/client/ui/themes/bowling/atlases'


const FORCE_SHOW = false
const breakAfter = Math.ceil(GameSettings.MAX_LANES / 2) - 1
const FRAME_PICKER_HEIGHT = 52

/** 1-based UV rows on the 4-state button sheets (bottom → top). */
enum LaneButtonRow {
	DISABLED = 1,
	PRESS    = 2,
	HOVER    = 3,
	DEFAULT  = 4,
}

const laneButtonRow: LaneButtonRow[] = Array.from(
	{ length: GameSettings.MAX_LANES },
	() => LaneButtonRow.DEFAULT,
)


enum LaneInfoKind {
	OPEN     = 'open',
	STARTING = 'starting',
	OCCUPIED = 'occupied',
}


type LaneCache = {
	phase     : LanePhase[]
	starting  : boolean[]
	running   : boolean[]
	players   : number[]
	countdown : number[]
	frame     : number[]
	frameCount: number[]
}


const laneCache: LaneCache = {
	phase     : [],
	starting  : [],
	running   : [],
	players   : [],
	countdown : [],
	frame     : [],
	frameCount: [],
}


// MARK: pixelsScaledRelative
/** Scales a design-pixel overlay by the live button size. */
function pixelsScaledRelative(
	value      : number,
	normalSize : number,
	currentSize: number,
): number {
	return value * (currentSize / normalSize)
}



// MARK: getLaneButtonUvs
/** Stable UV quad for a hover/press/disabled row on a bowling button atlas. */
function getLaneButtonUvs(
	atlas: typeof primaryButtonAtlas,
	row  : LaneButtonRow,
): number[] {
	switch (row) {
		case LaneButtonRow.HOVER:    return atlas.uv.hover
		case LaneButtonRow.PRESS:    return atlas.uv.press
		case LaneButtonRow.DISABLED: return atlas.uv.disabled
		default:                     return atlas.uv.default
	}
}


// MARK: getCountdownDigits
/** Tens and ones digits for a millisecond countdown. */
function getCountdownDigits(ms: number): [number, number] {
	const seconds = Math.max(0, Math.ceil(ms / 1000))
	const padded  = seconds.toString().padStart(2, '0')
	return [
		parseInt(padded.slice(0, 1), 10) || 0,
		parseInt(padded.slice(1, 2), 10) || 0,
	]
}


// MARK: JoinGameLayer
/**
 * Bottom-center lane picker shown when the player is near the bowling host.
 */
export class JoinGameLayer extends Layer {
	private joinProps: PropsController<{ frameCount: GameFrameCount }>

	constructor() {
		super({
			id         : 'bowling-join-game',
			zone       : ZoneType.BottomCenter,
			canBeHidden: true,
			startHidden: !FORCE_SHOW,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			uiTransform: {
				width : 1024,
				height: 372,
			},
		})

		this.joinProps = new PropsController<{ frameCount: GameFrameCount }>({
			frameCount: GameSettings.DEFAULT_FRAME_COUNT,
		})

		eventBus.on(ClientEvents.ON_GROUP_GAME_START, () => { this.hide(0.3) })
		eventBus.on(ClientEvents.ON_MY_ROLL_START,    () => { this.hide(0.3) })

		engine.addSystem(() => {
			if (!LaneStore.areLanesReady()) return

			for (let i = 0; i < GameSettings.MAX_LANES; i++) {
				const newLanePhase      = LaneStore.getPhase(i)
				const newGameIsStarting = newLanePhase === LanePhase.GAME_STARTING
				const newGameIsRunning  = newLanePhase !== LanePhase.NONE && newLanePhase !== LanePhase.GAME_STARTING
				const newPlayerCount    = LaneStore.getLaneUserIds(i).length
				const newCountdown      = clockSync.toLocalTime(LaneStore.getGameStartTime(i)) - Date.now()
				const newFrameNumber    = LaneStore.getCurrentFrameIndex(i)
				const newFrameCount     = LaneStore.getFrameCount(i)

				if (laneCache.phase[i] !== newLanePhase)           laneCache.phase[i]      = newLanePhase
				if (laneCache.starting[i] !== newGameIsStarting)   laneCache.starting[i]   = newGameIsStarting
				if (laneCache.running[i] !== newGameIsRunning)     laneCache.running[i]    = newGameIsRunning
				if (laneCache.players[i] !== newPlayerCount)       laneCache.players[i]    = newPlayerCount
				if (laneCache.countdown[i] !== newCountdown)       laneCache.countdown[i]  = newCountdown
				if (laneCache.frame[i] !== newFrameNumber)         laneCache.frame[i]      = newFrameNumber
				if (laneCache.frameCount[i] !== newFrameCount)     laneCache.frameCount[i] = newFrameCount
			}
		})
	}


	// MARK: laneButton
	private laneButton(
		i          : number,
		buttonWidth: number,
	) {
		const isRunning  = !!laneCache.running[i]
		const isStarting = !!laneCache.starting[i]
		const infoKind   = isRunning ? LaneInfoKind.OCCUPIED : isStarting ? LaneInfoKind.STARTING : LaneInfoKind.OPEN
		const atlas      = infoKind === LaneInfoKind.OPEN ? primaryButtonAtlas : secondaryButtonAtlas
		const overlay    : ReactEcs.JSX.Element[] = []

		if (isStarting) {
			const [tens, ones] = getCountdownDigits(laneCache.countdown[i] ?? 0)
			overlay.push(
				<Icon
					key    = {`ui_joinGame_laneButton_${i}_players_current`}
					src    = {bowlingIconAtlas.source}
					uvs    = {getBowlingDigitUvs(laneCache.players[i] ?? 0)}
					width  = {pixelsScaledRelative(20, 256, buttonWidth)}
					height = {pixelsScaledRelative(20, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : {
							left: pixelsScaledRelative(95, 256, buttonWidth),
							top : pixelsScaledRelative(63, 256, buttonWidth),
						},
					}}
				/>,
				<Icon
					key    = {`ui_joinGame_laneButton_${i}_players_max`}
					src    = {bowlingIconAtlas.source}
					uvs    = {getBowlingDigitUvs(GameSettings.MAX_PLAYERS_PER_GAME)}
					width  = {pixelsScaledRelative(20, 256, buttonWidth)}
					height = {pixelsScaledRelative(20, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : {
							left: pixelsScaledRelative(118, 256, buttonWidth),
							top : pixelsScaledRelative(78, 256, buttonWidth),
						},
					}}
				/>,
				<Icon
					key    = {`ui_joinGame_laneButton_${i}_countdown_10s`}
					src    = {bowlingIconAtlas.source}
					uvs    = {getBowlingDigitUvs(tens)}
					width  = {pixelsScaledRelative(20, 256, buttonWidth)}
					height = {pixelsScaledRelative(20, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : {
							left: pixelsScaledRelative(203, 256, buttonWidth),
							top : pixelsScaledRelative(51, 256, buttonWidth),
						},
					}}
				/>,
				<Icon
					key    = {`ui_joinGame_laneButton_${i}_countdown_1s`}
					src    = {bowlingIconAtlas.source}
					uvs    = {getBowlingDigitUvs(ones)}
					width  = {pixelsScaledRelative(20, 256, buttonWidth)}
					height = {pixelsScaledRelative(20, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : {
							left: pixelsScaledRelative(218, 256, buttonWidth),
							top : pixelsScaledRelative(51, 256, buttonWidth),
						},
					}}
				/>,
				<Icon
					key    = {`ui_joinGame_laneButton_${i}_frameCount`}
					src    = {bowlingIconAtlas.source}
					uvs    = {getBowlingDigitUvs(laneCache.frameCount[i] || GameSettings.DEFAULT_FRAME_COUNT)}
					width  = {pixelsScaledRelative(20, 256, buttonWidth)}
					height = {pixelsScaledRelative(20, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : {
							left: pixelsScaledRelative(174, 256, buttonWidth),
							top : pixelsScaledRelative(72, 256, buttonWidth),
						},
					}}
				/>,
			)
		}

		if (isRunning) {
			overlay.push(
				<Icon
					key    = {`ui_joinGame_laneButton_${i}_players`}
					src    = {bowlingIconAtlas.source}
					uvs    = {getBowlingDigitUvs(laneCache.players[i] ?? 0)}
					width  = {pixelsScaledRelative(20, 256, buttonWidth)}
					height = {pixelsScaledRelative(20, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : {
							left: pixelsScaledRelative(92, 256, buttonWidth),
							top : pixelsScaledRelative(60, 256, buttonWidth),
						},
					}}
				/>,
				<Icon
					key    = {`ui_joinGame_laneButton_${i}_frames`}
					src    = {bowlingIconAtlas.source}
					uvs    = {getBowlingDigitUvs((laneCache.frame[i] ?? 0) + 1)}
					width  = {pixelsScaledRelative(20, 256, buttonWidth)}
					height = {pixelsScaledRelative(20, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : {
							left: pixelsScaledRelative(174, 256, buttonWidth),
							top : pixelsScaledRelative(72, 256, buttonWidth),
						},
					}}
				/>,
			)
		}

		const infoUvs = infoKind === LaneInfoKind.OPEN
			? laneInfoAtlas.uv.open
			: infoKind === LaneInfoKind.STARTING
				? laneInfoAtlas.uv.starting
				: laneInfoAtlas.uv.occupied

		if (isRunning) {
			laneButtonRow[i] = LaneButtonRow.DISABLED
		} else if (laneButtonRow[i] === LaneButtonRow.DISABLED) {
			laneButtonRow[i] = LaneButtonRow.DEFAULT
		}

		return (
			<UiBox
				key           = {`ui_joinGame_laneButton_${i}`}
				width         = {buttonWidth}
				height        = {buttonWidth / 2}
				alignItems    = "center"
				borderWidth   = {0}
				uiTransform   = {{
					flexDirection: 'row',
					flexGrow     : 0,
					flexShrink   : 0,
				}}
				uiBackground  = {{
					texture    : atlas.texture,
					textureMode: 'stretch',
					uvs        : getLaneButtonUvs(atlas, laneButtonRow[i]),
					color      : Color4.White(),
				}}
				onMouseEnter  = {() => {
					if (laneButtonRow[i] !== LaneButtonRow.DISABLED) {
						laneButtonRow[i] = LaneButtonRow.HOVER
					}
				}}
				onMouseLeave  = {() => {
					if (laneButtonRow[i] !== LaneButtonRow.DISABLED) {
						laneButtonRow[i] = LaneButtonRow.DEFAULT
					}
				}}
				onMouseDown   = {() => {
					if (laneButtonRow[i] === LaneButtonRow.DISABLED) return
					laneButtonRow[i] = LaneButtonRow.PRESS
					if (!isRunning) {
						ClientMessaging.requestJoinLane(i + 1, this.joinProps.get('frameCount'))
					}
				}}
				onMouseUp     = {() => {
					if (laneButtonRow[i] !== LaneButtonRow.DISABLED) {
						laneButtonRow[i] = LaneButtonRow.HOVER
					}
				}}
			>
				<Icon
					src    = {bowlingIconAtlas.source}
					uvs    = {getLaneNumberUvs(i)}
					width  = {pixelsScaledRelative(58, 256, buttonWidth)}
					height = {pixelsScaledRelative(58, 256, buttonWidth)}
					uiTransform = {{
						positionType: 'absolute',
						position    : { left: pixelsScaledRelative(16, 256, buttonWidth) },
					}}
				/>
				<Icon
					src    = {laneInfoAtlas.source}
					uvs    = {infoUvs}
					width  = "100%"
					height = "100%"
					uiTransform = {{
						positionType: 'absolute',
					}}
				/>
				{overlay}
			</UiBox>
		)
	}


	// MARK: getLaneButtons
	private getLaneButtons(
		start      : number,
		end        : number,
		buttonWidth: number,
	) {
		const buttons: ReactEcs.JSX.Element[] = []
		for (let i = start; i <= end; i++) {
			buttons.push(this.laneButton(i, buttonWidth))
		}
		return buttons
	}



	// MARK: selectFrameCount
	/**
	 * Sets the length used when this player opens an idle lane.
	 */
	private selectFrameCount(frameCount: GameFrameCount) {
		this.joinProps.set('frameCount', frameCount)
	}



	// MARK: frameCountPicker
	/**
	 * 3 / 6 / 10 control shown above the lane buttons.
	 */
	private frameCountPicker() {
		const theme    = getTheme()
		const selected = this.joinProps.get('frameCount')

		return GameSettings.GAME_FRAME_COUNTS.map((count) => {
			const isSelected = count === selected
			return (
				<ButtonText
					key             = {`join_frames_${count}`}
					id              = {`btn_join_frames_${count}`}
					textLabel       = {`${count}`}
					width           = {72}
					height          = {40}
					backgroundColor = {theme.colors.secondary}
					borderColor     = {isSelected ? theme.colors.primary : theme.colors.tertiary}
					borderWidth     = {3}
					fontColor       = {isSelected ? theme.colors.primary : theme.colors.light}
					callback        = {() => { this.selectFrameCount(count) }}
				/>
			)
		})
	}



	// MARK: body
	protected body() {
		const mainWidth = 1024
		const padding   = { left: 32, right: 32, top: 32, bottom: 16 }
		const mainWidthMinusPadding = mainWidth - padding.left - padding.right
		const buttonWidth = mainWidthMinusPadding * 0.25
		const rowHeight   = buttonWidth / 2

		return [
			<UiBox
				key            = "join-panel"
				width          = {mainWidth}
				height         = {buttonWidth + padding.top + padding.bottom + FRAME_PICKER_HEIGHT}
				justifyContent = "center"
				alignItems     = "center"
				padding        = {padding}
				borderWidth    = {0}
				uiTransform    = {{ flexDirection: 'row' }}
			>
				<Background
					key          = "join-panel-chrome"
					textureSrc   = {bowlingThemeAssets.backgroundPopup}
					borderWidth  = {0}
					uiBackground = {{
						textureMode  : 'nine-slices',
						textureSlices: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
					}}
				/>
				<UiBox
					key    = "join-welcome"
					width  = {mainWidthMinusPadding * 0.25}
					height = {mainWidthMinusPadding * 0.25}
					uiBackground = {{
						texture    : { src: bowlingThemeAssets.infoWelcome, wrapMode: 'clamp' },
						textureMode: 'stretch',
					}}
				/>
				<UiBox
					key            = "join-lanes"
					width          = {mainWidthMinusPadding * 0.75}
					height         = {mainWidthMinusPadding * 0.25 + FRAME_PICKER_HEIGHT}
					alignItems     = "center"
					justifyContent = "center"
					borderWidth    = {0}
					uiTransform    = {{ flexDirection: 'column' }}
				>
					<UiBox
						key            = "join-frames"
						width          = {mainWidth * 0.75}
						height         = {FRAME_PICKER_HEIGHT}
						alignItems     = "center"
						justifyContent = "space-between"
						padding        = {{ left: 32, right: 32 }}
						borderWidth    = {0}
						uiTransform    = {{ flexDirection: 'row' }}
					>
						{this.frameCountPicker()}
					</UiBox>
					<UiBox
						key            = "join-row-1"
						width          = {mainWidth * 0.75}
						height         = {rowHeight}
						alignItems     = "center"
						justifyContent = "space-between"
						padding        = {padding}
						borderWidth    = {0}
						uiTransform    = {{ flexDirection: 'row' }}
					>
						{this.getLaneButtons(0, breakAfter, buttonWidth)}
					</UiBox>
					<UiBox
						key            = "join-row-2"
						width          = {mainWidth * 0.75}
						height         = {rowHeight}
						alignItems     = "center"
						justifyContent = "space-between"
						padding        = {padding}
						borderWidth    = {0}
						uiTransform    = {{
							flexDirection: 'row',
							positionType : 'relative',
							position     : { top: -20 },
						}}
					>
						{this.getLaneButtons(breakAfter + 1, GameSettings.MAX_LANES - 1, buttonWidth)}
					</UiBox>
				</UiBox>
			</UiBox>,
		]
	}
}

export const joinGameLayer = new JoinGameLayer()


// MARK: ShowJoinGameUI
/** Slides the join-game panel on-screen. */
export function ShowJoinGameUI() {
	joinGameLayer.show(0.2)
}


// MARK: HideJoinGameUI
/** Slides the join-game panel off-screen. */
export function HideJoinGameUI() {
	joinGameLayer.hide(0.3)
}
