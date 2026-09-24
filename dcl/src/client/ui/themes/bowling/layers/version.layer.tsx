import ReactEcs from '@dcl/sdk/react-ecs'
import {
	alpha,
	getTheme,
	Layer,
	Text,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'

import { VERSION } from 'src/shared/data/version'


// MARK: VersionLayer
/**
 * Always-on build version badge. FullScreen with absolute bottom-right
 * placement and the highest z-index so it stays above every other layer.
 */
export class VersionLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-version',
			zone       : ZoneType.FullScreen,
			canBeHidden: false,
			zIndex     : 9999,
		})
	}


	// MARK: body
	protected body() {
		const theme = getTheme()

		return [
			<UiBox
				key             = "version-badge"
				width           = "auto"
				height          = {18}
				borderRadius    = {6}
				borderWidth     = {0}
				padding         = {{ top: 4, right: 4, bottom: 8, left: 4 }}
				backgroundColor = {alpha(theme.colors.dark, 0.4)}
				alignItems      = "center"
				justifyContent  = "center"
				uiTransform     = {{
					positionType: 'absolute',
					position    : { right: 3, bottom: 3 },
				}}
			>
				<Text
					key       = "version-label"
					value     = {VERSION}
					fontSize  = {5}
					fontColor = {alpha(theme.colors.light, 0.3)}
					textAlign = "middle-center"
					textWrap  = "nowrap"
					margin    = {{ bottom: 2 }}
				/>
			</UiBox>,
		]
	}
}

export const versionLayer = new VersionLayer()
