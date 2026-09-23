import { Color4 } from '@dcl/sdk/math'
import ReactEcs, { Label } from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, ButtonText, getTheme, Icon, Layer, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'

import { areLaneBumpersEnabled, toggleLaneBumpers } from 'src/client/bowlingControls'


const TOGGLE_SIZE = 90
const ICON_SIZE   = 48


// MARK: BumperToggleLayer
/**
 * Right-edge button that raises and lowers gutter bumpers during the local roll.
 */
export class BumperToggleLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-bumper-toggle',
			zone       : ZoneType.Right,
			canBeHidden: true,
			startHidden: true,
			showFrom   : 'right',
			hideTo     : 'right',
			zIndex     : 600,
			uiTransform: {
				width : TOGGLE_SIZE,
				height: TOGGLE_SIZE,
			},
		})

		eventBus.on(ClientEvents.ON_MY_ROLL_START,   () => { this.show(0.8) })
		eventBus.on(ClientEvents.ON_MY_ROLL_REQUEST, () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_MY_ROLL_END,     () => { this.hide(0.8) })
		eventBus.on(ClientEvents.ON_GROUP_GAME_END,  () => { this.hide(0.8) })
	}



	// MARK: body
	protected body() {
		const theme   = getTheme()
		const enabled = areLaneBumpersEnabled()
		const iconUv  = enabled
			? atlasIconsFontAwesome.uv.bars
			: atlasIconsFontAwesome.uv.ban

		return [
			<ButtonText
				id              = "btn_bumper_toggle"
				width           = {TOGGLE_SIZE}
				height          = {TOGGLE_SIZE}
				aspectRatio     = {1}
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {2}
				borderRadius    = {16}
				callback        = {() => { toggleLaneBumpers() }}
				uiTransform     = {{
					padding: { top: 8, bottom: 22 },
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
					value     = {enabled ? 'Bumpers' : 'Off'}
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

export const bumperToggleLayer = new BumperToggleLayer()
