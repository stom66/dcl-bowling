import { LaneBumpers, LaneCurrentTurn, LaneGameData, LanePhaseEnum, LaneScores } from "src/shared/components/definitions/shared.lane"
import { PlayerActivity } from "src/shared/components/definitions/shared.playerActivity"
import { PlayerIdentity } from "src/shared/components/definitions/shared.playerIdentity"
import { PlayerLoadout } from "src/shared/components/definitions/shared.playerLoadout"
import { PlayerPreferences } from "src/shared/components/definitions/shared.playerPreferences"
import { PlayerStats } from "src/shared/components/definitions/shared.playerStats"
import { PlayerTickets } from "src/shared/components/definitions/shared.playerTickets"
import { PlayerUnlocks } from "src/shared/components/definitions/shared.playerUnlocks"
import { SceneState } from "src/shared/components/definitions/shared.sceneState"
import { PerfectGames, SceneScoreboards } from "src/shared/components/definitions/shared.scoreboards"
import { ComponentRegistration, KeyedEntityGroupConfig } from "src/shared/components/types"
import { getDefaultLoadout, getDefaultUnlockedIds } from "src/shared/data/unlocks"
import { LanePhase } from "src/shared/enums"


/**
 * Sync id for the single main gameplay entity.
 */
export const MAIN_ENTITY_SYNC_ID = 1001


/**
 * Component used by clients to discover the main entity after sync.
 */
export const MAIN_DISCOVERY_COMPONENT = SceneState


/**
 * Keyed group for per-player identity and storage-backed profile fields.
 */
export const PLAYERS_GROUP_ID = 'players'


/**
 * Keyed group for per-lane game state. Identity field is `laneIndex`.
 */
export const LANES_GROUP_ID = 'lanes'


/**
 * Keyed entity groups (one entity per instance key).
 */
export const keyedEntityGroups: KeyedEntityGroupConfig[] = [
	{
		id          : PLAYERS_GROUP_ID,
		keyComponent: PlayerIdentity,
		keyField    : 'userId',
	},
	{
		id          : LANES_GROUP_ID,
		keyComponent: LaneGameData,
		keyField    : 'laneIndex',
	},
]


/**
 * PROJECT FILE — register your components here.
 *
 * To add a component:
 * 1. Create a schema in `definitions/`
 * 2. Add one entry below (`mode`: `client` | `server` | `synced`)
 *
 * To add a keyed group (lanes, rooms, …):
 * 1. Add an identity field on a component and an entry in `keyedEntityGroups`
 * 2. Register the group's components with that `entityGroup` id
 *
 * Do not edit `componentManager.ts` or `componentStore.ts` for new components.
 */
export const registry: ComponentRegistration[] = [
	{
		component  : SceneState,
		mode       : 'synced',
		entityGroup: 'main',
		defaults   : () => ({
			bootAt: Date.now(),
		}),
	},
	{
		component  : SceneScoreboards,
		mode       : 'synced',
		entityGroup: 'main',
		defaults   : () => ({
			alltime3 : [],
			alltime6 : [],
			alltime10: [],
			weekly3  : [],
			weekly6  : [],
			weekly10 : [],
		}),
	},
	{
		component  : PerfectGames,
		mode       : 'synced',
		entityGroup: 'main',
		defaults   : () => ({
			entries: [],
		}),
	},
	{
		component  : LaneGameData,
		mode       : 'synced',
		entityGroup: LANES_GROUP_ID,
		defaults   : () => ({
			laneIndex : 0,
			startTime : 0,
			frameCount: 0,
			players   : [],
		}),
	},
	{
		component  : LanePhaseEnum,
		mode       : 'synced',
		entityGroup: LANES_GROUP_ID,
		defaults   : () => ({
			phase: LanePhase.NONE,
		}),
	},
	{
		component  : LaneCurrentTurn,
		mode       : 'synced',
		entityGroup: LANES_GROUP_ID,
		defaults   : () => ({
			currentFrameIndex      : 0,
			currentFramePlayerIndex: 0,
			currentFrameUserId     : '',
			currentRollIndex       : 0,
			currentRollStartTime   : 0,
		}),
	},
	{
		component  : LaneScores,
		mode       : 'synced',
		entityGroup: LANES_GROUP_ID,
		defaults   : () => ({
			scores: [],
		}),
	},
	{
		component  : LaneBumpers,
		mode       : 'synced',
		entityGroup: LANES_GROUP_ID,
		defaults   : () => ({
			enabled: false,
		}),
	},
	{
		component  : PlayerIdentity,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
	},
	{
		component  : PlayerActivity,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
		defaults   : () => ({
			firstPlayedAt : 0,
			lastPlayedAt  : 0,
			currentStreak : 0,
			maxStreak     : 0,
			gamesPlayed   : 0,
		}),
	},
	{
		component  : PlayerStats,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
		defaults   : () => ({
			gamesCreated      : 0,
			gamesPlayed       : 0,
			gamesWon          : 0,
			gamesLost         : 0,
			gamesLeftEarly    : 0,
			rolledBalls       : 0,
			rolledStrikes     : 0,
			rolledSpares      : 0,
			rolledGutterBalls : 0,
			pinsKnockedDown   : 0,
			perfectGames      : 0,
			matches           : [],
		}),
	},
	{
		component  : PlayerTickets,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
		defaults   : () => ({
			balance: 0,
		}),
	},
	{
		component  : PlayerUnlocks,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
		defaults   : () => ({
			unlockedItemIds: getDefaultUnlockedIds(),
		}),
	},
	{
		component  : PlayerLoadout,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
		defaults   : () => getDefaultLoadout(),
	},
	{
		component  : PlayerPreferences,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
		defaults   : () => ({
			bgmMuted       : false,
			bumpersEnabled : false,
		}),
	},
]
