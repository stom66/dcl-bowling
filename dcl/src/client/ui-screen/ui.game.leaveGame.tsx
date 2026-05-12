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
				width        : '100%',
				height       : '100%',
				display      : isInGame ? 'flex' : 'none',
				positionType : 'absolute',
			}}
		>
			<UiEntity
				uiTransform={{
					width         : 192,
					height        : 64,
					flexDirection : 'row',
					justifyContent: 'space-around',
					flexGrow      : 0,
					flexShrink    : 0,
					alignItems    : 'center',
					positionType  : 'absolute',
					position      : { top: 80, right: (canvasInfo?.width ?? 0) / 2 - 96 },
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
			</UiEntity>
		</UiEntity>
	)
}
