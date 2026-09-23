import { SpotlightColorItem } from "src/shared/data/unlocks/types"


const SPOTLIGHT_THUMB = 'assets/images/unlocks/spotlights/default.png'


export const spotlightColors: Record<string, SpotlightColorItem> = {
	'spotlight-color-white': {
		name            : 'White Light',
		description     : 'A clean white follow-spot.',
		ticketCost      : 0,
		defaultUnlocked : true,
		defaultEquipped : true,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 1, b: 1 },
	},
	'spotlight-color-blue': {
		name            : 'Blue Light',
		description     : 'A deep blue follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 0.2, g: 0.45, b: 1 },
	},
	'spotlight-color-green': {
		name            : 'Green Light',
		description     : 'A bright green follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 0.2, g: 0.9, b: 0.35 },
	},
	'spotlight-color-red': {
		name            : 'Red Light',
		description     : 'A vivid red follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 0.2, b: 0.2 },
	},
	'spotlight-color-orange': {
		name            : 'Orange Light',
		description     : 'A warm orange follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 0.5, b: 0.1 },
	},
	'spotlight-color-purple': {
		name            : 'Purple Light',
		description     : 'A rich purple follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 0.65, g: 0.25, b: 1 },
	},
	'spotlight-color-pink': {
		name            : 'Pink Light',
		description     : 'A vivid pink follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 0.4, b: 0.75 },
	},
}
