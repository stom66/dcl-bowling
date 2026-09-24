import { engine, Schemas } from "@dcl/sdk/ecs"


/**
 * Identity component for the keyed `players` group. Discovery field is `userId`.
 */
export const PlayerIdentity = engine.defineComponent(
	'PlayerIdentity',
	{
		userId: Schemas.String,
	}
)
