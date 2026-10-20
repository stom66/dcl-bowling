import type { Vec2 } from 'src/client/ui/particles/types'
import { TOGGLE_BUTTONS_SIZE, TOGGLE_GAP } from 'src/client/ui/themes/bowling/layers/topRightToggles.layer'


/** Desktop virtual canvas width used by Duck / React-ECS. */
export const VIRTUAL_WIDTH = 1920

/** Desktop virtual canvas height used by Duck / React-ECS. */
export const VIRTUAL_HEIGHT = 1080

/** Matches kit `RIGHT_ZONE_INSET` and ticket-chip layout. */
const ZONE_EDGE_INSET = 8
const CHIP_WIDTH      = 188
const CHIP_HEIGHT     = 64
const TICKET_ICON_SIZE = 48
const CHIP_PAD_LEFT   = 10


// MARK: getScreenCenter
/** Centre of the desktop virtual canvas. */
export function getScreenCenter(): Vec2 {
	return {
		x: VIRTUAL_WIDTH  * 0.5,
		y: VIRTUAL_HEIGHT * 0.5,
	}
}


// MARK: getTicketChipTarget
/**
 * Approximate centre of the ticket glyph in the RightTop balance chip, in
 * FullScreen virtual-canvas pixels. Uses the default right inset (not the
 * wider local-dev chrome inset) so streams land near the chip on deployed
 * clients.
 */
export function getTicketChipTarget(): Vec2 {
	const chipTop  = ZONE_EDGE_INSET + TOGGLE_BUTTONS_SIZE + TOGGLE_GAP
	const chipLeft = VIRTUAL_WIDTH - ZONE_EDGE_INSET - CHIP_WIDTH

	return {
		x: chipLeft + CHIP_PAD_LEFT + TICKET_ICON_SIZE * 0.5,
		y: chipTop  + CHIP_HEIGHT * 0.5,
	}
}
