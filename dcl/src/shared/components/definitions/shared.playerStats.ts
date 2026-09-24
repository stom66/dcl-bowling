import { engine, Schemas } from "@dcl/sdk/ecs"


const playerMatchSummarySchema = Schemas.Map({
	startedAt  : Schemas.Int64,
	durationMs : Schemas.Int,
	frameCount : Schemas.Int,
	score      : Schemas.Int,
	won        : Schemas.Boolean,
})


/**
 * Career bowling counters and a capped recent match history. Storage key `stats`.
 */
export const PlayerStats = engine.defineComponent(
	'PlayerStats',
	{
		gamesCreated      : Schemas.Int,
		gamesPlayed       : Schemas.Int,
		gamesWon          : Schemas.Int,
		gamesLost         : Schemas.Int,
		gamesLeftEarly    : Schemas.Int,
		rolledBalls       : Schemas.Int,
		rolledStrikes     : Schemas.Int,
		rolledSpares      : Schemas.Int,
		rolledGutterBalls : Schemas.Int,
		pinsKnockedDown   : Schemas.Int,
		perfectGames      : Schemas.Int,
		matches           : Schemas.Array(playerMatchSummarySchema),
	}
)
