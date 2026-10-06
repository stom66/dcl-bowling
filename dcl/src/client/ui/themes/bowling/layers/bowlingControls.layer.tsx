import { Color4 } from '@dcl/sdk/math'
import { isMobile } from '@dcl/sdk/platform'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	atlasIconsFontAwesome,
	ButtonText,
	easingFunctions,
	FlashColor,
	getTheme,
	Icon,
	IconString,
	Layer,
	lighten,
	playOnce,
	PropsController,
	Pulse,
	Spinner,
	tweenValue,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { areLaneBumpersEnabled, toggleLaneBumpers } from 'src/client/bowlingControls'
import { bowlingIconAtlas, bowlingRussoOneAlphaNumericAtlas, bowlingRussoOneSymbolsAtlas } from 'src/client/ui/themes/bowling/atlases'


// Temporary preview: roll HUD visible on load. Turn off before shipping.
const DEBUG_FORCE_SHOW = true

type IndicatorName = 'POSITION' | 'DIRECTION' | 'STRENGTH'

const INDICATOR_OFFSET = {
	POSITION : 2,
	DIRECTION: 299,
	STRENGTH : 590,
}

const FLASH_ID             = 'bowling-click-to-set-flash'
const CLICK_PULSE_ID       = 'bowling-click-to-set-pulse'
const CLICK_ONCE_ID        = 'bowling-click-to-set-pulse-once'
const CLICK_PULSE_DURATION = 0.2
const CLICK_PULSE_BURST    = 2
const CLICK_PULSE_EVERY    = 3
const CLICK_PULSE_GAP      = CLICK_PULSE_EVERY - CLICK_PULSE_BURST * CLICK_PULSE_DURATION
const CLICK_PULSE_SCALE    = 1.4
const CLICK_SPIN_ID        = 'bowling-click-to-set-spin'
const CLICK_SPIN_DURATION  = 6
const SPINNER_BEAMS_SRC    = 'assets/images/ui-component-kit/spinner-beams-even.png'

const CONTROLS_WIDTH       = 960
const CLICK_WIDTH          = 544
const CLICK_HEIGHT         = 107
const CLICK_SIZE           = 228
const CLICK_SPIN_SIZE      = CLICK_SIZE * 2
const CLICK_PULSE_BOX      = CLICK_SIZE * CLICK_PULSE_SCALE
const CLICK_PULSE_MIN      = 1 / CLICK_PULSE_SCALE
const CLICK_PULSE_OFFSET   = (CLICK_SIZE - CLICK_PULSE_BOX) / 2
const CLICK_ONCE_WRAP      = `${CLICK_PULSE_SCALE * 100}%`
const CLICK_ONCE_REST      = `${100 / CLICK_PULSE_SCALE}%`
const CLICK_ONCE_ORIGIN    = `${((1 - CLICK_PULSE_SCALE) / 2) * 100}%`
const CLICK_BORDER         = 4
const CLICK_RADIUS         = 12
const BUMPER_SIZE          = CLICK_HEIGHT
const BUMPER_ICON          = 48
const BUMPER_LABEL_HEIGHT  = 16
const BUMPER_GAP           = 24
const BUMPER_LEFT          = (CONTROLS_WIDTH + CLICK_WIDTH) / 2 + BUMPER_GAP
const BUMPER_TOP           = (CLICK_HEIGHT - BUMPER_SIZE) / 2
const BUMPER_SPIN_ID       = 'bowling-bumper-spin'
const BUMPER_SPIN_DEGREES  = 720
const BUMPER_SPIN_DURATION = 0.5

type BowlingControlsProps = {
	indicatorOffset: number
	positionColor  : Color4
	directionColor : Color4
	strengthColor  : Color4
}

type ClickToSetProps = {
	clickColor: Color4
}


// MARK: tweenColor
/** Lerps a Color4 onto the layer props controller. */
function tweenColor<T extends Record<string, Color4 | number>>(
	props     : PropsController<T>,
	key       : keyof T,
	to        : Color4,
	duration  : number,
	easing     = easingFunctions.easeCirc,
	onComplete?: () => void,
) {
	const from = props.get(key) as Color4
	if (Color4.toHexString(from) === Color4.toHexString(to)) {
		props.set(key, to as T[keyof T])
		onComplete?.()
		return
	}
	tweenValue(
		0,
		1,
		duration,
		(t) => { props.set(key, Color4.lerp(from, to, t) as T[keyof T]) },
		onComplete,
		easing,
	)
}


// MARK: BowlingControlsLayer
/**
 * Bottom-center roll HUD: bumper toggle and the position/direction/strength tab.
 * Click-to-set is a separate bottom-right layer.
 */
export class BowlingControlsLayer extends Layer {
	private controlProps: PropsController<BowlingControlsProps>

	constructor() {
		super({
			id         : 'bowling-controls',
			zone       : ZoneType.BottomCenter,
			canBeHidden: true,
			startHidden: !DEBUG_FORCE_SHOW,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			uiTransform: {
				width : CONTROLS_WIDTH,
				height: 320,
			},
		})

		const theme = getTheme()
		this.controlProps = new PropsController<BowlingControlsProps>({
			indicatorOffset: INDICATOR_OFFSET.POSITION,
			positionColor  : theme.colors.light,
			directionColor : theme.colors.tertiary,
			strengthColor  : theme.colors.tertiary,
		})

		eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
			this.setIndicator('POSITION', true)
			this.show(0.8)
		})
		eventBus.on(ClientEvents.ON_MY_ROLL_REQUEST, () => { if (!DEBUG_FORCE_SHOW) this.hide(0.8) })
		eventBus.on(ClientEvents.ON_MY_ROLL_END,     () => { if (!DEBUG_FORCE_SHOW) this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,  () => { if (!DEBUG_FORCE_SHOW) this.hide(0.8) })
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


	// MARK: bumperButton
	/**
	 * Square toggle in the center HUD. Raises and lowers gutter bumpers.
	 * The icon spins two full turns on each click.
	 */
	private bumperButton() {
		const theme   = getTheme()
		const enabled = areLaneBumpersEnabled()
		const iconUv  = enabled
			? atlasIconsFontAwesome.uv.arrowDown
			: atlasIconsFontAwesome.uv.arrowUp

		return (
			<ButtonText
				id              = "btn_bumper_toggle"
				width           = {BUMPER_SIZE}
				height          = {BUMPER_SIZE}
				aspectRatio     = {1}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {CLICK_BORDER}
				borderRadius    = {CLICK_RADIUS}
				callback        = {() => {
					toggleLaneBumpers()
					playOnce(BUMPER_SPIN_ID)
				}}
				uiTransform     = {{
					positionType: 'absolute',
					position    : { left: BUMPER_LEFT, top: BUMPER_TOP },
					padding     : { top: 8, bottom: 22 },
				}}
			>
				<Spinner
					id        = {BUMPER_SPIN_ID}
					playing   = {false}
					looping   = {false}
					duration  = {BUMPER_SPIN_DURATION}
					degrees   = {BUMPER_SPIN_DEGREES}
					burstCount= {1}
					width     = {BUMPER_ICON}
					height    = {BUMPER_ICON}
				>
					<Icon
						uvs         = {iconUv}
						width       = {BUMPER_ICON}
						height      = {BUMPER_ICON}
						aspectRatio = {1}
						iconColor   = {theme.colors.primary}
					/>
				</Spinner>
				<IconString
					value     = "BUMPERS"
					height    = {BUMPER_LABEL_HEIGHT}
					iconColor = {Color4.White()}
					atlases   = {{
						characters: bowlingRussoOneAlphaNumericAtlas,
						symbols   : bowlingRussoOneSymbolsAtlas,
					}}
					uiTransform={{
						positionType  : 'absolute',
						position      : { left: 0, right: 0, bottom: 6 },
						width         : '100%',
						justifyContent: 'center',
					}}
				/>
			</ButtonText>
		)
	}


	// MARK: body
	protected body() {
		const theme = getTheme()
		const props = this.controlProps

		const indicatorOffset = props.get('indicatorOffset')
		const positionColor   = props.get('positionColor')
		const directionColor  = props.get('directionColor')
		const strengthColor   = props.get('strengthColor')

		return [
			<UiBox
				key            = "bowling-controls-stack"
				width          = {CONTROLS_WIDTH}
				height         = {320}
				alignItems     = "center"
				justifyContent = "flex-end"
				borderWidth    = {0}
				uiTransform    = {{ flexDirection: 'column' }}
			>
				<UiBox
					key         = "bumper_row"
					width       = {CONTROLS_WIDTH}
					height      = {CLICK_HEIGHT}
					borderWidth = {0}
					uiTransform = {{
						positionType: 'absolute',
						position    : { right: 8, bottom: 0 },
					}}
				>
					{this.bumperButton()}
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


// MARK: ClickToSetLayer
/**
 * Square roll-confirm button in the bottom-right corner.
 * Desktop uses the click glyph. Mobile uses the tap glyph.
 * Beams spin behind the button while the layer is on screen.
 */
export class ClickToSetLayer extends Layer {
	private clickProps: PropsController<ClickToSetProps>
	private periodicPulsePaused = false

	constructor() {
		super({
			id         : 'bowling-click-to-set',
			zone       : ZoneType.BottomRight,
			canBeHidden: true,
			startHidden: !DEBUG_FORCE_SHOW,
			showFrom   : 'bottom',
			hideTo     : 'bottom',
			uiTransform: {
				width   : CLICK_SIZE,
				height  : CLICK_SIZE,
				overflow: 'visible',
				margin  : { bottom: 64, right: 64 },
			},
		})

		const theme = getTheme()
		this.clickProps = new PropsController<ClickToSetProps>({
			clickColor: theme.colors.light,
		})

		eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
			this.show(0.8)
			timers.setTimeout(() => {
				this.flashClickToSet()
			}, 1500)
		})
		eventBus.on(ClientEvents.ON_MY_ROLL_REQUEST, () => { if (!DEBUG_FORCE_SHOW) this.hide(0.8) })
		eventBus.on(ClientEvents.ON_MY_ROLL_END,     () => { if (!DEBUG_FORCE_SHOW) this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,  () => { if (!DEBUG_FORCE_SHOW) this.hide(0.8) })
	}


	// MARK: flashClickToSet
	/** Flashes the set label twice. */
	flashClickToSet() {
		playOnce(FLASH_ID)
	}


	// MARK: onClickToSet
	private onClickToSet() {
		console.log('ClickToSetLayer: onClickToSet')
		playOnce(CLICK_ONCE_ID)
		eventBus.emit(ClientEvents.ON_MY_ROLL_CLICK_TO_SET, {})
	}


	// MARK: onClickToSetHover
	/** Pauses the periodic double-pulse and lightens the label. */
	private onClickToSetHover() {
		this.periodicPulsePaused = true
		tweenColor(this.clickProps, 'clickColor', lighten(getTheme().colors.primary, 0.75), 0.1)
	}


	// MARK: onClickToSetLeave
	/** Resumes the periodic double-pulse and restores the label. */
	private onClickToSetLeave() {
		this.periodicPulsePaused = false
		tweenColor(this.clickProps, 'clickColor', getTheme().colors.light, 0.1)
	}


	// MARK: body
	protected body() {
		const theme      = getTheme()
		const props      = this.clickProps
		const clickColor = props.get('clickColor')
		const labelUv    = isMobile()
			? bowlingIconAtlas.uv.tapToSetRound
			: bowlingIconAtlas.uv.clickToSetRound

		return [
			<Spinner
				key            = "click-to-set-beams"
				id             = {CLICK_SPIN_ID}
				playing        = {!this.visibility.isHidden}
				looping        = {true}
				duration       = {CLICK_SPIN_DURATION}
				degrees        = {360}
				burstInterval  = {0}
				width          = {CLICK_SPIN_SIZE}
				height         = {CLICK_SPIN_SIZE}
				pointerFilter  = "none"
				positionType   = "absolute"
				position       = {{
					left: (CLICK_SIZE - CLICK_SPIN_SIZE) / 2,
					top : (CLICK_SIZE - CLICK_SPIN_SIZE) / 2,
				}}
			>
				<Icon
					src       = {SPINNER_BEAMS_SRC}
					width     = {CLICK_SPIN_SIZE}
					height    = {CLICK_SPIN_SIZE}
					iconColor = {theme.colors.primary}
				/>
			</Spinner>,
			<Pulse
				id            = {CLICK_PULSE_ID}
				playing       = {!this.visibility.isHidden && !this.periodicPulsePaused}
				looping       = {true}
				duration      = {CLICK_PULSE_DURATION}
				burstCount    = {CLICK_PULSE_BURST}
				burstInterval = {CLICK_PULSE_GAP}
				burstOffset   = {CLICK_PULSE_GAP}
				scaleMin      = {CLICK_PULSE_MIN}
				scaleMax      = {1}
				uiTransform   = {{
					overflow    : 'visible',
					positionType: 'absolute',
					position    : { left: CLICK_PULSE_OFFSET, top: CLICK_PULSE_OFFSET },
				}}
			>
				<UiBox
					key         = "click-to-set-periodic"
					width       = {CLICK_PULSE_BOX}
					height      = {CLICK_PULSE_BOX}
					borderWidth = {0}
					overflow    = "visible"
				>
					<Pulse
						id          = {CLICK_ONCE_ID}
						playing     = {false}
						looping     = {false}
						duration    = {CLICK_PULSE_DURATION}
						burstCount  = {1}
						scaleMin    = {1}
						scaleMax    = {CLICK_PULSE_SCALE}
						uiTransform = {{
							overflow    : 'visible',
							width       : CLICK_ONCE_WRAP,
							height      : CLICK_ONCE_WRAP,
							positionType: 'absolute',
							position    : { left: CLICK_ONCE_ORIGIN, top: CLICK_ONCE_ORIGIN },
						}}
					>
						<UiBox
							key             = "btn_click_to_set_box"
							width           = {CLICK_ONCE_REST}
							height          = {CLICK_ONCE_REST}
							backgroundColor = {theme.colors.secondary}
							borderColor     = {theme.colors.primary}
							borderWidth     = {CLICK_BORDER}
							borderRadius    = {CLICK_PULSE_BOX}
							overflow        = "hidden"
							justifyContent  = "center"
							alignItems      = "center"
							onMouseDown     = {() => { this.onClickToSet() }}
							onMouseEnter    = {() => { this.onClickToSetHover() }}
							onMouseLeave    = {() => { this.onClickToSetLeave() }}
						>
							<FlashColor
								id             = {FLASH_ID}
								playing        = {false}
								looping        = {false}
								duration       = {0.1}
								burstCount     = {2}
								burstInterval  = {0.3}
								flashColor     = {theme.colors.primary}
								easingFunction = {easingFunctions.easeBounce}
								width          = "90%"
								height         = "90%"
							>
								<Icon
									src       = {bowlingIconAtlas.source}
									uvs       = {labelUv}
									width     = "100%"
									height    = "100%"
									iconColor = {clickColor}
								/>
							</FlashColor>
						</UiBox>
					</Pulse>
				</UiBox>
			</Pulse>,
		]
	}
}

export const clickToSetLayer = new ClickToSetLayer()


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
