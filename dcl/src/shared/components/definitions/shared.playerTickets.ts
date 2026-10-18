import { engine, Schemas } from "@dcl/sdk/ecs"


const gameTicketLineSchema = Schemas.Map({
	label   : Schemas.String,
	count   : Schemas.Int,
	tickets : Schemas.Int,
})


/**
 * Ticket balance and the last completed game's payout lines. Storage key `tickets`.
 */
export const PlayerTickets = engine.defineComponent(
	'PlayerTickets',
	{
		balance             : Schemas.Int,
		lastPayoutStartedAt : Schemas.Int64,
		lastPayoutTotal     : Schemas.Int,
		lastPayoutLines     : Schemas.Array(gameTicketLineSchema),
	}
)
