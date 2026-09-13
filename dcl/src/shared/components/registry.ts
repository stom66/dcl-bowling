import { LaneCurrentTurn, LaneGameData, LanePhaseEnum, LaneScores } from "src/shared/components/definitions/shared.lane"
import { PlayerIdentity } from "src/shared/components/definitions/shared.playerIdentity"
import { SceneState } from "src/shared/components/definitions/shared.sceneState"
import { ComponentRegistration, KeyedEntityGroupConfig } from "src/shared/components/types"
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
 * Keyed group for per-player identity (storage-backed fields land here in stage 2).
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
		component  : LaneGameData,
		mode       : 'synced',
		entityGroup: LANES_GROUP_ID,
		defaults   : () => ({
			laneIndex: 0,
			startTime: 0,
			players  : [],
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
		component  : PlayerIdentity,
		mode       : 'synced',
		entityGroup: PLAYERS_GROUP_ID,
	},
]
