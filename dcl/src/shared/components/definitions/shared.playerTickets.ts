import { engine, Schemas } from "@dcl/sdk/ecs"


/**
 * Ticket balance. Storage key `tickets`.
 */
export const PlayerTickets = engine.defineComponent(
	'PlayerTickets',
	{
		balance: Schemas.Int,
	}
)
