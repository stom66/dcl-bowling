import { engine, Schemas } from "@dcl/sdk/ecs"


/**
 * Flat list of unlocked catalog ids. Storage key `unlocks`.
 */
export const PlayerUnlocks = engine.defineComponent(
	'PlayerUnlocks',
	{
		unlockedItemIds: Schemas.Array(Schemas.String),
	}
)
