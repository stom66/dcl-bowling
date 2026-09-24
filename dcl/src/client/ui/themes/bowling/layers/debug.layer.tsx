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

import { ComponentStore } from 'src/shared/components/componentStore'
import { PlayerActivity } from 'src/shared/components/definitions/shared.playerActivity'
import { PlayerLoadout } from 'src/shared/components/definitions/shared.playerLoadout'
import { PlayerPreferences } from 'src/shared/components/definitions/shared.playerPreferences'
import { PlayerStats } from 'src/shared/components/definitions/shared.playerStats'
import { PlayerTickets } from 'src/shared/components/definitions/shared.playerTickets'
import { LaneStore } from 'src/shared/laneStore'
import { GameSettings } from 'src/shared/settings'
import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { userProfileCache } from 'src/shared/utils/userProfileCache'

import { ClientMessaging } from 'src/client/clientMessaging'
import { ClientStore } from 'src/client/clientStore'


const clientStore = ClientStore.getInstance()

/** Theme-base px before Duck scales it — below `size.code` (6) for a dense inspector. */
const DEBUG_FONT_SIZE  = 4
/** Pixel height of each component-value `Code` row. Tune independently of font size. */
const DEBUG_ROW_HEIGHT = 14


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
	 * Label on the left, value on the right. Uses `DEBUG_FONT_SIZE` /
	 * `DEBUG_ROW_HEIGHT` and clips long ids inside the LeftTop column.
	 */
	private field(
		key  : string,
		label: string,
		value: string,
	) {
		const theme = getTheme()
		return (
			<UiBox
				key            = {`debug-field-${key}`}
				width          = "100%"
				height         = {DEBUG_ROW_HEIGHT}
				minHeight      = {DEBUG_ROW_HEIGHT}
				justifyContent = "space-between"
				alignItems     = "center"
				overflow       = "hidden"
				uiTransform    = {{ flexDirection: 'row' }}
			>
				<Code
					value     = {label}
					width     = "50%"
					height    = {DEBUG_ROW_HEIGHT}
					minHeight = {DEBUG_ROW_HEIGHT}
					fontSize  = {DEBUG_FONT_SIZE}
					fontColor = {theme.colors.light}
					textAlign = "middle-left"
					textWrap  = "nowrap"
					overflow  = "hidden"
					uiTransform = {{
						width     : '50%',
						flexGrow  : 0,
						flexShrink: 0,
					}}
				/>
				<Code
					value     = {value}
					width     = "50%"
					height    = {DEBUG_ROW_HEIGHT}
					minHeight = {DEBUG_ROW_HEIGHT}
					fontSize  = {DEBUG_FONT_SIZE}
					fontColor = {theme.colors.light}
					textAlign = "middle-right"
					textWrap  = "nowrap"
					overflow  = "hidden"
					uiTransform = {{
						width     : '50%',
						flexGrow  : 0,
						flexShrink: 0,
					}}
				/>
			</UiBox>
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
				fontSize  = {DEBUG_FONT_SIZE}
				fontColor = {Color4.create(1, 0.8, 0.3, 1)}
				uiTransform = {{
					padding: { top: 1, bottom: 1 },
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


	// MARK: getProfileRows
	private getProfileRows() {
		const userId = clientStore.getUserId()
		if (!userId) {
			return [this.field('profile-syncing', 'profile', 'no userId')]
		}

		const tickets      = ComponentStore.getOrNull(PlayerTickets, { key: userId })
		const activity     = ComponentStore.getOrNull(PlayerActivity, { key: userId })
		const stats        = ComponentStore.getOrNull(PlayerStats, { key: userId })
		const loadout      = ComponentStore.getOrNull(PlayerLoadout, { key: userId })
		const preferences  = ComponentStore.getOrNull(PlayerPreferences, { key: userId })

		return [
			this.field('tickets',          'tickets',          tickets?.balance.toString() ?? 'syncing...'),
			this.field('bgmMuted',         'bgmMuted',         preferences ? String(preferences.bgmMuted) : 'syncing...'),
			this.field('bumpersEnabled',   'bumpersEnabled',   preferences ? String(preferences.bumpersEnabled) : 'syncing...'),
			this.field('gamesPlayed',      'gamesPlayed',      activity?.gamesPlayed.toString() ?? '-'),
			this.field('streak',           'streak',           activity ? `${activity.currentStreak}/${activity.maxStreak}` : '-'),
			this.field('careerPlayed',     'careerPlayed',     stats?.gamesPlayed.toString() ?? '-'),
			this.field('careerWonLost',    'won/lost',         stats ? `${stats.gamesWon}/${stats.gamesLost}` : '-'),
			this.field('careerCreated',    'gamesCreated',     stats?.gamesCreated.toString() ?? '-'),
			this.field('careerLeftEarly',  'leftEarly',        stats?.gamesLeftEarly.toString() ?? '-'),
			this.field('careerPerfect',    'perfectGames',     stats?.perfectGames.toString() ?? '-'),
			this.field('careerRolls',      'rolls',            stats ? `${stats.rolledBalls} b / ${stats.rolledStrikes} x / ${stats.rolledSpares} / ${stats.rolledGutterBalls} g` : '-'),
			this.field('careerPins',       'pinsDown',         stats?.pinsKnockedDown.toString() ?? '-'),
			this.field('careerHistory',    'matchHistory',     stats ? `${stats.matches.length}` : '-'),
			this.field('ballId',           'ballId',           loadout?.ballId ?? '-'),
			this.field('pinId',            'pinId',            loadout?.pinId ?? '-'),
			this.field('laneId',           'laneId',           loadout?.laneId ?? '-'),
			this.field('trailId',          'trailId',          loadout?.trailId ?? '-'),
			this.field('spotlightId',      'spotlightId',      loadout?.spotlightId ?? '-'),
			this.field('spotlightColorId', 'spotlightColorId', loadout?.spotlightColorId ?? '-'),
		]
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
					fontSize  = {DEBUG_FONT_SIZE}
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
					fontSize  = {DEBUG_FONT_SIZE}
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
							fontSize  = {DEBUG_FONT_SIZE}
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
					fontSize  = {DEBUG_FONT_SIZE}
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
						fontSize  = {DEBUG_FONT_SIZE}
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
						fontSize  = {DEBUG_FONT_SIZE}
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
						fontSize  = {DEBUG_FONT_SIZE}
						callback  = {() => {
							this.bowl(Vector3.create(-0.2, 0.12, 0.8), Vector3.create(0, 0, 1), 1, 0)
						}}
						uiTransform = {{
							positionType: 'relative',
							position    : { top: 0, left: 0 },
						}}
					/>
				</Row>

				<Divider margin={{ top: 2, bottom: 2 }} thickness={1} />

				{this.sectionTitle('debug-client', 'ClientState')}
				{this.field('displayName',  'displayName',  clientStore.getDisplayName())}
				{this.field('userId',       'userId',       clientStore.getUserId())}
				{this.field('playerStatus', 'playerStatus', clientStore.getPlayerStatus().toString())}

				<Divider margin={{ top: 2, bottom: 2 }} thickness={1} />
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

				<Divider margin={{ top: 2, bottom: 2 }} thickness={1} />
				{this.sectionTitle('debug-profile', 'Player profile')}
				{this.getProfileRows()}
				<Text
					value     = "Add tickets"
					fontSize  = {DEBUG_FONT_SIZE}
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
					{[1, 10, 100].map((amount) => (
						<ButtonText
							id        = {`debug_add_tickets_${amount}`}
							textLabel = {`+${amount}`}
							width     = {70}
							height    = {18}
							fontSize  = {DEBUG_FONT_SIZE}
							callback  = {() => { ClientMessaging.requestTicket(amount) }}
							uiTransform = {{
								positionType: 'relative',
								position    : { top: 0, left: 0 },
							}}
						/>
					))}
				</Row>
				<Row
					width          = "100%"
					height         = {20}
					spacing        = {20}
					padding        = {{ top: 1, bottom: 2 }}
					justifyContent = "space-between"
				>
					<ButtonText
						id        = "debug_unlock_ember"
						textLabel = "Unlock ember"
						width     = {90}
						height    = {18}
						fontSize  = {DEBUG_FONT_SIZE}
						callback  = {() => { ClientMessaging.requestUnlockItem('trail-ember') }}
						uiTransform = {{
							positionType: 'relative',
							position    : { top: 0, left: 0 },
						}}
					/>
					<ButtonText
						id        = "debug_equip_ember"
						textLabel = "Equip ember"
						width     = {90}
						height    = {18}
						fontSize  = {DEBUG_FONT_SIZE}
						callback  = {() => { ClientMessaging.requestEquipItem('trail-ember') }}
						uiTransform = {{
							positionType: 'relative',
							position    : { top: 0, left: 0 },
						}}
					/>
					<ButtonText
						id        = "debug_equip_classic"
						textLabel = "Classic"
						width     = {70}
						height    = {18}
						fontSize  = {DEBUG_FONT_SIZE}
						callback  = {() => {
							ClientMessaging.requestEquipItem('ball-default')
							ClientMessaging.requestEquipItem('trail-none')
							ClientMessaging.requestEquipItem('spotlight-none')
						}}
						uiTransform = {{
							positionType: 'relative',
							position    : { top: 0, left: 0 },
						}}
					/>
				</Row>

				<Divider margin={{ top: 2, bottom: 2 }} thickness={1} />
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
