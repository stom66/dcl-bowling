import ReactEcs, { Button, Label, UiEntity} from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'

import { ClientStore } from 'src/client/clientStore'

import { Divider, SectionHeader } from 'src/client/ui/ui.components'

const clientStore = ClientStore.getInstance()


const howToPlayString = `
- Best tested with a single player per lane
- Talk to the Bowling Host
- Choose a lane 1-6
- Wait for the game to start
- When moved to the front, click to set your position, direction, and then strength
- Bowling will happen
- Demo ends here currently
`

const notes = `
Current bugs: 

- turns dont rotate correctly in this build 
- turn-replication to other players is WIP

Features so far: 

- supporting groups of players
- handling multiple lanes
- getting cannon-es to properly simulate the bowling
`

var show = true

export function HowToPlay() {
	return (
		<UiEntity
		key="ui_debug_root"
		uiTransform={{
			width         : 300,
			height        : 500,
			flexDirection : 'column',
			justifyContent: 'flex-start',
			margin        : { top: '-220px', right: '00px' },
			padding       : '10px',
			position      : { right: 10, top: 350 },
			positionType: "absolute",
			borderRadius  : { topLeft: 24, topRight: 8, bottomLeft: 24, bottomRight: 8 },
			borderColor   : Color4.fromHexString("#4C9581FF"),
			borderWidth   : 3,
			display       : show ? 'flex' : 'none',
		}}
		uiBackground={{ color: Color4.fromHexString("#4C958166") }}
		>
		
		<Button
			value="X"
			variant="primary"
			fontSize={16}
			uiTransform={{ 
				width       : 40, 
				height      : 40,
				position    : { right: 10, top: 10 },
				positionType: "absolute",
				borderRadius: 20,
				borderWidth: 2,
				borderColor: Color4.fromHexString("#22524b"),
			 }}
			onMouseDown={() => {
				show = false
			}}
			uiBackground={{ color: Color4.fromHexString("#44727b") }}
		/>
			<SectionHeader title="How To Play" />
			
			<Label
				value       = {howToPlayString}
				fontSize    = {16}
				color       = {Color4.White()}
				textAlign   = "middle-left"
				font        = "sans-serif"

			/>

			<Divider />

			<Label
				value       = {notes}
				fontSize    = {14}
				color       = {Color4.White()}
				textAlign   = "middle-left"
				font        = "sans-serif"
			/>

			
			
		</UiEntity>
		)
	}