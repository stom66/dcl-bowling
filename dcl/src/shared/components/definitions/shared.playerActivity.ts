import { engine, Schemas } from "@dcl/sdk/ecs"


/**
 * First/last play, streaks, sessions, last version, and completed-game count. Storage key `activity`.
 */
export const PlayerActivity = engine.defineComponent(
	'PlayerActivity',
	{
		firstPlayedAt     : Schemas.Int64,
		lastPlayedAt      : Schemas.Int64,
		lastPlayedVersion : Schemas.String,
		currentStreak     : Schemas.Int,
		maxStreak         : Schemas.Int,
		sessions          : Schemas.Int,
		gamesPlayed       : Schemas.Int,
	}
)
