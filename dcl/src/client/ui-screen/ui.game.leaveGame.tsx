import ReactEcs, { Button, UiEntity } from '@dcl/sdk/react-ecs'
import { Color4 } from '@dcl/sdk/math'
import { BtnStateUVIndex, buttonUVs } from './utils/btn-utils'
import { ClientMessaging } from '../clientMessaging'
import { ClientStore } from '../clientStore'
import { PlayerStatus } from 'src/shared/enums'
import { getCanvasInfo } from './utils/sizing'


var buttonState = BtnStateUVIndex.NORMAL

const clientStore = ClientStore.getInstance()

// MARK: Main GameUI
export function LeaveGameUI() {
	
	const isInGame = clientStore.getPlayerStatus() !== PlayerStatus.IDLE 

	const canvasInfo = getCanvasInfo()

	return (
		<UiEntity
			uiTransform={{
				positionType : 'relative',
				position     : { top: 80, right: (canvasInfo?.width ?? 0) / 2 - 64 },
				width        : 192,
				height       : 64,
				alignItems   : "center",
				justifyContent: 'space-around',
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

			uiBackground={{ 
				texture    : { src: 'assets/images/ui/btn-primary-atlas-b.png' }, 
				textureMode: 'stretch',
				uvs        : buttonUVs[buttonState],
			}}
		>
			<UiEntity
				uiTransform={{
					width: "75%",
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
		</UiEntity>
	)
}
