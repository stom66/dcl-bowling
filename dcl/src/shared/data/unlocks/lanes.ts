import { LaneItem } from "src/shared/data/unlocks/types"


export const lanes: Record<string, LaneItem> = {
	'lane-default': {
		name            : 'Default',
		description     : 'The standard house lane.',
		ticketCost      : 0,
		defaultUnlocked : true,
		defaultEquipped : true,
		thumbSrc        : 'assets/images/unlocks/lanes/lane_default.png',
		modelSrc        : 'assets/models/unlocks/lanes/lane_default.gltf',
	},
	'lane-blue': {
		name            : 'Blue',
		description     : 'A bright blue lane.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/lanes/lane_blue.png',
		modelSrc        : 'assets/models/unlocks/lanes/lane_blue.gltf',
	},
	'lane-digital-glitch': {
		name            : 'Digital Glitch',
		description     : 'A lane with a digital-glitch pattern.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/lanes/lane_digitalGlitch.png',
		modelSrc        : 'assets/models/unlocks/lanes/lane_digitalGlitch.gltf',
	},
	'lane-nebula': {
		name            : 'Nebula',
		description     : 'A purple nebula lane.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/lanes/lane_nebula.png',
		modelSrc        : 'assets/models/unlocks/lanes/lane_nebula.gltf',
	},
	'lane-red': {
		name            : 'Red',
		description     : 'A bright red lane.',
		ticketCost      : 10,
		defaultUnlocked : false,
		defaultEquipped : false,
		thumbSrc        : 'assets/images/unlocks/lanes/lane_red.png',
		modelSrc        : 'assets/models/unlocks/lanes/lane_red.gltf',
	},
}
