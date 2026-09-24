import { engine, Schemas } from "@dcl/sdk/ecs"


const leaderboardScoreSchema = Schemas.Map({
	userId     : Schemas.String,
	displayName: Schemas.String,
	score      : Schemas.Int,
	rank       : Schemas.Int,
})


/**
 * Scene-wide ranked boards. Six storage keys publish into these arrays.
 */
export const SceneScoreboards = engine.defineComponent(
	'SceneScoreboards',
	{
		alltime3 : Schemas.Array(leaderboardScoreSchema),
		alltime6 : Schemas.Array(leaderboardScoreSchema),
		alltime10: Schemas.Array(leaderboardScoreSchema),
		weekly3  : Schemas.Array(leaderboardScoreSchema),
		weekly6  : Schemas.Array(leaderboardScoreSchema),
		weekly10 : Schemas.Array(leaderboardScoreSchema),
	}
)


/**
 * Append-only perfect-game wall. Not ranked and not capped.
 */
export const PerfectGames = engine.defineComponent(
	'PerfectGames',
	{
		entries: Schemas.Array(
			Schemas.Map({
				displayName: Schemas.String,
				userId     : Schemas.String,
				achievedAt : Schemas.Int64,
				frameCount : Schemas.Int,
			})
		),
	}
)
