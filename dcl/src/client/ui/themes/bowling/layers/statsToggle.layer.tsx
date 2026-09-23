import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label } from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, ButtonText, getTheme, Icon, Layer, ZoneType } from '@stom66/dcl-ui-component-kit'

import { statsLayer } from 'src/client/ui/themes/bowling/layers/stats.layer'


const TOGGLE_SIZE = 90
const ICON_SIZE   = 48


// MARK: StatsToggleLayer
/**
 * Top-right button that toggles the local player's stats window.
 */
export class StatsToggleLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-stats-toggle',
			zone       : ZoneType.TopRight,
			canBeHidden: false,
			zIndex     : 600,
			uiTransform: {
				width : TOGGLE_SIZE,
				height: TOGGLE_SIZE,
			},
		})
	}


	// MARK: body
	protected body() {
		const theme = getTheme()

		return [
			<ButtonText
				id              = "btn_stats_toggle"
				width           = {TOGGLE_SIZE}
				height          = {TOGGLE_SIZE}
				aspectRatio     = {1}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {2}
				borderRadius    = {16}
				callback        = {() => { statsLayer.toggle() }}
				uiTransform     = {{
					positionType: 'relative',
					position    : { top: 0, right: 328 },
					padding     : { top: 8, bottom: 22 },
				}}
			>
				<Icon
					uvs         = {atlasIconsFontAwesome.uv.rankingStar}
					width       = {ICON_SIZE}
					height      = {ICON_SIZE}
					aspectRatio = {1}
					iconColor   = {theme.colors.primary}
				/>
				<Label
					value     = "Stats"
					color     = {Color4.White()}
					textAlign = "middle-center"
					textWrap  = "nowrap"
					uiTransform={{
						positionType: 'absolute',
						position    : { left: 0, right: 0, bottom: 2 },
						width       : '100%',
						height      : 22,
					}}
				/>
			</ButtonText>,
		]
	}
}

export const statsToggleLayer = new StatsToggleLayer()
