import { SpotlightColorItem } from "src/shared/data/unlocks/types"


const SPOTLIGHT_THUMB = 'assets/images/unlocks/spotlights/default.png'


export const spotlightColors: Record<string, SpotlightColorItem> = {
	'spotlight-color-white': {
		name            : 'White',
		description     : 'A clean white follow-spot.',
		ticketCost      : 0,
		defaultUnlocked : true,
		defaultEquipped : true,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 1, b: 1 },
	},
	'spotlight-color-blue': {
		name            : 'Blue',
		description     : 'A deep blue follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 0.2, g: 0.45, b: 1 },
	},
	'spotlight-color-green': {
		name            : 'Green',
		description     : 'A bright green follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 0.2, g: 0.9, b: 0.35 },
	},
	'spotlight-color-red': {
		name            : 'Red',
		description     : 'A vivid red follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 0.2, b: 0.2 },
	},
	'spotlight-color-orange': {
		name            : 'Orange',
		description     : 'A warm orange follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 0.5, b: 0.1 },
	},
	'spotlight-color-purple': {
		name            : 'Purple',
		description     : 'A rich purple follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 0.65, g: 0.25, b: 1 },
	},
	'spotlight-color-pink': {
		name            : 'Pink',
		description     : 'A vivid pink follow-spot.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : SPOTLIGHT_THUMB,
		color           : { r: 1, g: 0.4, b: 0.75 },
	},
}
