import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label } from '@dcl/sdk/react-ecs'
import { ButtonText, getTheme, Layer, ZoneType } from '@stom66/dcl-ui-component-kit'

import { leaderboardLayer } from 'src/client/ui/themes/bowling/layers/leaderboard.layer'


const TOGGLE_SIZE = 90
const ICON_SIZE   = 48


// MARK: LeaderboardToggleLayer
/**
 * Top-right button that toggles the records window.
 */
export class LeaderboardToggleLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-leaderboard-toggle',
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
				id              = "btn_leaderboard_toggle"
				width           = {TOGGLE_SIZE}
				height          = {TOGGLE_SIZE}
				aspectRatio     = {1}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {2}
				borderRadius    = {16}
				callback        = {() => { leaderboardLayer.toggle() }}
				uiTransform     = {{
					positionType: 'relative',
					position    : { top: 0, right: 228 },
					padding     : { top: 8, bottom: 22 },
				}}
			>
				<Label
					value     = "TOP"
					color     = {theme.colors.primary}
					fontSize  = {22}
					textAlign = "middle-center"
					textWrap  = "nowrap"
					uiTransform={{
						width : '100%',
						height: ICON_SIZE,
					}}
				/>
				<Label
					value     = "Leaderboard"
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

export const leaderboardToggleLayer = new LeaderboardToggleLayer()
