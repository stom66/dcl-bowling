import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	easingFunctions,
	Layer,
	PropsController,
	tweenValue,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { gameStatusLayer } from 'src/client/ui/themes/bowling/layers/gameStatus.layer'
import { playtestDebugLayer } from 'src/client/ui/themes/bowling/layers/playtestDebug.layer'
import { ticketBalanceLayer } from 'src/client/ui/themes/bowling/layers/ticketBalance.layer'
import { topRightTogglesLayer } from 'src/client/ui/themes/bowling/layers/topRightToggles.layer'


const BAR_HEIGHT_VH     = 17.5
const OFFSET_VISIBLE_VH = BAR_HEIGHT_VH * -0.25
const OFFSET_HIDDEN_VH  = BAR_HEIGHT_VH * -1

/** Slide time for the top HUD, matching the letterbox tween. */
export const LETTERBOX_HUD_DURATION = 0.8

let barsVisible = false

const shownListeners : Array<() => void> = []
const hiddenListeners: Array<() => void> = []


// MARK: onLetterboxShown
/**
 * Runs once when the cinematic bars begin sliding in.
 * Leave-game uses this because its own in-game visibility must win on the way back.
 */
export function onLetterboxShown(listener: () => void) {
	shownListeners.push(listener)
}


// MARK: onLetterboxHidden
/**
 * Runs once when the cinematic bars begin sliding out.
 */
export function onLetterboxHidden(listener: () => void) {
	hiddenListeners.push(listener)
}


type LetterboxProps = {
	topOffset   : number
	bottomOffset: number
}


// MARK: LetterboxLayer
/**
 * Full-screen cinematic bars that slide in during group roll playback.
 * The top HUD (status, toolbar, tickets, playtest, and Bowl-o-tron) hides
 * with the bars and returns when they leave. Leave-game listens separately.
 */
export class LetterboxLayer extends Layer {
	private barProps: PropsController<LetterboxProps>

	constructor() {
		super({
			id         : 'bowling-letterbox',
			zone       : ZoneType.FullScreen,
			canBeHidden: false,
			zIndex     : 1500,
			uiTransform: {
				flexDirection : 'column',
				justifyContent: 'space-between',
				alignItems    : 'stretch',
				borderWidth   : 0,
				pointerFilter : 'none',
			},
		})

		this.barProps = new PropsController<LetterboxProps>({
			topOffset   : OFFSET_HIDDEN_VH,
			bottomOffset: OFFSET_HIDDEN_VH,
		})

		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_START, () => { this.showBars() })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_PLAYBACK_END,   () => { this.hideBars() })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,            () => { this.hideBars() })
		eventBus.on(ClientEvents.ON_GROUP_ROLL_END,            () => { this.hideBars() })
		eventBus.on(ClientEvents.ON_GROUP_FRAME_END,           () => { this.hideBars() })
		eventBus.on(ClientEvents.ON_MY_FRAME_END,              () => { this.hideBars() })
		eventBus.on(ClientEvents.ON_MY_ROLL_END,               () => { this.hideBars() })
		eventBus.on(ClientEvents.REQUEST_LEAVE_GAME,           () => { this.hideBars() })
	}


	// MARK: showBars
	/** Tweens both letterbox bars on-screen and slides the top HUD away. */
	showBars() {
		this.tweenOffset(OFFSET_VISIBLE_VH)
		if (barsVisible) return

		barsVisible = true
		this.suppressTopHud()
		for (const listener of shownListeners) listener()
	}


	// MARK: hideBars
	/** Tweens both letterbox bars off-screen and brings the top HUD back. */
	hideBars() {
		this.tweenOffset(OFFSET_HIDDEN_VH)
		if (!barsVisible) return

		barsVisible = false
		this.restoreTopHud()
		for (const listener of hiddenListeners) listener()
	}


	// MARK: suppressTopHud
	/** Slides the always-on top HUD off with the bars. */
	private suppressTopHud() {
		gameStatusLayer.hide(LETTERBOX_HUD_DURATION)
		topRightTogglesLayer.hide(LETTERBOX_HUD_DURATION)
		ticketBalanceLayer.hide(LETTERBOX_HUD_DURATION)
		playtestDebugLayer.hide(LETTERBOX_HUD_DURATION)
	}


	// MARK: restoreTopHud
	/** Slides the always-on top HUD back in with the bars. */
	private restoreTopHud() {
		gameStatusLayer.show(LETTERBOX_HUD_DURATION)
		topRightTogglesLayer.show(LETTERBOX_HUD_DURATION)
		ticketBalanceLayer.show(LETTERBOX_HUD_DURATION)
		playtestDebugLayer.show(LETTERBOX_HUD_DURATION)
	}


	// MARK: tweenOffset
	private tweenOffset(to: number) {
		const topFrom    = this.barProps.get('topOffset')
		const bottomFrom = this.barProps.get('bottomOffset')
		tweenValue(
			topFrom,
			to,
			0.8,
			(value) => { this.barProps.set('topOffset', value) },
			undefined,
			easingFunctions.easeOutBack,
		)
		tweenValue(
			bottomFrom,
			to,
			0.8,
			(value) => { this.barProps.set('bottomOffset', value) },
			undefined,
			easingFunctions.easeOutBack,
		)
	}


	// MARK: body
	protected body() {
		const topOffset    = this.barProps.get('topOffset')
		const bottomOffset = this.barProps.get('bottomOffset')

		return [
			<UiBox
				key             = "letterbox-top"
				width           = "100%"
				height          = {`${BAR_HEIGHT_VH}vh`}
				backgroundColor = {Color4.Black()}
				borderWidth     = {0}
				uiTransform     = {{
					positionType: 'relative',
					position    : { top: `${topOffset}vh` },
				}}
			/>,
			<UiBox
				key             = "letterbox-bottom"
				width           = "100%"
				height          = {`${BAR_HEIGHT_VH}vh`}
				backgroundColor = {Color4.Black()}
				borderWidth     = {0}
				uiTransform     = {{
					positionType: 'relative',
					position    : { bottom: `${bottomOffset}vh` },
				}}
			/>,
		]
	}
}

export const letterboxLayer = new LetterboxLayer()
