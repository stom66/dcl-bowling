import { PinItem } from "src/shared/data/unlocks/types"


export const pins: Record<string, PinItem> = {
	'pin-default': {
		name            : 'Default Pin',
		description     : 'The standard house pin.',
		ticketCost      : 0,
		defaultUnlocked : true,
		defaultEquipped : true,
		thumbSrc        : 'assets/images/unlocks/pins/pin_default.png',
		modelSrc        : 'assets/models/pins/pin_default.gltf',
	},
	'pin-blue': {
		name            : 'Blue Pin',
		description     : 'A deep blue pin.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/pins/pin_blue.png',
		modelSrc        : 'assets/models/pins/pin_blue.gltf',
	},
	'pin-red': {
		name            : 'Red Pin',
		description     : 'A bright red pin.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/pins/pin_red.png',
		modelSrc        : 'assets/models/pins/pin_red.gltf',
	},
	'pin-orange': {
		name            : 'Orange Pin',
		description     : 'A vivid orange pin.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/pins/pin_orange.png',
		modelSrc        : 'assets/models/pins/pin_orange.gltf',
	},
	'pin-green': {
		name            : 'Green Pin',
		description     : 'A bright green pin.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/pins/pin_green.png',
		modelSrc        : 'assets/models/pins/pin_green.gltf',
	},
}
