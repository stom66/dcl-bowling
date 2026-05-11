import ReactEcs, { Button, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { BtnStateUVIndex, buttonUVs } from './utils/btn-utils'
import { ClientMessaging } from '../clientMessaging'
import { ClientStore } from '../clientStore'
import { PlayerStatus } from 'src/shared/enums'


var defaultColor = Color4.fromHexString('#4C958166')
var hoverColor = Color4.fromHexString('#4C9581FF')

var currentColor = defaultColor
var buttonState = BtnStateUVIndex.NORMAL

const clientStore = ClientStore.getInstance()

// MARK: Main GameUI
export function LeaveGameUI() {
	
	const playerStatus = ClientStore.getInstance().getPlayerStatus()
	const isInGame     = playerStatus !== PlayerStatus.IDLE 

	return (
		<UiEntity
			uiTransform={{
				positionType : 'absolute',
				position     : { top: 6, right: 128 },
				width        : '128',
				height       : 48,
				alignContent : 'flex-start',
				alignItems   : "center",
				flexDirection: 'row',
				flexGrow     : 0,
				flexShrink   : 0,
				display      : isInGame ? 'flex' : 'none',
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
				ClientMessaging.requestLeaveGame()
			}}}
			onMouseUp    = {() => { if (buttonState !== BtnStateUVIndex.DISABLED) {
				console.log("NORMAL")
				buttonState = BtnStateUVIndex.HOVER 
			}}}
			uiText={{
				value: "Leave Game",
			}}

			uiBackground={{ 
				texture    : { src: 'assets/images/ui/btn-primary-atlas-b.png' }, 
				textureMode: 'stretch',
				uvs        : buttonUVs[buttonState],
			}}

		>
		</UiEntity>
	)
}
