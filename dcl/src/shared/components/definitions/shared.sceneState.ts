import { engine, Schemas } from "@dcl/sdk/ecs"


/**
 * Discovery component on the single main entity.
 */
export const SceneState = engine.defineComponent(
	'SceneState',
	{
		bootAt: Schemas.Int64,
	}
)
