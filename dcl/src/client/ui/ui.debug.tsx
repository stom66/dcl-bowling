import ReactEcs, { Button, UiEntity} from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'

import { ClientStore } from 'src/client/clientStore'

import { Divider, InfoRow, SectionHeader } from 'src/client/ui/ui.components'
import { movePlayerTo } from '~system/RestrictedActions'

const clientStore = ClientStore.getInstance()

export function DebugUI() {
	return (
		<UiEntity
			key="ui_debug_root"
			uiTransform={{
				width         : 300,
				height        : 500,
				flexDirection : 'column',
				alignItems    : 'flex-start',
				justifyContent: 'space-between',
				margin        : { top: '-220px', right: '50px' },
				padding       : '10px',
				position      : { left: 50, top: 350 },
				positionType: "absolute"
			}}
			uiBackground={{ color: Color4.fromHexString("#4C958166") }}
		>

			<SectionHeader title="Debug Menu" />
			<Button
				key         = "btnToLobby"
				uiTransform = {{ width: 180, height: 40, margin: 8 }}
				value       = 'toLobby()'
				variant     = 'primary'
				fontSize    = {14}
				onMouseDown = {() => {
					movePlayerTo({ 
						newRelativePosition: Vector3.create(16, 0, 11),
						cameraTarget: Vector3.create(16, 1, 15),
					 })
				}}
			/>

			<Divider />


			<SectionHeader title="ClientState" />

			<InfoRow label = "displayName"   value = {clientStore.getDisplayName()} />
			<InfoRow label = "userId"        value = {clientStore.getUserId()} />
			<InfoRow label = "playerStatus"  value = {clientStore.getPlayerStatus().toString()} />


		</UiEntity>
	)
}