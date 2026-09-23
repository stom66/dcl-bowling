import { SpotlightPatternItem } from "src/shared/data/unlocks/types"


export const spotlightPatterns: Record<string, SpotlightPatternItem> = {
	'spotlight-none': {
		name            : 'No Gobo',
		description     : 'A plain beam with no shadow mask.',
		ticketCost      : 0,
		defaultUnlocked : true,
		defaultEquipped : true,
		thumbSrc        : 'assets/images/unlocks/spotlights/default.png',
		color           : { r: 1, g: 1, b: 1 },
		intensity       : 0,
		innerAngle      : 20,
		outerAngle      : 40,
		shadow          : false,
	},
	'spotlight-logo': {
		name            : 'Logo Gobo',
		description     : 'A logo gobo follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/spotlights/default.png',
		maskSrc         : 'assets/images/unlocks/spotlights/default.png',
		color           : { r: 1, g: 1, b: 1 },
		intensity       : 800,
		innerAngle      : 18,
		outerAngle      : 32,
		range           : 14,
		shadow          : true,
	},
}
