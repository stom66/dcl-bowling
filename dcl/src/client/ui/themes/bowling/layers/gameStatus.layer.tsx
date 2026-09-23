import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { Column, getTheme, Icon, IconNumber, IconString, Layer, lighten, PropsController, ProgressBarRadial, Row, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { LanePhase } from 'src/shared/enums'
import { GameSettings } from 'src/shared/settings'
import { LaneSnapshot } from 'src/shared/types/shared-types'
import { clockSync } from 'src/shared/utils/clockSync'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientStore } from 'src/client/clientStore'
import { bowlingCharsAtlas, bowlingTextLabelsAtlas, gameIconsAtlas, getBowlingTextLabelSize } from 'src/client/ui/themes/bowling/atlases'


type GameStatusProps = {
	playerName: string
	endTime   : number
	durationMs: number
}


const clientStore = ClientStore.getInstance()

const PANEL_WIDTH         = 520
const OUTER_PADDING       = 3
const OUTER_BORDER_WIDTH  = 4
const INNER_PADDING       = 8
const BALL_SIZE           = 80
const BALL_ICON_PADDING   = 4
const COUNTDOWN_NUM_SIZE  = 32
const STATUS_HEADING_SIZE = 24
const STATUS_NAME_SIZE    = 18
const STATUS_LINE_SIZE    = 24
const SECONDS_LABEL_SIZE  = 10
const BALL_BORDER_WIDTH   = 2
const INNER_BORDER_WIDTH  = 1
const COLOR_PANEL_FILL    = Color4.fromHexString('#1d0231ff')
const COLOR_INNER_BORDER  = Color4.fromHexString('#681fd0ff')
const COLOR_OUTER_BORDER  = Color4.fromHexString('#f66a02ff')
const COLOR_TIMER_BORDER  = Color4.fromHexString('#6b4698ff')
const STATUS_LABEL_MAX_WIDTH =
	Math.floor((
		PANEL_WIDTH
		- OUTER_BORDER_WIDTH * 2
		- OUTER_PADDING      * 2
		- INNER_BORDER_WIDTH * 2
		- INNER_PADDING      * 2
		- 8                  * 2
	) * 6 / 12)

/**
 * Layout height of the status panel (ball column plus inner/outer padding
 * and borders). Leave-game uses this to sit below the HUD.
 */
export const GAME_STATUS_PANEL_HEIGHT =
	BALL_SIZE
	+ INNER_PADDING * 2
	+ INNER_BORDER_WIDTH * 2
	+ OUTER_PADDING * 2
	+ OUTER_BORDER_WIDTH * 2


// MARK: GameStatusLayer
/**
 * Top-center HUD showing the current turn, player, phase, and countdown.
 */
export class GameStatusLayer extends Layer {
	private statusProps: PropsController<GameStatusProps>

	constructor() {
		super({
			id         : 'bowling-game-status',
			zone       : ZoneType.TopCenter,
			canBeHidden: false,
			uiTransform: {
				height: 'auto',
			},
		})

		this.statusProps = new PropsController<GameStatusProps>({
			playerName: '~',
			endTime   : 0,
			durationMs: 0,
		})

		eventBus.on(ClientEvents.NOTIFY_LANE_STATE, (data: LaneSnapshot) => {
			const myLane = clientStore.getLaneIndex()
			if (myLane === undefined || data.laneIndex !== myLane) return

			if (data.currentFrameUserId) {
				void userProfileCache.getDisplayName(data.currentFrameUserId).then((displayName) => {
					this.statusProps.set('playerName', displayName || '~')
				})
			}

			if (data.currentRollStartTime) {
				this.statusProps.set(
					'endTime',
					clockSync.toLocalTime(data.currentRollStartTime) + GameSettings.ROLL_MAX_DURATION,
				)
				this.statusProps.set('durationMs', GameSettings.ROLL_MAX_DURATION)
			} else {
				this.statusProps.set('endTime', clockSync.toLocalTime(data.gameStartTime))
				this.statusProps.set('durationMs', GameSettings.GAME_START_COUNTDOWN_DURATION)
			}
		})
	}



	// MARK: getStatusLabelKey
	/** Named cell in {@link bowlingTextLabelsAtlas} for the current lane phase. */
	private getStatusLabelKey(): keyof typeof bowlingTextLabelsAtlas.named {
		const lanePhase = clientStore.getLanePhase()

		if (lanePhase === LanePhase.GAME_STARTING)    return 'gameIsStarting'
		if (lanePhase === LanePhase.WAITING)          return 'waitingForNextFrame'
		if (lanePhase === LanePhase.FRAME_START)      return 'turnIsStarting'
		if (lanePhase === LanePhase.ROLL_AWAITING)    return 'waitingToRoll'
		if (lanePhase === LanePhase.ROLL_PROCESSING)  return 'rolling'
		if (lanePhase === LanePhase.ROLL_PLAYBACK)    return 'rolling'
		if (lanePhase === LanePhase.ROLL_END)         return 'hasFinishedRolling'
		if (lanePhase === LanePhase.FRAME_END)        return 'hasFinishedTheirFrame'
		if (lanePhase === LanePhase.GAME_ENDING)      return 'gameIsEnding'
		if (lanePhase === LanePhase.NONE)             return 'youAreNotInAGame'
		return 'idle'
	}



	// MARK: getCountdownSeconds
	/**
	 * Whole seconds left on the active timer, or `0` when there is no countdown.
	 */
	private getCountdownSeconds(): number {
		const endTime = this.statusProps.get('endTime')
		if (endTime <= 0) return 0

		const timeRemaining = Math.ceil((endTime - Date.now()) / 1000)
		return timeRemaining > 0 ? timeRemaining : 0
	}



	// MARK: getCountdownProgress
	/**
	 * Remaining time as `0..1` for {@link ProgressBarRadial}. Full at the start
	 * of the window, empty when the timer elapses.
	 */
	private getCountdownProgress(): number {
		const endTime    = this.statusProps.get('endTime')
		const durationMs = this.statusProps.get('durationMs')
		if (endTime <= 0 || durationMs <= 0) return 0

		const remaining = endTime - Date.now()
		if (remaining <= 0) return 0
		if (remaining >= durationMs) return 1
		return remaining / durationMs
	}



	// MARK: ballIcon
	/** Left column: colored bowling-ball glyph with an inset light-purple ring. */
	private ballIcon() {
		return (
			<Icon
				src             = {gameIconsAtlas.source}
				uvs             = {gameIconsAtlas.uv.ballColor}
				width           = {BALL_SIZE}
				height          = {BALL_SIZE}
				padding         = {BALL_ICON_PADDING}
				backgroundColor = {COLOR_PANEL_FILL}
				borderColor     = {COLOR_INNER_BORDER}
				borderWidth     = {BALL_BORDER_WIDTH}
				borderRadius    = {BALL_SIZE / 2}
			/>
		)
	}



	// MARK: statusCopy
	/** Center column: heading, current player, and phase status. */
	private statusCopy() {
		const theme        = getTheme()
		const lightPrimary = lighten(theme.colors.primary, 0.35)
		const playerName   = this.statusProps.get('playerName')
		const headingSize  = getBowlingTextLabelSize('currentTurn', STATUS_HEADING_SIZE, STATUS_LABEL_MAX_WIDTH)
		const statusKey    = this.getStatusLabelKey()
		const statusSize   = getBowlingTextLabelSize(statusKey, STATUS_LINE_SIZE, STATUS_LABEL_MAX_WIDTH)

		return (
			<Column
				width          = "100%"
				spacing        = {2}
				alignItems     = "center"
				justifyContent = "center"
			>
				<Icon
					src          = {bowlingTextLabelsAtlas.source}
					uvs          = {bowlingTextLabelsAtlas.uv.currentTurn}
					width        = {headingSize.width}
					height       = {headingSize.height}
					iconColor    = {theme.colors.warning}
					alignSelf    = "center"
					uiBackground = {{ texture: bowlingTextLabelsAtlas.texture }}
				/>
				<IconString
					value     = {playerName}
					height    = {STATUS_NAME_SIZE}
					iconColor = {lightPrimary}
					atlases   = {{ characters: bowlingCharsAtlas }}
				/>
				<Icon
					src          = {bowlingTextLabelsAtlas.source}
					uvs          = {bowlingTextLabelsAtlas.uv[statusKey]}
					width        = {statusSize.width}
					height       = {statusSize.height}
					iconColor    = {theme.colors.light}
					alignSelf    = "center"
					uiBackground = {{ texture: bowlingTextLabelsAtlas.texture }}
				/>
			</Column>
		)
	}



	// MARK: countdownTimer
	/**
	 * Right column: radial remaining-time ring with atlas digits and a
	 * `seconds` caption in the hole.
	 */
	private countdownTimer() {
		const theme        = getTheme()
		const lightPrimary = lighten(theme.colors.warning, 0.0)
		const seconds      = this.getCountdownSeconds()
		const secondsSize  = getBowlingTextLabelSize('seconds', SECONDS_LABEL_SIZE)

		return (
			<ProgressBarRadial
				progress        = {this.getCountdownProgress()}
				width           = {BALL_SIZE}
				height          = {BALL_SIZE}
				fillColor       = {theme.colors.primary}
				backgroundColor = {COLOR_PANEL_FILL}
				borderColor     = {COLOR_TIMER_BORDER}
				borderWidth     = {BALL_BORDER_WIDTH}
				inset           = {-8}
			>
				<Column
					width          = "100%"
					height         = "100%"
					spacing        = {2}
					alignItems     = "center"
					justifyContent = "center"
				>
					<IconNumber
						value     = {seconds}
						height    = {COUNTDOWN_NUM_SIZE}
						iconColor = {Color4.White()}
					/>
					<Icon
						src          = {bowlingTextLabelsAtlas.source}
						uvs          = {bowlingTextLabelsAtlas.uv.seconds}
						width        = {secondsSize.width}
						height       = {secondsSize.height}
						iconColor    = {lightPrimary}
						uiBackground = {{ texture: bowlingTextLabelsAtlas.texture }}
					/>
				</Column>
			</ProgressBarRadial>
		)
	}



	// MARK: body
	protected body() {
		const theme       = getTheme()
		const innerRadius = Math.max(0, theme.border.radiusDefault - OUTER_PADDING)

		return [
			<UiBox
				width           = {PANEL_WIDTH}
				//backgroundColor = {COLOR_OUTER_BORDER}
				borderRadius    = {theme.border.radiusDefault}
				padding         = {OUTER_PADDING}
				backgroundColor = {COLOR_PANEL_FILL}
				uiTransform     = {{
					borderColor: COLOR_OUTER_BORDER,
					borderWidth: OUTER_BORDER_WIDTH,
				}}
			>
				<Row
					width           = "100%"
					padding         = {INNER_PADDING}
					spacing         = {8}
					alignItems      = "center"
					backgroundColor = {COLOR_PANEL_FILL}
					borderColor     = {COLOR_INNER_BORDER}
					borderWidth     = {INNER_BORDER_WIDTH}
					borderRadius    = {innerRadius}
				>
					<Column cols={3} justifyContent="center" alignItems="center">
						{this.ballIcon()}
					</Column>
					<Column cols={6} justifyContent="center" alignItems="center">
						{this.statusCopy()}
					</Column>
					<Column cols={3} justifyContent="center" alignItems="center">
						{this.countdownTimer()}
					</Column>
				</Row>
			</UiBox>,
		]
	}
}

export const gameStatusLayer = new GameStatusLayer()
