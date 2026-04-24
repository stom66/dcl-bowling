import { engine, InputModifier, Transform } from "@dcl/sdk/ecs"
import { movePlayerTo, triggerSceneEmote } from "~system/RestrictedActions"
import * as utils from "@dcl-sdk/utils"

const EMOTE_SRC = 'assets/emotes/bowl6_emote.glb'
const EMOTE_TRIGGER_DELAY_MS = 400
const EMOTE_DURATION_MS = 10000

let emoteActive = false

export function PlayBowlingAnimation(loop: boolean) {
	if (emoteActive) return
	emoteActive = true

	const playerPos = Transform.getOrNull(engine.PlayerEntity)?.position
	if (!playerPos) {
		emoteActive = false
		return
	}

	InputModifier.createOrReplace(engine.PlayerEntity, {
		mode: InputModifier.Mode.Standard({
			disableAll: true,
		}),
	})

	movePlayerTo({
		newRelativePosition: { x: playerPos.x, y: playerPos.y, z: playerPos.z },
	})

	utils.timers.setTimeout(() => {
		if (!emoteActive) return
		triggerSceneEmote({ src: EMOTE_SRC, loop: loop ? true : false })

		utils.timers.setTimeout(() => {
			ClearEmote()
		}, EMOTE_DURATION_MS)
	}, EMOTE_TRIGGER_DELAY_MS)
}

export function ClearEmote() {
	if (!emoteActive) return
	emoteActive = false
	InputModifier.deleteFrom(engine.PlayerEntity)
}
