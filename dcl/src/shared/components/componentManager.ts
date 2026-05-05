import { engine } from "@dcl/sdk/ecs"
import * as LaneComponent from "./lane"
import { GameSettings } from "../settings"

export namespace ComponentManager {
	const laneComponentEntities = []

	export function init() {

		// Create the entities
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			const entity = engine.addEntity()
			LaneComponent.LaneIndex.create(entity, { index: 0 })
			LaneComponent.LaneGameStartTime.create(entity, { startTime: 0 })
			LaneComponent.LanePlayers.create(entity, { players: [] })
			LaneComponent.LaneCurrentTurn.create(entity, { currentFrameIndex: 0, currentFramePlayerIndex: 0, currentFrameUserId: '', currentRollIndex: 0, currentRollStartTime: 0 })
			LaneComponent.LaneScores.create(entity, { scores: [] })

			laneComponentEntities.push(entity)
		}
	}
}