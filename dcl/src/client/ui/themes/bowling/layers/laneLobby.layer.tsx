import { engine } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { AvatarIcon, ButtonImage, Column, getTheme, IconNumber, IconString, Layer, lighten, ProgressBarRadial, PropsController, Row, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { LanePhase } from 'src/shared/enums'
import { LaneStore } from 'src/shared/laneStore'
import { GameFrameCount, GameSettings, normalizeFrameCount } from 'src/shared/settings'
import { clockSync } from 'src/shared/utils/clockSync'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { ClientMessaging } from 'src/client/clientMessaging'
import { bowlingRussoOneAlphaNumericAtlas, bowlingRussoOneSymbolsAtlas, primaryButtonAtlas, secondaryButtonAtlas } from 'src/client/ui/themes/bowling/atlases'


const FORCE_SHOW = false

const PANEL_WIDTH        = 640
const PANEL_PADDING      = 20
const FRAME_BTN_W        = 120
const FRAME_BTN_H        = 44
const AVATAR_SIZE        = 52
const ACTION_BTN_W       = 200
const ACTION_BTN_H       = 64
const RADIAL_SIZE        = 88
const COLOR_PANEL_FILL   = Color4.fromHexString('#1d0231ff')
const COLOR_TIMER_BORDER = Color4.fromHexString('#6b4698ff')

const stringAtlases = {
	characters: bowlingRussoOneAlphaNumericAtlas,
	symbols   : bowlingRussoOneSymbolsAtlas,
}


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

			this.lobbyProps.set('phase', phase)
			this.lobbyProps.set('players', LaneStore.getLaneUserIds(laneIndex))
			this.lobbyProps.set(
				'frameCount',
				this.pendingFrameCount ?? serverFrames,
			)
			this.lobbyProps.set('endTime', startTime > 0 ? clockSync.toLocalTime(startTime) : 0)
			this.lobbyProps.set('occupied', this.wasOpenedAsOccupied || (
				phase !== LanePhase.NONE
				&& phase !== LanePhase.LOBBY
				&& phase !== LanePhase.GAME_STARTING
			))
		})
	}


	// MARK: openForLane
	/** Binds the panel to a 0-based lane and shows it. */
	openForLane(
		laneIndex: number,
		occupied : boolean,
	): void {
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
	/** Hides the panel and clears optimistic frame state. */
	close(): void {
		this.pendingFrameCount  = null
		this.flushPendingFrames = false
		this.hide(0.3)
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
		const theme      = getTheme()
		const laneIndex  = this.lobbyProps.get('laneIndex')
		const occupied   = this.lobbyProps.get('occupied')
		const phase      = this.lobbyProps.get('phase')
		const frameCount = this.lobbyProps.get('frameCount')
		const players    = this.lobbyProps.get('players')
		const endTime    = this.lobbyProps.get('endTime')
		const canEdit    = !occupied
		const canStart   = !occupied && phase === LanePhase.LOBBY && players.length > 0
		const starting   = phase === LanePhase.GAME_STARTING
		const seconds    = endTime > 0 ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) : 0
		const progress   = endTime > 0
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
					<IconString
						value     = {`LANE ${laneIndex + 1}`}
						height    = {22}
						iconColor = {theme.colors.primary}
						atlases   = {stringAtlases}
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
									onMouseDown     = {() => {
										if (canEdit) this.selectFrameCount(count)
									}}
								>
									<IconString
										value     = {`${count} FRAMES`}
										width     = {FRAME_BTN_W - 16}
										height    = {14}
										iconColor = {selected ? theme.colors.dark : theme.colors.light}
										atlases   = {stringAtlases}
									/>
								</UiBox>
							)
						})}
					</Row>

					<Row width="100%" height={AVATAR_SIZE} spacing={8} alignItems="center" justifyContent="center">
						{players.length === 0 ? (
							<IconString
								value     = "WAITING"
								height    = {14}
								iconColor = {theme.colors.tertiary}
								atlases   = {stringAtlases}
							/>
						) : players.map((userId) => (
							<AvatarIcon
								key          = {`lobby_avatar_${userId}`}
								userId       = {userId}
								width        = {AVATAR_SIZE}
								height       = {AVATAR_SIZE}
								borderRadius = {AVATAR_SIZE / 2}
							/>
						))}
					</Row>

					{occupied ? (
						<IconString
							value     = "OCCUPIED"
							height    = {18}
							iconColor = {theme.colors.warning}
							atlases   = {stringAtlases}
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
									<IconNumber
										value     = {seconds}
										height    = {28}
										iconColor = {Color4.White()}
										atlas     = {bowlingRussoOneAlphaNumericAtlas}
									/>
									<IconString
										value     = "SECONDS"
										height    = {10}
										iconColor = {lighten(theme.colors.warning, 0)}
										atlases   = {stringAtlases}
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
								<IconString
									value     = "CANCEL"
									height    = {18}
									iconColor = {Color4.White()}
									atlases   = {stringAtlases}
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
							<IconString
								value     = "START"
								height    = {20}
								iconColor = {Color4.White()}
								atlases   = {stringAtlases}
							/>
						</ButtonImage>
					)}
				</Column>
			</UiBox>,
		]
	}
}

export const laneLobbyLayer = new LaneLobbyLayer()


// MARK: ShowLaneLobbyUI
/** Opens the lobby panel for a 0-based lane index. */
export function ShowLaneLobbyUI(
	laneIndex: number,
	occupied : boolean = false,
): void {
	laneLobbyLayer.openForLane(laneIndex, occupied)
}


// MARK: HideLaneLobbyUI
/** Hides the lobby panel. */
export function HideLaneLobbyUI(): void {
	laneLobbyLayer.close()
}
