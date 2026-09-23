import { engine, Schemas } from "@dcl/sdk/ecs"


/**
 * Equipped cosmetics. Storage key `loadout`.
 */
export const PlayerLoadout = engine.defineComponent(
	'PlayerLoadout',
	{
		ballId           : Schemas.String,
		pinId            : Schemas.String,
		laneId           : Schemas.String,
		trailId          : Schemas.String,
		spotlightId      : Schemas.String,
		spotlightColorId : Schemas.String,
		scoringAnimIds   : Schemas.Array(Schemas.String),
	}
)
