import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	easingFunctions,
	FlashColor,
	getTheme,
	Icon,
	Layer,
	lighten,
	playOnce,
	PropsController,
	tweenValue,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { bowlingIconAtlas } from 'src/client/ui/themes/bowling/atlases'


type IndicatorName = 'POSITION' | 'DIRECTION' | 'STRENGTH'

const INDICATOR_OFFSET = {
	POSITION : 2,
	DIRECTION: 299,
	STRENGTH : 590,
}

const FLASH_ID = 'bowling-click-to-set-flash'

type BowlingControlsProps = {
	indicatorOffset : number
	positionColor   : Color4
	directionColor  : Color4
	strengthColor   : Color4
	clickColor      : Color4
	clickBorderColor: Color4
}


// MARK: tweenColor
/** Lerps a Color4 onto the layer props controller. */
function tweenColor(
	props : PropsController<BowlingControlsProps>,
	key   : keyof BowlingControlsProps,
	to    : Color4,
	duration: number,
	easing  = easingFunctions.easeCirc,
	onComplete?: () => void,
) {
	const from = props.get(key) as Color4
	if (Color4.toHexString(from) === Color4.toHexString(to)) {
		props.set(key, to)
		onComplete?.()
		return
	}
	tweenValue(
		0,
		1,
		duration,
		(t) => { props.set(key, Color4.lerp(from, to, t)) },
		onComplete,
		easing,
	)
}


// MARK: BowlingControlsLayer
/**
 * Bottom-center roll input HUD: click-to-set plus the position/direction/strength tab.
 */
export class BowlingControlsLayer extends Layer {
	private controlProps: PropsController<BowlingControlsProps>

	constructor() {
		super({
			id         : 'bowling-controls',
			zone       : ZoneType.BottomCenter,
			canBeHidden: true,
			startHidden: true,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			uiTransform: {
				width : 960,
				height: 320,
			},
		})

		const theme = getTheme()
		this.controlProps = new PropsController<BowlingControlsProps>({
			indicatorOffset : INDICATOR_OFFSET.POSITION,
			positionColor   : theme.colors.light,
			directionColor  : theme.colors.tertiary,
			strengthColor   : theme.colors.tertiary,
			clickColor      : theme.colors.light,
			clickBorderColor: theme.colors.primary,
		})

		eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
			this.setIndicator('POSITION', true)
			this.show(0.8)
			timers.setTimeout(() => {
				this.flashClickToSet()
			}, 1500)
		})
		eventBus.on(ClientEvents.ON_MY_ROLL_REQUEST, () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_MY_ROLL_END,     () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,  () => { this.hide(0.8) })
	}


	// MARK: setIndicator
	/**
	 * Moves the orange tab and tints the matching label.
	 */
	setIndicator(
		name      : IndicatorName,
		skipTweens: boolean = false,
	) {
		console.log('BowlingControlsLayer: setIndicator: name', name)
		const theme = getTheme()
		const props = this.controlProps

		if (skipTweens) {
			props.update({
				indicatorOffset: INDICATOR_OFFSET[name],
				positionColor  : name === 'POSITION'  ? theme.colors.light : theme.colors.tertiary,
				directionColor : name === 'DIRECTION' ? theme.colors.light : theme.colors.tertiary,
				strengthColor  : name === 'STRENGTH'  ? theme.colors.light : theme.colors.tertiary,
			})
			return
		}

		const easing = name === 'DIRECTION' ? easingFunctions.easeOutBack : easingFunctions.easeOutBounce
		tweenValue(
			props.get('indicatorOffset'),
			INDICATOR_OFFSET[name],
			0.35,
			(value) => { props.set('indicatorOffset', value) },
			undefined,
			easing,
		)
		tweenColor(props, 'positionColor',  name === 'POSITION'  ? theme.colors.light : theme.colors.tertiary, 0.25)
		tweenColor(props, 'directionColor', name === 'DIRECTION' ? theme.colors.light : theme.colors.tertiary, 0.25)
		tweenColor(props, 'strengthColor',  name === 'STRENGTH'  ? theme.colors.light : theme.colors.tertiary, 0.25)
	}


	// MARK: flashClickToSet
	/** Flashes the click-to-set label twice. */
	flashClickToSet() {
		playOnce(FLASH_ID)
	}


	// MARK: onClickToSet
	private onClickToSet() {
		console.log('BowlingControlsLayer: onClickToSet')
		eventBus.emit(ClientEvents.ON_MY_ROLL_CLICK_TO_SET, {})
	}


	// MARK: body
	protected body() {
		const theme = getTheme()
		const props = this.controlProps

		const indicatorOffset  = props.get('indicatorOffset')
		const positionColor    = props.get('positionColor')
		const directionColor   = props.get('directionColor')
		const strengthColor    = props.get('strengthColor')
		const clickColor       = props.get('clickColor')
		const clickBorderColor = props.get('clickBorderColor')

		return [
			<UiBox
				key            = "bowling-controls-stack"
				width          = {960}
				height         = {320}
				alignItems     = "center"
				justifyContent = "flex-end"
				borderWidth    = {0}
				uiTransform    = {{ flexDirection: 'column' }}
			>
				<UiBox
					key             = "btn_click_to_set_box"
					width           = {544}
					height          = {107}
					borderColor     = {clickBorderColor}
					borderWidth     = {4}
					borderRadius    = {12}
					backgroundColor = {theme.colors.secondary}
					justifyContent  = "center"
					alignItems      = "center"
					onMouseDown     = {() => { this.onClickToSet() }}
					onMouseEnter    = {() => {
						tweenColor(props, 'clickColor',       lighten(theme.colors.primary, 0.75), 0.1)
						tweenColor(props, 'clickBorderColor', lighten(theme.colors.success, 0.01), 0.1)
					}}
					onMouseLeave    = {() => {
						tweenColor(props, 'clickColor',       theme.colors.light,   0.1)
						tweenColor(props, 'clickBorderColor', theme.colors.primary, 0.1)
					}}
				>
					<FlashColor
						id            = {FLASH_ID}
						playing       = {false}
						looping       = {false}
						duration      = {0.1}
						burstCount    = {2}
						burstInterval = {0.3}
						flashColor    = {theme.colors.primary}
						easingFunction= {easingFunctions.easeBounce}
						width         = {512}
						height        = {64}
					>
						<Icon
							src       = {bowlingIconAtlas.source}
							uvs       = {bowlingIconAtlas.uv.clickToSet}
							width     = {512}
							height    = {64}
							iconColor = {clickColor}
						/>
					</FlashColor>
				</UiBox>

				<UiBox
					key             = "indicator_box"
					width           = {900}
					height          = {78}
					borderColor     = {theme.colors.primary}
					borderWidth     = {4}
					borderRadius    = {12}
					backgroundColor = {theme.colors.secondary}
					justifyContent  = "center"
					alignItems      = "center"
					margin          = {{ top: 24, bottom: 32 }}
				>
					<UiBox
						key             = "indicator_tab"
						width           = {300}
						height          = {66}
						borderRadius    = {8}
						backgroundColor = {theme.colors.primary}
						uiTransform     = {{
							positionType: 'absolute',
							position    : { left: indicatorOffset, top: 2 },
						}}
					/>
					<UiBox
						key            = "indicator_labels"
						width          = {900}
						height         = {78}
						justifyContent = "space-between"
						alignItems     = "center"
						padding        = {{ left: 24, right: 24 }}
						borderWidth    = {0}
						uiTransform    = {{ flexDirection: 'row' }}
					>
						<Icon
							src       = {bowlingIconAtlas.source}
							uvs       = {bowlingIconAtlas.uv.position}
							width     = {256}
							height    = {64}
							iconColor = {positionColor}
						/>
						<Icon
							src       = {bowlingIconAtlas.source}
							uvs       = {bowlingIconAtlas.uv.direction}
							width     = {256}
							height    = {64}
							iconColor = {directionColor}
						/>
						<Icon
							src       = {bowlingIconAtlas.source}
							uvs       = {bowlingIconAtlas.uv.strength}
							width     = {256}
							height    = {64}
							iconColor = {strengthColor}
						/>
					</UiBox>
				</UiBox>
			</UiBox>,
		]
	}
}

export const bowlingControlsLayer = new BowlingControlsLayer()


// MARK: SetIndicator
/**
 * Moves the bowling-controls indicator tab. Used by the 3D roll-input flow.
 */
export function SetIndicator(
	name      : IndicatorName,
	skipTweens: boolean = false,
) {
	bowlingControlsLayer.setIndicator(name, skipTweens)
}
