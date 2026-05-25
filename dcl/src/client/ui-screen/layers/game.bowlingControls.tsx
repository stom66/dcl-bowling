import ReactEcs, { Button, UiEntity } from '@dcl/sdk/react-ecs'
import * as utils from "@dcl-sdk/utils"
import { BtnStateUVIndex, buttonUVs } from '../utils/btn-utils'
import { ClientMessaging } from '../../clientMessaging'
import { ClientStore } from '../../clientStore'
import { PlayerStatus } from 'src/shared/enums'
import { getCanvasInfo, vwAsPixels } from '../utils/sizing'
import { tweenColor, tweenValue } from '../utils/tweens'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { EasingFunction } from '@dcl/sdk/ecs'
import { theme } from '../vars/theme'
import { lighten } from '../utils/colors'


// MARK: Vars
var buttonState = BtnStateUVIndex.NORMAL

type CurrentIndicator = "POSITION" | "DIRECTION" | "STRENGTH"

const clientStore = ClientStore.getInstance()

// Left offset for orange tab
const INDICATOR_OFFSET = {
	POSITION : 2,
	DIRECTION: 299,
	STRENGTH : 590,
}
var indicatorOffset = INDICATOR_OFFSET.POSITION
var currentIndicator: CurrentIndicator = "POSITION" // Only used to get current state, in case we're mid-tween

// Colors for the indicator text
const INDICATOR_COLOR_ACTIVE    = theme.colors.light
const INDICATOR_COLOR_INACTIVE  = theme.colors.tertiary
const INDICATOR_COLOR_HIGHLIGHT = theme.colors.primary
const componentColors          = {
	POSITION         : INDICATOR_COLOR_ACTIVE,
	DIRECTION        : INDICATOR_COLOR_INACTIVE,
	STRENGTH         : INDICATOR_COLOR_INACTIVE,
	CLICKTOSET       : INDICATOR_COLOR_ACTIVE,
	CLICKTOSET_BORDER: theme.colors.primary,
}


// Overall Visibility 
const OFFSET_VISIBLE = 0
const OFFSET_HIDDEN  = -300




// MARK: DEBUG Vars/calls
const FORCE_SHOW           =  false // DEBUG: FORCE SHOW UI

/* utils.timers.setTimeout(() => { SetIndicator("DIRECTION") }, 2000)
utils.timers.setTimeout(() => { FlashClickToSet() }, 2500)
utils.timers.setTimeout(() => { SetIndicator("POSITION")  }, 4000)
utils.timers.setTimeout(() => { FlashClickToSet() }, 4500)
utils.timers.setTimeout(() => { SetIndicator("STRENGTH")  }, 6000)
utils.timers.setTimeout(() => { FlashClickToSet() }, 6500)
utils.timers.setTimeout(() => { SetIndicator("DIRECTION") }, 8000)
utils.timers.setTimeout(() => { FlashClickToSet() }, 8500)
utils.timers.setTimeout(() => { SetIndicator("POSITION")  }, 10000)
utils.timers.setTimeout(() => { FlashClickToSet() }, 10500)
utils.timers.setTimeout(() => { SetIndicator("STRENGTH")  }, 12000)

 */
var offset = FORCE_SHOW ? OFFSET_VISIBLE : OFFSET_HIDDEN

// MARK: Functions
export function SetIndicator(
	name      : "POSITION" | "DIRECTION" | "STRENGTH", 
	skipTweens: boolean = false
) {
	console.log("SetIndicator", name)
	if (skipTweens) {
		indicatorOffset = INDICATOR_OFFSET[name]
		componentColors.POSITION = name == "POSITION"   ? INDICATOR_COLOR_ACTIVE : INDICATOR_COLOR_INACTIVE
		componentColors.DIRECTION = name == "DIRECTION" ? INDICATOR_COLOR_ACTIVE : INDICATOR_COLOR_INACTIVE
		componentColors.STRENGTH = name == "STRENGTH"   ? INDICATOR_COLOR_ACTIVE : INDICATOR_COLOR_INACTIVE
		return
	}

	var currentOffset = indicatorOffset
	const easing = name == "DIRECTION" ? EasingFunction.EF_EASEOUTBACK : EasingFunction.EF_EASEOUTBOUNCE
	tweenValue(currentOffset, INDICATOR_OFFSET[name], 0.35, (v) => indicatorOffset = v, undefined, easing)

	tweenColor(componentColors.POSITION,  name == "POSITION"  ? INDICATOR_COLOR_ACTIVE : INDICATOR_COLOR_INACTIVE, 0.25, (v) => componentColors.POSITION  = v)
	tweenColor(componentColors.DIRECTION, name == "DIRECTION" ? INDICATOR_COLOR_ACTIVE : INDICATOR_COLOR_INACTIVE, 0.25, (v) => componentColors.DIRECTION = v)
	tweenColor(componentColors.STRENGTH,  name == "STRENGTH"  ? INDICATOR_COLOR_ACTIVE : INDICATOR_COLOR_INACTIVE, 0.25, (v) => componentColors.STRENGTH  = v)
}

export function FlashClickToSet(repeatCount: number = 2) {
	const duration = 0.1

	for (let i = 0; i < repeatCount; i++) {
		utils.timers.setTimeout(() => {
			tweenColor(componentColors.CLICKTOSET, INDICATOR_COLOR_HIGHLIGHT, duration, (v) => componentColors.CLICKTOSET = v, () => { 
				console.log("FlashClickToSet complete")
				tweenColor(componentColors.CLICKTOSET, INDICATOR_COLOR_ACTIVE, duration, (v) => componentColors.CLICKTOSET = v, undefined, EasingFunction.EF_EASEBOUNCE)
			}, EasingFunction.EF_EASEBOUNCE)
		}, (duration * 3) * i * 1000)
	}
}

export function ShowBowlingControls() {
	tweenValue(offset, OFFSET_VISIBLE, 0.8, (v) => offset = v)
}
export function HideBowlingControls() {
	tweenValue(offset, OFFSET_HIDDEN, 0.8, (v) => offset = v)
}

function getNextIndicator(): CurrentIndicator {
	if (currentIndicator === "POSITION") return "DIRECTION"
	if (currentIndicator === "DIRECTION") return "STRENGTH"
	return "POSITION"
}



function OnClickToSet() {
	console.log("Click To Set")
	eventBus.emit(ClientEvents.ON_MY_ROLL_CLICK_TO_SET, {})
	//currentIndicator = getNextIndicator()
	//SetIndicator(currentIndicator)
}


// MARK: Event Listeners
eventBus.on(ClientEvents.ON_MY_ROLL_START,   () => { 
	SetIndicator("POSITION", true)
	ShowBowlingControls()

	utils.timers.setTimeout(() => {
		FlashClickToSet()
	}, 1500)
})
eventBus.on(ClientEvents.ON_MY_ROLL_REQUEST, () => { HideBowlingControls() })
eventBus.on(ClientEvents.ON_MY_ROLL_END,     () => { HideBowlingControls() })
eventBus.on(ClientEvents.ON_GROUP_GAME_END,  () => { HideBowlingControls() })
eventBus.on(ClientEvents.ON_GROUP_GAME_END,  () => { HideBowlingControls() })


// MARK: Main GameUI
export function BowlingControlsUI() {
	
	const isInGame = clientStore.getPlayerStatus() !== PlayerStatus.IDLE 
	return (
		<UiEntity
			uiTransform={{
				width         : '100%',
				height        : '100%',
				display       : 'flex',
				positionType  : 'absolute',
				flexDirection : 'column',
				alignItems    : 'center',
				justifyContent: 'flex-end',
			}}
		>

			<UiEntity
				uiTransform={{
					width         : 960,
					height        : 320,
					positionType  : 'relative',
					position      : { bottom: offset },
					flexDirection : 'column',
					alignItems    : 'center',
					justifyContent: 'flex-end',
				}}
				uiBackground={{
					//texture: { src: 'assets/images/ui/bowling-input-bg.png' },
					//textureMode: 'stretch',
					//color: theme.colors.info,
				}}
			>
 				{/* MARK: Click To Set */}
				<UiEntity
					key="btn_click_to_set_box"
					uiTransform={{
						width         : "544",
						height        : "107",
						borderColor   : componentColors.CLICKTOSET_BORDER,
						borderWidth   : 4,
						borderRadius  : 12,
						justifyContent: 'center',
						alignItems    : 'center',
					}}
					uiBackground={{
						color: theme.colors.secondary,
					}}
					onMouseDown = {() => {
						console.log("Click To Set")
						OnClickToSet()
					}}
					onMouseEnter={() => {
						console.log("Mouse Enter")
						tweenColor(componentColors.CLICKTOSET, lighten(theme.colors.primary, 0.75), 0.1, (v) => componentColors.CLICKTOSET = v)
						tweenColor(componentColors.CLICKTOSET_BORDER, lighten(theme.colors.success, 0.01), 0.1, (v) => componentColors.CLICKTOSET_BORDER = v)
					}}
					onMouseLeave={() => {
						console.log("Mouse Leave")
						tweenColor(componentColors.CLICKTOSET, INDICATOR_COLOR_ACTIVE, 0.1, (v) => componentColors.CLICKTOSET = v)
						tweenColor(componentColors.CLICKTOSET_BORDER, theme.colors.primary, 0.1, (v) => componentColors.CLICKTOSET_BORDER = v)
					}}
				>
					<UiEntity
						key="btn_click_to_set"
						uiTransform={{
							width         : "512",
							height        : "64",
						}}
						uiBackground={{
							texture: { src: 'assets/images/ui/icon-atlas.png' },
							textureMode: 'stretch',
							uvs: [
								0, 0.25, 
								0, 0.375, 
								1, 0.375, 
								1, 0.25],
							color: componentColors.CLICKTOSET,
						}}
					/>
				</UiEntity>



				<UiEntity
					key="indicator_box"
					uiTransform={{
						width         : "900",
						height        : "78",
						borderColor   : theme.colors.primary,
						borderWidth   : 4,
						borderRadius  : 12,
						justifyContent: 'center',
						alignItems    : 'center',
						margin        : { top: 24, bottom: 32 },
					}}
					uiBackground={{
						color: theme.colors.secondary,
					}}
				>
					
					{/* MARK: Orange Tab */}
					<UiEntity
						key="indicator_pos_dir_strength"
						uiTransform={{
							width         : "300",
							height        : "66",
							positionType  : "absolute",
							position      : { left: indicatorOffset, top: "2" },
							borderRadius  : 8,
						}}
						uiBackground={{
							color: theme.colors.primary,
						}}
					/>


					{/* MARK: Labels Pos/Dir/Str */}
					<UiEntity
						key="row_pos_dir_strength"
						uiTransform={{
							width         : "900",
							height        : "78",
							flexDirection : 'row',
							justifyContent: 'space-between',
							padding       : { left: 24, right: 24 },
							alignItems    : 'center',
						}}
						uiBackground={{
						}}
					>
						<UiEntity
							key="btn_pos"
							uiTransform={{
								width         : "256",
								height        : "64",
							}}
							uiBackground={{
								texture: { src: 'assets/images/ui/icon-atlas.png' },
								textureMode: 'stretch',
								uvs: [
									0, 0.375, 
									0, 0.5, 
									0.5, 0.5, 
									0.5, 0.375
								],
								color: componentColors.POSITION,
							}}
						/>
						<UiEntity
							key="btn_pos"
							uiTransform={{
								width         : "256",
								height        : "64",
							}}
							uiBackground={{
								texture: { src: 'assets/images/ui/icon-atlas.png' },
								textureMode: 'stretch',
								uvs: [
									0.5, 0.625, 
									0.5, 0.75, 
									1, 0.75, 
									1, 0.625
								],
								color: componentColors.DIRECTION,
							}}
						/>
						<UiEntity
							key="btn_pos"
							uiTransform={{
								width         : "256",
								height        : "64",
							}}
							uiBackground={{
								texture: { src: 'assets/images/ui/icon-atlas.png' },
								textureMode: 'stretch',
								uvs: [
									0, 0.5, 
									0, 0.625, 
									0.5, 0.625, 
									0.5, 0.5
								],
								color: componentColors.STRENGTH,
							}}
						/>
					</UiEntity>
				</UiEntity>

			</UiEntity>

{/* 			<UiEntity
				uiTransform={{
					width         : 960,
					height        : 320,
					flexDirection : 'column',
					justifyContent: 'space-around',
					flexGrow      : 0,
					flexShrink    : 0,
					alignItems    : 'center',
				}}


				onMouseEnter = {() => { if (buttonState !== BtnStateUVIndex.DISABLED) {
					console.log("HOVER")
					buttonState = BtnStateUVIndex.HOVER 
				}}}
				onMouseLeave = {() => { if (buttonState !== BtnStateUVIndex.DISABLED) {
					console.log("NORMAL")
					buttonState = BtnStateUVIndex.NORMAL 
				}}}
				onMouseDown  = {() => { if (buttonState !== BtnStateUVIndex.DISABLED) {
					console.log("PRESSED")
					buttonState = BtnStateUVIndex.PRESSED

					// TOOD: Hook into bowling controls here
					//requestBowlingControls()
				}}}
				onMouseUp    = {() => { if (buttonState !== BtnStateUVIndex.DISABLED) {
					console.log("NORMAL")
					buttonState = BtnStateUVIndex.HOVER 
				}}}

				uiBackground={{ 
					texture    : { src: 'assets/images/ui/btn-primary-atlas-b.png' }, 
					textureMode: 'stretch',
					uvs        : buttonUVs[buttonState],
				}}
			>
				<UiEntity
					uiTransform={{
						width : "75%",
						height: "75%",
					}}
					uiBackground={{
						texture: { src: 'assets/images/ui/icon-atlas.png' },
						textureMode: 'stretch',
						uvs: [
							0, 0.625, 
							0, 0.75, 
							0.5, 0.75, 
							0.5, 0.625],
					}}
				/>
			</UiEntity> */}
		</UiEntity>
	)
}
