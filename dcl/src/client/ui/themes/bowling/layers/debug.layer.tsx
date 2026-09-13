import { Color4, Vector3 } from '@dcl/sdk/math'
import ReactEcs from '@dcl/sdk/react-ecs'
import {
	ButtonText,
	Code,
	Divider,
	getTheme,
	Layer,
	Row,
	SectionHeader,
	Text,
	UiBox,
	ZoneType,
} from '@stom66/dcl-ui-component-kit'
import { movePlayerTo } from '~system/RestrictedActions'

import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'


const clientStore = ClientStore.getInstance()


// MARK: DebugLayer
/**
 * Development-only left-top inspector for lane and client state.
 */
export class DebugLayer extends Layer {
	constructor() {
		super({
			id         : 'bowling-debug',
			zone       : ZoneType.LeftTop,
			canBeHidden: false,
			uiTransform: {
				width   : 280,
				padding : 6,
				overflow: 'hidden',
			},
		})
	}


	// MARK: bowl
	private bowl(
		position : Vector3,
		direction: Vector3,
		strength : number,
		spin     : number,
	) {
		ClientMessaging.requestPlayRoll(position, direction, strength, spin)
		eventBus.emit(ClientEvents.ON_MY_ROLL_REQUEST, {
			position : position,
			direction: direction,
			strength : strength,
			spin     : spin,
		})
	}


	// MARK: field
	/**
	 * Single-line debug readout. `Code` stays at theme `size.code` and clips
	 * long ids instead of wrapping out of the pinned LeftTop column.
	 */
	private field(
		key  : string,
		label: string,
		value: string,
	) {
		const theme = getTheme()
		return (
			<Code
				key        = {`debug-field-${key}`}
				value      = {`${label}  ${value}`}
				width      = "100%"
				fontSize   = {theme.typography.size.code}
				fontColor  = {theme.colors.light}
				textAlign  = "middle-left"
				textWrap   = "nowrap"
				overflow   = "hidden"
			/>
		)
	}


	// MARK: sectionTitle
	/** Compact section title so the inspector fits the LeftTop zone. */
	private sectionTitle(
		key  : string,
		value: string,
	) {
		const theme = getTheme()
		return (
			<SectionHeader
				key       = {key}
				value     = {value}
				fontSize  = {theme.typography.size.code}
				fontColor = {Color4.create(1, 0.8, 0.3, 1)}
				uiTransform = {{
					padding: { top: 2, bottom: 1 },
				}}
			/>
		)
	}


	// MARK: getAllLanesRows
	private getAllLanesRows() {
		if (!LaneStore.areLanesReady()) {
			return [
				this.field('lanes-syncing', 'Lanes', 'syncing...'),
			]
		}

		const rows: ReactEcs.JSX.Element[] = []
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			const phase    = LaneStore.getPhase(i)
			const players  = LaneStore.getLaneUserIds(i)
			const turnUser = LaneStore.getCurrentFrameUserId(i) ?? undefined
			const summary  = `${phase} | ${players.length}p${turnUser ? ` | ${turnUser}` : ''}`
			rows.push(this.field(`lane-${i}`, `Lane ${i}`, summary))
			if (turnUser) {
				void userProfileCache.getDisplayName(turnUser)
			}
		}
		return rows
	}


	// MARK: body
	protected body() {
		const theme = getTheme()

		return [
			<UiBox
				key             = "debug-chrome"
				width           = "100%"
				height          = "100%"
				alignItems      = "flex-start"
				justifyContent  = "flex-start"
				backgroundColor = {theme.colors.secondary}
				borderColor     = {theme.colors.primary}
				borderWidth     = {3}
				borderRadius    = {8}
				padding         = {6}
				overflow        = "hidden"
				uiTransform     = {{ flexDirection: 'column' }}
			>
				{this.sectionTitle('debug-title', 'Debug Menu')}

				<ButtonText
					id        = "debug_goto_lobby"
					textLabel = "GoTo Lobby"
					width     = "100%"
					height    = {18}
					fontSize  = {theme.typography.size.code}
					callback  = {() => {
						movePlayerTo({
							newRelativePosition: Vector3.create(16, 0, 11),
							cameraTarget       : Vector3.create(16, 1, 15),
						})
					}}
					uiTransform = {{
						positionType: 'relative',
						position    : { top: 0, left: 0 },
					}}
				/>

				<Text
					value     = "Start Game on Lane"
					fontSize  = {theme.typography.size.code}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "100%"
					height    = {12}
				/>
				<Row
					width          = "100%"
					height         = {20}
					spacing        = {2}
					padding        = {{ top: 1, bottom: 2 }}
					justifyContent = "space-between"
				>
					{[1, 2, 3, 4, 5, 6].map((lane) => (
						<ButtonText
							id        = {`debug_join_lane_${lane}`}
							textLabel = {lane.toString()}
							width     = {28}
							height    = {18}
							fontSize  = {theme.typography.size.code}
							callback  = {() => { ClientMessaging.requestJoinLane(lane) }}
							uiTransform = {{
								positionType: 'relative',
								position    : { top: 0, left: 0 },
							}}
						/>
					))}
				</Row>

				<Text
					value     = "Bowl-O-Tron"
					fontSize  = {theme.typography.size.code}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					width     = "100%"
					height    = {12}
				/>
				<Row
					width          = "100%"
					height         = {20}
					spacing        = {2}
					padding        = {{ top: 1, bottom: 2 }}
					justifyContent = "space-between"
				>
					<ButtonText
						id        = "debug_bowl_strike"
						textLabel = "Strike"
						width     = {70}
						height    = {18}
						fontSize  = {theme.typography.size.code}
						callback  = {() => {
							this.bowl(Vector3.create(-0.07, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
						}}
						uiTransform = {{
							positionType: 'relative',
							position    : { top: 0, left: 0 },
						}}
					/>
					<ButtonText
						id        = "debug_bowl_spare_1"
						textLabel = "Spare 1"
						width     = {70}
						height    = {18}
						fontSize  = {theme.typography.size.code}
						callback  = {() => {
							this.bowl(Vector3.create(0.15, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
						}}
						uiTransform = {{
							positionType: 'relative',
							position    : { top: 0, left: 0 },
						}}
					/>
					<ButtonText
						id        = "debug_bowl_spare_2"
						textLabel = "Spare 2"
						width     = {70}
						height    = {18}
						fontSize  = {theme.typography.size.code}
						callback  = {() => {
							this.bowl(Vector3.create(-0.2, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
						}}
						uiTransform = {{
							positionType: 'relative',
							position    : { top: 0, left: 0 },
						}}
					/>
				</Row>

				<Divider margin={{ top: 4, bottom: 4 }} thickness={1} />

				{this.sectionTitle('debug-client', 'ClientState')}
				{this.field('displayName',  'displayName',  clientStore.getDisplayName())}
				{this.field('userId',       'userId',       clientStore.getUserId())}
				{this.field('playerStatus', 'playerStatus', clientStore.getPlayerStatus().toString())}

				<Divider margin={{ top: 4, bottom: 4 }} thickness={1} />
				{this.sectionTitle('debug-my-lane', 'My Lane (components)')}
				{this.field('laneIndex',               'laneIndex',               clientStore.getLaneIndex()?.toString() ?? '-')}
				{this.field('lanePhase',               'lanePhase',               clientStore.getLanePhase()?.toString() ?? '-')}
				{this.field('gameStartTime',           'gameStartTime',           clientStore.getGameStartTime()?.toString() ?? '-')}
				{this.field('currentFrameIndex',       'currentFrameIndex',       clientStore.getCurrentFrameIndex()?.toString() ?? '-')}
				{this.field('currentFramePlayerIndex', 'currentFramePlayerIndex', clientStore.getCurrentFramePlayerIndex()?.toString() ?? '-')}
				{this.field('currentFrameUserId',      'currentFrameUserId',      clientStore.getCurrentFrameUserId() ?? '-')}
				{this.field('currentRollIndex',        'currentRollIndex',        clientStore.getCurrentRollIndex()?.toString() ?? '-')}
				{this.field('currentRollStartTime',    'currentRollStartTime',    clientStore.getCurrentRollStartTime()?.toString() ?? '-')}
				{this.field('players',                 'players',                 clientStore.getPlayers()?.length.toString() ?? '-')}
				{this.field('frames',                  'frames',                  clientStore.getFrames()?.size.toString() ?? '-')}

				<Divider margin={{ top: 4, bottom: 4 }} thickness={1} />
				{this.sectionTitle('debug-all-lanes', 'All Lanes (components)')}
				<UiBox
					key         = "debug-lanes"
					width       = "100%"
					height      = "auto"
					borderWidth = {0}
					uiTransform = {{ flexDirection: 'column' }}
				>
					{this.getAllLanesRows()}
				</UiBox>
			</UiBox>,
		]
	}
}

export const debugLayer = new DebugLayer()
