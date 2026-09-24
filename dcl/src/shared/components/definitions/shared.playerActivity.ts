import { engine, Schemas } from "@dcl/sdk/ecs"


/**
 * First/last play, streaks, and completed-game count. Storage key `activity`.
 */
export const PlayerActivity = engine.defineComponent(
	'PlayerActivity',
	{
		firstPlayedAt : Schemas.Int64,
		lastPlayedAt  : Schemas.Int64,
		currentStreak : Schemas.Int,
		maxStreak     : Schemas.Int,
		gamesPlayed   : Schemas.Int,
	}
)
