import { engine, Schemas } from "@dcl/sdk/ecs"


const pendingRewardSchema = Schemas.Map({
	id          : Schemas.String,
	title       : Schemas.String,
	message     : Schemas.String,
	buttonLabel : Schemas.String,
	kind        : Schemas.String,
	tickets     : Schemas.Int,
	itemId      : Schemas.String,
})


/**
 * Redeemed reward ids and offers waiting for the claim button. Storage key `rewards`.
 */
export const PlayerRewards = engine.defineComponent(
	'PlayerRewards',
	{
		redeemedIds : Schemas.Array(Schemas.String),
		pending     : Schemas.Array(pendingRewardSchema),
	}
)
