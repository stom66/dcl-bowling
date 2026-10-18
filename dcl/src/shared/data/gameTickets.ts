import { GameTicketLine } from "src/shared/data/unlocks/types"
import { normalizeFrameCount } from "src/shared/settings"


export const TICKETS_PER_FRAME          = 1
export const TICKETS_FOR_WIN            = 3
export const TICKETS_PER_STRIKE         = 2
export const TICKETS_PER_SPARE          = 1
export const TICKETS_FIRST_GAME_TODAY   = 1


export type GameTicketPayoutInput = {
	frameCount     : number
	sharesTopScore : boolean
	strikeCount    : number
	spareCount     : number
	firstGameToday : boolean
}



// MARK: buildGameTicketLines
/**
 * Builds the end-of-game ticket lines. Lines with a count of zero are omitted.
 */
export function buildGameTicketLines(input: GameTicketPayoutInput): GameTicketLine[] {
	const frameCount = normalizeFrameCount(input.frameCount)
	const strikes    = Math.max(0, Math.floor(input.strikeCount))
	const spares     = Math.max(0, Math.floor(input.spareCount))
	const lines: GameTicketLine[] = []

	if (frameCount > 0) {
		lines.push({
			label   : 'Frames',
			count   : frameCount,
			tickets : frameCount * TICKETS_PER_FRAME,
		})
	}
	if (input.sharesTopScore) {
		lines.push({
			label   : 'Winner',
			count   : 1,
			tickets : TICKETS_FOR_WIN,
		})
	}
	if (strikes > 0) {
		lines.push({
			label   : 'Strikes',
			count   : strikes,
			tickets : strikes * TICKETS_PER_STRIKE,
		})
	}
	if (spares > 0) {
		lines.push({
			label   : 'Spares',
			count   : spares,
			tickets : spares * TICKETS_PER_SPARE,
		})
	}
	if (input.firstGameToday) {
		lines.push({
			label   : 'First game today',
			count   : 1,
			tickets : TICKETS_FIRST_GAME_TODAY,
		})
	}

	return lines
}



// MARK: sumTicketLines
/**
 * Adds the ticket amounts on a payout.
 */
export function sumTicketLines(lines: GameTicketLine[]): number {
	return lines.reduce((total, line) => total + line.tickets, 0)
}
