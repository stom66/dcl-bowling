import { engine, Transform } from "@dcl/sdk/ecs"
import { movePlayerTo, stopEmote, triggerEmote, triggerSceneEmote } from "~system/RestrictedActions"
import * as utils from "@dcl-sdk/utils"
import { ClientEvents, eventBus } from "src/shared/utils/eventBus"
import { FreezePlayer, UnFreezePlayer } from "src/shared/utils/inputModifiers"

const EMOTE_SRC               = 'assets/emotes/bowl6_emote.glb'
const EMOTE_TRIGGER_DELAY_MS  = 400
const EMOTE_DURATION_MS       = 10000

const GUTTER_RESULT_EMOTES = [
	'cry',
	'dontsee',
]
const CHEER_RESULT_EMOTES  = [
	'confettipopper',
	'dance',
	'handsair',
]
const OPEN_RESULT_EMOTES   = [
	'fistpump',
	'shrug',
	'wave',
	'raiseHand',
	'clap',
	'kiss',
]

let emoteActive       = false
let resultEmoteActive = false

export function PlayBowlingAnimation(loop: boolean) {
	if (emoteActive) return
	emoteActive = true

	const playerPos = Transform.getOrNull(engine.PlayerEntity)?.position
	if (!playerPos) {
		emoteActive = false
		return
	}

	FreezePlayer()

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
	UnFreezePlayer()
}


// MARK: pickEmote
function pickEmote(emotes: readonly string[]): string {
	const index = Math.floor(Math.random() * emotes.length)
	return emotes[index]
}


// MARK: PlayRollResultEmote
/**
 * Plays a built-in emote on the local player for the roll that just finished.
 * Gutters cry or cover their eyes, strikes and spares celebrate, and every other result picks a lighter reaction.
 * Only call this for the local bowler. `triggerEmote` always plays on this client.
 */
export function PlayRollResultEmote(
	gutterBall : boolean,
	isStrike   : boolean,
	isSpare    : boolean,
): void {
	let emotes = OPEN_RESULT_EMOTES
	if (gutterBall) {
		emotes = GUTTER_RESULT_EMOTES
	}
	else if (isStrike || isSpare) {
		emotes = CHEER_RESULT_EMOTES
	}

	const predefinedEmote = pickEmote(emotes)
	console.log('emotes: PlayRollResultEmote:', predefinedEmote)
	resultEmoteActive = true
	void triggerEmote({ predefinedEmote })
}


// MARK: StopRollResultEmote
/**
 * Stops the local player's current emote. `stopEmote` ends a built-in or scene
 * emote, including one that loops.
 */
export function StopRollResultEmote(): void {
	if (!resultEmoteActive) return
	resultEmoteActive = false
	console.log('emotes: StopRollResultEmote')
	void stopEmote({})
}


// MARK: init
/**
 * Stops a result emote when the local player's next roll starts, so a looping
 * emote such as cry does not carry into the lane.
 */
export function init(): void {
	eventBus.on(ClientEvents.ON_MY_ROLL_START, () => {
		StopRollResultEmote()
	})
}
