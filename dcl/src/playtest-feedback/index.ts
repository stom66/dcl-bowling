import { engine } from '@dcl/sdk/ecs'
import { isServer } from '@dcl/sdk/network'

import { ClientEvents, eventBus } from 'src/shared/utils/eventBus'
import { timers } from 'src/shared/utils/timers'

import { feedback } from 'src/playtest-feedback/lib'
import { setIntroAccepted, setIntroDeclined, showToast } from 'src/playtest-feedback/lib/client/state'
import { releaseFeedbackUi } from 'src/playtest-feedback/lib/client/ui'


/** How long after the load fly-in before the intro opens. */
const INTRO_DELAY_MS = 20 * 1000

/** How long an intro reply notice stays up. */
const NOTICE_MS = 4500

const DECLINE_NOTICE = "Okay 😢"

/** Open text, as soon as they agree to answer. */
const AFTER_INTRO = ['firstImpressions'] as const

/** Asked on its own, the first time the local player's turn ends. */
const AFTER_FIRST_TURN = ['startGame'] as const

/** Remaining batch, after the player's first finished game. */
const AFTER_FIRST_GAME = ['playGame', 'anythingWrong'] as const

let askedStartGame  = false
let askedFirstGame  = false


setIntroAccepted(() => {
	void feedback.ask(AFTER_INTRO, 'after-intro')
})

setIntroDeclined(() => {
	showToast(DECLINE_NOTICE, false, NOTICE_MS, true)
})


// MARK: onFlyInEnd
/**
 * Releases the feedback panel once the load fly-in has handed control back,
 * then shows the intro after {@link INTRO_DELAY_MS}.
 */
function onFlyInEnd(): void {
	releaseFeedbackUi()
	timers.setTimeout(() => {
		void feedback.intro('after-fly-in')
	}, INTRO_DELAY_MS)
}


// MARK: onFirstTurnEnd
/**
 * Asks how easy it was to start, once, the first time this player's turn ends.
 * Players who opted out, and turns that end before they opt in, are left alone.
 */
function onFirstTurnEnd(): void {
	if (askedStartGame) return
	if (feedback.participation() !== 'in') return
	askedStartGame = true
	void feedback.ask(AFTER_FIRST_TURN, 'after-first-turn')
}


// MARK: onFirstGameComplete
/**
 * Asks the remaining batch once, after the score screen for a finished match closes.
 * Players who opted out, and matches that end before they opt in, are left alone.
 */
function onFirstGameComplete(): void {
	if (askedFirstGame) return
	if (feedback.participation() !== 'in') return
	askedFirstGame = true
	void feedback.ask(AFTER_FIRST_GAME, 'after-first-game')
}


// MARK: subscribeOnFirstTick
/**
 * Subscribes on the client once the runtime role is known. The fly-in ends
 * seconds later, so the listener is in place before that event fires.
 */
function subscribeOnFirstTick(): void {
	engine.removeSystem(subscribeOnFirstTick)
	if (isServer()) return
	eventBus.on(ClientEvents.ON_LOAD_FLY_IN_END, onFlyInEnd)
	eventBus.on(ClientEvents.ON_MY_FRAME_END, onFirstTurnEnd)
	eventBus.on(ClientEvents.ON_GAME_SUMMARY_END, onFirstGameComplete)
}

engine.addSystem(subscribeOnFirstTick)

export { feedback }
export type { AskOptions, AskResult, IntroResult, Participation } from 'src/playtest-feedback/lib'
