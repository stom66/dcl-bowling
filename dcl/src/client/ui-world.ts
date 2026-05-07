import { engine, Entity, Transform } from "@dcl/sdk/ecs"
import { Quaternion, Vector3 } from "@dcl/sdk/math"
import { GameSettings } from "src/shared/settings"
import { UiLaneScreen } from "./ui-world/ui.laneScreen"

export namespace UiWorld {

	export function init() {

		// Spawn the lane screens
		for (let i = 0; i < GameSettings.MAX_LANES; i++) {
			new UiLaneScreen(i)
		}
	}


}