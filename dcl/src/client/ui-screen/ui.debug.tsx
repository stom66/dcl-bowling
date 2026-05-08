import ReactEcs, { Button, Label, UiEntity} from '@dcl/sdk/react-ecs'
import { Color4, Vector3 } from '@dcl/sdk/math'
import { movePlayerTo } from '~system/RestrictedActions'

import { ComponentManager } from 'src/shared/components/componentManager'
import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'
import { newPlayer, perfectGame } from 'src/shared/utils/discord-webhooks'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'
import { ClearEmote, PlayBowlingAnimation } from 'src/client/emotes'

import { ButtonAction, Divider, InfoRow, SectionHeader } from 'src/client/ui-screen/utils/components'
import { tweenValue } from './utils/tweens'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'


// MARK: Vars
declare var process: {
	env: {
		NODE_ENV: string
	}
}
const env        = process.env.NODE_ENV
const IS_DEV     = env == "development"
const SHOW_DEBUG = true

const clientStore = ClientStore.getInstance()

const PANEL_HIDDEN  = -300
const PANEL_VISIBLE = 64
const BTN_HIDDEN    = -110
const BTN_VISIBLE   = 240
var btnRight        : number = IS_DEV? BTN_VISIBLE : BTN_HIDDEN
var panelLeft       : number = IS_DEV? PANEL_VISIBLE : PANEL_HIDDEN



// MARK: GetAllLanesRows
/**
 * Builds one InfoRow per lane summarising its current component values:
 * `phase | players count | current turn userId`. Reads through `ComponentManager`
 * so it always reflects the latest synced state. Renders a "syncing..." row
 * during the brief window before CRDT sync has populated all lane entities.
 */
function GetAllLanesRows() {
	if (!ComponentManager.isReady()) {
		return [
			<UiEntity key="debug_lane_syncing" uiTransform={{ width: '100%', height: 'auto' }}>
				<InfoRow label="Lanes" value="syncing..." fontSize={10} />
			</UiEntity>,
		]
	}

	const rows: ReactEcs.JSX.Element[] = []
	for (let i = 0; i < GameSettings.MAX_LANES; i++) {
		const phase    = LaneStore.getPhase(i)
		const players  = LaneStore.getLaneUserIds(i)
		const turnUser = LaneStore.getCurrentFrameUserId(i)
		const summary  = `${phase} | ${players.length}p${turnUser ? ` | ${turnUser.slice(0, 4)}...${turnUser.slice(turnUser.length - 4, turnUser.length)}` : ''}`
		rows.push(
			<UiEntity key={`debug_lane_${i}`} uiTransform={{ width: '100%', height: 'auto' }}>
				<InfoRow label={`Lane ${i}`} value={summary} fontSize={10} />
			</UiEntity>
		)
	}
	return rows
}


function BowlStrike() {
	DoBowl(Vector3.create(-0.07, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
}
function BowlSpare1() {
	DoBowl(Vector3.create(0.15, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
}
function BowlSpare2() {
	DoBowl(Vector3.create(-0.2, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
}

function DoBowl(position: Vector3, direction: Vector3, strength: number, spin: number) {
	ClientMessaging.requestPlayRoll(position, direction, strength, spin)
	eventBus.emit(ClientEvents.ON_MY_ROLL_REQUEST, { position: position, direction: direction, strength: strength, spin: spin })
}

export function DebugUI() {
	return (
		<UiEntity
			key="ui_debug_root"
			uiTransform={{
				width         : 300,
				height        : 720,
				flexDirection : 'column',
				alignItems    : 'flex-start',
				justifyContent: 'space-between',
				padding       : '10px',
				position      : { left: panelLeft, top: 256 },
				positionType: "absolute",
				borderRadius  : { topLeft: 8, topRight: 24, bottomLeft: 8, bottomRight: 24 },
				borderColor   : Color4.fromHexString("#4C9581FF"),
				borderWidth   : 3
			}}
			uiBackground={{ color: Color4.fromHexString("#4C958166") }}
		>

		<UiEntity 
				uiTransform={{ 
					width       : '58', 
					height      : '32',
					borderRadius: 16,
					borderWidth : 3,
					borderColor : Color4.fromHexString("#44B596FF"),
					positionType: 'absolute',
					position    : { top: -36, right: btnRight },
				}}
				uiText={{
					value: "[debug]",
					fontSize: 10,
				}}
				onMouseDown={() => {
					if (panelLeft > PANEL_HIDDEN) {
						tweenValue(btnRight, BTN_HIDDEN, 0.2, (v) => btnRight = v)
						tweenValue(panelLeft, PANEL_HIDDEN, 0.2, (v) => panelLeft = v)
					} else {
						tweenValue(panelLeft, PANEL_VISIBLE, 0.2, (v) => panelLeft = v)
						tweenValue(btnRight, BTN_VISIBLE, 0.2, (v) => btnRight = v)
					}
				}}
			/>
			
			<UiEntity
				uiTransform={{
					width         : '100%',
					height        : 'auto',
					flexDirection : 'column',
					display       : IS_DEV || SHOW_DEBUG ? 'flex' : 'none',
				}}
			>
				<SectionHeader title="Debug Menu" />
				
				<ButtonAction textLabel="GoTo Lobby" callback={() => { 
					movePlayerTo({ 
						newRelativePosition: Vector3.create(16, 0, 11),
						cameraTarget: Vector3.create(16, 1, 15),
					}) }} />
					

				<Label value="Start Game on Lane" />
				<UiEntity
					uiTransform={{ 
						width: '100%', 
						height: '64',
						flexDirection: 'row',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: { top: 8, bottom: 16, left: 0, right: 0 },
					}}
					>

					<ButtonAction textLabel="1" callback={() => { ClientMessaging.requestJoinLane(1) }} />
					<ButtonAction textLabel="2" callback={() => { ClientMessaging.requestJoinLane(2) }} />
					<ButtonAction textLabel="3" callback={() => { ClientMessaging.requestJoinLane(3) }} />
					<ButtonAction textLabel="4" callback={() => { ClientMessaging.requestJoinLane(4) }} />
					<ButtonAction textLabel="5" callback={() => { ClientMessaging.requestJoinLane(5) }} />
					<ButtonAction textLabel="6" callback={() => { ClientMessaging.requestJoinLane(6) }} />
				</UiEntity>
				<Label value="Bowl-O-Tron" />
				<UiEntity
					uiTransform={{ 
						width         : '100%', 
						height        : 'auto',
						flexDirection : 'row',
						justifyContent: 'space-between',
						alignItems    : 'center',
						padding       : { top:  8, bottom: 16, left: 0, right: 0 },
					}}
					>
					<ButtonAction textLabel="Strike" callback={() => { BowlStrike() }} />
					<ButtonAction textLabel="Spare 1" callback={() => { BowlSpare1() }} />
					<ButtonAction textLabel="Spare 2" callback={() => { BowlSpare2() }} />
				</UiEntity>

				{/* 			
				<Divider />
				<ButtonAction textLabel="Discord | newPlayer()" callback={() => { newPlayer(clientStore.getDisplayName(), clientStore.getUserId()) }} />
				<ButtonAction textLabel="playerWateredPlants(stom, 60)" callback={() => { playerWateredPlants("stom", 60) }} /> 
				<ButtonAction textLabel="Discord | perfectGame(stom)" callback={() => { perfectGame("stom") }} />
				*/}
				
				
				<Divider />
			</UiEntity>
			

			
			
			
			<SectionHeader title="ClientState" />
			
			<InfoRow label = "displayName"                 value = {clientStore.getDisplayName()} />
			<InfoRow label = "userId"                      value = {clientStore.getUserId()} fontSize = {10} />
			<InfoRow label = "playerStatus"                value = {clientStore.getPlayerStatus().toString()} />
			
			<Divider />
			<SectionHeader title="My Lane (components)" />

			<InfoRow label = "laneIndex"                 value = {clientStore.getLaneIndex()?.toString() ?? '-'} />
			<InfoRow label = "lanePhase"                 value = {clientStore.getLanePhase()?.toString() ?? '-'} />
			<InfoRow label = "gameStartTime"             value = {clientStore.getGameStartTime()?.toString() ?? '-'} />
			<InfoRow label = "currentFrameIndex"         value = {clientStore.getCurrentFrameIndex()?.toString() ?? '-'} />
			<InfoRow label = "currentFramePlayerIndex"   value = {clientStore.getCurrentFramePlayerIndex()?.toString() ?? '-'} />
			<InfoRow label = "currentFrameUserId"        value = {clientStore.getCurrentFrameUserId() ?? '-'} fontSize = {10} />
			<InfoRow label = "currentRollIndex"          value = {clientStore.getCurrentRollIndex()?.toString() ?? '-'} />
			<InfoRow label = "currentRollStartTime"      value = {clientStore.getCurrentRollStartTime()?.toString() ?? '-'} />
			<InfoRow label = "players"                   value = {clientStore.getPlayers()?.size.toString() ?? '-'} />
			<InfoRow label = "frames"                    value = {clientStore.getFrames()?.size.toString() ?? '-'} />

			<Divider />
			<SectionHeader title="All Lanes (components)" />

			{GetAllLanesRows()}

		</UiEntity>
	)
}