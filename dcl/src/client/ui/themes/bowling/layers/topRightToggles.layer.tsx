import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label } from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, ButtonText, getTheme, Icon, IconString, Layer, playOnce, Pulse, Spinner, ZoneType } from '@stom66/dcl-ui-component-kit'

import { SoundManager } from 'src/client/soundManager'
import { bowlingRussoOneAlphaNumericAtlas, bowlingRussoOneSymbolsAtlas } from 'src/client/ui/themes/bowling/atlases'
import { customizationLayer } from 'src/client/ui/themes/bowling/layers/customization.layer'
import { leaderboardLayer } from 'src/client/ui/themes/bowling/layers/leaderboard.layer'
import { statsLayer } from 'src/client/ui/themes/bowling/layers/stats.layer'


declare var process: {
	env: {
		NODE_ENV: string
	}
}

const IS_DEV = process.env.NODE_ENV === 'development'

export const TOGGLE_BUTTONS_SIZE = 90
export const TOGGLE_GAP          = 8
const ICON_SIZE                  = 48
const TOP_MARK_FONT              = 22
const TOGGLE_LABEL_HEIGHT        = 14
const TOGGLE_LABEL_WIDTH         = 80
const MUTE_SPIN_ID               = 'bowling-mute-spin'
const MUTE_SPIN_DEGREES          = 360
const MUTE_SPIN_DURATION         = 0.15
const TOGGLE_PULSE_DURATION      = 0.2
const TOGGLE_PULSE_SCALE         = 1.4
const STATS_PULSE_ID             = 'bowling-stats-pulse'
const LEADERBOARD_PULSE_ID       = 'bowling-leaderboard-pulse'
const CUSTOMIZE_PULSE_ID         = 'bowling-customize-pulse'

const toggleLabelAtlases = {
	characters: bowlingRussoOneAlphaNumericAtlas,
	symbols   : bowlingRussoOneSymbolsAtlas,
}

/** TopRight zone default. Kept when this is not a local dev session. */
const RIGHT_INSET_DEFAULT = 8
/** Clears the local preview chrome along the right edge. */
const RIGHT_INSET_LOCAL_DEV = 152

const exclusivePanels: Layer[] = [
	statsLayer,
	leaderboardLayer,
	customizationLayer,
]


// MARK: toggleExclusivePanel
/**
 * Opens one center panel and closes the other two.
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


// MARK: TopMark
/**
 * "TOP" stand-in on the leaderboard toggle. Font size follows `height`
 * so a pulse scales the letters, not just the text box.
 */
function TopMark({
	width  = ICON_SIZE,
	height = ICON_SIZE,
	color,
}: {
	width? : number
	height?: number
	color  : Color4
}) {
	const fontSize = Math.max(1, Math.round(TOP_MARK_FONT * (height / ICON_SIZE)))

	return (
		<Label
			value       = "TOP"
			color       = {color}
			fontSize    = {fontSize}
			textAlign   = "middle-center"
			textWrap    = "nowrap"
			uiTransform = {{
				width,
				height,
			}}
		/>
	)
}


// MARK: toggleButton
/**
 * Square HUD toggle. `gapLeft` is the space before this button in the row.
 */
function toggleButton(
	id     : string,
	label  : string,
	onClick: () => void,
	icon   : ReactEcs.JSX.Element,
	gapLeft: number,
) {
	const theme = getTheme()

	return (
		<ButtonText
			id              = {id}
			width           = {TOGGLE_BUTTONS_SIZE}
			height          = {TOGGLE_BUTTONS_SIZE}
			aspectRatio     = {1}
			backgroundColor = {theme.colors.secondary}
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
			<IconString
				value       = {label}
				width       = {TOGGLE_LABEL_WIDTH}
				height      = {TOGGLE_LABEL_HEIGHT}
				iconColor   = {Color4.White()}
				atlases     = {toggleLabelAtlases}
				uiTransform = {{
					positionType  : 'absolute',
					position      : { left: 0, right: 0, bottom: 4 },
					width         : '100%',
					justifyContent: 'center',
				}}
			/>
		</ButtonText>
	)
}


// MARK: TopRightTogglesLayer
/**
 * Mute, stats, leaderboard, and customize, in one top-right row.
 * The zone lays the buttons out; local dev insets the row 152px from
 * the right, otherwise the zone default of 8px is used.
 */
export class TopRightTogglesLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-top-right-toggles',
			zone       : ZoneType.TopRight,
			canBeHidden: false,
			zIndex     : 600,
			uiTransform: {
				width   : 'auto',
				height  : 'auto',
				position: {
					top  : 8,
					right: IS_DEV ? RIGHT_INSET_LOCAL_DEV : RIGHT_INSET_DEFAULT,
				},
			},
		})
	}


	// MARK: body
	protected body() {
		const theme = getTheme()
		const muted = SoundManager.isBgmMuted()

		return [
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
				0,
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
				'btn_leaderboard_toggle',
				'Leaderboard',
				() => {
					toggleExclusivePanel(leaderboardLayer)
					playOnce(LEADERBOARD_PULSE_ID)
				},
				pulseGlyph(
					LEADERBOARD_PULSE_ID,
					<TopMark
						width  = {ICON_SIZE}
						height = {ICON_SIZE}
						color  = {theme.colors.primary}
					/>,
				),
				TOGGLE_GAP,
			),
			toggleButton(
				'btn_customization_toggle',
				'Customize',
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
