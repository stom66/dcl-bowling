import { engine } from '@dcl/sdk/ecs'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	ButtonImage,
	Icon,
	Layer,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { PlayerStatus } from 'src/shared/enums'
import { UnFreezePlayer } from 'src/shared/utils/inputModifiers'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { bowlingIconAtlas, primaryButtonAtlas } from 'src/client/ui/themes/bowling/atlases'
import { GAME_STATUS_PANEL_HEIGHT } from 'src/client/ui/themes/bowling/layers/gameStatus.layer'
import { LETTERBOX_HUD_DURATION, onLetterboxHidden, onLetterboxShown } from 'src/client/ui/themes/bowling/layers/letterbox.layer'


const clientStore = ClientStore.getInstance()

const LEAVE_BUTTON_HEIGHT = 64
const LEAVE_BUTTON_GAP    = 12


// MARK: requestLeaveGame
/** Leaves the current lane and restores player movement. */
function requestLeaveGame() {
	ClientMessaging.requestLeaveGame()
	clientStore.setLaneIndex(undefined)
	UnFreezePlayer()
}


// MARK: isMatchStarted
/** True once the local player's lane is past the lobby and the start countdown. */
function isMatchStarted(): boolean {
	const status = clientStore.getPlayerStatus()
	return (
		status === PlayerStatus.IN_GAME_WAITING
		|| status === PlayerStatus.IN_GAME_PLAYING
	)
}


// MARK: LeaveGameLayer
/**
 * Top-center leave button, shown once a match has started.
 * Offset by the status-panel height plus a gap so it sits below that HUD.
 */
export class LeaveGameLayer extends Layer {
	private wasMatchStarted       = false
	private suppressedByLetterbox = false

	constructor() {
		super({
			id         : 'bowling-leave-game',
			zone       : ZoneType.TopCenter,
			canBeHidden: true,
			startHidden: true,
			uiTransform: {
				height: LEAVE_BUTTON_HEIGHT,
				margin: { top: GAME_STATUS_PANEL_HEIGHT + LEAVE_BUTTON_GAP },
			},
		})

		onLetterboxShown(() => { this.suppressForLetterbox() })
		onLetterboxHidden(() => { this.restoreAfterLetterbox() })

		engine.addSystem(() => {
			const matchStarted = isMatchStarted()
			if (this.suppressedByLetterbox) {
				this.wasMatchStarted = matchStarted
				return
			}
			if (matchStarted === this.wasMatchStarted) return
			this.wasMatchStarted = matchStarted
			if (matchStarted) {
				this.show(0)
			} else {
				this.hide(0)
			}
		})
	}


	// MARK: suppressForLetterbox
	/** Hides the leave button while cinematic bars are on screen. */
	private suppressForLetterbox() {
		this.suppressedByLetterbox = true
		if (this.visibility.isHidden) return
		this.hide(LETTERBOX_HUD_DURATION)
	}


	// MARK: restoreAfterLetterbox
	/**
	 * Brings the leave button back only when a match is still underway.
	 */
	private restoreAfterLetterbox() {
		const matchStarted = isMatchStarted()
		this.suppressedByLetterbox = false
		this.wasMatchStarted       = matchStarted
		if (matchStarted) this.show(LETTERBOX_HUD_DURATION)
		else if (!this.visibility.isHidden) this.hide(0)
	}


	// MARK: body
	protected body() {
		return [
			<ButtonImage
				id             = "btn_leave_game"
				atlas          = {primaryButtonAtlas}
				uvColumn       = {1}
				width          = {192}
				height         = {LEAVE_BUTTON_HEIGHT}
				alignItems     = "center"
				justifyContent = "center"
				callback       = {() => { requestLeaveGame() }}
				uiTransform    = {{
					positionType: 'relative',
					position    : { top: 0, left: 0 },
				}}
			>
				<UiBox
					width          = "100%"
					height         = "100%"
					alignItems     = "center"
					justifyContent = "center"
					borderWidth    = {0}
				>
					<Icon
						src    = {bowlingIconAtlas.source}
						uvs    = {bowlingIconAtlas.uv.leave}
						width  = "75%"
						height = "75%"
					/>
				</UiBox>
			</ButtonImage>,
		]
	}
}

export const leaveGameLayer = new LeaveGameLayer()
