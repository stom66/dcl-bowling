import ReactEcs, { Button, UiEntity} from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'

import { ClientStore } from 'src/client/clientStore'

import { ButtonAction, Divider, InfoRow, SectionHeader } from 'src/client/ui/ui.components'
import { movePlayerTo } from '~system/RestrictedActions'
import { ClientMessaging } from '../clientMessaging'
import { newPlayer, perfectGame } from 'src/shared/utils/discord-webhooks'
import { ClearEmote, PlayBowlingAnimation } from '../emotes'

const clientStore = ClientStore.getInstance()


export function DebugUI() {
	return (
		<UiEntity
		key="ui_debug_root"
		uiTransform={{
			width         : 300,
			height        : 640,
			flexDirection : 'column',
			alignItems    : 'flex-start',
			justifyContent: 'space-between',
			margin        : { top: '-220px', right: '50px' },
			padding       : '10px',
			position      : { left: 50, top: 350 },
			positionType: "absolute",
			borderRadius  : { topLeft: 8, topRight: 24, bottomLeft: 8, bottomRight: 24 },
			borderColor   : Color4.fromHexString("#4C9581FF"),
			borderWidth   : 3
		}}
		uiBackground={{ color: Color4.fromHexString("#4C958166") }}
		>
		
		<SectionHeader title="Debug Menu" />
		
		<ButtonAction textLabel="GoTo Lobby" callback={() => { 
			movePlayerTo({ 
				newRelativePosition: Vector3.create(16, 0, 11),
				cameraTarget: Vector3.create(16, 1, 15),
			}) }} />
			
			<ButtonAction textLabel="StartGame | Lane 2" callback={() => { ClientMessaging.requestJoinLane(2) }} />
			<ButtonAction textLabel="StartGame | Lane 3" callback={() => { ClientMessaging.requestJoinLane(3) }} />
			<ButtonAction textLabel="Anim | Bowl (loop)" callback={() => { PlayBowlingAnimation(true) }} />
			
			

			
			{/* 			
			<Divider />
			<ButtonAction textLabel="Discord | newPlayer()" callback={() => { newPlayer(clientStore.getDisplayName(), clientStore.getUserId()) }} />
			<ButtonAction textLabel="playerWateredPlants(stom, 60)" callback={() => { playerWateredPlants("stom", 60) }} /> 
			<ButtonAction textLabel="Discord | perfectGame(stom)" callback={() => { perfectGame("stom") }} />
			*/}
			
			
			<Divider />
			
			
			<SectionHeader title="ClientState" />
			
			<InfoRow label = "displayName"                 value = {clientStore.getDisplayName()} />
			<InfoRow label = "userId"                      value = {clientStore.getUserId()} fontSize = {10} />
			<InfoRow label = "playerStatus"                value = {clientStore.getPlayerStatus().toString()} />
			
			<Divider />
			<SectionHeader title="laneState" />

			<InfoRow label = "currentFrameIndex"         value = {clientStore.getCurrentFrameIndex()?.toString() ?? ''} />
			<InfoRow label = "currentFramePlayerIndex"   value = {clientStore.getCurrentFramePlayerIndex()?.toString() ?? ''} />
			<InfoRow label = "currentFrameUserId"        value = {clientStore.getCurrentFrameUserId() ?? ''} fontSize = {10} />
			<InfoRow label = "currentRollIndex"          value = {clientStore.getCurrentRollIndex()?.toString() ?? ''} />
			<InfoRow label = "currentRollStartTime"      value = {clientStore.getCurrentRollStartTime()?.toString() ?? ''} />
			<InfoRow label = "frames"                    value = {clientStore.getFrames()?.size.toString() ?? ''} />
			<InfoRow label = "laneStatus"                value = {clientStore.getLaneStatus()?.toString() ?? ''} />
			<InfoRow label = "laneIndex"                 value = {clientStore.getLaneIndex()?.toString() ?? ''} />
			<InfoRow label = "players"                   value = {clientStore.getPlayers()?.size.toString() ?? ''} />
			<InfoRow label = "gameStartTime"             value = {clientStore.getGameStartTime()?.toString() ?? ''} />
			
			
			
			</UiEntity>
		)
	}