import { engine, InputModifier } from "@dcl/sdk/ecs";


export function FreezePlayer() {
	InputModifier.createOrReplace(engine.PlayerEntity, {
		mode: InputModifier.Mode.Standard({
			disableAll: true,
		}),
	})
}

export function UnFreezePlayer() {
	InputModifier.deleteFrom(engine.PlayerEntity)
}