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


const BAR_HEIGHT_VH     = 17.5
const OFFSET_VISIBLE_VH = BAR_HEIGHT_VH * -0.25
const OFFSET_HIDDEN_VH  = BAR_HEIGHT_VH * -1


type LetterboxProps = {
	topOffset   : number
	bottomOffset: number
}


// MARK: LetterboxLayer
/**
 * Full-screen cinematic bars that slide in during group roll playback.
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
	}


	// MARK: showBars
	/** Tweens both letterbox bars on-screen. */
	showBars() {
		this.tweenOffset(OFFSET_VISIBLE_VH)
	}


	// MARK: hideBars
	/** Tweens both letterbox bars off-screen. */
	hideBars() {
		this.tweenOffset(OFFSET_HIDDEN_VH)
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
