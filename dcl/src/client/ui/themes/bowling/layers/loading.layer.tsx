import { Color4 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import { alpha, atlasIconsFontAwesome, Background, easingFunctions, getTheme, Icon, Label, Layer, Spinner, tweenValue, UiBox, ZoneType } from '@stom66/dcl-ui-component-kit'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { getLoadingStage } from 'src/client/loadingState'


const LOADING_FAILED_TIMEOUT = 1000 * 6
const FADE_OUT_DURATION      = 0.5
let loadingFailedVisible     = false

timers.setTimeout(() => {
	loadingFailedVisible = true
}, LOADING_FAILED_TIMEOUT)


// MARK: LoadingLayer
/**
 * Full-screen loading overlay. Fades the backdrop out when
 * `ClientEvents.LOAD_COMPLETE` fires, then hides and disables itself.
 * Custom loading art can be wired later via `assets/images/themes/bowling/`.
 */
export class LoadingLayer extends Layer {
	private backgroundColor: Color4 | undefined
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
	 * Lerps the backdrop alpha to 0 over half a second, then hides and
	 * disables the layer so it no longer mounts.
	 */
	private fadeOut() {
		if (this.fading || !this.enabled) return

		this.fading = true

		const source         = this.backgroundColor ?? getTheme().colors.secondary
		const from           = Color4.create(source.r, source.g, source.b, source.a)
		const to             = alpha(from, 0)
		this.backgroundColor = from

		tweenValue(
			0,
			1,
			FADE_OUT_DURATION,
			(t) => { this.backgroundColor = Color4.lerp(from, to, t) },
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

		return [
			<Background
				key             = "loading-chrome"
				backgroundColor = {backgroundColor}
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
