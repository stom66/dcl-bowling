import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label } from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, ButtonText, getTheme, Icon, Layer, ZoneType } from '@stom66/dcl-ui-component-kit'

import { SoundManager } from 'src/client/soundManager'
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

/** TopRight zone default. Kept when this is not a local dev session. */
const RIGHT_INSET_DEFAULT = 8
/** Clears the local preview chrome along the right edge. */
const RIGHT_INSET_LOCAL_DEV = 152


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
			<Label
				value       = {label}
				color       = {Color4.White()}
				textAlign   = "middle-center"
				textWrap    = "nowrap"
				uiTransform = {{
					positionType: 'absolute',
					position    : { left: 0, right: 0, bottom: 2 },
					width       : '100%',
					height      : 22,
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
				() => { SoundManager.toggleBgmMute() },
				<Icon
					uvs         = {muted ? atlasIconsFontAwesome.uv.volumeXmark : atlasIconsFontAwesome.uv.volumeHigh}
					width       = {ICON_SIZE}
					height      = {ICON_SIZE}
					aspectRatio = {1}
					iconColor   = {theme.colors.primary}
				/>,
				0,
			),
			toggleButton(
				'btn_stats_toggle',
				'Stats',
				() => { statsLayer.toggle() },
				<Icon
					uvs         = {atlasIconsFontAwesome.uv.rankingStar}
					width       = {ICON_SIZE}
					height      = {ICON_SIZE}
					aspectRatio = {1}
					iconColor   = {theme.colors.primary}
				/>,
				TOGGLE_GAP,
			),
			toggleButton(
				'btn_leaderboard_toggle',
				'Leaderboard',
				() => { leaderboardLayer.toggle() },
				<Label
					value       = "TOP"
					color       = {theme.colors.primary}
					fontSize    = {22}
					textAlign   = "middle-center"
					textWrap    = "nowrap"
					uiTransform = {{
						width : '100%',
						height: ICON_SIZE,
					}}
				/>,
				TOGGLE_GAP,
			),
			toggleButton(
				'btn_customization_toggle',
				'Customize',
				() => { customizationLayer.toggle() },
				<Icon
					uvs         = {atlasIconsFontAwesome.uv.paintbrush}
					width       = {ICON_SIZE}
					height      = {ICON_SIZE}
					aspectRatio = {1}
					iconColor   = {theme.colors.primary}
				/>,
				TOGGLE_GAP,
			),
		]
	}
}

export const topRightTogglesLayer = new TopRightTogglesLayer()
