import { Color4 } from '@dcl/sdk/math'
import { isDesktop } from '@dcl/sdk/platform'
import ReactEcs from '@dcl/sdk/react-ecs'
import { alpha, atlasIconsFontAwesome, ButtonText, getTheme, Icon, Layer, playOnce, Pulse, Spinner, Text, ZoneType } from '@stom66/dcl-ui-component-kit'

import { SoundManager } from 'src/client/soundManager'
import { customizationLayer } from 'src/client/ui/themes/bowling/layers/customization.layer'
import { debugLayer } from 'src/client/ui/themes/bowling/layers/debug.layer'
import { statsLayer } from 'src/client/ui/themes/bowling/layers/stats.layer'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'


declare var process: {
	env: {
		NODE_ENV: string
	}
}

const IS_DEV = process.env.NODE_ENV === 'development'

export const TOGGLE_BUTTONS_SIZE = 90
export const TOGGLE_GAP          = 8
const ICON_SIZE                  = 48
const TOGGLE_LABEL_MAX_FONT      = 14
const TOGGLE_LABEL_MIN_FONT      = 7
const TOGGLE_LABEL_PAD_X         = 10
/**
 * Approx advance width for Russo One as a fraction of em, with headroom so
 * theme font scaling does not push long labels past the button edge.
 */
const RUSSO_CHAR_EM              = 0.82
const MUTE_SPIN_ID               = 'bowling-mute-spin'
const MUTE_SPIN_DEGREES          = 360
const MUTE_SPIN_DURATION         = 0.15
const TOGGLE_PULSE_DURATION      = 0.2
const TOGGLE_PULSE_SCALE         = 1.4
const DEBUG_PULSE_ID             = 'bowling-debug-pulse'
const STATS_PULSE_ID             = 'bowling-stats-pulse'
const CUSTOMIZE_PULSE_ID         = 'bowling-customize-pulse'

/** TopRight zone default. Kept when this is not a local dev session. */
const RIGHT_INSET_DEFAULT = 8
/** Clears the local preview chrome along the right edge. */
const RIGHT_INSET_LOCAL_DEV = 152

const exclusivePanels: Layer[] = [
	statsLayer,
	customizationLayer,
]


// MARK: toggleExclusivePanel
/**
 * Opens one center panel and closes the other.
 * Clicking the panel that is already open closes it.
 */
function toggleExclusivePanel(target: Layer) {
	const opening = target.visibility.isHidden

	for (const layer of exclusivePanels) {
		if (layer === target) continue
		if (layer.visibility.isHidden) continue
		layer.hide()
	}

	if (opening) target.show()
	else         target.hide()
}


// MARK: pulseGlyph
/**
 * One-shot grow-and-shrink around a single glyph. Resting scale stays at 1.
 */
function pulseGlyph(
	id   : string,
	glyph: ReactEcs.JSX.Element,
) {
	return (
		<Pulse
			id         = {id}
			playing    = {false}
			looping    = {false}
			duration   = {TOGGLE_PULSE_DURATION}
			burstCount = {1}
			scaleMin   = {1}
			scaleMax   = {TOGGLE_PULSE_SCALE}
		>
			{glyph}
		</Pulse>
	)
}


// MARK: fitToggleLabelFontSize
/**
 * Picks a theme-base font size so `label` fits inside `maxWidth` under Russo One.
 */
function fitToggleLabelFontSize(
	label   : string,
	maxWidth: number,
): number {
	if (label.length === 0) return TOGGLE_LABEL_MAX_FONT

	const fitted = Math.floor(maxWidth / (label.length * RUSSO_CHAR_EM)) - 1
	return Math.max(TOGGLE_LABEL_MIN_FONT, Math.min(TOGGLE_LABEL_MAX_FONT, fitted))
}


// MARK: toggleButton
/**
 * Square HUD toggle. `gapLeft` is the space before this button in the row.
 * Label font size shrinks to fit the button width.
 */
function toggleButton(
	id     : string,
	label  : string,
	onClick: () => void,
	icon   : ReactEcs.JSX.Element,
	gapLeft: number,
) {
	const theme      = getTheme()
	const labelWidth = TOGGLE_BUTTONS_SIZE - TOGGLE_LABEL_PAD_X * 2
	const fontSize   = fitToggleLabelFontSize(label, labelWidth)

	return (
		<ButtonText
			id              = {id}
			width           = {TOGGLE_BUTTONS_SIZE}
			height          = {TOGGLE_BUTTONS_SIZE}
			aspectRatio     = {1}
			backgroundColor = {alpha(theme.colors.secondary, 0.9)}
			borderColor     = {theme.colors.primary}
			borderWidth     = {2}
			borderRadius    = {16}
			callback        = {onClick}
			uiTransform     = {{
				padding: { top: 8, bottom: 22 },
				margin : { left: gapLeft },
			}}
		>
			{icon}
			<Text
				value     = {label}
				fontSize  = {fontSize}
				fontColor = {Color4.White()}
				textAlign = "middle-center"
				textWrap  = "nowrap"
				width     = {labelWidth}
				height    = {fontSize + 4}
				uiTransform = {{
					positionType: 'absolute',
					position    : { left: TOGGLE_LABEL_PAD_X, bottom: 4 },
				}}
			/>
		</ButtonText>
	)
}


// MARK: TopRightTogglesLayer
/**
 * Mute, stats, and customize, in one top-right row.
 * In local debug the leftmost button toggles the left-top debug panel.
 * The zone lays the buttons out; local dev insets the row 152px from
 * the right, otherwise the zone default of 8px is used.
 */
export class TopRightTogglesLayer extends Layer {
	private rewardHidden = false

	constructor() {
		super({
			id         : 'bowling-top-right-toggles',
			zone       : ZoneType.TopRight,
			canBeHidden: true,
			startHidden: true,
			zIndex     : 600,
			uiTransform: {
				width   : 'auto',
				height  : 'auto',
				position: {
					top  : 8,
					right: (IS_DEV && isDesktop()) ? RIGHT_INSET_LOCAL_DEV : RIGHT_INSET_DEFAULT,
				},
			},
		})

		eventBus.on(ClientEvents.ON_LOAD_FLY_IN_END, () => {
			if (this.rewardHidden) return
			this.show()
		})
		eventBus.on(ClientEvents.ON_REWARD_OPEN, () => {
			this.rewardHidden = true
			this.hide()
		})
		eventBus.on(ClientEvents.ON_REWARD_CLOSE, () => {
			this.rewardHidden = false
			this.show()
		})
	}


	// MARK: body
	protected body() {
		const theme = getTheme()
		const muted = SoundManager.isBgmMuted()

		return [
			...(IS_DEV ? [
				toggleButton(
					'btn_debug_toggle',
					'Debug',
					() => {
						debugLayer.toggle()
						playOnce(DEBUG_PULSE_ID)
					},
					pulseGlyph(
						DEBUG_PULSE_ID,
						<Icon
							uvs         = {atlasIconsFontAwesome.uv.bug}
							width       = {ICON_SIZE}
							height      = {ICON_SIZE}
							aspectRatio = {1}
							iconColor   = {theme.colors.primary}
						/>,
					),
					0,
				),
			] : []),
			toggleButton(
				'btn_mute_toggle',
				muted ? 'Unmute' : 'Mute',
				() => {
					SoundManager.toggleBgmMute()
					playOnce(MUTE_SPIN_ID)
				},
				<Spinner
					id         = {MUTE_SPIN_ID}
					playing    = {false}
					looping    = {false}
					duration   = {MUTE_SPIN_DURATION}
					degrees    = {MUTE_SPIN_DEGREES}
					burstCount = {1}
					width      = {ICON_SIZE}
					height     = {ICON_SIZE}
				>
					<Icon
						uvs         = {muted ? atlasIconsFontAwesome.uv.volumeXmark : atlasIconsFontAwesome.uv.volumeHigh}
						width       = {ICON_SIZE}
						height      = {ICON_SIZE}
						aspectRatio = {1}
						iconColor   = {theme.colors.primary}
					/>
				</Spinner>,
				IS_DEV ? TOGGLE_GAP : 0,
			),
			toggleButton(
				'btn_stats_toggle',
				'Stats',
				() => {
					toggleExclusivePanel(statsLayer)
					playOnce(STATS_PULSE_ID)
				},
				pulseGlyph(
					STATS_PULSE_ID,
					<Icon
						uvs         = {atlasIconsFontAwesome.uv.rankingStar}
						width       = {ICON_SIZE}
						height      = {ICON_SIZE}
						aspectRatio = {1}
						iconColor   = {theme.colors.primary}
					/>,
				),
				TOGGLE_GAP,
			),
			toggleButton(
				'btn_customization_toggle',
				'Customise',
				() => {
					toggleExclusivePanel(customizationLayer)
					playOnce(CUSTOMIZE_PULSE_ID)
				},
				pulseGlyph(
					CUSTOMIZE_PULSE_ID,
					<Icon
						uvs         = {atlasIconsFontAwesome.uv.paintbrush}
						width       = {ICON_SIZE}
						height      = {ICON_SIZE}
						aspectRatio = {1}
						iconColor   = {theme.colors.primary}
					/>,
				),
				TOGGLE_GAP,
			),
		]
	}
}

export const topRightTogglesLayer = new TopRightTogglesLayer()
