import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label } from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, ButtonText, getTheme, Icon, Layer, ZoneType } from '@stom66/dcl-ui-component-kit'

import { SoundManager } from 'src/client/soundManager'


const TOGGLE_SIZE = 90
const ICON_SIZE   = 48


// MARK: MuteToggleLayer
/**
 * Top-right button that mutes and unmutes background music.
 */
export class MuteToggleLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-mute-toggle',
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
		const theme  = getTheme()
		const muted  = SoundManager.isBgmMuted()
		const iconUv = muted
			? atlasIconsFontAwesome.uv.volumeXmark
			: atlasIconsFontAwesome.uv.volumeHigh

		return [
			<ButtonText
				id              = "btn_mute_toggle"
				width           = {TOGGLE_SIZE}
				height          = {TOGGLE_SIZE}
				aspectRatio     = {1}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {2}
				borderRadius    = {16}
				callback        = {() => { SoundManager.toggleBgmMute() }}
				uiTransform     = {{
					positionType: 'relative',
					position    : { top: 0, right: 428 },
					padding     : { top: 8, bottom: 22 },
				}}
			>
				<Icon
					uvs         = {iconUv}
					width       = {ICON_SIZE}
					height      = {ICON_SIZE}
					aspectRatio = {1}
					iconColor   = {theme.colors.primary}
				/>
				<Label
					value     = {muted ? 'Unmute' : 'Mute'}
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

export const muteToggleLayer = new MuteToggleLayer()
