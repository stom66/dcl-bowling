import { engine, Schemas } from "@dcl/sdk/ecs"


export type PlayerPreferencesState = {
	bgmMuted       : boolean
	bumpersEnabled : boolean
}


/**
 * Client settings that persist across sessions. Storage key `preferences`.
 */
export const PlayerPreferences = engine.defineComponent(
	'PlayerPreferences',
	{
		bgmMuted       : Schemas.Boolean,
		bumpersEnabled : Schemas.Boolean,
	}
)
