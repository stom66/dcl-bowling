import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { alpha, Background, easingFunctions, getTheme, Icon, Label, Layer, Spinner, tweenValue, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { getLoadingStage } from 'src/client/loadingState'
import { bowlingThemeAssets } from 'src/client/ui/themes/bowling/atlases'


const LOADING_FAILED_TIMEOUT = 1000 * 6
const FADE_OUT_DURATION      = 0.5
const LOADING_PANEL_SIZE     = 512
const LOADING_SPINNER_SIZE   = 300
const LOADING_SPINNER_BOTTOM = -72
let loadingFailedVisible     = false

timers.setTimeout(() => {
	loadingFailedVisible = true
}, LOADING_FAILED_TIMEOUT)


// MARK: LoadingLayer 
/**
 * Full-screen loading overlay. Fades the backdrop, logo, and spinner out when
 * `ClientEvents.LOAD_COMPLETE` fires, then hides and disables itself.
 * The Fastlane mark fills the centered panel (`bowlingThemeAssets.loadingOverlay`).
 */
export class LoadingLayer extends Layer {
	private backgroundColor: Color4 | undefined
	private imageColor     = Color4.create(1, 1, 1, 1)
	private fading         = false
	private enabled        = true

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
			this.fadeOut()
		})
	}


	// MARK: fadeOut 
	/**
	 * Lerps the backdrop and the white image tint to alpha 0 over half a
	 * second, then hides and disables the layer so it no longer mounts.
	 * White leaves the logo and spinner colors unchanged; only alpha fades them.
	 */
	private fadeOut() {
		if (this.fading || !this.enabled) return

		this.fading = true

		const source         = this.backgroundColor ?? getTheme().colors.secondary
		const from           = Color4.create(source.r, source.g, source.b, source.a)
		const to             = alpha(from, 0)
		const imageFrom      = Color4.create(1, 1, 1, this.imageColor.a)
		const imageTo        = alpha(imageFrom, 0)
		this.backgroundColor = from

		tweenValue(
			0,
			1,
			FADE_OUT_DURATION,
			(t) => {
				this.backgroundColor = Color4.lerp(from, to, t)
				this.imageColor      = Color4.lerp(imageFrom, imageTo, t)
			},
			() => {
				this.hide(0)
				this.enabled = false
			},
			easingFunctions.linear,
		)
	}


	// MARK: render 
	/** Skips the loading overlay once the fade-out has finished. */
	render(): ReactEcs.JSX.Element | ReactEcs.JSX.Element[] | null {
		if (!this.enabled) return null
		return super.render()
	}


	// MARK: body 
	protected body() {
		const theme            = getTheme()
		const backgroundColor  = this.backgroundColor ?? theme.colors.secondary
		const imageColor       = this.imageColor

		return [
			<Background
				key             = "loading-chrome"
				backgroundColor = {backgroundColor}
				borderWidth     = {0}
			/>,
			<UiBox
				key            = "loading-panel"
				width          = {LOADING_PANEL_SIZE}
				height         = {LOADING_PANEL_SIZE}
				borderWidth    = {0}
				alignItems     = "center"
				alignContent   = 'center'
				justifyContent = 'center'
				uiBackground   = {{
					color      : imageColor,
					texture    : { src: bowlingThemeAssets.loadingOverlay, wrapMode: 'clamp' },
					textureMode: 'stretch',
				}}
			>
				<Spinner
					key           = "loading-spinner"
					id            = "loading-spinner"
					duration      = {1}
					degrees       = {180}
					burstInterval = {0}
					width         = {LOADING_SPINNER_SIZE}
					height        = {LOADING_SPINNER_SIZE}
					positionType  = "absolute"
					position      = {{
						left  : LOADING_PANEL_SIZE / 2,
						bottom: LOADING_SPINNER_BOTTOM,
					}}
					margin        = {{ left: -LOADING_SPINNER_SIZE / 2 }}
				>
					<Icon
						src       = {bowlingThemeAssets.spinnerBalls}
						iconColor = {imageColor}
						width     = {LOADING_SPINNER_SIZE}
						height    = {LOADING_SPINNER_SIZE}
					/>
				</Spinner>

				<Label
					key             = "loading-failed"
					fontSize        = {theme.typography.size.small}
					backgroundColor = {theme.colors.primary}
					uiTransform     = {{
						display     : loadingFailedVisible ? 'flex' : 'none',
						positionType: 'absolute',
						position    : {
							bottom: -128,
						}
					}}
					value           = {`Waiting for ${getLoadingStage()}`}
				/>
			</UiBox>,
		]
	}
}

export const loadingLayer = new LoadingLayer()
