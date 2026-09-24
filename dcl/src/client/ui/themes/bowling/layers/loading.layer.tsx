import ReactEcs from '@dcl/sdk/react-ecs'
import { atlasIconsFontAwesome, Background, getTheme, Icon, Label, Layer, Spinner, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { getLoadingStage } from 'src/client/loadingState'


const LOADING_FAILED_TIMEOUT = 1000 * 6
let loadingFailedVisible     = false

timers.setTimeout(() => {
	loadingFailedVisible = true
}, LOADING_FAILED_TIMEOUT)


// MARK: LoadingLayer
/**
 * Full-screen loading overlay. Hides when `ClientEvents.LOAD_COMPLETE` fires.
 * Custom loading art can be wired later via `assets/images/themes/bowling/`.
 */
export class LoadingLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-loading',
			zone       : ZoneType.FullScreen,
			canBeHidden: true,
			startHidden: false,
			zIndex     : 2000,
			uiTransform: {
				justifyContent: 'center',
				alignItems    : 'center',
				borderWidth   : 0,
			},
		})

		eventBus.on(ClientEvents.LOAD_COMPLETE, () => {
			this.hide()
		})
	}


	// MARK: body
	protected body() {
		const theme = getTheme()

		return [
			<Background
				key             = "loading-chrome"
				backgroundColor = {theme.colors.secondary}
				borderWidth     = {0}
			/>,
			<UiBox
				key            = "loading-panel"
				width          = "25vw"
				height         = "12vw"
				borderWidth    = {0}
				alignItems     = "center"
				justifyContent = "center"
			>
				<Spinner
					key           = "loading-spinner"
					id            = "loading-spinner"
					duration      = {1}
					degrees       = {360}
					burstInterval = {0}
					width         = {64}
					height        = {64}
				>
					<Icon
						uvs    = {atlasIconsFontAwesome.uv.dots}
						width  = {64}
						height = {64}
					/>
				</Spinner>

				<Label
					key             = "loading-failed"
					fontSize        = {theme.typography.size.small}
					backgroundColor = {theme.colors.primary}
					uiTransform     = {{
						display     : loadingFailedVisible ? 'flex' : 'none',
						positionType: 'absolute',
						position    : { bottom: '-8%' },
					}}
					value           = {`Waiting for ${getLoadingStage()}`}
				/>
			</UiBox>,
		]
	}
}

export const loadingLayer = new LoadingLayer()
