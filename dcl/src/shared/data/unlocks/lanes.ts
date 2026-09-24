import { LaneItem } from "src/shared/data/unlocks/types"


export const lanes: Record<string, LaneItem> = {
	'lane-default': {
		name            : 'Default',
		description     : 'The standard house lane.',
		ticketCost      : 0,
		defaultUnlocked : true,
		defaultEquipped : true,
		thumbSrc        : 'assets/images/unlocks/lanes/lane_default.png',
		modelSrc        : 'assets/models/lanes/lane_default.gltf',
	},
}
