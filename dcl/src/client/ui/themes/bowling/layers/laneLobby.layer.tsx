import { engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { AvatarIcon, ButtonImage, Column, getTheme, Layer, lighten, ProgressBarRadial, PropsController, Row, Text, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { LanePhase } from 'src/shared/enums'
import { estimateGameLengthMs, formatGameLengthLabel } from 'src/shared/gameLength'
import { LaneStore } from 'src/shared/laneStore'
import { GameFrameCount, GameSettings, normalizeFrameCount } from 'src/shared/settings'
import { clockSync } from 'src/shared/utils/clockSync'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { primaryButtonAtlas, secondaryButtonAtlas } from 'src/client/ui/themes/bowling/atlases'
import { bindLaneLobbyUi } from 'src/client/ui/themes/bowling/layers/laneLobbyUi'


const FORCE_SHOW = false

const PANEL_WIDTH        = 640
const PANEL_PADDING      = 20
const FRAME_BTN_W        = 180
const FRAME_BTN_H        = 44
const FRAME_BTN_PAD_X    = 14
const FRAME_BTN_TEXT_H   = FRAME_BTN_H - 8
const AVATAR_SIZE        = 52
const AVATAR_BORDER      = 2
const ACTION_BTN_W       = 200
const ACTION_BTN_H       = 64
const ACTION_BTN_FONT    = 14
const ACTION_BTN_PAD_X   = 24
const RADIAL_SIZE        = 88
const COLOR_PANEL_FILL   = Color4.fromHexString('#1d0231ff')
const COLOR_TIMER_BORDER = Color4.fromHexString('#6b4698ff')

const clientStore = ClientStore.getInstance()


type LobbyUiProps = {
	laneIndex : number
	occupied  : boolean
	phase     : LanePhase
	frameCount: GameFrameCount
	players   : string[]
	endTime   : number
}


// MARK: readLaneFrameCount
/** Server frame count for a lane, or the default when the lane is idle. */
function readLaneFrameCount(laneIndex: number): GameFrameCount {
	if (!LaneStore.areLanesReady()) return GameSettings.DEFAULT_FRAME_COUNT
	return normalizeFrameCount(LaneStore.getFrameCount(laneIndex) || GameSettings.DEFAULT_FRAME_COUNT)
}


// MARK: LaneLobbyLayer
/**
 * Per-lane lobby: frame length, player avatars, start / cancel countdown.
 */
export class LaneLobbyLayer extends Layer {
	private lobbyProps: PropsController<LobbyUiProps>
	private wasOpenedAsOccupied = false

	/** Optimistic frame choice until the synced lane value catches up. */
	private pendingFrameCount: GameFrameCount | null = null

	/** Send pending frames once the player is actually in the lobby. */
	private flushPendingFrames = false

	/** Bumped on each open so avatar portraits remount after a hide. */
	private panelGeneration = 0

	constructor() {
		super({
			id         : 'bowling-lane-lobby',
			zone       : ZoneType.BottomCenter,
			canBeHidden: true,
			startHidden: !FORCE_SHOW,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			uiTransform: {
				height: 'auto',
			},
		})

		this.lobbyProps = new PropsController<LobbyUiProps>({
			laneIndex : 0,
			occupied  : false,
			phase     : LanePhase.NONE,
			frameCount: GameSettings.DEFAULT_FRAME_COUNT,
			players   : [],
			endTime   : 0,
		})

		eventBus.on(ClientEvents.ON_GROUP_GAME_START, () => { this.hide(0.3) })
		eventBus.on(ClientEvents.ON_MY_ROLL_START,    () => { this.hide(0.3) })

		engine.addSystem(() => {
			if (this.visibility.isHidden && !FORCE_SHOW) return
			if (!LaneStore.areLanesReady()) return

			const laneIndex   = this.lobbyProps.get('laneIndex')
			const phase       = LaneStore.getPhase(laneIndex)
			const serverFrames = readLaneFrameCount(laneIndex)
			const startTime   = LaneStore.getGameStartTime(laneIndex)
			const inLobby     = phase === LanePhase.LOBBY || phase === LanePhase.GAME_STARTING

			if (this.flushPendingFrames && this.pendingFrameCount !== null && inLobby) {
				ClientMessaging.requestSetLaneFrameCount(this.pendingFrameCount)
				this.flushPendingFrames = false
			}

			if (this.pendingFrameCount !== null && serverFrames === this.pendingFrameCount) {
				this.pendingFrameCount = null
			}

			const players  = LaneStore.getLaneUserIds(laneIndex)
			const frames   = this.pendingFrameCount ?? serverFrames
			const endTime  = startTime > 0 ? clockSync.toLocalTime(startTime) : 0
			const occupied = this.wasOpenedAsOccupied || (
				phase !== LanePhase.NONE
				&& phase !== LanePhase.LOBBY
				&& phase !== LanePhase.GAME_STARTING
			)
			const samePlayers = players.join() === this.lobbyProps.get('players').join()

			if (this.lobbyProps.get('phase') !== phase)         this.lobbyProps.set('phase', phase)
			if (!samePlayers)                                   this.lobbyProps.set('players', players)
			if (this.lobbyProps.get('frameCount') !== frames)   this.lobbyProps.set('frameCount', frames)
			if (this.lobbyProps.get('endTime') !== endTime)     this.lobbyProps.set('endTime', endTime)
			if (this.lobbyProps.get('occupied') !== occupied)   this.lobbyProps.set('occupied', occupied)
		})
	}


	// MARK: openForLane
	/** Binds the panel to a 0-based lane and shows it. */
	openForLane(
		laneIndex: number,
		occupied : boolean,
	): void {
		this.panelGeneration++
		this.wasOpenedAsOccupied = occupied
		this.pendingFrameCount   = null
		this.flushPendingFrames  = false

		this.lobbyProps.set('laneIndex', laneIndex)
		this.lobbyProps.set('occupied', occupied)
		this.lobbyProps.set('frameCount', readLaneFrameCount(laneIndex))
		if (LaneStore.areLanesReady()) {
			this.lobbyProps.set('phase', LaneStore.getPhase(laneIndex))
			this.lobbyProps.set('players', LaneStore.getLaneUserIds(laneIndex))
		}
		else {
			this.lobbyProps.set('phase', LanePhase.NONE)
			this.lobbyProps.set('players', [])
		}
		this.show(0.2)
	}


	// MARK: close
	/**
	 * Hides the panel and clears optimistic frame state.
	 * Snaps off-screen without `isFullyHidden`, so the zone never gets
	 * `display: none`. That flag blanks `avatarTexture` and it does not recover.
	 */
	close(): void {
		this.pendingFrameCount  = null
		this.flushPendingFrames = false
		this.hide(0)
		this.visibility.isFullyHidden = false
	}


	// MARK: render
	/**
	 * Keeps a hidden panel off-screen. An in-flight show tween would otherwise
	 * slide it back after `close()`.
	 */
	render() {
		if (this.visibility.isHidden) {
			this.visibility.activeEdge = this.visibility.hideTo
			this.visibility.position   = this.visibility.hiddenPosition
		}
		return super.render()
	}


	// MARK: selectFrameCount
	/** Optimistically selects a frame length and asks the server when enrolled. */
	private selectFrameCount(frameCount: GameFrameCount) {
		if (this.lobbyProps.get('occupied')) return

		this.pendingFrameCount = frameCount
		this.lobbyProps.set('frameCount', frameCount)

		const phase = this.lobbyProps.get('phase')
		if (phase === LanePhase.LOBBY || phase === LanePhase.GAME_STARTING) {
			ClientMessaging.requestSetLaneFrameCount(frameCount)
			this.flushPendingFrames = false
		}
		else {
			// Join may still be in flight on first enter.
			this.flushPendingFrames = true
		}
	}


	// MARK: body
	protected body() {
		const theme         = getTheme()
		const laneIndex     = this.lobbyProps.get('laneIndex')
		const occupied      = this.lobbyProps.get('occupied')
		const phase         = this.lobbyProps.get('phase')
		const frameCount    = this.lobbyProps.get('frameCount')
		const players       = this.lobbyProps.get('players')
		const endTime       = this.lobbyProps.get('endTime')
		const localUserId   = clientStore.getUserId().toLowerCase()
		const canEdit       = !occupied
		const canStart      = !occupied && phase === LanePhase.LOBBY && players.length > 0
		const starting      = phase === LanePhase.GAME_STARTING
		const durationLabel = players.length > 0
			? formatGameLengthLabel(estimateGameLengthMs(players.length, frameCount))
			: ''
		const seconds       = endTime > 0 ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) : 0
		const progress      = endTime > 0
			? Math.min(1, Math.max(0, endTime - Date.now()) / GameSettings.GAME_START_COUNTDOWN_DURATION)
			: 0

		return [
			<UiBox
				key             = "lobby-panel"
				width           = {PANEL_WIDTH}
				height          = "auto"
				padding         = {PANEL_PADDING}
				borderWidth     = {3}
				borderRadius    = {16}
				borderColor     = {theme.colors.primary}
				backgroundColor = {theme.colors.secondary}
				alignItems      = "center"
				justifyContent  = "center"
				uiTransform     = {{ flexDirection: 'column' }}
			>
				<Column width="100%" spacing={16} alignItems="center" justifyContent="center">
					<Text
						value     = {`LANE ${laneIndex + 1}`}
						fontSize  = {22}
						fontColor = {theme.colors.primary}
						textAlign = "middle-center"
						textWrap  = "nowrap"
						width     = "100%"
						height    = {22}
					/>

					<Row width="100%" height={FRAME_BTN_H} spacing={10} alignItems="center" justifyContent="center">
						{GameSettings.GAME_FRAME_COUNTS.map((count) => {
							const selected = count === frameCount
							return (
								<UiBox
									key             = {`lobby_frames_${count}`}
									width           = {FRAME_BTN_W}
									height          = {FRAME_BTN_H}
									backgroundColor = {selected ? theme.colors.primary : theme.colors.dark}
									borderColor     = {selected ? theme.colors.primary : theme.colors.tertiary}
									borderWidth     = {3}
									borderRadius    = {theme.border.radiusSmall}
									alignItems      = "center"
									justifyContent  = "center"
									pointerFilter   = "block"
									onMouseDown     = {() => {
										if (canEdit) this.selectFrameCount(count)
									}}
								>
									<Text
										value         = {`${count} FRAMES`}
										fontSize      = {14}
										fontColor     = {selected ? theme.colors.dark : theme.colors.light}
										textAlign     = "middle-center"
										textWrap      = "nowrap"
										width         = {FRAME_BTN_W - (FRAME_BTN_PAD_X * 2)}
										height        = {FRAME_BTN_TEXT_H}
										pointerFilter = "none"
									/>
								</UiBox>
							)
						})}
					</Row>

					<Row width="100%" height={AVATAR_SIZE} spacing={8} alignItems="center" justifyContent="center">
						{players.length === 0 ? (
							<Text
								value     = "WAITING"
								fontSize  = {14}
								fontColor = {theme.colors.tertiary}
								textAlign = "middle-center"
								textWrap  = "nowrap"
								width     = "auto"
								height    = {14}
							/>
						) : players.map((userId) => {
							const isLocal = userId.toLowerCase() === localUserId
							return (
								<AvatarIcon
									key          = {`lobby_avatar_${this.panelGeneration}_${userId}`}
									userId       = {userId}
									width        = {AVATAR_SIZE}
									height       = {AVATAR_SIZE}
									borderRadius = {AVATAR_SIZE / 2}
									borderWidth  = {AVATAR_BORDER}
									borderColor  = {isLocal ? theme.colors.primary : theme.colors.tertiary}
								/>
							)
						})}
					</Row>

					{durationLabel !== '' ? (
						<Text
							value     = {durationLabel}
							fontSize  = {14}
							fontColor = {theme.colors.tertiary}
							textAlign = "middle-center"
							textWrap  = "nowrap"
							width     = "100%"
							height    = {14}
						/>
					) : null}

					{occupied ? (
						<Text
							value     = "OCCUPIED"
							fontSize  = {18}
							fontColor = {theme.colors.warning}
							textAlign = "middle-center"
							textWrap  = "nowrap"
							width     = "auto"
							height    = {18}
						/>
					) : starting ? (
						<Row width="100%" spacing={20} alignItems="center" justifyContent="center">
							<ProgressBarRadial
								progress        = {progress}
								width           = {RADIAL_SIZE}
								height          = {RADIAL_SIZE}
								fillColor       = {theme.colors.primary}
								backgroundColor = {COLOR_PANEL_FILL}
								borderColor     = {COLOR_TIMER_BORDER}
								borderWidth     = {2}
								inset           = {-8}
							>
								<Column width="100%" height="100%" spacing={2} alignItems="center" justifyContent="center">
									<Text
										value     = {`${seconds}`}
										fontSize  = {28}
										fontColor = {Color4.White()}
										textAlign = "middle-center"
										textWrap  = "nowrap"
										width     = "auto"
										height    = {28}
									/>
									<Text
										value     = "SECONDS"
										fontSize  = {10}
										fontColor = {lighten(theme.colors.warning, 0)}
										textAlign = "middle-center"
										textWrap  = "nowrap"
										width     = "auto"
										height    = {10}
									/>
								</Column>
							</ProgressBarRadial>
							<ButtonImage
								id             = "lobby_cancel"
								atlas          = {secondaryButtonAtlas}
								uvColumn       = {1}
								width          = {ACTION_BTN_W}
								height         = {ACTION_BTN_H}
								alignItems     = "center"
								justifyContent = "center"
								callback       = {() => { ClientMessaging.requestCancelCountdown() }}
								uiTransform    = {{
									positionType: 'relative',
									position    : { top: 0, left: 0 },
								}}
							>
								<Text
									value     = "CANCEL"
									fontSize  = {ACTION_BTN_FONT}
									fontColor = {Color4.White()}
									textAlign = "middle-center"
									textWrap  = "nowrap"
									width     = {ACTION_BTN_W - ACTION_BTN_PAD_X * 2}
									height    = {ACTION_BTN_FONT + 8}
									alignSelf = "center"
									pointerFilter = "none"
								/>
							</ButtonImage>
						</Row>
					) : (
						<ButtonImage
							id             = "lobby_start"
							atlas          = {canStart ? primaryButtonAtlas : secondaryButtonAtlas}
							uvColumn       = {1}
							width          = {ACTION_BTN_W}
							height         = {ACTION_BTN_H}
							alignItems     = "center"
							justifyContent = "center"
							callback       = {() => {
								if (!canStart) return
								ClientMessaging.requestStartCountdown()
							}}
							uiTransform    = {{
								positionType: 'relative',
								position    : { top: 0, left: 0 },
							}}
						>
							<Text
								value     = "START"
								fontSize  = {ACTION_BTN_FONT}
								fontColor = {Color4.White()}
								textAlign = "middle-center"
								textWrap  = "nowrap"
								width     = {ACTION_BTN_W - ACTION_BTN_PAD_X * 2}
								height    = {ACTION_BTN_FONT + 8}
								alignSelf = "center"
								pointerFilter = "none"
							/>
						</ButtonImage>
					)}
				</Column>
			</UiBox>,
		]
	}
}

export const laneLobbyLayer = new LaneLobbyLayer()

bindLaneLobbyUi(
	(laneIndex, occupied) => laneLobbyLayer.openForLane(laneIndex, occupied),
	() => laneLobbyLayer.close(),
)
